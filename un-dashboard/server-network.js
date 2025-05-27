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
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://10.5.1.83:3000', /^http:\/\/10\.5\.1\.\d+:3000$/],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    },
    pingTimeout: 60000, // 60 seconds until a ping times out
    pingInterval: 25000, // Send a ping every 25 seconds
    transports: ['polling', 'websocket'], // Start with more reliable polling, upgrade to websocket if possible
    allowEIO3: true, // Allow Engine.IO protocol version 3
    maxHttpBufferSize: 1e8, // 100MB max buffer size for large scanning data
});

// Socket.IO server-side error handling
io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err);
});

io.on('connect_error', (err) => {
    console.error('Socket.IO connect_error:', err);
});

io.on('error', (err) => {
    console.error('Socket.IO error:', err);
});

// Configure Express to parse JSON
app.use(express.json({ limit: '50mb' }));
// Configure Express to parse URL-encoded data
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
    console.log('[PARSE] Raw Nmap Output length:', output.length); 

    const lines = output.split('\n');
    const devices = [];
    let currentDevice = {};
    let currentOSSection = false;
    let osInfoArray = []; // Temporary array to store OS info lines

    lines.forEach((line) => {
        if (line.includes('Nmap scan report for')) {
            if (Object.keys(currentDevice).length) {
                // Process the device before adding it to enhance SSH detection
                if (currentDevice.ports) {
                    // Explicitly check and mark if SSH is available on this device
                    currentDevice.sshAvailable = currentDevice.ports.some(port => 
                        port.includes('22/tcp') && 
                        port.includes('open') && 
                        port.includes('ssh')
                    );
                }
                devices.push(currentDevice);
            }
            currentDevice = { 
                ip: line.split('Nmap scan report for ')[1].trim(),
                status: 'unknown'
            };
            currentOSSection = false;
            osInfoArray = []; // Reset OS info array for new device        } else if (line.includes('MAC Address:')) {
            // Improved MAC address detection - extract address and vendor
            const macLine = line.trim();
            console.log(`[MAC DETECTION] Processing line: ${macLine}`);
              // Extract MAC address - more flexible regex to handle different MAC formats
            const macMatch = macLine.match(/MAC Address:\s+([0-9A-Fa-f:]{12,17})/);
            if (macMatch) {
                currentDevice.mac = macMatch[1];
                console.log(`[MAC DETECTION] Found MAC: ${currentDevice.mac} for IP: ${currentDevice.ip}`);
                
                // Extract vendor information if available - more flexible regex
                const vendorMatch = macLine.match(/MAC Address:\s+[0-9A-Fa-f:]{12,17}\s+(?:\(([^)]+)\)|([^(].*$))/);
                if (vendorMatch) {
                    // Use either the first or second capture group (depending on which format was matched)
                    currentDevice.vendor = vendorMatch[1] || vendorMatch[2];
                    console.log(`[MAC DETECTION] Found vendor: ${currentDevice.vendor} for IP: ${currentDevice.ip}`);
                }
            } else {
                // Try alternate format
                const parts = line.split('MAC Address: ')[1]?.split(' ');
                if (parts && parts.length > 0) {
                    currentDevice.mac = parts[0];
                    currentDevice.vendor = parts.slice(1).join(' ').trim();
                    console.log(`[MAC DETECTION] Alternate format - MAC: ${currentDevice.mac}, Vendor: ${currentDevice.vendor} for IP: ${currentDevice.ip}`);
                    // Remove parentheses if present
                    if (currentDevice.vendor && currentDevice.vendor.startsWith('(') && currentDevice.vendor.endsWith(')')) {
                        currentDevice.vendor = currentDevice.vendor.substring(1, currentDevice.vendor.length - 1);
                    }
                }
            }
              // Create the macInfo object for structured data
            if (currentDevice.mac) {
                currentDevice.macInfo = {
                    available: true,
                    address: currentDevice.mac,
                    vendor: currentDevice.vendor || ''
                };
                console.log(`[MAC DETECTION] Created macInfo object: ${JSON.stringify(currentDevice.macInfo)} for IP: ${currentDevice.ip}`);
            }
        } else if (line.includes('Host is up')) {
            currentDevice.status = 'up';
            // Extract latency if available
            const latencyMatch = line.match(/\(([0-9.]+)s latency\)/);
            if (latencyMatch) {
                currentDevice.latency = parseFloat(latencyMatch[1]);
            }
        } else if (line.match(/^\d+\/tcp/)) {
            if (!currentDevice.ports) currentDevice.ports = [];
            currentDevice.ports.push(line.trim());
            
            // Check specifically for SSH service
            if (line.includes('22/tcp') && line.includes('open') && line.includes('ssh')) {
                currentDevice.sshService = {
                    available: true,
                    version: line.includes('ssh') ? line.split('ssh')[1].trim() : 'unknown'
                };
                // Create the ssh object for structured data
                currentDevice.ssh = {
                    available: true,
                    port: 22,
                    version: line.includes('ssh') ? line.split('ssh')[1].trim() : 'unknown'
                };
            }
        } else if (line.includes('OS detection performed.') || line.includes('OS fingerprint:')) {
            currentOSSection = true;
        } else if (currentOSSection || 
                   line.includes('OS:') || 
                   line.includes('Service Info:') || 
                   line.includes('Device type:') || 
                   line.includes('Running:') || 
                   line.includes('OS CPE:') || 
                   line.includes('OS details:') ||
                   line.includes('Uptime guess:') ||
                   line.includes('Network Distance:') ||
                   line.includes('TCP Sequence Prediction:') ||
                   line.includes('IP ID Sequence Generation:')) {
            
            // Add OS info to temporary array instead of directly to currentDevice.osInfo
            osInfoArray.push(line.trim());
            
            // Extract structured OS information
            if (line.includes('OS details:')) {
                // Create osDetails object if needed
                if (!currentDevice.osDetails) {
                    currentDevice.osDetails = {
                        name: null,
                        accuracy: null,
                        uptime: null,
                        uptimeLastBoot: null,
                        networkDistance: null,
                        tcpSequence: null,
                        ipIdSequence: null
                    };
                }
                
                currentDevice.osDetails.name = line.split('OS details:')[1].trim();
            } else if (line.includes('Accuracy:')) {
                if (!currentDevice.osDetails) currentDevice.osDetails = {};
                const accuracyMatch = line.match(/Accuracy:\s*(\d+)/i);
                if (accuracyMatch) {
                    currentDevice.osDetails.accuracy = parseInt(accuracyMatch[1]);
                }
            }
        } else if (line.includes('ssh-auth-methods')) {
            // Extract SSH authentication methods
            if (!currentDevice.sshAuthMethods) {
                currentDevice.sshAuthMethods = [];
            }
            const nextLines = lines.slice(lines.indexOf(line) + 1);
            let i = 0;
            while (i < nextLines.length && nextLines[i].includes('|')) {
                const authLine = nextLines[i].trim();
                if (authLine.includes('Supported authentication methods:')) {
                    i++;
                    // Collect all authentication methods
                    while (i < nextLines.length && nextLines[i].includes('|')) {
                        const method = nextLines[i].replace(/[|_]/g, '').trim();
                        if (method) {
                            currentDevice.sshAuthMethods.push(method);
                        }
                        i++;
                    }
                    break;
                }
                i++;
            }
        }
    });
    
    // After processing all lines, create the structured OS info from collected array
    if (osInfoArray.length > 0) {
        // First, save the raw OS info lines array
        currentDevice.rawOSInfo = osInfoArray;
        
        // Then create the structured osInfo object with the collected data
        currentDevice.osInfo = {
            available: true,
            name: currentDevice.osDetails ? currentDevice.osDetails.name || 'Unknown OS' : 'Unknown OS',
            accuracy: currentDevice.osDetails ? currentDevice.osDetails.accuracy || null : null,
            full: osInfoArray
        };
    }

    // Add the last device if there is one
    if (Object.keys(currentDevice).length) {
        // Process the device before adding it
        if (currentDevice.ports) {
            // Explicitly check and mark if SSH is available on this device
            currentDevice.sshAvailable = currentDevice.ports.some(port => 
                port.includes('22/tcp') && 
                port.includes('open') && 
                port.includes('ssh')
            );
        }
        devices.push(currentDevice);
    }    // Filter to only include devices that are actually online
    // This fixes the issue of showing all 255 IPs instead of only active ones
    const activeDevices = devices.filter(device => device.status === 'up');
    console.log(`[PARSE] Filtering ${devices.length} total devices to ${activeDevices.length} active devices`);
    
    // MAC address simulation disabled by default - user doesn't want simulated MAC addresses
    const ENABLE_MAC_SIMULATION = false; // Set to false to disable MAC simulation
    
    if (ENABLE_MAC_SIMULATION) {
        // Add simulated MAC addresses and vendor information for testing if real ones weren't detected
        activeDevices.forEach((device, index) => {
            if (!device.mac && !device.macInfo) {
                // Generate a simulated MAC address based on IP
                const ip = device.ip.split('.');
                const lastOctet = ip[3];
                const simulatedMac = `00:11:22:33:44:${lastOctet.padStart(2, '0')}`;
                const simulatedVendor = ['Intel', 'Apple', 'Samsung', 'Dell', 'HP', 'Cisco'][index % 6];
                
                // Add the simulated MAC and vendor
                device.mac = simulatedMac;
                device.vendor = simulatedVendor;
                
                // Create macInfo object
                device.macInfo = {
                    available: true,
                    address: simulatedMac,
                    vendor: simulatedVendor
                };
                
                console.log(`[MAC SIMULATION] Added simulated MAC: ${simulatedMac} and vendor: ${simulatedVendor} for IP: ${device.ip}`);
            }
        });
    } else {
        console.log(`[MAC DETECTION] MAC simulation disabled - only showing real detected MAC addresses`);
    }
    
    // Group devices by vendor - only include active devices
    const groupedDevices = activeDevices.reduce((acc, device) => {
        const vendor = device.vendor || 'Unknown';
        if (!acc[vendor]) acc[vendor] = [];
        acc[vendor].push(device);
        return acc;
    }, {});// Log statistics about detected SSH servers - only count from active devices
    const sshDevices = activeDevices.filter(device => device.sshAvailable);
    console.log(`[PARSE] Found ${sshDevices.length} devices with open SSH ports out of ${activeDevices.length} active devices`);
    if (sshDevices.length > 0) {
        console.log('[PARSE] SSH-enabled devices:', sshDevices.map(d => d.ip).join(', '));
    }
    
    return groupedDevices;
};

