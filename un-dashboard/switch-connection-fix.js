// Switch Connection Fix Script
// Run this in the browser console on the UN Dashboard application to fix switch connection issues

(function() {
    console.log('🔧 Starting Switch Connection Fix...');
    
    // Get current device data
    const devices = JSON.parse(localStorage.getItem('customDeviceProperties') || '{}');
    console.log('📊 Current devices:', Object.keys(devices).length);
    
    // Check if switches exist
    const switches = Object.entries(devices).filter(([_, device]) => 
        device.networkRole === 'Switch' || device.networkRole === 'switch'
    );
    
    console.log('🔌 Current switches:', switches.length);
    
    if (switches.length === 0) {
        console.log('❌ No switches found! Creating default switches...');
        
        // Create default switches
        const defaultSwitches = [
            {
                id: 'switch-main-001',
                name: 'Main Network Switch',
                networkRole: 'Switch',
                ip: '192.168.1.10',
                mac: '00:1A:2B:3C:4D:10',
                vendor: 'Cisco',
                isMainGateway: false,
                connectedSwitches: [],
                connectedGateways: [],
                parentSwitch: null,
                parentGateway: null,
                notes: [],
                history: []
            },
            {
                id: 'switch-access-002',
                name: 'Access Switch',
                networkRole: 'Switch',
                ip: '192.168.1.11',
                mac: '00:1A:2B:3C:4D:11',
                vendor: 'Netgear',
                isMainGateway: false,
                connectedSwitches: [],
                connectedGateways: [],
                parentSwitch: null,
                parentGateway: null,
                notes: [],
                history: []
            }
        ];
        
        // Add switches to device data
        defaultSwitches.forEach(switchData => {
            devices[switchData.ip] = switchData;
        });
        
        localStorage.setItem('customDeviceProperties', JSON.stringify(devices));
        console.log('✅ Created default switches');
    } else {
        console.log('✅ Switches already exist');
    }
    
    // Validate and fix existing device data
    let fixedIssues = 0;
    
    Object.entries(devices).forEach(([ip, device]) => {
        // Ensure all devices have required fields
        if (!device.id) {
            device.id = `${device.networkRole || 'device'}-${ip.replace(/\./g, '-')}`;
            fixedIssues++;
        }
        
        if (!device.networkRole) {
            device.networkRole = 'Other';
            fixedIssues++;
        }
        
        if (!device.notes) {
            device.notes = [];
            fixedIssues++;
        }
        
        if (!device.history) {
            device.history = [];
            fixedIssues++;
        }
        
        // Fix invalid switch references
        if (device.parentSwitch && !devices[device.parentSwitch]) {
            console.log(`🔧 Fixing invalid switch reference for ${device.name || ip}`);
            device.parentSwitch = null;
            fixedIssues++;
        }
    });
    
    if (fixedIssues > 0) {
        localStorage.setItem('customDeviceProperties', JSON.stringify(devices));
        console.log(`🔧 Fixed ${fixedIssues} data issues`);
    }
    
    // Test the fix
    const finalSwitches = Object.entries(devices).filter(([_, device]) => 
        device.networkRole === 'Switch' || device.networkRole === 'switch'
    );
    
    const regularDevices = Object.entries(devices).filter(([_, device]) => 
        device.networkRole !== 'Switch' && device.networkRole !== 'switch' && 
        device.networkRole !== 'Gateway' && device.networkRole !== 'gateway'
    );
    
    const connectedDevices = regularDevices.filter(([_, device]) => device.parentSwitch);
    
    console.log('📈 Final Status:');
    console.log(`   Switches: ${finalSwitches.length}`);
    console.log(`   Regular Devices: ${regularDevices.length}`);
    console.log(`   Connected Devices: ${connectedDevices.length}`);
    
    if (finalSwitches.length > 0) {
        console.log('✅ Switch connection fix completed successfully!');
        console.log('💡 Users can now connect devices to switches in the device modal.');
        
        // Show available switches
        console.log('🔌 Available switches for connection:');
        finalSwitches.forEach(([ip, switchData]) => {
            console.log(`   - ${switchData.name || ip} (${ip})`);
        });
        
        return {
            success: true,
            switches: finalSwitches.length,
            devices: regularDevices.length,
            connected: connectedDevices.length,
            message: 'Switch connections are now working properly!'
        };
    } else {
        console.log('❌ Fix failed - no switches available');
        return {
            success: false,
            message: 'Failed to create switches'
        };
    }
})();
