console.log('🔍 EXISTING TOPOLOGY DATA CHECK');
console.log('='.repeat(50));

const fs = require('fs');

async function checkExistingTopologyData() {
    console.log('📋 Checking for existing topology test data...\n');

    try {
        // Load authentication
        const loginData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));
        
        if (!loginData.token) {
            console.log('❌ No authentication token found');
            return false;
        }

        console.log('✅ Authentication token found');

        // Try to fetch scan history
        const response = await fetch('http://localhost:3000/api/scan-history', {
            headers: {
                'Authorization': `Bearer ${loginData.token}`
            }
        });

        if (!response.ok) {
            console.log('❌ Failed to fetch scan history:', response.status);
            return false;
        }

        const scans = await response.json();
        console.log(`📊 Found ${scans.length} scans in history`);

        // Look for topology-relevant scans
        const topologyScans = scans.filter(scan => 
            scan.metadata?.hasNetworkTopology || 
            scan.name?.toLowerCase().includes('topology') ||
            (scan.scanData && scan.scanData.devices && Object.keys(scan.scanData.devices).length > 0)
        );

        console.log(`🌐 Found ${topologyScans.length} topology-relevant scans:`);

        topologyScans.forEach((scan, index) => {
            console.log(`\n${index + 1}. ${scan.name || scan.scanId}`);
            console.log(`   - Device Count: ${scan.deviceCount || 'Unknown'}`);
            console.log(`   - Has Network Topology: ${scan.metadata?.hasNetworkTopology || 'Unknown'}`);
            console.log(`   - Scan ID: ${scan.scanId}`);
            
            if (scan.scanData && scan.scanData.devices) {
                const vendors = Object.keys(scan.scanData.devices);
                let totalDevices = 0;
                vendors.forEach(vendor => {
                    const devices = scan.scanData.devices[vendor];
                    if (Array.isArray(devices)) {
                        totalDevices += devices.length;
                    }
                });
                console.log(`   - Actual Device Count: ${totalDevices}`);
                console.log(`   - Vendors: ${vendors.join(', ')}`);
            }
        });

        if (topologyScans.length > 0) {
            console.log('\n🎯 RECOMMENDATION:');
            console.log('1. Open http://localhost:3000/networkscan');
            console.log('2. Look for one of the scans listed above');
            console.log('3. Load the scan and check if topology displays');
            console.log('4. Try both normal and collaboration modes');
            console.log('5. Check browser console for debug info from TopologyDebugger');
            
            // Pick the best scan for testing
            const bestScan = topologyScans.find(scan => 
                scan.metadata?.hasNetworkTopology && scan.deviceCount > 2
            ) || topologyScans[0];
            
            if (bestScan) {
                console.log(`\n🎯 RECOMMENDED TEST SCAN: "${bestScan.name || bestScan.scanId}"`);
                console.log('This scan appears to have good topology data for testing.');
            }
            
            return true;
        } else {
            console.log('\n⚠️  No topology-relevant scans found.');
            console.log('Creating a simple test scan...');
            
            // Create a minimal test scan
            const testScan = {
                scanId: 'quick-topology-test-' + Date.now(),
                name: 'Quick Topology Test',
                ipRange: '192.168.1.0/24',
                deviceCount: 3,
                scanData: {
                    devices: {
                        "Cisco": [
                            {
                                ip: "192.168.1.1",
                                hostname: "gateway.local",
                                status: "up",
                                vendor: "Cisco",
                                mac: "00:11:22:33:44:55",
                                deviceType: "router",
                                ports: [22, 80, 443]
                            }
                        ],
                        "Dell": [
                            {
                                ip: "192.168.1.10",
                                hostname: "switch.local", 
                                status: "up",
                                vendor: "Dell",
                                mac: "00:11:22:33:44:66",
                                deviceType: "switch",
                                ports: [22, 80, 161]
                            },
                            {
                                ip: "192.168.1.100",
                                hostname: "pc.local",
                                status: "up",
                                vendor: "Dell",
                                mac: "00:11:22:33:44:77",
                                deviceType: "computer",
                                ports: [22]
                            }
                        ]
                    }
                },
                metadata: {
                    scanType: 'topology-test',
                    hasNetworkTopology: true,
                    deviceTypes: ['router', 'switch', 'computer']
                }
            };

            const createResponse = await fetch('http://localhost:3000/api/scan-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${loginData.token}`
                },
                body: JSON.stringify(testScan)
            });

            if (createResponse.ok) {
                console.log('✅ Created test scan:', testScan.scanId);
                console.log('\n🎯 TEST INSTRUCTIONS:');
                console.log('1. Open http://localhost:3000/networkscan');
                console.log(`2. Look for scan: "${testScan.name}"`);
                console.log('3. Load the scan and check topology display');
                console.log('4. Check the TopologyDebugger info in top-right corner');
                console.log('5. Try enabling collaboration mode');
                return true;
            } else {
                console.log('❌ Failed to create test scan:', createResponse.status);
                return false;
            }
        }

    } catch (error) {
        console.error('❌ Error checking topology data:', error.message);
        return false;
    }
}

checkExistingTopologyData();
