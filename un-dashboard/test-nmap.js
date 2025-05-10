const Docker = require('dockerode');

// Console colors for better readability
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m"
};

// Docker connection configuration
const docker = new Docker({
    protocol: 'http',
    host: '10.5.1.212',
    port: 2375 // Standard Docker daemon port
});

// Scan configuration - read from environment variables or use defaults
const ipRange = process.env.IP_RANGE || '10.5.1.1-255';  // Default full subnet range
const scanType = process.env.SCAN_TYPE || 'ping';  // Default to ping scan (faster)
const ports = '22,80,443,3000,4000';  // Include common ports including Node.js server ports
const showOnlineOnly = true;  // Set to true to only show online hosts in results

console.log(`${colors.cyan}Docker client initialized - attempting connection to scan ${ipRange}${colors.reset}`);

// Helper function to format output sections
const printHeader = (text) => {
    console.log(`\n${colors.bright}${colors.magenta}=== ${text} ===${colors.reset}\n`);
};

// Enhanced nmap scan with OS detection and better output parsing
async function runNmapScan() {
    printHeader(`RUNNING ENHANCED NMAP SCAN FOR ${ipRange}`);
    
    try {
        // Store raw output for debugging
        let rawOutput = '';
        
        // Create a container for the NMAP scan with OS detection
        // Using specific parameters to get detailed OS fingerprinting
        const container = await docker.createContainer({
            Image: 'jonlabelle/network-tools',
            Cmd: [
                'nmap',
                '-O',                              // OS detection flag
                '--osscan-guess',                  // More aggressive OS detection
                '-v',                              // Verbose output
                '--version-all',                   // Detailed version detection
                '-T4',                             // Faster timing template
                '--max-os-tries=1',                // Limit OS tries for faster scan of large range
                '--max-retries=1',                 // Limit retries for faster scan
                '--host-timeout=30s',              // Don't spend too long on unresponsive hosts
                '-p', ports,                       // Ports to scan
                ipRange                            // Target IP range
            ],
            Tty: true,
            HostConfig: {
                NetworkMode: 'bridge',
            }
        });

        console.log(`${colors.yellow}Container created, starting scan of ${ipRange}...${colors.reset}`);
        await container.start();
        
        // Wait for the scan to complete
        console.log(`${colors.yellow}Scan in progress, please wait...${colors.reset}`);
        await container.wait();
        console.log(`${colors.green}Scan completed, processing results...${colors.reset}`);
        
        // Get the scan output
        const output = await container.logs({
            stdout: true,
            stderr: true
        });
        
        // Store raw output
        rawOutput = output.toString();
        
        // Print raw output first for debugging
        printHeader("RAW NMAP OUTPUT");
        console.log(rawOutput);
        
        // Then parse and display structured results
        printHeader("STRUCTURED SCAN RESULTS");
        const hosts = parseNmapOutput(rawOutput);
        displayResults(hosts);
        
        // Clean up the container
        await container.remove();
        console.log(`\n${colors.blue}Test container removed${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.red}Error:${colors.reset}`, error.message);
        if (error.stack) {
            console.error(colors.dim, error.stack, colors.reset);
        }
    }
}