// Function to save scan results to history
const saveScanResultsToHistory = (devices) => {
    const timestamp = new Date().toISOString();
    
    // Process each device and store scan results in history
    devices.forEach(device => {
        const ip = device.ip;
        
        if (!performanceHistory.scanResults[ip]) {
            performanceHistory.scanResults[ip] = [];
        }
        
        // Extract relevant information
        const scanEntry = {
            timestamp,
            status: device.status || 'unknown',
            latency: device.latency || null,
            ports: device.ports || [],
            mac: device.mac || null,
            vendor: device.vendor || 'Unknown',
            sshAvailable: device.sshAvailable || false,
            sshDetails: {
                available: device.sshAvailable || false,
                version: device.sshService ? device.sshService.version : null,
                authMethods: device.sshAuthMethods || []
            }
        };
        
        // Add OS information if available
        if (device.osInfo && device.osInfo.length > 0) {
            scanEntry.osInfo = device.osInfo;
        }
        
        // Add to history
        performanceHistory.scanResults[ip].push(scanEntry);
        
        // Trim to max length
        if (performanceHistory.scanResults[ip].length > MAX_HISTORY_ITEMS) {
            performanceHistory.scanResults[ip] = performanceHistory.scanResults[ip].slice(-MAX_HISTORY_ITEMS);
        }
        
        console.log(`[HISTORY] Saved scan results for ${ip} with ${scanEntry.ports.length} ports`);
    });
};

