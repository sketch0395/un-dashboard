require('dotenv').config();

const express = require('express');
const { spawn, execSync } = require('child_process');
const cors = require('cors');
const socketIo = require('socket.io');
const http = require('http');
const Docker = require('dockerode');
const SSH2 = require('ssh2');

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

// --- NETWORK PERFORMANCE MONITORING ---
const ping = require('ping');
const { exec } = require('child_process');
const os = require('os');

// Store historical performance data
const performanceHistory = {
    latency: {},    // IP -> array of {timestamp, value} objects
    bandwidth: {},  // IP -> array of {timestamp, upload, download} objects
    uptime: {}      // IP -> array of {timestamp, status} objects
};

// Maximum history items per device
const MAX_HISTORY_ITEMS = 100;

// Function to measure latency (ping) to a specific IP
const measureLatency = async (ip) => {
    try {
        const res = await ping.promise.probe(ip, {
            timeout: 2,
            extra: ['-c', '3'],
        });
        
        const timestamp = new Date().toISOString();
        const avgTime = parseFloat(res.avg) || null;
        const packetLoss = parseFloat(res.packetLoss) || 0;
        
        // Store historical data
        if (!performanceHistory.latency[ip]) {
            performanceHistory.latency[ip] = [];
        }
        
        performanceHistory.latency[ip].push({
            timestamp,
            value: avgTime,
            packetLoss
        });
        
        // Trim to max length
        if (performanceHistory.latency[ip].length > MAX_HISTORY_ITEMS) {
            performanceHistory.latency[ip] = performanceHistory.latency[ip].slice(-MAX_HISTORY_ITEMS);
        }
        
        return {
            ip,
            timestamp,
            latency: avgTime,
            packetLoss,
            alive: res.alive
        };
    } catch (error) {
        console.error(`[ERROR] Latency measurement for ${ip}:`, error.message);
        return {
            ip,
            timestamp: new Date().toISOString(),
            latency: null,
            packetLoss: 100,
            alive: false,
            error: error.message
        };
    }
};

// Function to measure bandwidth usage using iperf3 (if available)
const measureBandwidth = (ip) => {
    return new Promise((resolve) => {
        // Check if device has iperf3 server running on port 5201
        const timestamp = new Date().toISOString();
        
        // For demo purposes, generate simulated bandwidth data
        // In a real implementation, you would use iperf3 or similar tool
        const download = Math.random() * 100; // Simulated Mbps
        const upload = Math.random() * 20;    // Simulated Mbps
        
        // Store historical data
        if (!performanceHistory.bandwidth[ip]) {
            performanceHistory.bandwidth[ip] = [];
        }
        
        performanceHistory.bandwidth[ip].push({
            timestamp,
            download,
            upload
        });
        
        // Trim to max length
        if (performanceHistory.bandwidth[ip].length > MAX_HISTORY_ITEMS) {
            performanceHistory.bandwidth[ip] = performanceHistory.bandwidth[ip].slice(-MAX_HISTORY_ITEMS);
        }
        
        resolve({
            ip,
            timestamp,
            download,
            upload
        });
    });
};

// Function to check uptime/availability of a device
const checkUptime = async (ip) => {
    try {
        const res = await ping.promise.probe(ip, {
            timeout: 1,
            extra: ['-c', '1'],
        });
        
        const timestamp = new Date().toISOString();
        const status = res.alive ? 'up' : 'down';
        
        // Store historical data
        if (!performanceHistory.uptime[ip]) {
            performanceHistory.uptime[ip] = [];
        }
        
        performanceHistory.uptime[ip].push({
            timestamp,
            status
        });
        
        // Calculate uptime percentage based on historical data
        const uptimePercentage = calculateUptimePercentage(ip);
        
        // Trim to max length
        if (performanceHistory.uptime[ip].length > MAX_HISTORY_ITEMS) {
            performanceHistory.uptime[ip] = performanceHistory.uptime[ip].slice(-MAX_HISTORY_ITEMS);
        }
        
        return {
            ip,
            timestamp,
            status,
            uptimePercentage
        };
    } catch (error) {
        console.error(`[ERROR] Uptime check for ${ip}:`, error.message);
        return {
            ip,
            timestamp: new Date().toISOString(),
            status: 'unknown',
            uptimePercentage: null,
            error: error.message
        };
    }
};