// Ping scan (-sn) function to discover hosts without port scanning
async function runPingScan() {
    printHeader(`RUNNING PING SCAN (-sn) FOR ${ipRange}`);
      try {
        // Store raw output for debugging
        let rawOutput = '';
        // ACTUAL PING SCAN: This properly performs host discovery to find only active hosts
        // Previously this was incorrectly configured as a full port scan
        const container = await docker.createContainer({
            Image: 'jonlabelle/network-tools',
            Cmd: [
                'nmap',
                '-sn',                            // Ping scan - No port scan, host discovery only
                '-PR',                            // ARP scan for local network (faster and more reliable)
                '--reason',                       // Show reason a host is up or down
                '-T4',                            // Faster timing template
                ipRange                           // Target IP range
            ],
            Tty: true,
            HostConfig: {
                NetworkMode: 'host',              // Try host networking mode to improve ARP discovery
            }
        });

        console.log(`${colors.yellow}Container created, starting ping scan of ${ipRange}...${colors.reset}`);
        await container.start();
        
        // Wait for the scan to complete
        console.log(`${colors.yellow}Ping scan in progress, please wait...${colors.reset}`);
        await container.wait();
        console.log(`${colors.green}Ping scan completed, processing results...${colors.reset}`);
        
        // Get the scan output
        const output = await container.logs({
            stdout: true,
            stderr: true
        });
        
        // Store raw output
        rawOutput = output.toString();
        
        // Print raw output
        printHeader("RAW PING SCAN OUTPUT");
        console.log(rawOutput);
        
        // Then parse and display structured results
        printHeader("STRUCTURED PING SCAN RESULTS");
        const hosts = parseNmapOutput(rawOutput);
        displayPingScanResults(hosts);
        
        // Clean up the container
        await container.remove();
        console.log(`\n${colors.blue}Ping scan container removed${colors.reset}`);
        
        return hosts;
    } catch (error) {
        console.error(`${colors.red}Ping Scan Error:${colors.reset}`, error.message);
        if (error.stack) {
            console.error(colors.dim, error.stack, colors.reset);
        }
        return [];
    }
}

// Parse nmap output into structured host objects
function parseNmapOutput(output) {
    const lines = output.split('\n');
    const hosts = [];
    let currentHost = null;
    let currentOSSection = false;
    
    lines.forEach((line, index) => {
        // New host detection
        if (line.includes('Nmap scan report for')) {
            if (currentHost) {
                hosts.push(currentHost);
            }
            const ip = line.split('Nmap scan report for ')[1].trim();
            currentHost = { 
                ip,
                status: 'unknown',
                ports: [],
                osInfo: [],
                osDetails: {
                    name: null,
                    accuracy: null,
                    uptime: null,
                    uptimeLastBoot: null,
                    networkDistance: null,
                    tcpSequence: null,
                    ipIdSequence: null,
                    serviceInfo: null
                },
                mac: null,
                vendor: null
            };
            currentOSSection = false;
        }
        // MAC Address detection
        else if (line.includes('MAC Address:')) {
            const parts = line.split('MAC Address: ')[1].split(' ');
            currentHost.mac = parts[0];
            currentHost.vendor = parts.slice(1).join(' ').trim();
            // Remove parentheses if present
            if (currentHost.vendor.startsWith('(') && currentHost.vendor.endsWith(')')) {
                currentHost.vendor = currentHost.vendor.substring(1, currentHost.vendor.length - 1);
            }
        }
        // Host status
        else if (line.includes('Host is up')) {
            currentHost.status = 'up';
            // Extract latency if available
            const latencyMatch = line.match(/\(([0-9.]+)s latency\)/);
            if (latencyMatch) {
                currentHost.latency = parseFloat(latencyMatch[1]);
            }
        }
        // Port information
        else if (line.match(/^\d+\/tcp/) || line.match(/^\d+\/udp/)) {
            currentHost.ports.push(line.trim());
        }
        // Detect start of OS detection section
        else if (line.includes('OS detection performed.') || line.includes('OS fingerprint:')) {
            currentOSSection = true;
        }
        // OS detection information - capture more formats and edge cases
        else if (currentOSSection || 
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
            
            // Save the raw OS info line
            if (line.trim()) {
                currentHost.osInfo.push(line.trim());
            }
            
            // Extract structured OS information
            if (line.includes('OS details:')) {
                const osDetails = line.split('OS details:')[1].trim();
                currentHost.osDetails.name = osDetails;
            }
            else if (line.includes('Accuracy:')) {
                const accuracyMatch = line.match(/Accuracy:\s*(\d+)/i);
                if (accuracyMatch) {
                    currentHost.osDetails.accuracy = parseInt(accuracyMatch[1]);
                }
            }
            else if (line.includes('Uptime guess:')) {
                const uptimeMatch = line.match(/Uptime guess:\s*([\d.]+)\s*(\w+)/i);
                if (uptimeMatch) {
                    currentHost.osDetails.uptime = `${uptimeMatch[1]} ${uptimeMatch[2]}`;
                }
                
                // Extract last boot time if present
                const bootTimeMatch = line.match(/\(since\s+(.*?)\)/i);
                if (bootTimeMatch) {
                    currentHost.osDetails.uptimeLastBoot = bootTimeMatch[1];
                }
            }
            else if (line.includes('Network Distance:')) {
                const distanceMatch = line.match(/Network Distance:\s*(\d+)\s*hops?/i);
                if (distanceMatch) {
                    currentHost.osDetails.networkDistance = `${distanceMatch[1]} hops`;
                }
            }
            else if (line.includes('TCP Sequence Prediction:')) {
                const tcpSeqMatch = line.match(/TCP Sequence Prediction:\s*(.*)/i);
                if (tcpSeqMatch) {
                    currentHost.osDetails.tcpSequence = tcpSeqMatch[1];
                }
            }
            else if (line.includes('IP ID Sequence Generation:')) {
                const ipIdMatch = line.match(/IP ID Sequence Generation:\s*(.*)/i);
                if (ipIdMatch) {
                    currentHost.osDetails.ipIdSequence = ipIdMatch[1];
                }
            }
            else if (line.includes('Service Info:')) {
                const serviceInfoMatch = line.match(/Service Info:\s*(.*)/i);
                if (serviceInfoMatch) {
                    currentHost.osDetails.serviceInfo = serviceInfoMatch[1];
                }
            }
            // Look ahead for additional OS info spans
            else if (currentOSSection && line.match(/^\w+:/)) {
                // Capture "Running:" or other OS fingerprinting keys
                const key = line.split(':')[0].trim();
                const value = line.split(':')[1].trim();
                
                if (key && value) {
                    if (!currentHost.osDetails.name && (key === 'Running' || key === 'OS')) {
                        currentHost.osDetails.name = value;
                    }
                }
            }
        }
    });
    
    // Add the last host
    if (currentHost) {
        hosts.push(currentHost);
    }
    
    return hosts;
}

