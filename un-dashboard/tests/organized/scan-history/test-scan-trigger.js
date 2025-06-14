const io = require('socket.io-client');

console.log('🔌 Connecting to network server at http://localhost:4000...');

const socket = io('http://localhost:4000', {
    transports: ['polling'], // Use polling to avoid websocket issues
    timeout: 10000,
    reconnectionAttempts: 3,
    reconnectionDelay: 1000
});

console.log('📡 Socket.IO client created, waiting for connection...');

socket.on('connect', () => {
    console.log('✓ Connected to network server');
    
    // Trigger a small scan to test our fixes
    console.log('🔍 Starting test scan...');
    socket.emit('startNetworkScan', {
        range: '127.0.0.1',  // Just scan localhost to minimize impact
        useDocker: true,      // Use Docker for safety
        scanType: 'ping'      // Fast ping scan
    });
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
});

socket.on('networkScanStatus', (data) => {
    console.log('📊 Scan Status:', data.status);
    if (data.error) {
        console.error('❌ Scan Error:', data.error);
    }
    if (data.output) {
        console.log('📝 Scan Output:', data.output);
    }
});

socket.on('networkScanComplete', (data) => {
    console.log('✅ Scan Complete!');
    console.log('📈 Results:', Object.keys(data.devices || {}).length, 'vendor groups found');
    
    // Count total devices
    let deviceCount = 0;
    if (data.devices) {
        Object.values(data.devices).forEach(group => {
            if (Array.isArray(group)) {
                deviceCount += group.length;
            }
        });
    }
    console.log('🖥️  Total devices:', deviceCount);
});

socket.on('saveToScanHistory', (data) => {
    console.log('💾 saveToScanHistory event received!');
    console.log('📊 Data structure:', {
        hasDevices: !!data.devices,
        ipRange: data.ipRange,
        timestamp: data.timestamp,
        deviceKeys: data.devices ? Object.keys(data.devices) : []
    });
    
    // This is what we fixed - the server should now emit this event
    console.log('✅ SUCCESS: saveToScanHistory event is being emitted by server!');
});

socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server');
});

// Auto-disconnect after 30 seconds
setTimeout(() => {
    console.log('⏰ Test timeout, disconnecting...');
    socket.disconnect();
    process.exit(0);
}, 30000);
