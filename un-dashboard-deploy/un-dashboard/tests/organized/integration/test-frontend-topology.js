// Frontend Topology Visualization Test Script
// Tests authentication state sync and topology visualization components

const testFrontendComponents = async () => {
    console.log('=== Frontend Topology Visualization Test ===\n');

    // Test 1: Authentication State Check
    console.log('1. Testing Authentication State...');
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123!'
            })
        });

        if (response.ok) {
            const authData = await response.json();
            console.log('✓ Authentication successful');
            console.log('   - Token received:', authData.token ? 'Yes' : 'No');
            
            // Store token for subsequent tests
            localStorage.setItem('authToken', authData.token);
            
            // Test 2: Profile Endpoint with Token
            console.log('\n2. Testing Profile Endpoint...');
            const profileResponse = await fetch('http://localhost:3000/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${authData.token}`
                }
            });
            
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                console.log('✓ Profile endpoint accessible');
                console.log('   - User:', profileData.user?.username);
                console.log('   - Role:', profileData.user?.role);
            } else {
                console.log('✗ Profile endpoint failed:', profileResponse.status);
            }
        } else {
            console.log('✗ Authentication failed:', response.status);
            return;
        }
    } catch (error) {
        console.log('✗ Authentication error:', error.message);
        return;
    }

    // Test 3: Scan History API
    console.log('\n3. Testing Scan History API...');
    try {
        const token = localStorage.getItem('authToken');
        const scanResponse = await fetch('http://localhost:3000/api/scan-history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (scanResponse.ok) {
            const scanData = await scanResponse.json();
            console.log('✓ Scan history endpoint accessible');
            console.log('   - Scans found:', scanData.scans?.length || 0);
            
            if (scanData.scans && scanData.scans.length > 0) {
                console.log('   - Latest scan:', scanData.scans[0].scanId);
                console.log('   - Device count:', scanData.scans[0].deviceCount);
                
                // Test topology visualization with real data
                testTopologyVisualization(scanData.scans[0]);
            } else {
                // Test with mock data
                console.log('   - No existing scans, testing with mock data');
                testTopologyVisualization(getMockScanData());
            }
        } else {
            console.log('✗ Scan history failed:', scanResponse.status);
        }
    } catch (error) {
        console.log('✗ Scan history error:', error.message);
    }

    // Test 4: Frontend Component State
    console.log('\n4. Testing Frontend Component State...');
    testComponentState();
};

const testTopologyVisualization = (scanData) => {
    console.log('\n5. Testing Topology Visualization Components...');
    
    // Check if D3.js is available
    if (typeof d3 !== 'undefined') {
        console.log('✓ D3.js library loaded');
    } else {
        console.log('✗ D3.js library not found');
    }

    // Test data structure
    console.log('   - Scan ID:', scanData.scanId);
    console.log('   - IP Range:', scanData.ipRange);
    console.log('   - Device Count:', scanData.deviceCount);
    
    if (scanData.scanData && typeof scanData.scanData === 'object') {
        console.log('✓ Scan data structure valid');
        
        // Count devices by vendor
        const vendors = Object.keys(scanData.scanData);
        console.log('   - Vendors found:', vendors.length);
        vendors.forEach(vendor => {
            const devices = scanData.scanData[vendor];
            console.log(`     - ${vendor}: ${devices.length} devices`);
        });

        // Simulate topology visualization
        simulateTopologyRender(scanData);
    } else {
        console.log('✗ Invalid scan data structure');
    }
};