// Display parsed results in a readable format
function displayResults(hosts) {
    printHeader(`SCAN RESULTS SUMMARY (${hosts.length} hosts)`);
    
    if (hosts.length === 0) {
        console.log(`${colors.red}No hosts discovered${colors.reset}`);
        return;
    }
    
    // Count metrics
    let onlineHosts = 0;
    let sshHosts = 0;
    let hostsWithOS = 0;
    
    hosts.forEach((host, index) => {
        const isUp = host.status === 'up';
        if (isUp) onlineHosts++;
        
        const hasSSH = host.ports.some(port => port.includes('22/tcp') && port.includes('open') && port.includes('ssh'));
        if (hasSSH) sshHosts++;
        
        if (host.osInfo.length > 0) hostsWithOS++;
        
        if (showOnlineOnly && !isUp) {
            return;
        }
        
        console.log(`\n${colors.cyan}Host ${index + 1}:${colors.reset} ${host.ip}`);
        console.log(`${colors.dim}----------------------------------------${colors.reset}`);
        console.log(`${colors.bright}Status:${colors.reset} ${isUp ? colors.green + 'Online' + colors.reset : colors.red + 'Offline' + colors.reset}`);
        
        if (host.mac) {
            console.log(`${colors.bright}MAC:${colors.reset} ${host.mac}`);
        }
        
        if (host.vendor) {
            console.log(`${colors.bright}Vendor:${colors.reset} ${host.vendor}`);
        }
        
        if (host.latency) {
            console.log(`${colors.bright}Latency:${colors.reset} ${host.latency.toFixed(3)}s`);
        }
        
        if (host.ports.length > 0) {
            console.log(`\n${colors.bright}Open Ports:${colors.reset}`);
            host.ports.forEach(port => {
                // Colorize SSH ports
                if (port.includes('ssh') && port.includes('open')) {
                    console.log(`  ${colors.green}${port}${colors.reset}`);
                } else if (port.includes('open')) {
                    console.log(`  ${colors.yellow}${port}${colors.reset}`);
                } else {
                    console.log(`  ${port}`);
                }
            });
        } else {
            console.log(`\n${colors.bright}Ports:${colors.reset} No open ports detected`);
        }
        
        // Enhanced OS Information Display
        if (host.osInfo.length > 0) {
            console.log(`\n${colors.bright}${colors.blue}Operating System Information:${colors.reset}`);
            
            // Display structured OS details first if available
            const osDetails = host.osDetails;
            const hasStructuredOsInfo = Object.values(osDetails).some(val => val !== null);
            
            if (hasStructuredOsInfo) {
                if (osDetails.name) {
                    console.log(`  ${colors.bright}OS:${colors.reset} ${colors.green}${osDetails.name}${colors.reset}`);
                }
                if (osDetails.accuracy) {
                    console.log(`  ${colors.bright}Accuracy:${colors.reset} ${osDetails.accuracy}%`);
                }
                if (osDetails.uptime) {
                    console.log(`  ${colors.bright}Uptime Estimate:${colors.reset} ${osDetails.uptime}`);
                    if (osDetails.uptimeLastBoot) {
                        console.log(`  ${colors.bright}Last Boot:${colors.reset} ${osDetails.uptimeLastBoot}`);
                    }
                }
                if (osDetails.networkDistance) {
                    console.log(`  ${colors.bright}Network Distance:${colors.reset} ${osDetails.networkDistance}`);
                }
                if (osDetails.tcpSequence) {
                    console.log(`  ${colors.bright}TCP Sequence:${colors.reset} ${osDetails.tcpSequence}`);
                }
                if (osDetails.ipIdSequence) {
                    console.log(`  ${colors.bright}IP ID Sequence:${colors.reset} ${osDetails.ipIdSequence}`);
                }
                if (osDetails.serviceInfo) {
                    console.log(`  ${colors.bright}Service Info:${colors.reset} ${osDetails.serviceInfo}`);
                }
                
                console.log(`\n  ${colors.dim}Raw OS Information:${colors.reset}`);
            }
            
            // Display raw OS info lines
            host.osInfo.forEach(info => {
                console.log(`  ${colors.blue}${info}${colors.reset}`);
            });
        } else {
            console.log(`\n${colors.bright}OS Information:${colors.reset} No OS information detected`);
        }
    });
    
    // Print summary statistics
    printHeader(`SCAN STATISTICS`);
    console.log(`${colors.cyan}Total Hosts:${colors.reset} ${hosts.length}`);
    console.log(`${colors.green}Online Hosts:${colors.reset} ${onlineHosts}`);
    console.log(`${colors.yellow}Hosts with SSH:${colors.reset} ${sshHosts}`);
    console.log(`${colors.blue}Hosts with OS Detection:${colors.reset} ${hostsWithOS}`);
}

