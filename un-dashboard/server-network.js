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

// Change from const to let so we can reassign it later
let docker = new Docker({ host: '10.5.1.212', port: 2375 });

const handleDockerScan = async (range, socket) => {
    try {
        const sanitizedRange = sanitizeInput(range);
        console.log(`[SCAN] Starting Docker-based scan for range: ${sanitizedRange}`);
        
        // We need to use the instrumentisto/nmap container specifically for nmap operations
        // instead of the jonlabelle/network-tools persistent container
        socket.emit('networkScanStatus', { 
            status: 'Scan in progress...', 
            output: `Starting network scan for range: ${sanitizedRange}` 
        });
        
        // Create a dedicated instrumentisto/nmap container for this scan
        const container = await docker.createContainer({
            Image: 'instrumentisto/nmap',
            Cmd: ['-Pn', '-sS', '-O', '-p', DEFAULT_PORTS, sanitizedRange],
            HostConfig: {
                NetworkMode: 'host',
            },
        });

        await container.start();
        socket.emit('networkScanStatus', { status: 'Container started, scanning network...', output: `Scanning ${sanitizedRange}...` });

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
            try {
                await container.remove();
                
                if (!outputData.trim()) {
                    throw new Error('No output from Docker-based scan');
                }
                
                // Send progress update
                socket.emit('networkScanStatus', { 
                    status: 'Processing results...', 
                    output: 'Scan complete, analyzing results...' 
                });
                
                // Parse the scan results
                const groupedDevices = parseNmapOutput(outputData);
                
                // Send results to client
                socket.emit('networkData', groupedDevices);
                socket.emit('networkScanStatus', { status: 'Scan complete' });
            } catch (error) {
                console.error('[ERROR] Processing scan results:', error.message);
                socket.emit('networkScanStatus', { status: 'Error', error: error.message });
            }
        });
        
        // Add error handler for stream
        stream.on('error', (error) => {
            console.error('[ERROR] Stream error:', error.message);
            socket.emit('networkScanStatus', { status: 'Error', error: `Stream error: ${error.message}` });
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
    uptime: {},     // IP -> array of {timestamp, status} objects
    quality: {},    // IP -> array of {timestamp, quality} objects
    pathAnalysis: {} // IP -> array of {timestamp, path} objects
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
const runPerformanceCheck = async (ips, dockerConfig = {}, socket) => {
    const results = {
        timestamp: new Date().toISOString(),
        latency: [],
        bandwidth: [],
        uptime: [],
        quality: [],        // New metric
        pathAnalysis: []    // New metric
    };
    
    // Set Docker configuration if provided
    if (dockerConfig.dockerHost) {
        console.log(`[INFO] Setting Docker host to: ${dockerConfig.dockerHost}`);
        // Update Docker client with new host if provided
        docker = new Docker({ host: dockerConfig.dockerHost, port: 2375 });
    }
    
    // Total IPs to check
    const totalIps = ips.length;
    let completedIps = 0;
    
    // Measure performance for all IPs
    for (const ip of ips) {
        try {
            console.log(`[PERF] Starting enhanced performance check for IP: ${ip}`);
            if (socket) {
                socket.emit('networkPerformanceStatus', { 
                    status: `Checking ${ip}... (${completedIps}/${totalIps} complete)`,
                    ip,
                    progress: completedIps / totalIps * 100
                });
            }
            
            // Use Docker or host-based checking based on configuration
            const latencyResult = await checkLatency(ip);
            const timestamp = new Date().toISOString();
            
            // Format the result
            const formattedLatencyResult = {
                ip,
                timestamp,
                latency: latencyResult.latency,
                packetLoss: latencyResult.packetLoss,
                alive: latencyResult.alive
            };
            
            results.latency.push(formattedLatencyResult);
            
            // Store historical data
            if (!performanceHistory.latency[ip]) {
                performanceHistory.latency[ip] = [];
            }
            
            performanceHistory.latency[ip].push({
                timestamp,
                value: latencyResult.latency,
                packetLoss: latencyResult.packetLoss
            });
            
            // Trim to max length
            if (performanceHistory.latency[ip].length > MAX_HISTORY_ITEMS) {
                performanceHistory.latency[ip] = performanceHistory.latency[ip].slice(-MAX_HISTORY_ITEMS);
            }
            
            // Only check bandwidth, uptime, and other metrics if device is alive
            if (latencyResult.alive) {
                // Check bandwidth
                const bandwidthResult = await checkBandwidth(ip);
                const formattedBandwidthResult = {
                    ip,
                    timestamp,
                    download: bandwidthResult.download,
                    upload: bandwidthResult.upload,
                    source: bandwidthResult.source || 'unknown'
                };
                
                results.bandwidth.push(formattedBandwidthResult);
                
                // Store historical bandwidth data
                if (!performanceHistory.bandwidth[ip]) {
                    performanceHistory.bandwidth[ip] = [];
                }
                
                performanceHistory.bandwidth[ip].push({
                    timestamp,
                    download: bandwidthResult.download,
                    upload: bandwidthResult.upload,
                    source: bandwidthResult.source || 'unknown'
                });
                
                // Trim to max length
                if (performanceHistory.bandwidth[ip].length > MAX_HISTORY_ITEMS) {
                    performanceHistory.bandwidth[ip] = performanceHistory.bandwidth[ip].slice(-MAX_HISTORY_ITEMS);
                }
                
                // Check if device is up
                const isUp = await checkConnectivity(ip);
                const status = isUp ? 'up' : 'down';
                
                // Calculate uptime percentage
                if (!performanceHistory.uptime[ip]) {
                    performanceHistory.uptime[ip] = [];
                }
                
                performanceHistory.uptime[ip].push({
                    timestamp,
                    status
                });
                
                const uptimePercentage = calculateUptimePercentage(ip);
                
                // Trim to max length
                if (performanceHistory.uptime[ip].length > MAX_HISTORY_ITEMS) {
                    performanceHistory.uptime[ip] = performanceHistory.uptime[ip].slice(-MAX_HISTORY_ITEMS);
                }
                
                const formattedUptimeResult = {
                    ip,
                    timestamp,
                    status,
                    uptimePercentage
                };
                
                results.uptime.push(formattedUptimeResult);
                
                // NEW: Add connection quality metrics
                try {
                    const qualityResult = await measureConnectionQuality(ip);
                    results.quality.push(qualityResult);
                    
                    // Store historical quality data
                    if (!performanceHistory.quality) {
                        performanceHistory.quality = {};
                    }
                    if (!performanceHistory.quality[ip]) {
                        performanceHistory.quality[ip] = [];
                    }
                    
                    performanceHistory.quality[ip].push({
                        timestamp,
                        packetLoss: qualityResult.packetLoss,
                        jitter: qualityResult.jitter,
                        avgLatency: qualityResult.avgLatency,
                        quality: qualityResult.quality
                    });
                    
                    // Trim to max length
                    if (performanceHistory.quality[ip].length > MAX_HISTORY_ITEMS) {
                        performanceHistory.quality[ip] = performanceHistory.quality[ip].slice(-MAX_HISTORY_ITEMS);
                    }
                } catch (qualityError) {
                    console.error(`[ERROR] Quality check for ${ip} failed:`, qualityError.message);
                }
                
                // NEW: Run network path analysis (less frequently - resource intensive)
                // Only run for approximately 30% of checks to reduce load
                if (Math.random() < 0.3) {
                    try {
                        const pathResult = await runNetworkPathAnalysis(ip);
                        results.pathAnalysis.push(pathResult);
                        
                        // Store historical path analysis data
                        if (!performanceHistory.pathAnalysis) {
                            performanceHistory.pathAnalysis = {};
                        }
                        if (!performanceHistory.pathAnalysis[ip]) {
                            performanceHistory.pathAnalysis[ip] = [];
                        }
                        
                        performanceHistory.pathAnalysis[ip].push({
                            timestamp,
                            hopCount: pathResult.hopCount,
                            hasIssues: pathResult.hasIssues,
                            bottlenecks: pathResult.bottlenecks
                        });
                        
                        // Trim to max length - store fewer path analyses as they're larger
                        if (performanceHistory.pathAnalysis[ip].length > MAX_HISTORY_ITEMS / 2) {
                            performanceHistory.pathAnalysis[ip] = performanceHistory.pathAnalysis[ip].slice(-(MAX_HISTORY_ITEMS / 2));
                        }
                    } catch (pathError) {
                        console.error(`[ERROR] Path analysis for ${ip} failed:`, pathError.message);
                    }
                }
            } else {
                // If device is down, add default entries
                results.bandwidth.push({
                    ip,
                    timestamp,
                    download: null,
                    upload: null
                });
                
                // Store historical uptime data for down status
                if (!performanceHistory.uptime[ip]) {
                    performanceHistory.uptime[ip] = [];
                }
                
                performanceHistory.uptime[ip].push({
                    timestamp,
                    status: 'down'
                });
                
                const uptimePercentage = calculateUptimePercentage(ip);
                
                // Trim to max length
                if (performanceHistory.uptime[ip].length > MAX_HISTORY_ITEMS) {
                    performanceHistory.uptime[ip] = performanceHistory.uptime[ip].slice(-MAX_HISTORY_ITEMS);
                }
                
                results.uptime.push({
                    ip,
                    timestamp,
                    status: 'down',
                    uptimePercentage
                });
                
                // Add empty quality data
                results.quality.push({
                    ip,
                    timestamp,
                    packetLoss: 100,
                    jitter: null,
                    avgLatency: null,
                    quality: 'unknown'
                });
            }
            
            // Send partial data update for this IP if socket is provided
            if (socket) {
                const ipResults = {
                    latency: results.latency.filter(item => item.ip === ip),
                    bandwidth: results.bandwidth.filter(item => item.ip === ip),
                    uptime: results.uptime.filter(item => item.ip === ip),
                    quality: results.quality.filter(item => item.ip === ip),
                    pathAnalysis: results.pathAnalysis.filter(item => item.ip === ip)
                };
                
                socket.emit('networkPerformancePartialUpdate', {
                    ip,
                    data: ipResults
                });
            }

            completedIps++;
            
            if (socket) {
                socket.emit('networkPerformanceStatus', { 
                    status: `${ip} check complete (${completedIps}/${totalIps})`,
                    ip,
                    complete: true,
                    progress: completedIps / totalIps * 100
                });
            }

            console.log(`[PERF] Completed enhanced performance check for IP: ${ip} (${completedIps}/${totalIps})`);
        } catch (error) {
            console.error(`[ERROR] Performance check for ${ip}:`, error.message);
            completedIps++;
            
            if (socket) {
                socket.emit('networkPerformanceStatus', { 
                    status: `Error checking ${ip} (${completedIps}/${totalIps})`,
                    ip,
                    error: error.message,
                    progress: completedIps / totalIps * 100
                });
            }
        }
    }
    
    console.log(`[PERF] Enhanced performance check completed with results:`, {
        latencyCount: results.latency.length,
        bandwidthCount: results.bandwidth.length,
        uptimeCount: results.uptime.length,
        qualityCount: results.quality.length,
        pathAnalysisCount: results.pathAnalysis.length
    });
    
    return results;
};

// Function to get historical performance data for a specific IP
const getHistoricalPerformance = (ip) => {
    return {
        ip,
        latency: performanceHistory.latency[ip] || [],
        bandwidth: performanceHistory.bandwidth[ip] || [],
        uptime: performanceHistory.uptime[ip] || [],
        quality: performanceHistory.quality?.[ip] || [],
        pathAnalysis: performanceHistory.pathAnalysis?.[ip] || []
    };
};

// Function to check if we should use Docker for network tools
const shouldUseDocker = () => {
    return process.env.USE_DOCKER_NETWORK_TOOLS === 'true';
};

// Function to run a command in a jonlabelle/network-tools container
const runNetworkToolsContainer = async (cmd, timeout = 30000) => {
    try {
        console.log(`[DOCKER] Running network-tools command: ${cmd}`);
        
        // Get OS platform to adjust container networking
        const platform = os.platform();
        console.log(`[INFO] Running on platform: ${platform}`);
        
        // Create container with appropriate network configuration for the platform
        // For Windows, we use bridge networking (default) instead of host networking
        const container = await docker.createContainer({
            Image: 'jonlabelle/network-tools',
            Cmd: ['sh', '-c', cmd],
            HostConfig: {
                // On Linux use host networking, otherwise use default bridge
                NetworkMode: platform === 'linux' ? 'host' : 'bridge',
            },
            // Add debug environment variable
            Env: ['DEBUG=true']
        });

        console.log(`[DOCKER] Starting container for command: ${cmd}`);
        await container.start();
        console.log(`[DOCKER] Container started successfully`);

        // Wait for the command to complete with a timeout
        const waitPromise = container.wait();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Network tools container timed out')), timeout)
        );
        
        const waitResult = await Promise.race([waitPromise, timeoutPromise]);
        console.log(`[DOCKER] Container execution completed with status: ${JSON.stringify(waitResult)}`);

        // Get container logs
        console.log(`[DOCKER] Retrieving container logs`);
        const stream = await container.logs({
            stdout: true,
            stderr: true,
        });

        // Clean up the container
        console.log(`[DOCKER] Removing container`);
        await container.remove();

        const output = stream.toString();
        console.log(`[DOCKER] Command output: ${output.substring(0, 200)}${output.length > 200 ? '...' : ''}`);
        
        // Check for errors in the output
        if (output.includes('Network is unreachable') || output.includes('unknown host')) {
            throw new Error(`Network unreachable or unknown host in command: ${cmd}`);
        }

        // Return the output as a string
        return output;
    } catch (error) {
        console.error(`[ERROR] Network tools container for command "${cmd}":`, error.message);
        throw error;
    }
};

// Function to measure latency using Docker container
const measureLatencyWithDocker = async (ip) => {
    try {
        // Use persistent container instead of creating a new one each time
        const output = await execInPersistentContainer(`ping -c 5 ${ip}`);
        const lines = output.split('\n');
        
        // Parse standard ping output
        const summaryLine = lines.find(line => line.includes('min/avg/max'));
        if (summaryLine) {
            const stats = summaryLine.split('=')[1].trim().split('/');
            const avgLatency = parseFloat(stats[1]);
            
            // Calculate packet loss from ping summary
            const packetLossLine = lines.find(line => line.includes('packet loss'));
            const packetLossMatch = packetLossLine ? packetLossLine.match(/(\d+)%\spacket\sloss/) : null;
            const packetLoss = packetLossMatch ? parseInt(packetLossMatch[1]) : 0;
            
            return { 
                latency: avgLatency, 
                alive: true,
                packetLoss 
            };
        }
        
        return { latency: null, alive: false, packetLoss: 100 };
    } catch (error) {
        console.error(`[ERROR] Docker latency check for ${ip}:`, error.message);
        return { latency: null, alive: false, packetLoss: 100 };
    }
};

// Function to measure bandwidth using Docker container with enhanced iperf3 options
const measureBandwidthWithDocker = async (ip) => {
    try {
        // Use the persistent container to run iperf3 test
        console.log(`[BANDWIDTH] Testing bandwidth using iperf3 server at 10.5.1.212:5201 for device ${ip}`);
        
        // First attempt to use iperf3 with the running server
        try {
            // Instead of testing TO the IP, we're measuring network characteristics FROM our Docker container
            // to the iperf3 server. This should work better since we know the server is responsive.
            
            // Run iperf3 client to measure download speed
            const downloadOutput = await execInPersistentContainer(
                `iperf3 -c 10.5.1.212 -p 5201 -J -R -t 3`, 
                10000
            );
            
            // Run iperf3 client to measure upload speed
            const uploadOutput = await execInPersistentContainer(
                `iperf3 -c 10.5.1.212 -p 5201 -J -t 3`, 
                10000
            );
            
            try {
                // Parse the JSON output from both tests
                const downloadResult = JSON.parse(downloadOutput);
                const uploadResult = JSON.parse(uploadOutput);
                
                // Extract the bits per second
                const downloadMbps = downloadResult.end.sum_received.bits_per_second / 1000000;
                const uploadMbps = uploadResult.end.sum_received.bits_per_second / 1000000;
                
                console.log(`[BANDWIDTH] iperf3 results for ${ip}: Download=${downloadMbps.toFixed(2)} Mbps, Upload=${uploadMbps.toFixed(2)} Mbps`);
                
                return {
                    download: downloadMbps,
                    upload: uploadMbps,
                    source: 'iperf3' // Mark this as an iperf3 measurement
                };
            } catch (e) {
                console.error(`[ERROR] Parsing iperf output:`, e.message);
                console.error(`Download output: ${downloadOutput.substring(0, 100)}...`);
                console.error(`Upload output: ${uploadOutput.substring(0, 100)}...`);
                throw new Error(`Failed to parse iperf3 output: ${e.message}`);
            }
        } catch (error) {
            console.warn(`[WARN] iperf3 test failed: ${error.message}`);
            throw error;
        }
    } catch (error) {
        // All iperf3 methods failed, resort to simulation
        console.error(`[ERROR] All bandwidth tests failed for ${ip}: ${error.message}`);
        
        // Generate more realistic simulated data based on device location
        // LAN devices typically get higher bandwidth than external ones
        const isLAN = ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.');
        const downloadBase = isLAN ? 80 : 20;
        const uploadBase = isLAN ? 40 : 10;
        
        // Add some randomness for realism
        const download = downloadBase + (Math.random() * downloadBase * 0.5);
        const upload = uploadBase + (Math.random() * uploadBase * 0.3);
        
        console.log(`[BANDWIDTH] Using simulated data for ${ip}: Download=${download.toFixed(2)} Mbps, Upload=${upload.toFixed(2)} Mbps`);
        
        return {
            download,
            upload,
            source: 'simulated'
        };
    }
};

// Function to check device connectivity using Docker container
const checkConnectivityWithDocker = async (ip) => {
    try {
        // Use persistent container instead of creating a new one each time
        const output = await execInPersistentContainer(`ping -c 1 -W 1 ${ip}`);
        return output.includes('1 received');
    } catch (error) {
        return false;
    }
};

// Updated checkLatency function to use Docker when enabled
const checkLatency = async (ip) => {
    try {
        if (shouldUseDocker()) {
            return await measureLatencyWithDocker(ip);
        }

        // Original host-based implementation
        const res = await ping.promise.probe(ip, {
            timeout: 2,
            extra: ['-c', '5'],
        });

        return {
            latency: res.alive ? parseFloat(res.avg) : null,
            alive: res.alive,
            packetLoss: 100 - parseFloat(res.packetLoss)
        };
    } catch (error) {
        console.error(`[ERROR] Latency check for ${ip}:`, error.message);
        return { latency: null, alive: false, packetLoss: 100 };
    }
};

// Updated checkBandwidth function to use Docker when enabled
const checkBandwidth = async (ip) => {
    try {
        if (shouldUseDocker()) {
            return await measureBandwidthWithDocker(ip);
        }

        // Original host-based implementation remains the same
        // This is a placeholder, as the real bandwidth check would require specialized tools
        return { download: null, upload: null };
    } catch (error) {
        console.error(`[ERROR] Bandwidth check for ${ip}:`, error.message);
        return { download: null, upload: null };
    }
};

// Updated checkConnectivity function to use Docker when enabled
const checkConnectivity = async (ip) => {
    try {
        if (shouldUseDocker()) {
            return await checkConnectivityWithDocker(ip);
        }

        // Original host-based implementation
        const res = await ping.promise.probe(ip, {
            timeout: 2,
            extra: ['-c', '1'],
        });
        return res.alive;
    } catch (error) {
        console.error(`[ERROR] Connectivity check for ${ip}:`, error.message);
        return false;
    }
};

// --- PERSISTENT DOCKER CONTAINER MANAGER ---
let networkToolsContainer = null;
let containerBusy = false;
const containerCommandQueue = [];

// Initialize persistent container on server start
const initNetworkToolsContainer = async () => {
    if (networkToolsContainer) {
        console.log('[INFO] Network tools container already exists, no need to initialize');
        return;
    }
    
    try {
        console.log('[DOCKER] Creating persistent jonlabelle/network-tools container');
        
        // Create but don't start the container yet
        networkToolsContainer = await docker.createContainer({
            Image: 'jonlabelle/network-tools',
            name: 'un-dashboard-network-tools',
            Tty: true,
            OpenStdin: true,
            StdinOnce: false,
            // Use sh as entrypoint to keep container running
            Entrypoint: ['/bin/sh'],
            Cmd: ['-c', 'while true; do sleep 10; done'], // Keep container alive
            HostConfig: {
                NetworkMode: os.platform() === 'linux' ? 'host' : 'bridge',
                AutoRemove: false,
                RestartPolicy: {
                    Name: 'unless-stopped'
                }
            },
            Env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin']
        });
        
        console.log(`[DOCKER] Starting persistent network-tools container: ${networkToolsContainer.id}`);
        await networkToolsContainer.start();
        console.log('[DOCKER] Persistent network-tools container started successfully');
    } catch (error) {
        console.error('[ERROR] Failed to initialize network tools container:', error.message);
        networkToolsContainer = null;
    }
};

// Function to execute a command in the persistent container
const execInPersistentContainer = async (cmd, timeout = 30000) => {
    if (!networkToolsContainer) {
        console.log('[DEBUG] No network tools container found, initializing...');
        await initNetworkToolsContainer();
        if (!networkToolsContainer) {
            throw new Error('Failed to initialize network tools container');
        }
    }
    
    // Check container is running
    console.log('[DEBUG] Checking if container is running...');
    const containerInfo = await networkToolsContainer.inspect();
    if (!containerInfo.State.Running) {
        console.log('[DOCKER] Container not running, restarting');
        await networkToolsContainer.start();
    }
    
    // Queue commands if container is busy
    if (containerBusy) {
        console.log(`[DOCKER] Container busy, queuing command: ${cmd}`);
        return new Promise((resolve, reject) => {
            containerCommandQueue.push({ cmd, timeout, resolve, reject });
        });
    }
    
    // Set busy flag
    containerBusy = true;
    
    try {
        console.log(`[DEBUG] Executing command in persistent container: ${cmd}`);
        console.log(`[DEBUG] Container ID: ${networkToolsContainer.id}`);
        
        const exec = await networkToolsContainer.exec({
            Cmd: ['sh', '-c', cmd],
            AttachStdout: true,
            AttachStderr: true
        });
        
        console.log(`[DEBUG] Exec created, starting execution...`);
        const execProcess = await exec.start();
        let output = '';
        
        // Set timeout for command execution
        const timeoutId = setTimeout(() => {
            console.error(`[ERROR] Command timed out: ${cmd}`);
            throw new Error(`Command timed out after ${timeout}ms: ${cmd}`);
        }, timeout);
        
        // Collect output
        await new Promise((resolve) => {
            execProcess.on('data', (chunk) => {
                const chunkStr = chunk.toString();
                output += chunkStr;
                // Log first 300 chars of output for debugging
                if (chunkStr.length > 0) {
                    console.log(`[DEBUG] Output chunk (first 300 chars): ${chunkStr.substring(0, 300)}${chunkStr.length > 300 ? '...' : ''}`);
                }
            });
            
            execProcess.on('end', () => {
                console.log(`[DEBUG] Command execution completed`);
                clearTimeout(timeoutId);
                resolve();
            });
        });
        
        // Get command exit code
        const inspectResult = await exec.inspect();
        console.log(`[DEBUG] Command exit code: ${inspectResult.ExitCode}`);
        
        if (inspectResult.ExitCode !== 0) {
            console.warn(`[WARN] Command exited with non-zero code ${inspectResult.ExitCode}: ${cmd}`);
        }
        
        // Process next command in queue
        setTimeout(processNextCommand, 100);
        
        // Check for errors in the output
        if (output.includes('Network is unreachable') || output.includes('unknown host')) {
            console.error(`[ERROR] Network error in output: ${output.substring(0, 500)}...`);
            throw new Error(`Network unreachable or unknown host in command: ${cmd}`);
        }

        // Log full output for specific commands that are failing
        if (cmd.includes('iperf3')) {
            console.log(`[DEBUG] Full iperf3 output: ${output}`);
        }
        
        return output;
    } catch (error) {
        console.error(`[ERROR] Failed to execute in persistent container: ${error.message}`);
        
        // Release busy flag and process next command
        setTimeout(processNextCommand, 100);
        
        throw error;
    }
};

// Process next command in queue
const processNextCommand = () => {
    containerBusy = false;
    
    if (containerCommandQueue.length > 0) {
        const nextCommand = containerCommandQueue.shift();
        execInPersistentContainer(nextCommand.cmd, nextCommand.timeout)
            .then(nextCommand.resolve)
            .catch(nextCommand.reject);
    }
};

// Check if container exists and initialize if needed
const ensureContainer = async () => {
    try {
        if (!networkToolsContainer) {
            // Try to find existing container first
            const containers = await docker.listContainers({
                all: true,
                filters: JSON.stringify({
                    name: ['un-dashboard-network-tools']
                })
            });
            
            if (containers.length > 0) {
                console.log('[DOCKER] Found existing network tools container');
                networkToolsContainer = docker.getContainer(containers[0].Id);
                
                // Make sure it's running
                const containerInfo = await networkToolsContainer.inspect();
                if (!containerInfo.State.Running) {
                    console.log('[DOCKER] Container not running, starting it');
                    await networkToolsContainer.start();
                }
            } else {
                await initNetworkToolsContainer();
            }
        }
    } catch (error) {
        console.error('[ERROR] Failed to ensure container exists:', error.message);
        networkToolsContainer = null;
    }
};

// Initialize container on server start
ensureContainer();

// New function to measure jitter and packet loss using hping3
const measureConnectionQuality = async (ip) => {
    try {
        console.log(`[QUALITY] Measuring connection quality to ${ip} using hping3`);
        
        // Run hping3 with interval of 100ms (10 packets per second) for 2 seconds
        const output = await execInPersistentContainer(
            `hping3 -c 20 -i u100000 -S -p 80 ${ip} | grep "^rtt\\|packets"`, 
            5000
        );
        
        // Parse output to extract packet loss and jitter
        const packetLossMatch = output.match(/(\d+)% packet loss/);
        const rttMatch = output.match(/rtt min\/avg\/max = ([\d.]+)\/([\d.]+)\/([\d.]+) ms/);
        
        let packetLoss = 0;
        let minLatency = 0;
        let avgLatency = 0; 
        let maxLatency = 0;
        let jitter = 0;
        
        if (packetLossMatch && packetLossMatch[1]) {
            packetLoss = parseInt(packetLossMatch[1]);
        }
        
        if (rttMatch && rttMatch.length >= 4) {
            minLatency = parseFloat(rttMatch[1]);
            avgLatency = parseFloat(rttMatch[2]);
            maxLatency = parseFloat(rttMatch[3]);
            // Calculate jitter as the difference between max and min latency
            jitter = maxLatency - minLatency;
        }
        
        console.log(`[QUALITY] Results for ${ip}: Packet Loss=${packetLoss}%, Jitter=${jitter.toFixed(2)}ms`);
        
        return {
            ip,
            timestamp: new Date().toISOString(),
            packetLoss,
            avgLatency,
            jitter,
            quality: calculateQualityScore(packetLoss, jitter)
        };
    } catch (error) {
        console.error(`[ERROR] Connection quality measurement failed for ${ip}:`, error.message);
        
        // Fall back to basic ping for packet loss
        try {
            const pingOutput = await execInPersistentContainer(`ping -c 10 ${ip}`, 10000);
            const packetLossMatch = pingOutput.match(/(\d+)% packet loss/);
            const packetLoss = packetLossMatch ? parseInt(packetLossMatch[1]) : 100;
            
            return {
                ip,
                timestamp: new Date().toISOString(),
                packetLoss,
                avgLatency: null,
                jitter: null,
                quality: packetLoss < 5 ? 'good' : packetLoss < 20 ? 'fair' : 'poor'
            };
        } catch (fallbackError) {
            return {
                ip,
                timestamp: new Date().toISOString(),
                packetLoss: 100,
                avgLatency: null,
                jitter: null,
                quality: 'unknown'
            };
        }
    }
};

// Helper function to calculate quality score based on packet loss and jitter
const calculateQualityScore = (packetLoss, jitter) => {
    if (packetLoss < 1 && jitter < 10) return 'excellent';
    if (packetLoss < 3 && jitter < 30) return 'good';
    if (packetLoss < 10 && jitter < 50) return 'fair';
    return 'poor';
};

// Function to run MTR (My TraceRoute) to identify network bottlenecks
const runNetworkPathAnalysis = async (ip) => {
    try {
        console.log(`[PATH] Running network path analysis to ${ip} using MTR`);
        
        // Run MTR with 10 packets per hop, no DNS resolution for speed (-n)
        const output = await execInPersistentContainer(`mtr -c 10 -n -r ${ip}`, 30000);
        
        // Parse MTR output to extract hop information
        const lines = output.split('\n');
        const hops = [];
        
        // Skip the header lines
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parse the MTR output format
            const parts = line.split(/\s+/);
            if (parts.length < 10) continue;
            
            const hop = {
                hopNumber: parseInt(parts[0]),
                ip: parts[1],
                packetLoss: parseFloat(parts[2]),
                sent: parseInt(parts[3]),
                received: parseInt(parts[4]),
                best: parseFloat(parts[5]),
                avg: parseFloat(parts[6]),
                worst: parseFloat(parts[7]),
                stdDev: parseFloat(parts[8])
            };
            
            hops.push(hop);
        }
        
        // Analyze the path to identify bottlenecks
        const bottlenecks = hops.filter(hop => 
            hop.packetLoss > 10 || // High packet loss
            hop.avg > 100 || // High latency
            hop.stdDev > 30   // High jitter
        );
        
        return {
            ip,
            timestamp: new Date().toISOString(),
            hops,
            bottlenecks,
            hopCount: hops.length,
            hasIssues: bottlenecks.length > 0
        };
    } catch (error) {
        console.error(`[ERROR] Network path analysis failed for ${ip}:`, error.message);
        return {
            ip,
            timestamp: new Date().toISOString(),
            hops: [],
            bottlenecks: [],
            hopCount: 0,
            hasIssues: false,
            error: error.message
        };
    }
};

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('startNetworkScan', async (data) => {
        try {
            const { range } = data; // We're no longer using the useDocker parameter

            if (!range) {
                throw new Error('IP range is required');
            }

            if (!isValidIpRange(range)) {
                throw new Error('Invalid IP range format');
            }

            // Always use Docker for scanning, ignore the UI setting
            await handleDockerScan(range, socket);
            
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
            const { ips, dockerHost } = data;
            
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
            
            // Always use Docker for network tools, ignore the useDockerTools parameter
            process.env.USE_DOCKER_NETWORK_TOOLS = 'true';
            console.log(`[INFO] Using Docker for network tools: YES (forced)`);
            
            if (dockerHost) {
                console.log(`[INFO] Using Docker host: ${dockerHost}`);
            }
            
            // Pass Docker configuration to the runPerformanceCheck function
            const results = await runPerformanceCheck(ips, { dockerHost }, socket);
            
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

// Add a test endpoint to check if iperf3 is working
app.get('/test-iperf3', async (req, res) => {
    try {
        console.log('[TEST] Testing iperf3 connection to 10.5.1.212:5201');
        
        if (!networkToolsContainer) {
            await ensureContainer();
        }
        
        // Check if iperf3 is installed
        try {
            const versionOutput = await execInPersistentContainer('iperf3 --version');
            console.log(`[TEST] iperf3 version: ${versionOutput.trim()}`);
        } catch (e) {
            console.error('[TEST] Error checking iperf3 version:', e.message);
            return res.status(500).json({ error: 'iperf3 not available in container', details: e.message });
        }
        
        // Try a test connection to the iperf3 server
        try {
            // Just test download (reverse mode)
            const result = await execInPersistentContainer('iperf3 -c 10.5.1.212 -p 5201 -J -R -t 3');
            console.log(`[TEST] iperf3 test succeeded: ${result.substring(0, 200)}...`);
            
            // Try to parse the JSON
            try {
                const jsonResult = JSON.parse(result);
                const downloadMbps = jsonResult.end.sum_received.bits_per_second / 1000000;
                return res.json({ 
                    success: true, 
                    downloadMbps: downloadMbps.toFixed(2),
                    rawOutput: result 
                });
            } catch (parseError) {
                return res.status(500).json({ 
                    error: 'Failed to parse iperf3 output', 
                    details: parseError.message,
                    rawOutput: result 
                });
            }
        } catch (e) {
            console.error('[TEST] Error running iperf3 test:', e.message);
            return res.status(500).json({ error: 'iperf3 test failed', details: e.message });
        }
    } catch (error) {
        console.error('[TEST] Test endpoint error:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// --- START SERVER ---
server.listen(4000, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:4000');
});