// Calculate uptime percentage based on historical data
const calculateUptimePercentage = (ip) => {
    if (!performanceHistory.uptime[ip] || performanceHistory.uptime[ip].length === 0) {
        return null;
    }
    
    const totalChecks = performanceHistory.uptime[ip].length;
    const upChecks = performanceHistory.uptime[ip].filter(item => item.status === 'up').length;
    
    return (upChecks / totalChecks) * 100;
};

// Function to run performance metrics check for multiple IPs
const runPerformanceCheck = async (ips) => {
    const results = {
        timestamp: new Date().toISOString(),
        latency: [],
        bandwidth: [],
        uptime: []
    };
    
    // Measure latency for all IPs
    for (const ip of ips) {
        const latencyResult = await measureLatency(ip);
        results.latency.push(latencyResult);
        
        // Only check bandwidth and uptime if device is alive
        if (latencyResult.alive) {
            const bandwidthResult = await measureBandwidth(ip);
            results.bandwidth.push(bandwidthResult);
            
            const uptimeResult = await checkUptime(ip);
            results.uptime.push(uptimeResult);
        } else {
            // If device is down, add default entries
            results.bandwidth.push({
                ip,
                timestamp: latencyResult.timestamp,
                download: null,
                upload: null
            });
            
            results.uptime.push({
                ip,
                timestamp: latencyResult.timestamp,
                status: 'down',
                uptimePercentage: calculateUptimePercentage(ip)
            });
        }
    }
    
    return results;
};

// Function to get historical performance data for a specific IP
const getHistoricalPerformance = (ip) => {
    return {
        ip,
        latency: performanceHistory.latency[ip] || [],
        bandwidth: performanceHistory.bandwidth[ip] || [],
        uptime: performanceHistory.uptime[ip] || []
    };
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

    socket.on('sshConnect', (data) => {
        const { ip, username, password } = data;
        console.log(`Attempting SSH connection to ${username}@${ip}`);
        
        const conn = new SSH2.Client();
        
        conn.on('ready', () => {
            socket.emit('sshData', 'Connected to SSH server\r\n');
            
            conn.shell((err, stream) => {
                if (err) {
                    socket.emit('sshData', `\r\nSSH Error: ${err.message}\r\n`);
                    socket.emit('sshClose');
                    return;
                }

                stream.on('data', (data) => {
                    socket.emit('sshData', data.toString('utf-8'));
                });

                stream.stderr.on('data', (data) => {
                    socket.emit('sshData', data.toString('utf-8'));
                });

                stream.on('close', () => {
                    conn.end();
                    socket.emit('sshClose');
                });

                socket.on('sshData', (data) => {
                    stream.write(data);
                });

                socket.on('disconnect', () => {
                    conn.end();
                });
            });
        });

        conn.on('error', (err) => {
            socket.emit('sshData', `\r\nConnection error: ${err.message}\r\n`);
            socket.emit('sshClose');
        });

        conn.connect({
            host: ip,
            port: 22,
            username: username,
            password: password,
            readyTimeout: 5000,
            keepaliveInterval: 5000
        });
    });

    socket.on('startNetworkPerformanceCheck', async (data) => {
        try {
            const { ips } = data;
            
            if (!ips || !Array.isArray(ips) || ips.length === 0) {
                throw new Error('At least one IP address is required');
            }
            
            // Validate all IP addresses
            for (const ip of ips) {
                if (!ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
                    throw new Error(`Invalid IP address format: ${ip}`);
                }
            }
            
            socket.emit('networkPerformanceStatus', { status: 'Starting performance check...' });
            
            const results = await runPerformanceCheck(ips);
            
            socket.emit('networkPerformanceData', results);
            socket.emit('networkPerformanceStatus', { status: 'Performance check complete' });
            
        } catch (error) {
            console.error('[ERROR] Network performance check:', error.message);
            socket.emit('networkPerformanceStatus', { status: 'Error', error: error.message });
        }
    });
    
    socket.on('getHistoricalPerformance', (data) => {
        try {
            const { ip } = data;
            
            if (!ip || typeof ip !== 'string') {
                throw new Error('IP address is required');
            }
            
            if (!ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
                throw new Error(`Invalid IP address format: ${ip}`);
            }
            
            const historicalData = getHistoricalPerformance(ip);
            socket.emit('historicalPerformanceData', historicalData);
            
        } catch (error) {
            console.error('[ERROR] Historical performance data:', error.message);
            socket.emit('networkPerformanceStatus', { status: 'Error', error: error.message });
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