const simulateTopologyRender = (scanData) => {
    console.log('\n6. Simulating Topology Visualization...');
    
    try {
        // Extract all devices
        const allDevices = [];
        Object.keys(scanData.scanData).forEach(vendor => {
            scanData.scanData[vendor].forEach(device => {
                allDevices.push({ ...device, vendor });
            });
        });

        console.log('✓ Devices extracted:', allDevices.length);

        // Group by device type/role
        const devicesByRole = {
            gateways: [],
            switches: [],
            devices: []
        };

        allDevices.forEach(device => {
            const role = determineDeviceRole(device);
            if (devicesByRole[role]) {
                devicesByRole[role].push(device);
            } else {
                devicesByRole.devices.push(device);
            }
        });

        console.log('   - Gateways:', devicesByRole.gateways.length);
        console.log('   - Switches:', devicesByRole.switches.length);
        console.log('   - Other devices:', devicesByRole.devices.length);

        // Test hierarchical relationships
        console.log('\n7. Testing Network Hierarchy...');
        const relationships = buildNetworkRelationships(allDevices);
        console.log('✓ Network relationships built');
        console.log('   - Total connections:', relationships.length);

        console.log('\n✓ Topology visualization simulation complete');
        
    } catch (error) {
        console.log('✗ Topology simulation error:', error.message);
    }
};

const determineDeviceRole = (device) => {
    const ip = device.ip || device.ipAddress || '';
    const hostname = device.hostname || device.name || '';
    const vendor = device.vendor || '';

    // Gateway detection
    if (ip.endsWith('.1') || ip.endsWith('.254') || 
        hostname.toLowerCase().includes('gateway') ||
        hostname.toLowerCase().includes('router')) {
        return 'gateways';
    }

    // Switch detection
    if (hostname.toLowerCase().includes('switch') ||
        vendor.toLowerCase().includes('cisco') ||
        vendor.toLowerCase().includes('netgear')) {
        return 'switches';
    }

    return 'devices';
};

const buildNetworkRelationships = (devices) => {
    const relationships = [];
    
    // Simple relationship building based on IP ranges
    devices.forEach((device, index) => {
        devices.forEach((otherDevice, otherIndex) => {
            if (index !== otherIndex) {
                const deviceIp = device.ip || device.ipAddress || '';
                const otherIp = otherDevice.ip || otherDevice.ipAddress || '';
                
                if (areDevicesRelated(deviceIp, otherIp)) {
                    relationships.push({
                        source: device,
                        target: otherDevice,
                        type: 'network'
                    });
                }
            }
        });
    });

    return relationships;
};

const areDevicesRelated = (ip1, ip2) => {
    if (!ip1 || !ip2) return false;
    
    // Check if they're in the same subnet
    const parts1 = ip1.split('.');
    const parts2 = ip2.split('.');
    
    if (parts1.length === 4 && parts2.length === 4) {
        // Same /24 subnet
        return parts1[0] === parts2[0] && 
               parts1[1] === parts2[1] && 
               parts1[2] === parts2[2];
    }
    
    return false;
};

const testComponentState = () => {
    // Test if React components are available
    if (typeof React !== 'undefined') {
        console.log('✓ React library loaded');
    } else {
        console.log('✗ React library not found');
    }

    // Check for authentication context
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        console.log('✓ Auth token stored in localStorage');
    } else {
        console.log('✗ No auth token in localStorage');
    }

    // Check for network scan components
    console.log('   - Checking for topology components in DOM...');
    const topologyElements = document.querySelectorAll('[class*="topology"], [class*="network"], [id*="topology"]');
    console.log(`   - Found ${topologyElements.length} topology-related elements`);
};

const getMockScanData = () => {
    return {
        scanId: 'test-scan-' + Date.now(),
        ipRange: '10.5.1.0/24',
        deviceCount: 3,
        scanData: {
            "Cisco": [
                {
                    ip: "10.5.1.1",
                    hostname: "gateway.local",
                    mac: "00:11:22:33:44:55",
                    ports: [80, 443, 22]
                }
            ],
            "Netgear": [
                {
                    ip: "10.5.1.10",
                    hostname: "switch-01.local",
                    mac: "00:AA:BB:CC:DD:EE",
                    ports: [80, 443]
                }
            ],
            "Unknown": [
                {
                    ip: "10.5.1.100",
                    hostname: "device-01.local",
                    mac: "00:FF:EE:DD:CC:BB",
                    ports: [22, 3389]
                }
            ]
        }
    };
};

// Run the test
console.log('Starting frontend topology visualization test...');
testFrontendComponents().catch(console.error);
