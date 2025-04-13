const express = require('express');
const { spawn, execSync } = require('child_process'); // Add execSync for checking nmap availability
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

    // Group devices by vendor
    const groupedDevices = devices.reduce((acc, device) => {
        const vendor = device.vendor || 'Unknown';
        if (!acc[vendor]) acc[vendor] = [];
        acc[vendor].push(device);
        return acc;
    }, {});

    return groupedDevices;
};

const isValidIpRange = (range) => {
    const ipRangeRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(-\d{1,3})?$/;
    return ipRangeRegex.test(range);
};

const DEFAULT_IP_RANGE = process.env.DEFAULT_IP_RANGE || '10.5.1.130-255';
const DEFAULT_PORTS = process.env.DEFAULT_PORTS || '22,80,443';

// Check if nmap is available on the host
const isNmapAvailable = () => {
    try {
        execSync('nmap -v', { stdio: 'ignore' }); // Check if nmap command runs without error
        return true;
    } catch (error) {
        return false;
    }
};

// Check if Docker is available
const isDockerAvailable = () => {
    try {
        execSync('docker -v', { stdio: 'ignore' }); // Check if Docker command runs without error
        return true;
    } catch (error) {
        return false;
    }
};

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('startNetworkScan', (data) => {
        const { range, useDocker } = data;

        if (!range) {
            socket.emit('networkScanStatus', { status: 'IP range is required' });
            return;
        }

        if (!isValidIpRange(range)) {
            socket.emit('networkScanStatus', { status: 'Invalid IP range' });
            return;
        }

        if (useDocker) {
            if (!isDockerAvailable()) {
                socket.emit('networkScanStatus', { status: 'Error: Docker is not installed on the host system.' });
                console.error('Error: Docker is not installed on the host system.');
                return;
            }

            console.log(`[SCAN] Starting Nmap scan using Docker for range: ${range}...`);
            const nmapProcess = spawn('docker', [
                'run', '--rm', '--network=host', 'instrumentisto/nmap',
                '-Pn', '-sS', '-O', '-p', DEFAULT_PORTS, range
            ]);

            handleNmapProcess(nmapProcess, socket);
        } else {
            if (!isNmapAvailable()) {
                socket.emit('networkScanStatus', { status: 'Error: Nmap is not installed on the host system.' });
                console.error('Error: Nmap is not installed on the host system.');
                return;
            }

            console.log(`[SCAN] Starting Nmap scan on host for range: ${range}...`);
            const nmapProcess = spawn('nmap', [
                '-Pn', '-sS', '-O', '-p', DEFAULT_PORTS, range
            ]);

            handleNmapProcess(nmapProcess, socket);
        }
    });

    const handleNmapProcess = (nmapProcess, socket) => {
        let outputData = '';

        socket.emit('networkScanStatus', { status: 'Scanning network...' });

        nmapProcess.stdout.on('data', (data) => {
            outputData += data;
            socket.emit('networkScanStatus', { status: 'Scan in progress...', output: data.toString() });
        });

        nmapProcess.stderr.on('data', (data) => {
            console.error('[SCAN] STDERR:', data.toString());
            socket.emit('networkScanStatus', { status: 'Error during scan...', error: data.toString() });
        });

        nmapProcess.on('close', (code) => {
            if (code === 0) {
                socket.emit('networkScanStatus', { status: 'Scan complete' });

                const groupedDevices = parseNmapOutput(outputData);
                console.log('Grouped Devices:', groupedDevices);
                socket.emit('networkData', groupedDevices);
            } else {
                socket.emit('networkScanStatus', { status: 'Scan failed', errorCode: code });
            }
        });

        socket.on('disconnect', () => {
            console.log('[SCAN] User disconnected, terminating scan...');
            nmapProcess.kill();
        });
    };

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// --- START SERVER ---
server.listen(4000, () => {
    console.log('Server running on http://localhost:4000');
});