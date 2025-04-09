const express = require('express');
const { spawn } = require('child_process');
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

    return devices;
};

const isValidIpRange = (range) => {
    const ipRangeRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(-\d{1,3})?$/;
    return ipRangeRegex.test(range);
};

const DEFAULT_IP_RANGE = process.env.DEFAULT_IP_RANGE || '10.5.1.130-255';
const DEFAULT_PORTS = process.env.DEFAULT_PORTS || '22,80,443';

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('startNetworkScan', (data) => {
        const ipRange = data.range;

        if (!ipRange) {
            socket.emit('networkScanStatus', { status: 'IP range is required' });
            return;
        }

        if (!isValidIpRange(ipRange)) {
            socket.emit('networkScanStatus', { status: 'Invalid IP range' });
            return;
        }

        const nmapProcess = spawn('docker', [
            'run', '--rm', '--cap-add=NET_RAW', '--cap-add=NET_ADMIN', '--network=host',
            'parrotsec/nmap', 'nmap', '-Pn', '-sS', '-O', '-p', DEFAULT_PORTS, '--min-rtt-timeout', '100ms', '--max-rtt-timeout', '1s', ipRange
        ]);

        console.log(`[SCAN] Starting Nmap scan for range: ${ipRange}...`);

        socket.emit('networkScanStatus', { status: 'Scanning network...' });

        let outputData = '';

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

                const devices = parseNmapOutput(outputData);
                console.log('Devices:', devices);
                socket.emit('networkData', devices);
            } else {
                socket.emit('networkScanStatus', { status: 'Scan failed', errorCode: code });
            }
        });

        socket.on('disconnect', () => {
            console.log('[SCAN] User disconnected, terminating scan...');
            nmapProcess.kill();
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// --- START SERVER ---
server.listen(4000, () => {
    console.log('Server running on http://localhost:4000');
});