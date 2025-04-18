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
        origin: ['http://localhost:3000', 'http://10.5.1.83:3000'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    },
});

app.use(cors());

// --- DOCKER MANAGEMENT API ---
const docker = new Docker({ host: '10.5.1.212', port: 2375 }); // Connect to the remote Docker daemon

app.get('/api/containers', async (req, res) => {
    try {
        const containers = await docker.listContainers({ all: true });
        const formattedContainers = containers.map((container) => {
            const portMatch = container.Ports?.find((port) => port.PublicPort);
            return {
                ...container,
                PublishedPort: portMatch ? portMatch.PublicPort : null,
            };
        });
        res.json(formattedContainers);
    } catch (error) {
        console.error('Docker Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- SOCKET.IO ---
let lastFetched = Date.now();
const SOCKET_UPDATE_INTERVAL = 10000;

io.on('connection', (socket) => {
    console.log('A user connected');
    let fetchContainersInterval;

    const fetchContainers = async () => {
        if (Date.now() - lastFetched < SOCKET_UPDATE_INTERVAL) return;
        lastFetched = Date.now();

        try {
            const containers = await docker.listContainers({ all: true });
            const formattedContainers = containers.map((container) => {
                const portMatch = container.Ports?.find((port) => port.PublicPort);
                return {
                    ...container,
                    PublishedPort: portMatch ? portMatch.PublicPort : null,
                };
            });
            socket.emit('containers', formattedContainers);
        } catch (error) {
            console.error('Docker Error:', error.message);
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

        try {
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
            console.log(`Docker ${action} executed successfully`);
            fetchContainers(); // Refresh the container list
        } catch (error) {
            console.error('Docker Error:', error.message);
            socket.emit('error', error.message);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        clearInterval(fetchContainersInterval);
    });
});

// --- START SERVER ---
server.listen(4002, () => {
    console.log('Server running on http://10.5.1.83:4002');
});
