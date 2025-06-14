console.log('🚀 CREATING TOPOLOGY TEST DATA');

const fs = require('fs');

async function main() {
    try {
        console.log('Reading auth data...');
        const authData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));
        console.log('Auth data loaded:', authData.username);
        
        // Import fetch
        const { default: fetch } = await import('node-fetch');
        console.log('Fetch imported successfully');
        
        const topologyData = {
            scanId: `topology-test-${Date.now()}`,
            name: "Network Topology Test",
            ipRange: "192.168.200.0/24",
            deviceCount: 4,
            scanData: {
                devices: {
                    "Gateway": [
                        {
                            ip: "192.168.200.1",
                            hostname: "gateway",
                            status: "up",
                            vendor: "Gateway",
                            networkRole: "gateway",
                            isMainGateway: true
                        }
                    ],
                    "Switch": [
                        {
                            ip: "192.168.200.10", 
                            hostname: "switch",
                            status: "up",
                            vendor: "Switch",
                            networkRole: "switch",
                            parentGateway: "192.168.200.1"
                        }
                    ],
                    "Device": [
                        {
                            ip: "192.168.200.100",
                            hostname: "device1",
                            status: "up", 
                            vendor: "Device",
                            networkRole: "device",
                            parentSwitch: "192.168.200.10"
                        },
                        {
                            ip: "192.168.200.101",
                            hostname: "device2", 
                            status: "up",
                            vendor: "Device",
                            networkRole: "device",
                            parentSwitch: "192.168.200.10"
                        }
                    ]
                }
            },
            metadata: {
                hasNetworkTopology: true,
                scanType: "topology"
            },
            settings: {
                tags: ["topology", "test"]
            }
        };
        
        console.log('Sending POST request...');
        const response = await fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            headers: {
                'Cookie': `auth-token=${authData.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(topologyData)
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Success! Scan created:', result.name);
            console.log('Database ID:', result._id);
        } else {
            const error = await response.text();
            console.log('❌ Error:', error);
        }
        
    } catch (error) {
        console.error('Script error:', error);
    }
}

main();