// Change from const to let so we can reassign it later
let docker = new Docker({
    protocol: 'http',
    host: '10.5.1.212',
    port: 2375 // Standard Docker daemon port
});

// Function to test Docker connection and re-initialize if needed
const testDockerConnection = async () => {
    try {
        console.log('[DOCKER] Testing Docker connection to 10.5.1.212:2375');
        // Simple test to list containers
        await docker.listContainers();
        console.log('[DOCKER] Docker connection successful');
        return true;
    } catch (error) {
        console.error('[DOCKER] Connection test failed:', error.message);
        console.log('[DOCKER] Attempting to reconnect with different configuration...');
        
        try {
            // Try with default Docker socket (for local Docker)
            docker = new Docker();
            await docker.listContainers();
            console.log('[DOCKER] Reconnected to Docker using default socket');
            return true;
        } catch (innerError) {
            console.error('[DOCKER] All connection attempts failed:', innerError.message);
            return false;
        }
    }
};

const handleDockerScan = async (range, socket, scanOptions = {}) => {
    try {
        const sanitizedRange = sanitizeInput(range);
        console.log(`[SCAN] Starting Docker-based scan for range: ${sanitizedRange}`);
        
        socket.emit('networkScanStatus', { 
            status: 'Scan in progress...', 
            output: `Starting network scan for range: ${sanitizedRange}` 
        });
          socket.emit('networkScanStatus', { 
            status: 'Setting up scan...', 
            output: `Using jonlabelle/network-tools container for network scanning` 
        });        // FAST SCAN: More efficient scan parameters that only checks common ports
        // This scan is much faster because it only scans specific ports rather than all 65,535 ports
        // ENHANCED: Added better host discovery to only show active hosts
        const nmapCmd = [
            'nmap',
            // '--host-timeout=30s',              // Don't spend too long on unresponsive hosts
            // '-PR',                             // ARP discovery (best for local networks)
            // '-sS',                             // SYN scan which is better for MAC detection
            // '-sV',                             // Service version detection (lighter than -A)
            // '-O',                              // OS detection flag
            // '--osscan-limit',                  // Limit OS detection to promising targets
            '-A',                             // Aggressive scan for detailed information
            '-v',                              // Verbose output
            '-T4',                             // Faster timing template
            '--max-os-tries=1',                // Limit OS tries for faster scan of large range
            '--max-retries=1',                 // Limit retries for faster scan
            '-p', '22,80,443,3000,4000',       // Common ports including SSH and web servers
            '--script=ssh-auth-methods,ssh-hostkey', // Keep SSH scripts for auth methods detection
            sanitizedRange
        ];
        
        console.log(`[DOCKER] NMAP command: ${nmapCmd.join(' ')}`);
        
        // Create a container for this scan - Always use bridge mode to match test-nmap.js
        const container = await docker.createContainer({
            Image: 'jonlabelle/network-tools',
            Cmd: nmapCmd,
            Tty: true,
            HostConfig: {
                NetworkMode: 'bridge',  // Consistently use bridge mode which works in test-nmap.js
            }
        });

        socket.emit('networkScanStatus', { 
            status: 'Scan started...',
            output: 'Scanning network with enhanced host discovery for active devices and services'
        });
        
        await container.start();
        console.log(`[DOCKER] Container started successfully`);

        // Wait for the scan to complete
        socket.emit('networkScanStatus', { 
            status: 'Scanning in progress...',
            output: 'This may take a few minutes to complete'
        });
        
        await container.wait();
        console.log(`[DOCKER] Container execution completed`);

        // Get container logs with detailed logging
        console.log(`[DOCKER] Retrieving container logs`);
        const stream = await container.logs({
            stdout: true,
            stderr: true
        });

        // Clean up the container
        await container.remove();
        console.log(`[DOCKER] Container removed`);

        const output = stream.toString();
        console.log(`[DOCKER] Raw output length: ${output.length}`);
        
        // Debug: Log the first few hundred characters of output
        console.log(`[DOCKER] Output sample: ${output.substring(0, 500)}...`);
        
        if (!output || !output.trim()) {
            throw new Error('No output from Docker-based scan');
        }
        
        // Send progress update
        socket.emit('networkScanStatus', { 
            status: 'Processing results...', 
            output: 'Scan complete, analyzing results...' 
        });
        
        // Parse the scan results
        const groupedDevices = parseNmapOutput(output);
        
        // Find SSH-enabled devices
        const devices = [];
        Object.values(groupedDevices).forEach(group => {
            devices.push(...group);
        });
        const sshDevices = devices.filter(device => device.sshAvailable);
        
        // Store scan results in history
        saveScanResultsToHistory(devices);
        
        // Log found SSH devices
        if (sshDevices.length > 0) {
            socket.emit('networkScanStatus', {
                status: 'SSH devices found',
                output: `Found ${sshDevices.length} devices with SSH enabled: ${sshDevices.map(d => d.ip).join(', ')}`
            });
        } else {
            socket.emit('networkScanStatus', {
                status: 'No SSH devices found',
                output: 'No SSH-enabled devices were detected on the network'
            });
        }
        
        // Send results to client
        socket.emit('networkData', groupedDevices);
        socket.emit('networkScanStatus', { status: 'Scan complete' });
        
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

const handleHostScan = (range, socket, scanOptions = {}) => {
    try {
        const sanitizedRange = sanitizeInput(range);
        console.log(`[SCAN] Starting host-based scan for range: ${sanitizedRange}`);
        
        // Tell user we're using accurate scan mode now
        socket.emit('networkScanStatus', { 
            status: 'Scanning active hosts...',
            output: 'Performing accurate scan with enhanced host discovery'
        });        // FAST SCAN: Host-based scan using optimized parameters for speed
        // This scan is faster as it uses ARP scan for local network discovery and only scans specific ports
        // ENHANCED: Improved host discovery to only show active hosts
        const nmapProcess = spawn('nmap', [
            '-PR',                              // ARP scan for MAC address discovery (best for local networks)
            '--reason',                         // Show why hosts are marked as up/down
            '-sS',                              // SYN scan
            '-sV',                              // Service version detection
            '-O',                               // OS detection
            '--osscan-limit',                   // Only do OS detection on promising targets
            '--script=ssh-auth-methods,ssh-hostkey', // SSH detection scripts
            '-T4',                              // Faster timing template
            '--max-retries=2',                  // Minimize retries for better performance
            '--host-timeout=30s',               // Don't spend too long on each host
            '-p', scanOptions.ports || DEFAULT_PORTS, // Use configured ports, usually includes 22
            sanitizedRange
        ]);

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
                
                // Find all devices for storing in history
                const devices = [];
                Object.values(groupedDevices).forEach(group => {
                    devices.push(...group);
                });
                
                // Store scan results in history
                saveScanResultsToHistory(devices);
                
                socket.emit('networkData', groupedDevices);
                socket.emit('networkScanStatus', { status: 'Scan complete' });
            } else {
                const errorDetails = `Nmap exited with code ${code}`;
                console.error(`[ERROR] ${errorDetails}`);
                socket.emit('networkScanStatus', { status: 'Error', error: errorDetails });
            }
        });
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
    scanResults: {} // IP -> array of {timestamp, ports, services, sshDetails} objects
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
        uptime: []
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
    
    // Measure latency for all IPs
    for (const ip of ips) {
        try {
            console.log(`[PERF] Starting performance check for IP: ${ip}`);
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
            
            // Only check bandwidth and uptime if device is alive
            if (latencyResult.alive) {
                // First, try to get actual system uptime for devices with SSH
                let systemUptimeInfo = null;
                try {
                    // Try to get the actual system uptime for devices with SSH
                    systemUptimeInfo = await getSystemUptime(ip);
                    console.log(`[UPTIME] System uptime for ${ip}: ${JSON.stringify(systemUptimeInfo)}`);
                } catch (uptimeError) {
                    console.warn(`[WARN] Failed to get system uptime for ${ip}: ${uptimeError.message}`);
                }
                
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
                    uptimePercentage,
                    systemUptime: systemUptimeInfo && systemUptimeInfo.available ? {
                        available: true,
                        uptimeString: systemUptimeInfo.uptimeString,
                        raw: systemUptimeInfo.raw
                    } : null
                };
                
                results.uptime.push(formattedUptimeResult);
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
                    uptimePercentage,
                    systemUptime: null
                });
            }
            
            // Send partial data update for this IP if socket is provided
            if (socket) {
                const ipResults = {
                    latency: results.latency.filter(item => item.ip === ip),
                    bandwidth: results.bandwidth.filter(item => item.ip === ip),
                    uptime: results.uptime.filter(item => item.ip === ip)
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

            console.log(`[PERF] Completed performance check for IP: ${ip} (${completedIps}/${totalIps})`);
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

// Function to measure bandwidth using Docker container with iperf
const measureBandwidthWithDocker = async (ip) => {
    try {
        // Use the persistent container to run iperf3 test
        // Connect to the iperf3 server at 10.5.1.212:5201
        console.log(`[BANDWIDTH] Testing bandwidth to ${ip} using iperf3 server at 10.5.1.212:5201`);
        
        try {
            // Run iperf3 client to measure download speed (from server to client)
            const downloadOutput = await execInPersistentContainer(`iperf3 -c 10.5.1.212 -p 5201 -J -R`, 15000);
            
            // Run iperf3 client to measure upload speed (from client to server)
            const uploadOutput = await execInPersistentContainer(`iperf3 -c 10.5.1.212 -p 5201 -J`, 15000);
            
            try {
                // Parse the JSON output from both tests
                const downloadResult = JSON.parse(downloadOutput);
                const uploadResult = JSON.parse(uploadOutput);
                
                // Extract the bits_per_second values and convert to Mbps
                const downloadMbps = downloadResult.end.sum_received.bits_per_second / 1000000;
                const uploadMbps = uploadResult.end.sum_received.bits_per_second / 1000000;
                
                console.log(`[BANDWIDTH] Results for ${ip}: Download=${downloadMbps.toFixed(2)} Mbps, Upload=${uploadMbps.toFixed(2)} Mbps`);
                
                return {
                    download: downloadMbps,
                    upload: uploadMbps,
                    source: 'iperf3' // Mark this as real iperf3 measurement
                };
            } catch (e) {
                console.error(`[ERROR] Parsing iperf output for ${ip}:`, e.message);
                console.error(`[ERROR] Download output: ${downloadOutput.substring(0, 200)}`);
                console.error(`[ERROR] Upload output: ${uploadOutput.substring(0, 200)}`);
                throw new Error(`Failed to parse iperf3 output: ${e.message}`);
            }
        } catch (error) {
            console.warn(`[WARN] Could not connect to iperf3 server for ${ip}, using fallback method: ${error.message}`);
            
            // Fallback to a simpler HTTP download test if iperf3 fails
            try {
                console.log(`[BANDWIDTH] Using curl fallback method for ${ip}`);
                
                // Use curl to download a file and measure speed
                const curlOutput = await execInPersistentContainer(
                    `curl -o /dev/null -w '%{speed_download}' -s http://10.5.1.212/testfile.dat`, 
                    15000
                );
                
                const downloadSpeedBytes = parseFloat(curlOutput.trim());
                const downloadMbps = downloadSpeedBytes * 8 / 1000000; // Convert bytes/sec to Mbps
                
                // Upload test is harder with curl alone, using simulated upload
                const uploadMbps = downloadMbps * 0.2; // Estimate upload as 20% of download
                
                console.log(`[BANDWIDTH] Fallback results for ${ip}: Download=${downloadMbps.toFixed(2)} Mbps, Upload=${uploadMbps.toFixed(2)} Mbps (estimated)`);
                
                return {
                    download: downloadMbps,
                    upload: uploadMbps,
                    source: 'curl-fallback' // Mark this as fallback measurement
                };
            } catch (fallbackError) {
                console.error(`[ERROR] Fallback bandwidth check failed for ${ip}:`, fallbackError.message);
                
                // Last resort: generate simulated data
                const download = Math.random() * 100;
                const upload = Math.random() * 20;
                
                console.log(`[BANDWIDTH] Using simulated data for ${ip}: Download=${download.toFixed(2)} Mbps, Upload=${upload.toFixed(2)} Mbps`);
                
                return {
                    download,
                    upload,
                    source: 'simulated' // Mark this as simulated data
                };
            }
        }
    } catch (error) {
        console.error(`[ERROR] Docker bandwidth check for ${ip}:`, error.message);
        return { download: null, upload: null, source: 'failed' };
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
            name: 'nexus-control-network-tools',
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
        await initNetworkToolsContainer();
        if (!networkToolsContainer) {
            throw new Error('Failed to initialize network tools container');
        }
    }
    
    // Check container is running
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
        console.log(`[DOCKER] Executing command in persistent container: ${cmd}`);
        const exec = await networkToolsContainer.exec({
            Cmd: ['sh', '-c', cmd],
            AttachStdout: true,
            AttachStderr: true
        });
        
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
                output += chunk.toString();
            });
            
            execProcess.on('end', () => {
                clearTimeout(timeoutId);
                resolve();
            });
        });
        
        // Get command exit code
        const inspectResult = await exec.inspect();
        if (inspectResult.ExitCode !== 0) {
            console.warn(`[WARN] Command exited with non-zero code ${inspectResult.ExitCode}: ${cmd}`);
        }
        
        // Process next command in queue
        setTimeout(processNextCommand, 100);
        
        // Check for errors in the output
        if (output.includes('Network is unreachable') || output.includes('unknown host')) {
            throw new Error(`Network unreachable or unknown host in command: ${cmd}`);
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
                    name: ['nexus-control-network-tools']
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

// Function to run NMAP scan directly using jonlabelle/network-tools
const runNmapInDockerContainer = async (range, options = {}, timeout = 600000) => {
    try {
        const sanitizedRange = sanitizeInput(range);
        console.log(`[DOCKER] Running NMAP scan directly for range: ${sanitizedRange}`);
        
        // Set default options
        const nmapOptions = {
            ports: DEFAULT_PORTS,
            serviceDetection: true,
            osDetection: true,
            ...options
        };
        
        // Build NMAP command with enhanced SSH detection but without -Pn
        let nmapCmd = ['nmap'];
        
        // Don't use -Pn by default - this will first check if hosts are up before scanning
        // Only add if explicitly requested in options
        if (options.skipHostDiscovery) {
            nmapCmd.push('-Pn'); 
        }
        
        if (nmapOptions.serviceDetection) {
            nmapCmd.push('-sV'); // Service version detection (crucial for SSH detection)
        }
        
        nmapCmd.push('-sS'); // SYN scan, faster
        
        if (nmapOptions.osDetection) {
            nmapCmd.push('-O'); // OS detection
        }
        
        // Add scripts specifically for SSH detection
        nmapCmd.push('--script=ssh-auth-methods,ssh-hostkey');
        
        // Improved timing and scan settings
        nmapCmd.push('-T4'); // Faster timing template
        nmapCmd.push('--max-retries=2'); // Limit retries for better performance
        nmapCmd.push('--host-timeout=30s'); // Limit per-host timeout
        nmapCmd.push('-p', nmapOptions.ports);
        nmapCmd.push(sanitizedRange);
        
        console.log(`[DOCKER] Enhanced NMAP command: ${nmapCmd.join(' ')}`);
        
        // Create a container specifically for this scan
        const container = await docker.createContainer({
            Image: 'jonlabelle/network-tools',
            Cmd: nmapCmd,
            HostConfig: {
                NetworkMode: os.platform() === 'linux' ? 'host' : 'bridge',
            },
            Env: ['DEBUG=true']
        });

        console.log(`[DOCKER] Starting container for NMAP scan`);
        await container.start();
        console.log(`[DOCKER] Container started successfully`);

        // Wait for the command to complete with a timeout
        const waitPromise = container.wait();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('NMAP scan timed out')), timeout)
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
        console.log(`[DOCKER] NMAP scan completed with ${output.length} characters of output`);
        
        return output;
    } catch (error) {
        console.error(`[ERROR] NMAP scan in Docker container:`, error.message);
        throw error;
    }
};

