const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const socketIo = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:3000', // Allow only your frontend to access the server
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true, // Allow cookies if necessary
    },
});

// CORS configuration for regular HTTP requests
const corsOptions = {
    origin: 'http://localhost:3000', // Allow only your frontend to access the server
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true, // Allow cookies if necessary
};

// Middleware for HTTP CORS
app.use(cors(corsOptions));

// Docker API to fetch containers
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

// WebSocket connection for network scan updates (using `nmap` command with status)
let networkData = [];

io.on('connection', (socket) => {
    console.log('A user connected');
    
    // Start network scan when client emits 'startNetworkScan'
    socket.on('startNetworkScan', () => {
        fetchNetworkScan(socket);
    });

    // Emit network scan status during scan
    const fetchNetworkScan = (socket) => {
        const nmapCommand = 'nmap --unprivileged -sC -T4 -p- -vv -e eth2 10.5.1.1-255'; // Change the IP range as needed
        const nmapProcess = exec(nmapCommand);

        // Emit status updates to clients during scan
        socket.emit('networkScanStatus', { status: 'Scanning network...', progress: '0%' });

        let outputData = '';

        nmapProcess.stdout.on('data', (data) => {
            outputData += data;

            // Check for progress or status output from Nmap
            if (outputData.includes('Nmap scan report for')) {
                socket.emit('networkScanStatus', { status: 'Scan in progress...', output: outputData });
            }
        });

        nmapProcess.stderr.on('data', (data) => {
            socket.emit('networkScanStatus', { status: 'Error during scan...', error: data });
        });

        nmapProcess.on('close', (code) => {
            if (code === 0) {
                socket.emit('networkScanStatus', { status: 'Scan complete' });

                // Parse Nmap output to extract devices and emit network data
                const devices = parseNmapOutput(outputData); // Customize this function as needed
                networkData = devices;
                socket.emit('networkData', networkData);
            } else {
                socket.emit('networkScanStatus', { status: 'Scan failed', errorCode: code });
            }
        });
    };

    // Parse Nmap output to extract relevant information (customize as needed)
    const parseNmapOutput = (output) => {
        const lines = output.split('\n');
        const devices = [];

        lines.forEach(line => {
            if (line.includes('Nmap scan report for')) {
                const ip = line.split(' ')[4];  // Extract IP address
                devices.push({ ip });
            }
        });

        return devices;
    };

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start the server
server.listen(5001, () => {
    console.log('Server running on http://localhost:5001');
});
