require('dotenv').config();

const express = require('express');
const { spawn, execSync } = require('child_process');
const cors = require('cors');
const socketIo = require('socket.io');
const http = require('http');
const Docker = require('dockerode');

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

if (!process.env.DEFAULT_IP_RANGE || !process.env.DEFAULT_PORTS) {
    console.error('[ERROR] Missing required environment variables: DEFAULT_IP_RANGE or DEFAULT_PORTS');
    process.exit(1);
}

const isValidIpRange = (range) => {
    const ipRangeRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(-\d{1,3})?$/;
    const parts = range.split('-');
    if (!ipRangeRegex.test(range)) return false;

    // Ensure each octet is within 0-255
    const isValidOctet = (ip) => ip.split('.').every((octet) => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
    });

    return parts.every(isValidOctet);
};

const DEFAULT_IP_RANGE = process.env.DEFAULT_IP_RANGE || '10.5.1.130-255';
const DEFAULT_PORTS = process.env.DEFAULT_PORTS || '22,80,443';

if (!isValidIpRange(DEFAULT_IP_RANGE)) {
    console.error('[ERROR] Invalid DEFAULT_IP_RANGE environment variable');
    process.exit(1);
}

const isValidPortList = (ports) => {
    return ports.split(',').every((port) => {
        const num = parseInt(port, 10);
        return num > 0 && num <= 65535;
    });
};

if (!isValidPortList(DEFAULT_PORTS)) {
    console.error('[ERROR] Invalid DEFAULT_PORTS environment variable');
    process.exit(1);
}

// --- NETWORK MAPPING VIA NMAP ---
const parseNmapOutput = (output) => {
    console.log('[PARSE] Raw Nmap Output:', output); // Debugging log

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

    // Group devices by vendor
    const groupedDevices = devices.reduce((acc, device) => {
        const vendor = device.vendor || 'Unknown';
        if (!acc[vendor]) acc[vendor] = [];
        acc[vendor].push(device);
        return acc;
    }, {});

    console.log('[PARSE] Grouped Devices:', groupedDevices); // Debugging log
    return groupedDevices;
};

const docker = new Docker({ host: '10.5.1.212', port: 2375 });

const handleDockerScan = async (range, socket) => {
    try {
        const sanitizedRange = sanitizeInput(range);
        console.log(`[SCAN] Starting Docker-based scan for range: ${sanitizedRange}`);
        const container = await docker.createContainer({
            Image: 'instrumentisto/nmap',
            Cmd: ['-Pn', '-sS', '-O', '-p', DEFAULT_PORTS, sanitizedRange],
            HostConfig: {
                NetworkMode: 'host',
            },
        });

        await container.start();

        let outputData = '';
        const stream = await container.logs({
            follow: true,
            stdout: true,
            stderr: true,
        });

        stream.on('data', (chunk) => {
            const data = chunk.toString();
            outputData += data;
            socket.emit('networkScanStatus', { status: 'Scan in progress...', output: data });
        });

        stream.on('end', async () => {
            await container.remove();
            if (!outputData.trim()) {
                throw new Error('No output from Docker-based scan');
            }
            const groupedDevices = parseNmapOutput(outputData);
            socket.emit('networkData', groupedDevices);
            socket.emit('networkScanStatus', { status: 'Scan complete' });
        });
    } catch (error) {
        console.error('[ERROR] Docker-based scan:', error.message);
        socket.emit('networkScanStatus', { status: 'Error during Docker-based scan', error: error.message });
    }
};

const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    return input.replace(/[^a-zA-Z0-9\-.,]/g, ''); // Allow only alphanumeric, dash, dot, and comma
};

const isNmapAvailable = () => {
    try {
        // Use execSync to check if the `nmap` command is available
        execSync('nmap -v', { stdio: 'ignore' });
        return true;
    } catch (error) {
        return false;
    }
};

const handleNmapProcess = (nmapProcess, socket) => {
    let outputData = '';

    // Capture stdout data
    nmapProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        outputData += chunk;
        socket.emit('networkScanStatus', { status: 'Scan in progress...', output: chunk });
    });

    // Capture stderr data (errors from nmap)
    nmapProcess.stderr.on('data', (data) => {
        const errorMessage = data.toString();
        console.error('[ERROR] Nmap stderr:', errorMessage);
        socket.emit('networkScanStatus', { status: 'Error', error: `Nmap error: ${errorMessage}` });
    });

    // Handle process exit
    nmapProcess.on('close', (code) => {
        if (code === 0) {
            console.log('[SCAN] Nmap process completed successfully');
            const groupedDevices = parseNmapOutput(outputData);
            socket.emit('networkData', groupedDevices);
            socket.emit('networkScanStatus', { status: 'Scan complete' });
        } else {
            const errorDetails = `Nmap exited with code ${code}`;
            console.error(`[ERROR] ${errorDetails}`);
            socket.emit('networkScanStatus', { status: 'Error', error: errorDetails });
        }
    });
};

const handleHostScan = (range, socket) => {
    try {
        const sanitizedRange = sanitizeInput(range);
        console.log(`[SCAN] Starting host-based scan for range: ${sanitizedRange}`);
        const nmapProcess = spawn('nmap', ['-Pn', '-sS', '-O', '-p', DEFAULT_PORTS, sanitizedRange]);

        handleNmapProcess(nmapProcess, socket);
    } catch (error) {
        console.error('[ERROR] Host-based scan:', error.message);
        socket.emit('networkScanStatus', { status: 'Error during host-based scan', error: error.message });
    }
};

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('startNetworkScan', async (data) => {
        try {
            const { range, useDocker } = data;

            if (!range) {
                throw new Error('IP range is required');
            }

            if (!isValidIpRange(range)) {
                throw new Error('Invalid IP range format');
            }

            if (useDocker) {
                await handleDockerScan(range, socket);
            } else {
                if (!isNmapAvailable()) {
                    throw new Error('Nmap is not installed on the host system');
                }
                handleHostScan(range, socket);
            }
        } catch (error) {
            console.error('[ERROR] startNetworkScan:', error.message);
            socket.emit('networkScanStatus', { status: 'Error', error: error.message });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Error-handling middleware
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
        },
    });
});

// --- START SERVER ---
server.listen(4000, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:4000');
});