// Function to get system uptime from SSH-capable devices
const getSystemUptime = async (ip, sshCredentials = null) => {
    try {
        // Default SSH credentials if none provided
        const credentials = sshCredentials || {
            username: process.env.DEFAULT_SSH_USER || 'admin',
            password: process.env.DEFAULT_SSH_PASSWORD || 'admin'
        };
        
        // Skip if Docker tools are enabled (we'll use a different approach)
        if (shouldUseDocker()) {
            return { available: false, reason: 'SSH not used in Docker mode' };
        }

        // Check if SSH is available
        const sshCheck = await ping.promise.probe(ip, {
            port: 22,
            timeout: 1
        });
        
        if (!sshCheck.alive) {
            return { available: false, reason: 'SSH port not responding' };
        }
        
        // Use SSH client to connect and run uptime command
        return new Promise((resolve, reject) => {
            const conn = new Client();
            
            conn.on('ready', () => {
                console.log(`[SSH] Connected to ${ip} - checking system uptime`);
                
                conn.exec('uptime', (err, stream) => {
                    if (err) {
                        conn.end();
                        return resolve({ 
                            available: false, 
                            reason: `SSH command failed: ${err.message}`
                        });
                    }
                    
                    let output = '';
                    stream.on('data', (data) => {
                        output += data.toString();
                    });
                    
                    stream.on('close', () => {
                        conn.end();
                        
                        // Parse the uptime output
                        // Typical output: "14:30:32 up 42 days, 2:27, 3 users, load average: 0.52, 0.58, 0.59"
                        try {
                            const upMatch = output.match(/up\s+(.*?),\s+\d+\s+user/);
                            if (upMatch && upMatch[1]) {
                                const uptimeStr = upMatch[1].trim();
                                return resolve({
                                    available: true,
                                    uptimeString: uptimeStr,
                                    raw: output.trim()
                                });
                            }
                            
                            // Alternative regex for different formats
                            const altMatch = output.match(/up\s+(.*?),\s+load average/);
                            if (altMatch && altMatch[1]) {
                                const uptimeStr = altMatch[1].trim();
                                return resolve({
                                    available: true,
                                    uptimeString: uptimeStr,
                                    raw: output.trim()
                                });
                            }
                            
                            resolve({
                                available: true,
                                uptimeString: 'unknown format',
                                raw: output.trim() 
                            });
                        } catch (error) {
                            resolve({ 
                                available: true,
                                uptimeString: 'parse error',
                                raw: output.trim(),
                                error: error.message
                            });
                        }
                    });
                });
            });
            
            conn.on('error', (err) => {
                console.error(`[SSH] Error connecting to ${ip}: ${err.message}`);
                resolve({ 
                    available: false, 
                    reason: `SSH connection error: ${err.message}`
                });
            });
            
            conn.connect({
                host: ip,
                port: 22,
                username: credentials.username,
                password: credentials.password,
                readyTimeout: 5000,
                keepaliveInterval: 5000
            });
        });
    } catch (error) {
        console.error(`[ERROR] System uptime check for ${ip}:`, error.message);
        return { 
            available: false, 
            reason: `Error: ${error.message}`
        };
    }
};

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('startNetworkScan', async (data) => {
        try {
            const { range, useDocker, scanType } = data;

            if (!range) {
                throw new Error('IP range is required');
            }

            if (!isValidIpRange(range)) {
                throw new Error('Invalid IP range format');
            }

            console.log(`[SCAN] Starting network scan with type: ${scanType || 'default'}`);
            
            // Configure scan options based on scan type
            const scanOptions = {
                ports: DEFAULT_PORTS,
                serviceDetection: true,
                osDetection: false,
                skipHostDiscovery: false
            };
            
            // Adjust scan options based on scan type
            if (scanType === 'os') {
                console.log('[SCAN] Using OS detection scan type');
                scanOptions.osDetection = true;
            } else {
                console.log('[SCAN] Using basic ping scan type');
                // Use default options for basic scan
            }

            if (useDocker) {
                await handleDockerScan(range, socket, scanOptions);
            } else {
                if (!isNmapAvailable()) {
                    throw new Error('Nmap is not installed on the host system');
                }
                handleHostScan(range, socket, scanOptions);
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
            const { ips, useDockerTools, dockerHost } = data;
            
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
            
            // Override environment variable with the frontend setting
            process.env.USE_DOCKER_NETWORK_TOOLS = useDockerTools ? 'true' : 'false';
            console.log(`[INFO] Using Docker for network tools: ${useDockerTools ? 'YES' : 'NO'}`);
            
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
    });    socket.on('disconnect', () => {
        console.log('User disconnected');
    });    // Handle import of scan data
    socket.on('importScanData', (data) => {
        try {
            console.log('[INFO] Received scan data import request via WebSocket');
            
            if (!data || (!data.devices && !data.customNames)) {
                throw new Error('Invalid import data format');
            }
            
            // Basic validation
            const deviceCount = data.devices ? 
                (Array.isArray(data.devices) ? 
                    data.devices.length : 
                    Object.values(data.devices).flat().length) : 0;
                    
            if (deviceCount === 0) {
                throw new Error('No valid devices found in import data');
            }
            
            // Extract or generate IP range for history
            const ipRange = data.metadata?.ipRange || 'WebSocket Import';
            
            // Add scan source information to devices if missing
            const timestamp = new Date().toISOString();
            const formattedDate = new Intl.DateTimeFormat('en-US', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            }).format(new Date());
            
            if (data.devices) {
                Object.values(data.devices).forEach(deviceList => {
                    deviceList.forEach(device => {
                        if (!device.scanSource) {
                            device.scanSource = {
                                id: require('crypto').randomUUID(),
                                name: 'WebSocket Import',
                                timestamp: formattedDate
                            };
                        }
                    });
                });
            }
            
            // Log success
            console.log(`[INFO] Successfully imported scan data with ${deviceCount} devices via WebSocket`);
            
            // Broadcast to all clients including this one
            if (data.devices) {
                io.emit('networkScanData', data.devices);
            }
            
            if (data.customNames) {
                io.emit('customNamesUpdate', data.customNames);
            }
            
            // Emit event to save to scan history
            io.emit('saveToScanHistory', {
                devices: data.devices,
                ipRange: ipRange,
                timestamp: timestamp
            });
            
            // Send validation success back to client
            socket.emit('importScanStatus', { 
                status: 'success', 
                message: `Successfully imported ${deviceCount} devices and added to scan history`,
                deviceCount
            });
            
        } catch (error) {
            console.error('[ERROR] Import scan data:', error.message);
            socket.emit('importScanStatus', { status: 'error', error: error.message });
        }
    });
});