// Display ping scan results in a simplified format
function displayPingScanResults(hosts) {
    const onlineHosts = hosts.filter(host => host.status === 'up');
    
    printHeader(`PING SCAN RESULTS SUMMARY (${onlineHosts.length} online hosts)`);
    
    if (onlineHosts.length === 0) {
        console.log(`${colors.red}No online hosts discovered${colors.reset}`);
        return;
    }
    
    console.log(`${colors.bright}Online Hosts:${colors.reset}`);
    onlineHosts.forEach((host, index) => {
        let hostInfo = `${colors.green}${index + 1}. ${host.ip}${colors.reset}`;
        
        if (host.latency) {
            hostInfo += ` - ${host.latency.toFixed(3)}s latency`;
        }
        
        if (host.mac) {
            hostInfo += ` - MAC: ${host.mac}`;
        }
        
        if (host.vendor) {
            hostInfo += ` (${host.vendor})`;
        }
        
        console.log(hostInfo);
    });
}

// Run the appropriate scan type based on environment variables
async function runScans() {
    try {
        if (scanType === 'os') {
            // Run full OS scan
            await runNmapScan();
        } else {
            // Default to ping scan which includes MAC addresses and vendor info
            const pingScanHosts = await runPingScan();
        }
        
    } catch (error) {
        console.error(`${colors.red}Error running scans:${colors.reset}`, error.message);
    }
}

// Run the test
runScans();