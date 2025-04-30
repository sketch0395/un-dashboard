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

    socket.on("createContainer", async (config) => {
        try {
            const { image, name, ports, environment, volumes } = config;
            
            // Update operation status to show we're working on it
            socket.emit("operation", {
                type: "containerAction",
                status: "start",
                action: "create",
                message: `Creating container from image ${image}...`
            });
            
            // Check if image exists locally, if not pull it
            try {
                await docker.getImage(image).inspect();
                console.log(`Image ${image} found locally`);
            } catch (err) {
                // Image not found locally, try to pull it
                console.log(`Image ${image} not found locally, pulling from registry...`);
                socket.emit("operation", {
                    type: "containerAction",
                    status: "start",
                    action: "pull",
                    message: `Pulling image ${image}...`
                });
                
                // Use stream to track pull progress
                const stream = await docker.pull(image);
                await new Promise((resolve, reject) => {
                    docker.modem.followProgress(stream, (err, output) => {
                        if (err) reject(err);
                        else resolve(output);
                    }, (event) => {
                        // Optional: emit progress updates if desired
                        if (event.progress) {
                            socket.emit("operation", {
                                type: "containerAction",
                                status: "progress",
                                action: "pull",
                                message: `Pulling ${image}: ${event.progress}`
                            });
                        }
                    });
                });
                
                socket.emit("operation", {
                    type: "containerAction",
                    status: "progress",
                    action: "create",
                    message: `Image pulled, creating container...`
                });
            }
            
            // Parse port mappings
            const portBindings = {};
            const exposedPorts = {};
            
            if (ports) {
                ports.split(',').forEach(portMapping => {
                    const [hostPort, containerPort] = portMapping.trim().split(':');
                    const containerPortWithProto = `${containerPort}/tcp`;
                    exposedPorts[containerPortWithProto] = {};
                    portBindings[containerPortWithProto] = [{ HostPort: hostPort }];
                });
            }
            
            // Parse environment variables
            const envArray = environment ? environment.split('\n').filter(line => line.trim()) : [];
            
            // Parse volumes
            const volumeBindings = [];
            if (volumes) {
                volumes.split('\n').forEach(volume => {
                    if (volume.trim()) {
                        const [hostPath, containerPath] = volume.trim().split(':');
                        volumeBindings.push(`${hostPath}:${containerPath}`);
                    }
                });
            }
            
            // Create container config
            const containerConfig = {
                Image: image,
                name: name || undefined,
                ExposedPorts: Object.keys(exposedPorts).length > 0 ? exposedPorts : undefined,
                HostConfig: {
                    PortBindings: Object.keys(portBindings).length > 0 ? portBindings : undefined,
                    Binds: volumeBindings.length > 0 ? volumeBindings : undefined
                },
                Env: envArray.length > 0 ? envArray : undefined
            };
            
            // Create and start container using Docker API
            const container = await docker.createContainer(containerConfig);
            await container.start();
            
            // Emit success message
            socket.emit("operation", {
                type: "containerAction",
                status: "complete",
                action: "create",
                message: `Container ${name || container.id.substring(0, 12)} created successfully`
            });
            
            // Send updated container list
            fetchContainers(); // Use your existing fetch function to update the container list
        } catch (error) {
            console.error("Error creating container:", error);
            socket.emit("operation", {
                type: "containerAction",
                status: "error",
                action: "create",
                message: error.message
            });
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
