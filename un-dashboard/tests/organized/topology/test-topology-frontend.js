// Test script for frontend topology visualization
const fs = require('fs');

// Read the test topology data
const testData = JSON.parse(fs.readFileSync('topology-test-data.json', 'utf8'));

async function testTopologyVisualization() {
    console.log('Testing topology visualization with complex network data...');
    
    try {
        // First, submit the test data to create a scan with topology
        const response = await fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
        const getResponse = await fetch(`http://localhost:3000/api/scan-history/${result.scanId}`);
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
            
            console.log('\n🎨 Frontend Visualization Test:');
            console.log('1. Navigate to http://localhost:3000/networkscan');
            console.log('2. Look for the topology visualization components');
            console.log('3. Check if network hierarchy is displayed correctly');
            console.log('4. Verify device connections are rendered');
            console.log('5. Test device property customization');
            
        } else {
            console.error('❌ Failed to retrieve scan data:', getResponse.status);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Test with different topology structures
async function testMultipleTopologies() {
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
                gateway: true,
                connections: ['10.0.0.10', '10.0.0.11', '10.0.0.12', '10.0.0.13']
            },
            {ip: '10.0.0.10', hostname: 'pc-1', deviceType: 'workstation', connectedTo: '10.0.0.1'},
            {ip: '10.0.0.11', hostname: 'pc-2', deviceType: 'workstation', connectedTo: '10.0.0.1'},
            {ip: '10.0.0.12', hostname: 'server-1', deviceType: 'server', connectedTo: '10.0.0.1'},
            {ip: '10.0.0.13', hostname: 'printer-1', deviceType: 'printer', connectedTo: '10.0.0.1'}
        ],
        metadata: {hasNetworkTopology: true}
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
                connections: ['172.16.0.2', '172.16.0.3', '172.16.0.4']
            },
            {
                ip: '172.16.0.2',
                hostname: 'node-2',
                deviceType: 'router',
                connections: ['172.16.0.1', '172.16.0.3', '172.16.0.4']
            },
            {
                ip: '172.16.0.3',
                hostname: 'node-3',
                deviceType: 'router',
                connections: ['172.16.0.1', '172.16.0.2', '172.16.0.4']
            },
            {
                ip: '172.16.0.4',
                hostname: 'node-4',
                deviceType: 'router',
                connections: ['172.16.0.1', '172.16.0.2', '172.16.0.3']
            }
        ],
        metadata: {hasNetworkTopology: true}
    };
    
    const topologies = [starTopology, meshTopology];
    
    for (const topology of topologies) {
        try {
            const response = await fetch('http://localhost:3000/api/scan-history', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(topology)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`✅ ${topology.name} submitted successfully:`, result.scanId);
            } else {
                console.log(`❌ Failed to submit ${topology.name}:`, response.status);
            }
        } catch (error) {
            console.error(`❌ Error submitting ${topology.name}:`, error.message);
        }
    }
}

// Run the tests
async function runAllTests() {
    await testTopologyVisualization();
    await testMultipleTopologies();
    
    console.log('\n🎯 Manual Testing Instructions:');
    console.log('1. Open http://localhost:3000/networkscan in your browser');
    console.log('2. Look for scan entries with topology data');
    console.log('3. Click on any scan to view the topology visualization');
    console.log('4. Test both Hierarchical and Circular view modes');
    console.log('5. Try customizing device properties');
    console.log('6. Check for any rendering issues or duplications');
    console.log('7. Verify connections between devices are displayed correctly');
}

runAllTests().catch(console.error);
