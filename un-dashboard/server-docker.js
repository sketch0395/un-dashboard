const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const socketIo = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    },
});

app.use(cors());

// --- DOCKER MANAGEMENT API ---
app.get('/api/containers', (req, res) => {
    exec('docker ps -a --format "{{json .}}" --no-trunc', (error, stdout, stderr) => {
        if (error || stderr) {
            console.error('Docker Error:', stderr || error.message);
            return res.status(500).json({ error: stderr || error.message });
        }

        if (!stdout.trim()) return res.json([]);

        const containers = stdout.trim().split('\n').map((line) => {
            try {
                const container = JSON.parse(line);
                const portMatch = container.Ports?.match(/0.0.0.0:(\d+)->/);
                container.PublishedPort = portMatch ? portMatch[1] : null;
                return container;
            } catch (e) {
                console.error('JSON Parse Error:', e.message, 'Line:', line);
                return null;
            }
        }).filter(Boolean);

        res.json(containers);
    });
});

// --- SOCKET.IO ---
let lastFetched = Date.now();
const SOCKET_UPDATE_INTERVAL = 10000;

io.on('connection', (socket) => {
    console.log('A user connected');
    let fetchContainersInterval;

    // Emit Docker container list every 10 seconds
    const fetchContainers = () => {
        if (Date.now() - lastFetched < SOCKET_UPDATE_INTERVAL) return;
        lastFetched = Date.now();

        exec('docker ps -a --format "{{json .}}" --no-trunc', (error, stdout, stderr) => {
            if (error || stderr) {
                console.error('Docker Error:', stderr || error.message);
                socket.emit('error', stderr || error.message);
                return;
            }

            if (!stdout.trim()) {
                socket.emit('containers', []);
                return;
            }

            const containers = stdout.trim().split('\n').map((line) => {
                try {
                    const container = JSON.parse(line);
                    const portMatch = container.Ports?.match(/0.0.0.0:(\d+)->/);
                    container.PublishedPort = portMatch ? portMatch[1] : null;
                    return container;
                } catch (e) {
                    console.error('JSON Parse Error:', e.message, 'Line:', line);
                    return null;
                }
            }).filter(Boolean);

            socket.emit('containers', containers);
        });
    };

    fetchContainers(); // On connect
    fetchContainersInterval = setInterval(fetchContainers, SOCKET_UPDATE_INTERVAL);

    // Handle Docker container actions (start, stop, restart)
    socket.on('containerAction', (data) => {
        const { action, containerID } = data;
        let command;

        switch (action) {
            case 'start':
                command = `docker start ${containerID}`;
                break;
            case 'stop':
                command = `docker stop ${containerID}`;
                break;
            case 'restart':
                command = `docker restart ${containerID}`;
                break;
            default:
                return;
        }

        exec(command, (error, stdout, stderr) => {
            if (error || stderr) {
                console.error('Docker Error:', stderr || error.message);
                socket.emit('error', stderr || error.message);
                return;
            }

            console.log(`Docker ${action} executed successfully`);
            fetchContainers();  // Refresh the container list
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        clearInterval(fetchContainersInterval);
    });
});

// --- START SERVER ---
server.listen(4002, () => {
    console.log('Server running on http://localhost:4002');
});
