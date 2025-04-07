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

    // --- NETWORK MAPPING VIA NMAP ---
    const parseNmapOutput = (output) => {
        const lines = output.split('\n');
        const devices = [];
        let currentDevice = {};

        lines.forEach((line) => {
            if (line.includes('Nmap scan report for')) {
                if (Object.keys(currentDevice).length) {
                    devices.push(currentDevice);
                }
                currentDevice = { ip: line.split('Nmap scan report for ')[1].trim() };
            } else if (line.includes('MAC Address:')) {
                const parts = line.split('MAC Address: ')[1].split(' ');
                currentDevice.mac = parts[0];
                currentDevice.vendor = parts.slice(1).join(' ').trim();
            } else if (line.includes('Host is up')) {
                currentDevice.status = 'up';
            } else if (line.match(/^\d+\/tcp/)) {
                if (!currentDevice.ports) currentDevice.ports = [];
                currentDevice.ports.push(line.trim());
            }
        });

        if (Object.keys(currentDevice).length) {
            devices.push(currentDevice);
        }

        return devices;
    };

    socket.on('startNetworkScan', (data) => {
        const ipRange = data.range || '10.5.1.130-255';
        const nmapCommand = `docker run --rm --cap-add=NET_RAW --cap-add=NET_ADMIN --network=host parrotsec/nmap nmap -sV -T4 -F ${ipRange}`;

        console.log('[SCAN] Starting Nmap scan...');

        const nmapProcess = exec(nmapCommand);

        socket.emit('networkScanStatus', { status: 'Scanning network...' });

        let outputData = '';

        nmapProcess.stdout.on('data', (data) => {
            outputData += data;
            socket.emit('networkScanStatus', { status: 'Scan in progress...', output: data });
        });

        nmapProcess.stderr.on('data', (data) => {
            console.error('[SCAN] STDERR:', data);
            socket.emit('networkScanStatus', { status: 'Error during scan...', error: data });
        });

        nmapProcess.on('close', (code) => {
            if (code === 0) {
                socket.emit('networkScanStatus', { status: 'Scan complete' });

                const devices = parseNmapOutput(outputData);
                console.log('Devices:', devices);
                socket.emit('networkData', devices);
            } else {
                socket.emit('networkScanStatus', { status: 'Scan failed', errorCode: code });
            }
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        clearInterval(fetchContainersInterval);
    });
});

// --- START SERVER ---
server.listen(4000, () => {
    console.log('Server running on http://localhost:4000');
});
