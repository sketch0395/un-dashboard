const Docker = require('dockerode');

// Configure Docker connection with the correct host and port
const docker = new Docker({
    protocol: 'http',
    host: '10.5.1.212',
    port: 2375  // Standard Docker API port
});

// Test IP or range to scan - change as needed
const ipRange = '10.5.1.1-255';  // Full subnet scan
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

async function runNmapSshScan() {
    console.log(`${colors.cyan}Starting enhanced SSH detection scan for range: ${ipRange}${colors.reset}`);
    
    try {
        // Create a container for the enhanced SSH scan
        console.log(`${colors.yellow}Creating container for SSH scan...${colors.reset}`);
        const container = await docker.createContainer({
            Image: 'jonlabelle/network-tools',
            // FAST SCAN: Specialized and optimized scan just for SSH detection
            // This scan is very fast because it only targets SSH-related ports and behaviors
            // -Pn: Skip host discovery
            // -sS: SYN scan (faster and less intrusive)
            // -sV: Version detection (helps identify SSH servers)
            // --script=ssh-auth-methods: Run SSH authentication method detection script
            // -T4: Use aggressive timing template
            // --max-retries=2: Limit retries for better performance
            // --host-timeout=30s: Limit time spent on each host
            // -p 22: Focus only on SSH port
            Cmd: ['nmap', '-Pn', '-sS', '-sV', '--script=ssh-auth-methods,ssh-hostkey', '-T4', '--max-retries=2', '--host-timeout=30s', '-p', ports, ipRange],
            Tty: true,
            HostConfig: {
                NetworkMode: 'bridge',
            }
        });

        console.log(`${colors.green}Container created, starting SSH scan...${colors.reset}`);
        await container.start();
        
        // Wait for the scan to complete
        console.log(`${colors.yellow}Waiting for scan to complete (this may take a few minutes)...${colors.reset}`);
        await container.wait();
        console.log(`${colors.green}Scan completed, fetching results...${colors.reset}`);
        
        // Get the scan output
        const output = await container.logs({
            stdout: true,
            stderr: true
        });
        
        console.log(`\n${colors.magenta}=== NMAP SSH SCAN RESULTS ===${colors.reset}`);
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

// Run the test
console.log(`${colors.cyan}=== ENHANCED SSH DETECTION TEST ===${colors.reset}`);
runNmapSshScan();