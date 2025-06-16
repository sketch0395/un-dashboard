// Test script to verify port handling fixes
import { getDeviceStatus, formatPorts, isSSHAvailable } from './src/app/networkscan/networkviews/NetworkViewUtils.js';

// Test data with different port formats
const testDevices = [
    {
        ip: '192.168.1.1',
        ports: ['22/tcp open ssh', '80/tcp open http', '443/tcp open https']
    },
    {
        ip: '192.168.1.2', 
        ports: [
            { port: 22, state: 'open', service: 'ssh' },
            { port: 80, state: 'closed', service: 'http' },
            { port: 443, state: 'open', service: 'https' }
        ]
    },
    {
        ip: '192.168.1.3',
        ports: [22, 80, 443]
    },
    {
        ip: '192.168.1.4',
        ports: []
    }
];

console.log('Testing port handling fixes...\n');

testDevices.forEach((device, index) => {
    console.log(`Device ${index + 1} (${device.ip}):`);
    console.log(`  Port format: ${typeof device.ports[0] || 'empty'}`);
    
    try {
        const status = getDeviceStatus(device);
        console.log(`  Status: ${status}`);
        
        const sshAvailable = isSSHAvailable(device);
        console.log(`  SSH Available: ${sshAvailable}`);
        
        const formattedPorts = formatPorts(device.ports);
        console.log(`  Formatted Ports: ${formattedPorts}`);
        
        console.log('  ✅ No errors');
    } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
});

console.log('Port handling test completed!');
