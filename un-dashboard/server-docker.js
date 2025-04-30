const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const socketIo = require('socket.io');
const http = require('http');
const Docker = require('dockerode'); // Import dockerode

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["http://localhost:3000", "http://10.5.1.83:3000", /^http:\/\/10\.5\.1\.\d+:3000$/, "0.0.0.0:3000"],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    },
});

app.use(cors());

// --- DOCKER MANAGEMENT API ---
const docker = new Docker({ host: '10.5.1.212', port: 2375 }); // Connect to the remote Docker daemon

// Add active connections tracking
const activeConnections = new Set();
const MAX_CONCURRENT_OPERATIONS = 10;
let activeOperations = 0;

app.get('/api/connections', (req, res) => {
    res.json({ 
        activeConnections: activeConnections.size,
        activeOperations: activeOperations
    });
});

app.get('/api/containers', async (req, res) => {
    try {
        // Notify about operation start
        io.emit('operation', { type: 'containerList', status: 'start' });
        activeOperations++;
        
        const containers = await docker.listContainers({ all: true });
        const formattedContainers = containers.map((container) => {
            const portMatch = container.Ports?.find((port) => port.PublicPort);
            return {
                ...container,
                PublishedPort: portMatch ? portMatch.PublicPort : null,
            };
        });
        
        // Notify about operation completion
        activeOperations--;
        io.emit('operation', { 
            type: 'containerList', 
            status: 'complete',
            count: containers.length 
        });
        
        res.json(formattedContainers);
    } catch (error) {
        activeOperations--;
        console.error('Docker Error:', error.message);
        io.emit('operation', { type: 'containerList', status: 'error', message: error.message });
        res.status(500).json({ error: error.message });
    }
});

// --- SOCKET.IO ---
const SOCKET_UPDATE_INTERVAL = 10000;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    activeConnections.add(socket.id);
    
    // Create connection-specific lastFetched timestamp
    socket.lastFetched = Date.now();
    
    // Broadcast updated connection count
    io.emit('connectionCount', activeConnections.size);
    
    let fetchContainersInterval;

    const fetchContainers = async () => {
        if (Date.now() - socket.lastFetched < SOCKET_UPDATE_INTERVAL) return;
        socket.lastFetched = Date.now();

        try {
            socket.emit('operation', { type: 'refresh', status: 'start' });
            activeOperations++;
            
            // Add timeout to prevent hanging connections
            const containerPromise = docker.listContainers({ all: true });
            const containers = await Promise.race([
                containerPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Docker operation timed out')), 15000)
                )
            ]);
            
            // Rest of the function remains the same
            const formattedContainers = containers.map((container) => {
                const portMatch = container.Ports?.find((port) => port.PublicPort);
                return {
                    ...container,
                    PublishedPort: portMatch ? portMatch.PublicPort : null,
                };
            });
            
            activeOperations--;
            socket.emit('operation', { type: 'refresh', status: 'complete' });
            socket.emit('containers', formattedContainers);
        } catch (error) {
            activeOperations--;
            console.error('Docker Error:', error.message);
            socket.emit('operation', { type: 'refresh', status: 'error', message: error.message });
            socket.emit('error', error.message);
        }
    };

    fetchContainers(); // On connect
    fetchContainersInterval = setInterval(fetchContainers, SOCKET_UPDATE_INTERVAL);

    socket.on('containerAction', async (data) => {
        const { action, containerID } = data;

        if (!containerID) {
            console.error("Invalid container ID received");
            socket.emit('error', "Invalid container ID");
            return;
        }

        // Rate limit operations if needed
        if (activeOperations >= MAX_CONCURRENT_OPERATIONS) {
            socket.emit('error', "Too many concurrent operations. Please try again later.");
            return;
        }

        try {
            activeOperations++;
            socket.emit('operation', { 
                type: 'containerAction', 
                action,
                containerID,
                status: 'start' 
            });
            
            switch (action) {
                case 'start':
                    await docker.getContainer(containerID).start();
                    break;
                case 'stop':
                    await docker.getContainer(containerID).stop();
                    break;
                case 'restart':
                    await docker.getContainer(containerID).restart();
                    break;
                case 'delete':
                    await docker.getContainer(containerID).remove({ force: true });
                    break;
                default:
                    console.error("Invalid action:", action);
                    return;
            }
            
            activeOperations--;
            console.log(`Docker ${action} executed successfully`);
            socket.emit('operation', { 
                type: 'containerAction', 
                action,
                containerID,
                status: 'complete' 
            });
            
            fetchContainers(); // Refresh the container list
        } catch (error) {
            activeOperations--;
            console.error('Docker Error:', error.message);
            socket.emit('operation', { 
                type: 'containerAction', 
                action,
                containerID,
                status: 'error',
                message: error.message
            });
            socket.emit('error', error.message);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        activeConnections.delete(socket.id);
        io.emit('connectionCount', activeConnections.size);
        clearInterval(fetchContainersInterval);
    });
});

// --- START SERVER ---
server.listen(4002, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:4002');
});
