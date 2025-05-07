const Docker = require('dockerode');

// Try a different connection approach - direct HTTP API
const docker = new Docker({
    protocol: 'http',
    host: '10.5.1.212',
    port: 2375 // Standard Docker daemon port
});

console.log('Docker client initialized - attempting connection');

// Test IP or range to scan - change as needed
const ipRange = '10.5.1.130-140';
const ports = '22,80,443';

async function runNmapScan() {
    console.log(`Starting NMAP scan for range: ${ipRange}`);
    
    try {
        // Create a container for the NMAP scan
        const container = await docker.createContainer({
            Image: 'jonlabelle/network-tools',
            Cmd: ['nmap', '-Pn', '-sS', '-sV', '-T4', '--script=ssh-auth-methods', '-p', ports, ipRange],
            Tty: true,
            HostConfig: {
                NetworkMode: 'bridge', // Use bridge mode for Windows
            }
        });

        console.log('Container created, starting scan...');
        await container.start();
        
        // Wait for the scan to complete
        await container.wait();
        console.log('Scan completed, fetching results...');
        
        // Get the scan output
        const output = await container.logs({
            stdout: true,
            stderr: true
        });
        
        console.log('Scan Results:');
        console.log(output.toString());
        
        // Look for SSH ports in the output
        const lines = output.toString().split('\n');
        const sshLines = lines.filter(line => 
            line.includes('22/tcp') && 
            !line.includes('filtered') && 
            !line.includes('closed')
        );
        
        console.log('\nDetected SSH services:');
        if (sshLines.length > 0) {
            sshLines.forEach(line => console.log(line));
        } else {
            console.log('No SSH services detected');
        }
        
        // Clean up the container
        await container.remove();
        console.log('Test container removed');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the test
runNmapScan();