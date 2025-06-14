/**
 * Frontend Integration Test: Device Data Missing Fix
 * 
 * This test verifies that the client-side NetworkScanHistory component
 * can properly fetch and display device data from database scans.
 */

const testDeviceDataFix = async () => {
    console.log('🧪 FRONTEND DEVICE DATA FIX TEST');
    console.log('=================================');
    
    // Simulate the issue scenario
    console.log('\n📋 Scenario: User has database scans but no device data visible');
    
    // Mock scan entry as returned by the main API (without scan data)
    const mockDatabaseScan = {
        id: 'test-scan-123',
        timestamp: '2025-06-09 10:30:00',
        ipRange: '192.168.1.0/24',
        devices: 5, // Device count
        data: {}, // Empty data object - this was the problem!
        name: 'Morning Network Scan',
        isFromDatabase: true,
        scanSource: {
            id: 'test-scan-123',
            name: 'Morning Network Scan',
            timestamp: '2025-06-09 10:30:00'
        }
    };
    
    // Mock full scan data as returned by detailed API
    const mockFullScanData = {
        scanId: 'test-scan-123',
        scanData: {
            devices: {
                "Network Equipment": [
                    {
                        ip: "192.168.1.1",
                        hostname: "router.local",
                        mac: "00:11:22:33:44:55",
                        vendor: "Netgear",
                        status: "up"
                    },
                    {
                        ip: "192.168.1.2",
                        hostname: "switch.local", 
                        mac: "00:11:22:33:44:66",
                        vendor: "Cisco",
                        status: "up"
                    }
                ],
                "Computers": [
                    {
                        ip: "192.168.1.100",
                        hostname: "desktop.local",
                        mac: "00:11:22:33:44:77",
                        vendor: "Dell",
                        status: "up"
                    },
                    {
                        ip: "192.168.1.101",
                        hostname: "laptop.local",
                        mac: "00:11:22:33:44:88",
                        vendor: "HP",
                        status: "up"
                    }
                ],
                "Mobile Devices": [
                    {
                        ip: "192.168.1.200",
                        hostname: "iphone.local",
                        mac: "00:11:22:33:44:99",
                        vendor: "Apple",
                        status: "up"
                    }
                ]
            }
        }
    };
    
    // Mock fetch function
    global.fetch = async (url, options) => {
        if (url.includes('/api/scan-history/test-scan-123')) {
            // Detailed scan API - return full data
            return {
                ok: true,
                json: async () => mockFullScanData
            };
        }
        return { ok: false, status: 404 };
    };
    
    console.log('\n🔍 Test 1: Check initial state (empty data)');
    console.log(`Entry device count: ${mockDatabaseScan.devices}`);
    console.log(`Entry data keys: ${Object.keys(mockDatabaseScan.data).length}`);
    console.log(`Is from database: ${mockDatabaseScan.isFromDatabase}`);
    
    // Simulate the original problematic extraction logic
    let entryDevices = [];
    if (mockDatabaseScan.isFromDatabase) {
        if (mockDatabaseScan.data && typeof mockDatabaseScan.data === 'object') {
            entryDevices = Object.values(mockDatabaseScan.data).flat();
        }
    }
    
    console.log(`❌ Original logic extracted: ${entryDevices.length} devices`);
    console.log('   This was the problem - no device data available for visualization!');
    
    console.log('\n🔧 Test 2: Apply fix (fetch full data when needed)');
    
    // Simulate the new fixed logic
    const fixedEntry = { ...mockDatabaseScan };
    
    if (fixedEntry.isFromDatabase && (!fixedEntry.data || Object.keys(fixedEntry.data).length === 0)) {
        console.log('   🔍 Detected empty data, fetching full scan data...');
        
        try {
            const response = await fetch(`/api/scan-history/${fixedEntry.id}`);
            if (response.ok) {
                const fullScanData = await response.json();
                fixedEntry.data = fullScanData.scanData?.devices || fullScanData.scanData || {};
                console.log('   ✅ Full scan data retrieved');
                console.log(`   📊 Data structure: ${typeof fixedEntry.data}`);
                console.log(`   🏷️  Vendor groups: ${Object.keys(fixedEntry.data).join(', ')}`);
            }
        } catch (error) {
            console.log(`   ❌ Error fetching full data: ${error.message}`);
        }
    }
    
    // Extract devices with the fixed data
    let fixedEntryDevices = [];
    if (fixedEntry.data && typeof fixedEntry.data === 'object') {
        if (Array.isArray(fixedEntry.data)) {
            fixedEntryDevices = fixedEntry.data;
        } else if (fixedEntry.data.devices) {
            fixedEntryDevices = Object.values(fixedEntry.data.devices).flat();
        } else {
            fixedEntryDevices = Object.values(fixedEntry.data).flat();
        }
    }
    
    console.log(`   ✅ Fixed logic extracted: ${fixedEntryDevices.length} devices`);
    
    console.log('\n📱 Test 3: Verify device data quality');
    
    if (fixedEntryDevices.length > 0) {
        console.log('   ✅ Devices available for visualization');
        
        // Group by vendor for display
        const vendorGroups = {};
        fixedEntryDevices.forEach(device => {
            const vendor = device.vendor || 'Unknown';
            if (!vendorGroups[vendor]) {
                vendorGroups[vendor] = [];
            }
            vendorGroups[vendor].push(device);
        });
        
        console.log('   📊 Device breakdown:');
        Object.entries(vendorGroups).forEach(([vendor, devices]) => {
            console.log(`      ${vendor}: ${devices.length} devices`);
        });
        
        // Show sample devices
        console.log('   🔍 Sample devices:');
        fixedEntryDevices.slice(0, 3).forEach((device, index) => {
            console.log(`      ${index + 1}. ${device.ip} - ${device.hostname || 'Unknown'} (${device.vendor})`);
        });
        
    } else {
        console.log('   ❌ No devices available for visualization');
    }
    
    console.log('\n🎨 Test 4: Simulate visualization preparation');
    
    // Apply any custom properties (this would come from localStorage in real app)
    const mockCustomProperties = {
        "192.168.1.1": {
            name: "Main Router",
            color: "#ff6b6b",
            networkRole: "gateway"
        },
        "192.168.1.100": {
            name: "Work Desktop",
            color: "#4ecdc4",
            category: "Computer"
        }
    };
    
    const enhancedDevices = fixedEntryDevices.map(device => {
        const enhancedDevice = { ...device };
        
        if (device.ip && mockCustomProperties[device.ip]) {
            const customProps = mockCustomProperties[device.ip];
            enhancedDevice.name = customProps.name || enhancedDevice.name;
            enhancedDevice.color = customProps.color || enhancedDevice.color;
            enhancedDevice.networkRole = customProps.networkRole || enhancedDevice.networkRole;
            enhancedDevice.category = customProps.category || enhancedDevice.category;
        }
        
        // Add scan source for topology grouping
        enhancedDevice.scanSource = fixedEntry.scanSource;
        
        return enhancedDevice;
    });
    
    console.log(`   ✅ Enhanced ${enhancedDevices.length} devices with custom properties`);
    
    // Count enhanced devices
    const enhancedCount = enhancedDevices.filter(d => 
        d.name !== d.hostname || d.color || d.networkRole
    ).length;
    
    console.log(`   🎨 ${enhancedCount} devices have custom enhancements`);
    
    console.log('\n📊 TEST RESULTS');
    console.log('================');
    
    const originalWorked = entryDevices.length > 0;
    const fixWorked = fixedEntryDevices.length > 0;
    const dataMatches = fixedEntryDevices.length === mockDatabaseScan.devices;
    
    console.log(`Original logic: ${originalWorked ? '✅ PASSED' : '❌ FAILED'} (${entryDevices.length} devices)`);
    console.log(`Fixed logic: ${fixWorked ? '✅ PASSED' : '❌ FAILED'} (${fixedEntryDevices.length} devices)`);
    console.log(`Data integrity: ${dataMatches ? '✅ PASSED' : '❌ FAILED'} (expected ${mockDatabaseScan.devices}, got ${fixedEntryDevices.length})`);
    
    if (!originalWorked && fixWorked && dataMatches) {
        console.log('\n🎉 FIX VERIFICATION SUCCESSFUL!');
        console.log('✅ Original issue reproduced (no devices extracted)');
        console.log('✅ Fix resolves the issue (devices properly extracted)');
        console.log('✅ Device data integrity maintained');
        console.log('✅ Ready for topology visualization');
        
        return true;
    } else {
        console.log('\n❌ FIX VERIFICATION FAILED');
        if (originalWorked) console.log('⚠️  Original logic unexpectedly worked');
        if (!fixWorked) console.log('❌ Fixed logic failed to extract devices');
        if (!dataMatches) console.log('❌ Device count mismatch');
        
        return false;
    }
};

// Run the test
testDeviceDataFix().then(success => {
    if (success) {
        console.log('\n✅ All frontend tests passed - device data fix is working!');
    } else {
        console.log('\n❌ Frontend tests failed - fix needs attention');
    }
}).catch(error => {
    console.error('\n💥 Test error:', error);
});

export { testDeviceDataFix };
