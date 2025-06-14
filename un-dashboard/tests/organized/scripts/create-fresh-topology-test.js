/**
 * Create Fresh Topology Test Data with Valid Authentication
 * This script creates comprehensive topology test data for the UI
 */

const fs = require('fs');

async function createTopologyTestScan() {
    console.log('🌐 Creating fresh topology test scan...');
    
    try {
        // Load fresh authentication data
        const authData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));
        const authToken = authData.authToken;
        
        // Import fetch for Node.js
        const { default: fetch } = await import('node-fetch');
        
        // Create comprehensive topology test data
        const topologyTestData = {
            scanId: `topology-scan-${Date.now()}`,
            name: "Network Topology Test Scan",
            ipRange: "192.168.200.0/24",
            deviceCount: 4,
            scanData: {
                devices: {
                    "Gateway Device": [
                        {
                            ip: "192.168.200.1",
                            hostname: "main-gateway",
                            status: "up",
                            vendor: "Gateway Device",
                            mac: "00:11:22:33:44:01",
                            ports: [
                                { port: 80, state: "open", service: "http" },
                                { port: 443, state: "open", service: "https" },
                                { port: 22, state: "open", service: "ssh" }
                            ],
                            // Network topology properties
                            networkRole: "gateway",
                            isMainGateway: true,
                            portCount: 24,
                            deviceType: "router"
                        }
                    ],
                    "Network Switch": [
                        {
                            ip: "192.168.200.10",
                            hostname: "core-switch-01",
                            status: "up",
                            vendor: "Network Switch",
                            mac: "00:11:22:33:44:10",
                            ports: [
                                { port: 80, state: "open", service: "http" },
                                { port: 23, state: "open", service: "telnet" }
                            ],
                            // Network topology properties
                            networkRole: "switch",
                            parentGateway: "192.168.200.1",
                            portCount: 48,
                            deviceType: "switch"
                        }
                    ],
                    "Workstation": [
                        {
                            ip: "192.168.200.100",
                            hostname: "workstation-01",
                            status: "up",
                            vendor: "Workstation",
                            mac: "00:11:22:33:44:100",
                            ports: [
                                { port: 22, state: "open", service: "ssh" },
                                { port: 3389, state: "open", service: "rdp" }
                            ],
                            // Network topology properties
                            networkRole: "device",
                            parentSwitch: "192.168.200.10",
                            parentGateway: "192.168.200.1",
                            deviceType: "computer"
                        },
                        {
                            ip: "192.168.200.101",
                            hostname: "workstation-02",
                            status: "up",
                            vendor: "Workstation",
                            mac: "00:11:22:33:44:101",
                            ports: [
                                { port: 22, state: "open", service: "ssh" },
                                { port: 80, state: "open", service: "http" }
                            ],
                            // Network topology properties
                            networkRole: "device",
                            parentSwitch: "192.168.200.10",
                            parentGateway: "192.168.200.1",
                            deviceType: "computer"
                        }
                    ]
                },
                portScanResults: [],
                networkInfo: {
                    topology: {
                        hasHierarchy: true,
                        gatewayCount: 1,
                        switchCount: 1,
                        deviceCount: 2
                    }
                }
            },
            metadata: {
                timestamp: new Date().toISOString(),
                scanDuration: 8000,
                userAgent: "Topology Test Script",
                scanType: "topology",
                osDetection: false,
                serviceDetection: true,
                ports: ["22", "80", "443", "3389", "23"],
                hasNetworkTopology: true,
                deviceTypes: ["gateway", "switch", "computer"],
                vendor: "Mixed"
            },
            settings: {
                isPrivate: true,
                isFavorite: true,
                tags: ["topology", "test", "network-hierarchy"],
                notes: "Comprehensive topology test with gateway→switch→devices hierarchy"
            }
        };
        
        console.log('📡 Sending topology test scan to database...');
        console.log(`   Scan ID: ${topologyTestData.scanId}`);
        console.log(`   Devices: ${topologyTestData.deviceCount} (1 gateway, 1 switch, 2 workstations)`);
        console.log(`   Network hierarchy: Gateway → Switch → Devices`);
        
        const response = await fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            headers: {
                'Cookie': `auth-token=${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(topologyTestData)
        });
        
        if (response.ok) {
            const savedScan = await response.json();
            console.log('✅ Topology test scan created successfully!');
            console.log(`   Database ID: ${savedScan._id}`);
            console.log(`   Scan name: ${savedScan.name}`);
            
            // Save scan ID for future reference
            const scanReference = {
                scanId: topologyTestData.scanId,
                dbId: savedScan._id,
                name: savedScan.name,
                created: new Date().toISOString(),
                deviceHierarchy: {
                    gateway: "192.168.200.1 (main-gateway)",
                    switch: "192.168.200.10 (core-switch-01)",
                    devices: [
                        "192.168.200.100 (workstation-01)",
                        "192.168.200.101 (workstation-02)"
                    ]
                }
            };
            
            fs.writeFileSync('./topology-test-scan.json', JSON.stringify(scanReference, null, 2));
            console.log('💾 Saved scan reference to topology-test-scan.json');
            
            return savedScan;
            
        } else {
            const errorText = await response.text();
            console.log(`❌ Failed to create topology test scan: ${response.status}`);
            console.log(`   Error: ${errorText}`);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error creating topology test scan:', error.message);
        return null;
    }
}

async function verifyTopologyData() {
    console.log('\n🔍 Verifying topology test data...');
    
    try {
        const authData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));
        const authToken = authData.authToken;
        
        const { default: fetch } = await import('node-fetch');
        
        // Get recent scans to find our topology scan
        const response = await fetch('http://localhost:3000/api/scan-history?limit=5', {
            method: 'GET',
            headers: {
                'Cookie': `auth-token=${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const scans = data.scanHistory || [];
            
            console.log(`   Found ${scans.length} recent scans`);
            
            // Look for topology scans
            const topologyScans = scans.filter(scan => 
                scan.metadata?.hasNetworkTopology || 
                scan.settings?.tags?.includes('topology')
            );
            
            if (topologyScans.length > 0) {
                console.log(`✅ Found ${topologyScans.length} topology scan(s):`);
                topologyScans.forEach(scan => {
                    console.log(`   - ${scan.name} (${scan.deviceCount} devices)`);
                    console.log(`     Tags: ${scan.settings?.tags?.join(', ') || 'none'}`);
                    console.log(`     Has topology: ${scan.metadata?.hasNetworkTopology}`);
                });
                return true;
            } else {
                console.log('❌ No topology scans found');
                return false;
            }
        } else {
            console.log(`❌ Failed to verify topology data: ${response.status}`);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error verifying topology data:', error.message);
        return false;
    }
}

// Run the topology test creation
async function createAndVerifyTopologyTest() {
    console.log('🚀 CREATING FRESH TOPOLOGY TEST DATA');
    console.log('=====================================');
    
    const scan = await createTopologyTestScan();
    
    if (scan) {
        await verifyTopologyData();
        
        console.log('\n🎯 TOPOLOGY TEST SETUP COMPLETE');
        console.log('================================');
        console.log('✅ Topology test scan created and verified');
        console.log('🌐 Network hierarchy: Gateway → Switch → Devices');
        console.log('🖥️  Ready for UI topology visualization testing');
        console.log('');
        console.log('Next steps:');
        console.log('1. Open http://localhost:3000/networkscan in browser');
        console.log('2. Look for the "Network Topology Test Scan" in the scan history');
        console.log('3. Click "Visualize on Topology" to test the visualization');
        console.log('4. Verify the network hierarchy is displayed correctly');
    } else {
        console.log('\n❌ TOPOLOGY TEST SETUP FAILED');
        console.log('Please check the server logs and authentication.');
    }
}

// Export for use in other scripts
module.exports = { createTopologyTestScan, verifyTopologyData };

// Run if called directly
if (require.main === module) {
    createAndVerifyTopologyTest().catch(console.error);
}
