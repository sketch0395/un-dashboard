// Direct topology display investigation
// This script will help identify what's happening with topology display in collaboration mode

console.log('🔍 TOPOLOGY DISPLAY INVESTIGATION');
console.log('='.repeat(50));

const fs = require('fs');

async function investigateTopologyDisplay() {
    try {
        console.log('📊 1. Checking for existing scan history...');
        
        // Test API endpoint directly
        const response = await fetch('http://localhost:3000/api/scan-history');
        console.log('📡 API Response Status:', response.status);
        
        if (response.ok) {
            const scans = await response.json();
            console.log('📋 Found', scans.length, 'scans in history');
            
            if (scans.length > 0) {
                console.log('\n📈 Analyzing scans for topology data...');
                
                scans.forEach((scan, index) => {
                    console.log(`\n   Scan ${index + 1}: ${scan.name || scan.scanId}`);
                    console.log(`   - Device count: ${scan.deviceCount || 'unknown'}`);
                    console.log(`   - Has scanData: ${!!scan.scanData}`);
                    console.log(`   - Has metadata: ${!!scan.metadata}`);
                    
                    if (scan.scanData) {
                        if (typeof scan.scanData === 'object') {
                            const vendorKeys = Object.keys(scan.scanData);
                            console.log(`   - Vendor groups: ${vendorKeys.join(', ')}`);
                            
                            // Count devices
                            let deviceCount = 0;
                            vendorKeys.forEach(vendor => {
                                if (Array.isArray(scan.scanData[vendor])) {
                                    deviceCount += scan.scanData[vendor].length;
                                    console.log(`     ${vendor}: ${scan.scanData[vendor].length} devices`);
                                } else if (vendor === 'devices' && Array.isArray(scan.scanData.devices)) {
                                    deviceCount += scan.scanData.devices.length;
                                    console.log(`     devices: ${scan.scanData.devices.length} devices`);
                                }
                            });
                            
                            console.log(`   - Total devices found: ${deviceCount}`);
                            
                            if (deviceCount > 0) {
                                console.log('   ✅ This scan has device data for topology!');
                            } else {
                                console.log('   ❌ This scan has no device data');
                            }
                        } else {
                            console.log(`   - scanData type: ${typeof scan.scanData}`);
                        }
                    }
                    
                    if (scan.metadata) {
                        console.log(`   - Has topology flag: ${!!scan.metadata.hasNetworkTopology}`);
                        console.log(`   - Device types: ${scan.metadata.deviceTypes || 'none'}`);
                    }
                });
                
                // Create test data if no valid topology scans exist
                const validTopologyScans = scans.filter(scan => {
                    if (!scan.scanData) return false;
                    
                    if (typeof scan.scanData === 'object') {
                        const vendorKeys = Object.keys(scan.scanData);
                        let hasDevices = false;
                        
                        vendorKeys.forEach(vendor => {
                            if (Array.isArray(scan.scanData[vendor]) && scan.scanData[vendor].length > 0) {
                                hasDevices = true;
                            } else if (vendor === 'devices' && Array.isArray(scan.scanData.devices) && scan.scanData.devices.length > 0) {
                                hasDevices = true;
                            }
                        });
                        
                        return hasDevices;
                    }
                    
                    return false;
                });
                
                console.log(`\n📊 Summary: ${validTopologyScans.length}/${scans.length} scans have valid topology data`);
                
                if (validTopologyScans.length === 0) {
                    console.log('\n🔧 Creating test topology data...');
                    await createTestTopologyData();
                } else {
                    console.log('\n✅ Valid topology data exists, issue may be in UI rendering');
                    await investigateUIRendering();
                }
                
            } else {
                console.log('\n🔧 No scans found, creating test topology data...');
                await createTestTopologyData();
            }
            
        } else {
            const errorText = await response.text();
            console.log('❌ API Error:', response.status, errorText);
            
            console.log('\n💡 TOPOLOGY DISPLAY DIAGNOSIS:');
            console.log('- API endpoint not responding correctly');
            console.log('- This could explain why topology is not displaying');
            console.log('- Server may be having issues serving scan history');
        }
        
    } catch (error) {
        console.error('❌ Investigation failed:', error.message);
        
        console.log('\n💡 TOPOLOGY DISPLAY DIAGNOSIS:');
        console.log('- Network connection to API failed');
        console.log('- This could explain missing topology in collaboration mode');
        console.log('- Check if collaboration mode affects API access');
    }
}

