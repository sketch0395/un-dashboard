// Test script to verify scan history functionality
const io = require('socket.io-client');

// Connect to the network server
const socket = io('http://localhost:4000');

socket.on('connect', () => {
    console.log('Connected to network server');
    
    // Test the scan history event
    console.log('Testing saveToScanHistory event...');
    
    // Simulate what the server should emit after a scan
    const testScanData = {
        devices: [
            {
                ip: '192.168.1.1',
                mac: '00:11:22:33:44:55',
                hostname: 'router.local',
                vendor: 'Test Vendor',
                ports: [{ port: 80, state: 'open', service: 'http' }]
            },
            {
                ip: '192.168.1.100',
                mac: '00:11:22:33:44:66',
                hostname: 'desktop.local',
                vendor: 'Another Vendor',
                ports: [{ port: 22, state: 'open', service: 'ssh' }]
            }
        ],
        ipRange: '192.168.1.0/24',
        timestamp: new Date().toISOString()
    };
    
    console.log('Emitting saveToScanHistory with test data:', testScanData);
    socket.emit('saveToScanHistory', testScanData);
    
    // Wait a bit then disconnect
    setTimeout(() => {
        console.log('Test complete, disconnecting...');
        socket.disconnect();
    }, 1000);
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    process.exit(0);
});
