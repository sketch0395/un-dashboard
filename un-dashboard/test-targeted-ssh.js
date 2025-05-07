const Docker = require('dockerode');

// Configure Docker connection with the correct host and port
const docker = new Docker({
    protocol: 'http',
    host: '10.5.1.212',
    port: 2375  // Standard Docker API port
});

// Known IP range with SSH servers (from the previous successful test)
const ipRange = '10.5.1.1-100';  // Narrower range targeting just the known SSH devices
const ports = '22';  // Focus only on SSH port

// Log and handle errors consistently
const logError = (message, error) => {
    console.error(`[ERROR] ${message}:`, error.message);
    if (error.stack) {
        console.error(error.stack);
    }
};

// Colorize output
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m"
};

async function runTargetedSshScan() {
    console.log(`${colors.cyan}Starting targeted SSH detection scan for range: ${ipRange}${colors.reset}`);
    
    try {
        // Create a container specifically for this targeted SSH scan
        console.log(`${colors.yellow}Creating container for SSH scan...${colors.reset}`);
        const container = await docker.createContainer({
            Image: 'jonlabelle/network-tools',
            // Use a special set of flags optimized for SSH detection (but without -Pn for accuracy)
            Cmd: ['nmap', 
                  '-sS',                               // SYN scan
                  '-sV',                               // Version detection
                  '--script=ssh-auth-methods,ssh-hostkey', // SSH scripts
                  '-T4',                               // Aggressive timing
                  '--max-retries=1',                   // Limit retries 
                  '--host-timeout=15s',                // Don't spend too long on each host
                  '-p', ports,
                  ipRange],
            Tty: true,
            HostConfig: {
                NetworkMode: 'bridge',
            }
        });

        console.log(`${colors.green}Container created, starting SSH scan...${colors.reset}`);
        await container.start();
        
        // Wait for the scan to complete
        console.log(`${colors.yellow}Waiting for scan to complete...${colors.reset}`);
        await container.wait();
        console.log(`${colors.green}Scan completed, fetching results...${colors.reset}`);
        
        // Get the scan output
        const output = await container.logs({
            stdout: true,
            stderr: true
        });
        
        console.log(`\n${colors.magenta}=== TARGETED SSH SCAN RESULTS ===${colors.reset}`);
        console.log(output.toString());
        
        // Process the results to find SSH servers
        const lines = output.toString().split('\n');
        
        // Extract IP addresses with open SSH ports
        let currentIp = '';
        const sshHosts = [];
        
        lines.forEach(line => {
            if (line.includes('Nmap scan report for')) {
                currentIp = line.split('Nmap scan report for ')[1].trim();
            } else if (line.includes('22/tcp') && line.includes('open') && line.includes('ssh')) {
                sshHosts.push({
                    ip: currentIp,
                    details: line.trim()
                });
            }
        });
        
        console.log(`\n${colors.green}=== DETECTED SSH SERVERS ===${colors.reset}`);
        if (sshHosts.length > 0) {
            sshHosts.forEach(host => {
                console.log(`${colors.cyan}${host.ip}${colors.reset} - ${colors.green}${host.details}${colors.reset}`);
            });
            console.log(`\n${colors.green}Found ${sshHosts.length} SSH servers${colors.reset}`);
        } else {
            console.log(`${colors.red}No SSH services detected${colors.reset}`);
        }
        
        // Clean up the container
        await container.remove();
        console.log(`\n${colors.blue}Test container removed${colors.reset}`);
        
    } catch (error) {
        logError('SSH scan failed', error);
    }
}

// Run the test and exit when done
console.log(`${colors.cyan}=== TARGETED SSH DETECTION TEST ===${colors.reset}`);
runTargetedSshScan().then(() => {
    console.log(`${colors.blue}Test completed${colors.reset}`);
});