async function createTestTopologyData() {
    const testData = {
        scanId: 'topology-investigation-' + Date.now(),
        name: 'Topology Investigation Test',
        ipRange: '192.168.1.0/24',
        deviceCount: 4,
        scanData: {
            'Cisco': [
                {
                    ip: '192.168.1.1',
                    hostname: 'gateway',
                    mac: '00:11:22:33:44:01',
                    ports: [22, 80, 443],
                    vendor: 'Cisco',
                    deviceType: 'router'
                },
                {
                    ip: '192.168.1.10',
                    hostname: 'switch',
                    mac: '00:11:22:33:44:02',
                    ports: [22, 80, 161],
                    vendor: 'Cisco',
                    deviceType: 'switch'
                }
            ],
            'Dell': [
                {
                    ip: '192.168.1.100',
                    hostname: 'workstation1',
                    mac: '00:11:22:33:44:03',
                    ports: [22, 3389],
                    vendor: 'Dell',
                    deviceType: 'workstation'
                },
                {
                    ip: '192.168.1.101',
                    hostname: 'workstation2',
                    mac: '00:11:22:33:44:04',
                    ports: [22, 80],
                    vendor: 'Dell',
                    deviceType: 'workstation'
                }
            ]
        },
        metadata: {
            scanType: 'full',
            hasNetworkTopology: true,
            deviceTypes: ['router', 'switch', 'workstation']
        }
    };
    
    try {
        const response = await fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(testData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Test topology data created:', result.scanId || 'success');
            console.log('🌐 Now open http://localhost:3000/networkscan to test topology display');
            
            await investigateUIRendering();
        } else {
            const errorText = await response.text();
            console.log('❌ Failed to create test data:', response.status, errorText);
        }
    } catch (error) {
        console.log('❌ Error creating test data:', error.message);
    }
}

async function investigateUIRendering() {
    console.log('\n🎨 UI RENDERING INVESTIGATION:');
    console.log('='.repeat(40));
    
    console.log('📋 To manually check topology display:');
    console.log('1. Open http://localhost:3000/networkscan');
    console.log('2. Open browser console (F12)');
    console.log('3. Look for TopologyDebugger output (starts with "🔍 TOPOLOGY DEBUGGER:")');
    console.log('4. Check for SVG elements: document.querySelectorAll("svg").length');
    console.log('5. Check for React errors in console');
    console.log('6. Toggle collaboration mode and compare behavior');
    
    console.log('\n🔧 COLLABORATION MODE TESTING:');
    console.log('📝 Run this in browser console to test collaboration effects:');
    console.log('');
    console.log('// Check current topology state');
    console.log('console.log("SVG count:", document.querySelectorAll("svg").length);');
    console.log('console.log("TopologyDebugger:", !!document.querySelector("[class*=topology-debug]"));');
    console.log('');
    console.log('// Look for collaboration controls');
    console.log('const collabControls = document.querySelectorAll("[class*=collab], [class*=collaboration]");');
    console.log('console.log("Collaboration controls found:", collabControls.length);');
    console.log('collabControls.forEach((el, i) => console.log(`Control ${i}:`, el.textContent.trim()));');
    console.log('');
    console.log('// Check for error messages');
    console.log('const errors = document.querySelectorAll("[class*=error], .alert, [role=alert]");');
    console.log('console.log("Error messages:", errors.length);');
    console.log('errors.forEach((el, i) => console.log(`Error ${i}:`, el.textContent.trim()));');
    
    console.log('\n💡 EXPECTED BEHAVIOR:');
    console.log('- TopologyDebugger should show device count, collaboration status');
    console.log('- SVG elements should exist when topology data is available');
    console.log('- Collaboration mode should NOT prevent topology display');
    console.log('- Errors may indicate why topology is not rendering');
}

// Run the investigation
investigateTopologyDisplay();
