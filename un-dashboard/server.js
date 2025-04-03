const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const socketIo = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());

// Serve API to fetch Docker containers
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

                // Extract the host port dynamically (ephemeral port)
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

// Start/Stop/Restart Docker containers
app.post('/api/containers/:id/:action', (req, res) => {
    const { id, action } = req.params;

    // Validate action
    const validActions = ['start', 'stop', 'restart'];
    if (!validActions.includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
    }

    exec(`docker container ${action} ${id}`, (error, stdout, stderr) => {
        if (error || stderr) {
            console.error(`${action} Error:`, stderr || error.message);
            return res.status(500).json({ error: stderr || error.message });
        }
        res.json({ message: `${action.charAt(0).toUpperCase() + action.slice(1)}ed successfully` });
    });
});

// Socket.IO for real-time updates
let lastFetched = Date.now();
const SOCKET_UPDATE_INTERVAL = 10000; // 10 seconds (adjust as needed)

io.on('connection', (socket) => {
    console.log('A user connected');
    let fetchContainersInterval;

    const fetchContainers = () => {
        // Avoid excessive updates
        const currentTime = Date.now();
        if (currentTime - lastFetched < SOCKET_UPDATE_INTERVAL) {
            return; // Skip update if it's too soon
        }
        
        lastFetched = currentTime; // Update last fetched time
        
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

                    // Extract the host port dynamically (ephemeral port)
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

    fetchContainers(); // Initial fetch on connect

    fetchContainersInterval = setInterval(fetchContainers, SOCKET_UPDATE_INTERVAL);

    socket.on('disconnect', () => {
        console.log('User disconnected');
        clearInterval(fetchContainersInterval);
    });
});

// Start the server
server.listen(4000, () => {
    console.log('Server running on http://localhost:4000');
});
