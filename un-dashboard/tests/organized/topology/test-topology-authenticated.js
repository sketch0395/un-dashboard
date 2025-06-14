// Authenticated test script for frontend topology visualization
const fs = require('fs');

// Read the test topology data
const testData = JSON.parse(fs.readFileSync('topology-test-data.json', 'utf8'));

class AuthenticatedTester {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.authToken = null;
    }

    async authenticate() {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'admin123!'
                })
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`);
            }

            const result = await response.json();
            this.authToken = result.token;
            console.log('✅ Authentication successful');
            return true;
        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            return false;
        }
    }

    async makeAuthenticatedRequest(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        return fetch(url, {
            ...options,
            headers
        });
    }

    async testTopologyVisualization() {
        console.log('Testing topology visualization with complex network data...');
        
        try {
            // Submit the test data to create a scan with topology
            const response = await this.makeAuthenticatedRequest(`${this.baseUrl}/api/scan-history`, {
                method: 'POST',
                body: JSON.stringify(testData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.log('API Response Status:', response.status);
                console.log('API Response Body:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Test topology data successfully submitted:', result);
            console.log('Scan ID:', result.scanId);
            
            // Now test retrieval of the scan data
            const getResponse = await this.makeAuthenticatedRequest(`${this.baseUrl}/api/scan-history/${result.scanId}`);
            if (getResponse.ok) {
                const scanData = await getResponse.json();
                console.log('✅ Scan data retrieved successfully');
                console.log('Number of devices:', scanData.scanData.length);
                console.log('Device types found:', scanData.metadata.deviceTypes);
                
                // Analyze topology structure
                const devices = scanData.scanData;
                const router = devices.find(d => d.deviceType === 'router');
                const switches = devices.filter(d => d.deviceType === 'switch');
                const endpoints = devices.filter(d => !['router', 'switch'].includes(d.deviceType));
                
                console.log('\n📊 Network Topology Analysis:');
                console.log(`- Router (Gateway): ${router ? router.hostname : 'None'}`);
                console.log(`- Switches: ${switches.length} (${switches.map(s => s.hostname).join(', ')})`);
                console.log(`- Endpoints: ${endpoints.length} devices`);
                
                // Test topology connections
                console.log('\n🔗 Connection Analysis:');
                devices.forEach(device => {
                    if (device.connections && device.connections.length > 0) {
                        console.log(`${device.hostname} (${device.ip}) connects to: ${device.connections.join(', ')}`);
                    }
                    if (device.connectedTo) {
                        console.log(`${device.hostname} (${device.ip}) connected to: ${device.connectedTo}`);
                    }
                });
                
                return result.scanId;
                
            } else {
                console.error('❌ Failed to retrieve scan data:', getResponse.status);
                return null;
            }
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
            return null;
        }
    }

    async testMultipleTopologies() {
        console.log('\n🧪 Testing multiple topology variations...');
        
        // Test 1: Simple star topology
        const starTopology = {
            scanId: 'topology-test-star-001',
            name: 'Star Topology Test',
            ipRange: '10.0.0.0/24',
            deviceCount: 5,
            scanData: [
                {
                    ip: '10.0.0.1',
                    mac: '00:AA:BB:CC:DD:01',
                    hostname: 'central-switch',
                    deviceType: 'switch',
                    vendor: 'Cisco',
                    gateway: true,
                    openPorts: [22, 80, 161],
                    connections: ['10.0.0.10', '10.0.0.11', '10.0.0.12', '10.0.0.13']
                },
                {ip: '10.0.0.10', hostname: 'pc-1', deviceType: 'workstation', vendor: 'Dell', connectedTo: '10.0.0.1', mac: '00:AA:BB:CC:DD:10'},
                {ip: '10.0.0.11', hostname: 'pc-2', deviceType: 'workstation', vendor: 'HP', connectedTo: '10.0.0.1', mac: '00:AA:BB:CC:DD:11'},
                {ip: '10.0.0.12', hostname: 'server-1', deviceType: 'server', vendor: 'Dell', connectedTo: '10.0.0.1', mac: '00:AA:BB:CC:DD:12'},
                {ip: '10.0.0.13', hostname: 'printer-1', deviceType: 'printer', vendor: 'Canon', connectedTo: '10.0.0.1', mac: '00:AA:BB:CC:DD:13'}
            ],
            metadata: {hasNetworkTopology: true, deviceTypes: ['switch', 'workstation', 'server', 'printer']}
        };
        
        // Test 2: Mesh topology
        const meshTopology = {
            scanId: 'topology-test-mesh-001',
            name: 'Mesh Topology Test',
            ipRange: '172.16.0.0/24',
            deviceCount: 4,
            scanData: [
                {
                    ip: '172.16.0.1',
                    hostname: 'node-1',
                    deviceType: 'router',
                    vendor: 'Cisco',
                    mac: '00:BB:CC:DD:EE:01',
                    connections: ['172.16.0.2', '172.16.0.3', '172.16.0.4']
                },
                {
                    ip: '172.16.0.2',
                    hostname: 'node-2',
                    deviceType: 'router',
                    vendor: 'Cisco',
                    mac: '00:BB:CC:DD:EE:02',
                    connections: ['172.16.0.1', '172.16.0.3', '172.16.0.4']
                },
                {
                    ip: '172.16.0.3',
                    hostname: 'node-3',
                    deviceType: 'router',
                    vendor: 'Cisco',
                    mac: '00:BB:CC:DD:EE:03',
                    connections: ['172.16.0.1', '172.16.0.2', '172.16.0.4']
                },
                {
                    ip: '172.16.0.4',
                    hostname: 'node-4',
                    deviceType: 'router',
                    vendor: 'Cisco',
                    mac: '00:BB:CC:DD:EE:04',
                    connections: ['172.16.0.1', '172.16.0.2', '172.16.0.3']
                }
            ],
            metadata: {hasNetworkTopology: true, deviceTypes: ['router']}
        };
        
        const topologies = [starTopology, meshTopology];
        const submittedIds = [];
        
        for (const topology of topologies) {
            try {
                const response = await this.makeAuthenticatedRequest(`${this.baseUrl}/api/scan-history`, {
                    method: 'POST',
                    body: JSON.stringify(topology)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`✅ ${topology.name} submitted successfully:`, result.scanId);
                    submittedIds.push(result.scanId);
                } else {
                    console.log(`❌ Failed to submit ${topology.name}:`, response.status);
                }
            } catch (error) {
                console.error(`❌ Error submitting ${topology.name}:`, error.message);
            }
        }
        
        return submittedIds;
    }

    async getAllScans() {
        try {
            const response = await this.makeAuthenticatedRequest(`${this.baseUrl}/api/scan-history`);
            if (response.ok) {
                const scans = await response.json();
                console.log('\n📋 All Scans in Database:');
                scans.forEach(scan => {
                    console.log(`- ${scan.scanId}: ${scan.name} (${scan.deviceCount} devices)`);
                    if (scan.metadata && scan.metadata.hasNetworkTopology) {
                        console.log(`  📊 Has topology data with device types: ${scan.metadata.deviceTypes ? scan.metadata.deviceTypes.join(', ') : 'unknown'}`);
                    }
                });
                return scans;
            }
        } catch (error) {
            console.error('❌ Error fetching scans:', error.message);
        }
        return [];
    }

    async runAllTests() {
        if (!(await this.authenticate())) {
            return;
        }

        console.log('\n🚀 Starting topology visualization tests...');
        
        // Test complex topology
        const complexScanId = await this.testTopologyVisualization();
        
        // Test multiple topology types
        const additionalIds = await this.testMultipleTopologies();
        
        // Show all scans
        await this.getAllScans();
        
        console.log('\n🎯 Manual Frontend Testing Instructions:');
        console.log('1. Open http://localhost:3000/networkscan in your browser');
        console.log('2. Login with admin/admin123! if not already logged in');
        console.log('3. Look for these test scans:');
        if (complexScanId) console.log(`   - Complex Network Topology Test (${complexScanId})`);
        additionalIds.forEach(id => console.log(`   - Topology test scan (${id})`));
        console.log('4. Click on any scan to view the topology visualization');
        console.log('5. Test both Hierarchical and Circular view modes');
        console.log('6. Try customizing device properties');
        console.log('7. Check for any rendering issues or duplications');
        console.log('8. Verify connections between devices are displayed correctly');
        console.log('9. Test network role assignments and device icons');
        
        console.log('\n🔍 Frontend Components to Inspect:');
        console.log('- NetworkViewManager: Main visualization controller');
        console.log('- HierarchicalNetworkView: Tree-based topology');
        console.log('- CircularNetworkView: Circular layout topology');
        console.log('- Custom device properties in localStorage');
        console.log('- D3.js rendering and event handling');
    }
}

const tester = new AuthenticatedTester();
tester.runAllTests().catch(console.error);