// Add route to handle file uploads for import
app.post('/api/network/import', (req, res) => {
    try {
        const data = req.body;
        
        if (!data || (!data.devices && !data.customNames)) {
            return res.status(400).json({ 
                status: 'error', 
                error: 'Invalid import data format' 
            });
        }
        
        // Validate the imported data
        const validateDeviceFormat = (device) => {
            // Required fields
            if (!device.ip) {
                return false;
            }
            
            // Validate IP format with regex
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipRegex.test(device.ip)) {
                return false;
            }
            
            return true;
        };
        
        // Check device format for at least some devices
        if (data.devices) {
            let deviceArray = [];
            let isValid = true;
            
            // Flatten the devices object into an array
            if (Array.isArray(data.devices)) {
                deviceArray = data.devices;
            } else {
                // Handle object format where keys are IP addresses
                Object.values(data.devices).forEach(devicesAtIP => {
                    if (Array.isArray(devicesAtIP)) {
                        deviceArray = [...deviceArray, ...devicesAtIP];
                    } else if (typeof devicesAtIP === 'object') {
                        deviceArray.push(devicesAtIP);
                    }
                });
            }
            
            // Validate at least a subset of devices
            const samplesToCheck = Math.min(deviceArray.length, 50);
            for (let i = 0; i < samplesToCheck; i++) {
                const index = Math.floor(Math.random() * deviceArray.length);
                if (!validateDeviceFormat(deviceArray[index])) {
                    isValid = false;
                    break;
                }
            }
            
            if (!isValid) {
                return res.status(400).json({
                    status: 'error',
                    error: 'Invalid device data format in import file'
                });
            }
        }
        
        // Check customNames format if included
        if (data.customNames && typeof data.customNames !== 'object') {
            return res.status(400).json({
                status: 'error',
                error: 'Invalid customNames format in import file'
            });
        }
        
        const deviceCount = data.devices ? 
            (Array.isArray(data.devices) ? 
                data.devices.length : 
                Object.values(data.devices).flat().length) : 0;
                
        console.log(`[INFO] Successfully validated import data with ${deviceCount} devices via API`);        // Extract or generate IP range for history
        const ipRange = data.metadata?.ipRange || 'API Import';
        
        // Add scan source information to devices if missing
        const timestamp = new Date().toISOString();
        const formattedDate = new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }).format(new Date());
        
        Object.values(data.devices).forEach(deviceList => {
            deviceList.forEach(device => {
                if (!device.scanSource) {
                    device.scanSource = {
                        id: require('crypto').randomUUID(),
                        name: 'API Import',
                        timestamp: formattedDate
                    };
                }
            });
        });
        
        // Broadcast data to all connected clients
        io.emit('networkScanData', data.devices);
        
        if (data.customNames) {
            io.emit('customNamesUpdate', data.customNames);
        }
        
        // Emit event to save to scan history
        io.emit('saveToScanHistory', {
            devices: data.devices,
            ipRange: ipRange,
            timestamp: timestamp
        });
        
        return res.status(200).json({
            status: 'success',
            message: `Successfully imported ${deviceCount} devices`,
            deviceCount,
            ipRange
        });
        
    } catch (error) {
        console.error('[ERROR] Import scan data API:', error.message);
        return res.status(500).json({ 
            status: 'error', 
            error: error.message 
        });
    }
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
    
    // Test Docker connection on startup
    testDockerConnection().then(success => {
        if (success) {
            console.log('[STARTUP] Docker connection successful, container service available');
        } else {
            console.error('[STARTUP] Docker connection failed, network scan functionality may be limited');
        }
    });
});