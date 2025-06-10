// Comprehensive Topology Visualization Test
// This script tests the frontend topology components with real authentication

const runTopologyTest = async () => {
    console.log('=== Comprehensive Topology Visualization Test ===\n');

    // Step 1: Authentication and API Setup
    console.log('1. Testing Authentication and API Setup...');
    let authToken;
    
    try {
        // Test login
        const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123!'
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }

        const authData = await loginResponse.json();
        authToken = authData.token;
        localStorage.setItem('authToken', authToken);
        console.log('✓ Authentication successful');

        // Test profile
        const profileResponse = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log(`✓ Profile accessible - User: ${profileData.user?.username}`);
        } else {
            console.log('⚠ Profile endpoint issue');
        }

    } catch (error) {
        console.error('✗ Authentication failed:', error.message);
        return;
    }

    // Step 2: Test Scan History API
    console.log('\n2. Testing Scan History API...');
    let scanData = null;
    
    try {
        const scanResponse = await fetch('/api/scan-history', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (scanResponse.ok) {
            const scanHistoryData = await scanResponse.json();
            console.log(`✓ Scan history accessible - Found ${scanHistoryData.scans?.length || 0} scans`);
            
            if (scanHistoryData.scans && scanHistoryData.scans.length > 0) {
                scanData = scanHistoryData.scans[0];
                console.log(`   - Latest scan: ${scanData.scanId} (${scanData.deviceCount} devices)`);
            } else {
                console.log('   - No existing scans, will create mock data');
                scanData = createMockScanData();
            }
        } else {
            console.log('⚠ Scan history endpoint issue, using mock data');
            scanData = createMockScanData();
        }
    } catch (error) {
        console.error('✗ Scan history error:', error.message);
        scanData = createMockScanData();
    }

    // Step 3: Test Frontend Component Loading
    console.log('\n3. Testing Frontend Component Loading...');
    
    // Check for React and D3 libraries
    console.log(`   - React available: ${typeof React !== 'undefined' ? 'Yes' : 'No'}`);
    console.log(`   - D3 available: ${typeof d3 !== 'undefined' ? 'Yes' : 'No'}`);
    
    // Check for topology-related DOM elements
    const topologyElements = document.querySelectorAll([
        '[class*="topology"]',
        '[class*="network"]', 
        '[id*="topology"]',
        'svg',
        'canvas'
    ].join(', '));
    
    console.log(`   - Topology DOM elements found: ${topologyElements.length}`);
    
    if (topologyElements.length > 0) {
        console.log('   - Element types:');
        const elementCounts = {};
        topologyElements.forEach(el => {
            const type = el.tagName.toLowerCase();
            elementCounts[type] = (elementCounts[type] || 0) + 1;
        });
        Object.entries(elementCounts).forEach(([type, count]) => {
            console.log(`     - ${type}: ${count}`);
        });
    }

    // Step 4: Test Data Processing
    console.log('\n4. Testing Topology Data Processing...');
    
    if (scanData) {
        const processedData = processTopologyData(scanData);
        console.log('✓ Data processing completed');
        console.log(`   - Total devices: ${processedData.totalDevices}`);
        console.log(`   - Gateways: ${processedData.gateways.length}`);
        console.log(`   - Switches: ${processedData.switches.length}`);
        console.log(`   - Regular devices: ${processedData.devices.length}`);
        console.log(`   - Network relationships: ${processedData.relationships.length}`);
        
        // Test relationship building
        testNetworkRelationships(processedData);
    }

    // Step 5: Test Visualization Components
    console.log('\n5. Testing Visualization Components...');
    
    // Check if we're on the network scan page
    const currentPath = window.location.pathname;
    console.log(`   - Current page: ${currentPath}`);
    
    if (currentPath.includes('networkscan') || currentPath === '/') {
        testVisualizationRendering(scanData);
    } else {
        console.log('   - Not on network scan page, navigation test needed');
        // Test navigation
        testPageNavigation();
    }

    // Step 6: Test Authentication State Persistence
    console.log('\n6. Testing Authentication State Persistence...');
    testAuthPersistence();

    console.log('\n=== Topology Visualization Test Complete ===');
};

const createMockScanData = () => {
    return {
        scanId: 'test-topology-' + Date.now(),
        ipRange: '10.5.1.0/24',
        deviceCount: 5,
        scanData: {
            "Cisco": [
                {
                    ip: "10.5.1.1",
                    hostname: "gateway.local",
                    mac: "00:11:22:33:44:55",
                    ports: [80, 443, 22],
                    vendor: "Cisco"
                }
            ],
            "Netgear": [
                {
                    ip: "10.5.1.10",
                    hostname: "switch-01.local", 
                    mac: "00:AA:BB:CC:DD:EE",
                    ports: [80, 443],
                    vendor: "Netgear"
                },
                {
                    ip: "10.5.1.11",
                    hostname: "switch-02.local",
                    mac: "00:BB:CC:DD:EE:FF",
                    ports: [80, 443],
                    vendor: "Netgear"
                }
            ],
            "Unknown": [
                {
                    ip: "10.5.1.100",
                    hostname: "device-01.local",
                    mac: "00:FF:EE:DD:CC:BB",
                    ports: [22, 3389],
                    vendor: "Unknown"
                },
                {
                    ip: "10.5.1.101", 
                    hostname: "device-02.local",
                    mac: "00:EE:DD:CC:BB:AA",
                    ports: [80, 443, 22],
                    vendor: "Unknown"
                }
            ]
        }
    };
};

const processTopologyData = (scanData) => {
    const result = {
        totalDevices: 0,
        gateways: [],
        switches: [],
        devices: [],
        relationships: []
    };

    if (!scanData.scanData) return result;

    // Extract all devices
    const allDevices = [];
    Object.keys(scanData.scanData).forEach(vendor => {
        if (Array.isArray(scanData.scanData[vendor])) {
            scanData.scanData[vendor].forEach(device => {
                allDevices.push({ ...device, vendor });
            });
        }
    });

    result.totalDevices = allDevices.length;

    // Classify devices
    allDevices.forEach(device => {
        const role = determineDeviceRole(device);
        switch (role) {
            case 'gateway':
                result.gateways.push(device);
                break;
            case 'switch':
                result.switches.push(device);
                break;
            default:
                result.devices.push(device);
        }
    });

    // Build relationships
    result.relationships = buildNetworkRelationships(allDevices);

    return result;
};

const determineDeviceRole = (device) => {
    const ip = device.ip || '';
    const hostname = device.hostname || '';
    const vendor = device.vendor || '';

    // Gateway detection
    if (ip.endsWith('.1') || ip.endsWith('.254') || 
        hostname.toLowerCase().includes('gateway') ||
        hostname.toLowerCase().includes('router')) {
        return 'gateway';
    }

    // Switch detection  
    if (hostname.toLowerCase().includes('switch') ||
        vendor.toLowerCase().includes('cisco') ||
        vendor.toLowerCase().includes('netgear')) {
        return 'switch';
    }

    return 'device';
};

const buildNetworkRelationships = (devices) => {
    const relationships = [];
    
    devices.forEach((device1, i) => {
        devices.forEach((device2, j) => {
            if (i !== j && areDevicesRelated(device1.ip, device2.ip)) {
                relationships.push({
                    source: device1,
                    target: device2,
                    type: 'subnet',
                    strength: calculateRelationshipStrength(device1, device2)
                });
            }
        });
    });

    return relationships;
};

const areDevicesRelated = (ip1, ip2) => {
    if (!ip1 || !ip2) return false;
    
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

const calculateRelationshipStrength = (device1, device2) => {
    // Calculate relationship strength based on device types
    const role1 = determineDeviceRole(device1);
    const role2 = determineDeviceRole(device2);
    
    if ((role1 === 'gateway' && role2 === 'switch') || 
        (role1 === 'switch' && role2 === 'gateway')) {
        return 0.9; // Strong relationship
    }
    
    if ((role1 === 'switch' && role2 === 'device') || 
        (role1 === 'device' && role2 === 'switch')) {
        return 0.7; // Medium relationship
    }
    
    return 0.3; // Weak relationship
};

const testNetworkRelationships = (processedData) => {
    console.log('\n   Testing network relationships...');
    
    const { gateways, switches, devices, relationships } = processedData;
    
    // Test gateway-switch relationships
    const gatewayToSwitchConnections = relationships.filter(rel => {
        const sourceRole = determineDeviceRole(rel.source);
        const targetRole = determineDeviceRole(rel.target);
        return (sourceRole === 'gateway' && targetRole === 'switch') ||
               (sourceRole === 'switch' && targetRole === 'gateway');
    });
    
    console.log(`   - Gateway-Switch connections: ${gatewayToSwitchConnections.length}`);
    
    // Test switch-device relationships
    const switchToDeviceConnections = relationships.filter(rel => {
        const sourceRole = determineDeviceRole(rel.source);
        const targetRole = determineDeviceRole(rel.target);
        return (sourceRole === 'switch' && targetRole === 'device') ||
               (sourceRole === 'device' && targetRole === 'switch');
    });
    
    console.log(`   - Switch-Device connections: ${switchToDeviceConnections.length}`);
    
    // Validate network hierarchy
    if (gateways.length > 0 && switches.length > 0) {
        console.log('   ✓ Network hierarchy detected (Gateway -> Switch -> Device)');
    } else if (gateways.length > 0) {
        console.log('   ⚠ Network has gateway but no switches');
    } else if (switches.length > 0) {
        console.log('   ⚠ Network has switches but no gateway');
    } else {
        console.log('   ⚠ Flat network structure (no designated gateways or switches)');
    }
};

const testVisualizationRendering = (scanData) => {
    console.log('   Testing visualization rendering...');
    
    // Check for SVG elements (D3.js visualizations)
    const svgElements = document.querySelectorAll('svg');
    console.log(`   - SVG elements: ${svgElements.length}`);
    
    if (svgElements.length > 0) {
        svgElements.forEach((svg, index) => {
            const rect = svg.getBoundingClientRect();
            console.log(`     - SVG ${index + 1}: ${rect.width}x${rect.height}px`);
            
            // Check for D3 nodes and links
            const nodes = svg.querySelectorAll('circle, rect, g[class*="node"]');
            const links = svg.querySelectorAll('line, path[class*="link"]');
            
            console.log(`       - Nodes: ${nodes.length}, Links: ${links.length}`);
        });
    }
    
    // Check for Canvas elements (alternative visualization)
    const canvasElements = document.querySelectorAll('canvas');
    console.log(`   - Canvas elements: ${canvasElements.length}`);
    
    // Try to trigger a test visualization if we have data
    if (scanData && typeof window.testTopologyVisualization === 'function') {
        console.log('   - Triggering test visualization...');
        window.testTopologyVisualization(scanData);
    }
};

const testPageNavigation = () => {
    console.log('   Testing page navigation...');
    
    // Check if we can navigate to the network scan page
    const networkScanLink = document.querySelector('a[href*="networkscan"], a[href="/networkscan"]');
    
    if (networkScanLink) {
        console.log('   ✓ Network scan navigation link found');
        // Don't actually navigate, just verify the link exists
    } else {
        console.log('   ⚠ Network scan navigation link not found');
        
        // Try programmatic navigation
        if (window.location.pathname !== '/networkscan') {
            console.log('   - Attempting programmatic navigation...');
            // This would normally use Next.js router, but we'll just note it
            console.log('   - Navigation test would require Next.js router');
        }
    }
};

const testAuthPersistence = () => {
    const storedToken = localStorage.getItem('authToken');
    
    if (storedToken) {
        console.log('   ✓ Auth token persisted in localStorage');
        console.log(`   - Token length: ${storedToken.length} characters`);
        
        // Test token validity by making a quick API call
        fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${storedToken}` }
        })
        .then(response => {
            if (response.ok) {
                console.log('   ✓ Stored token is valid');
            } else {
                console.log('   ⚠ Stored token may be invalid');
            }
        })
        .catch(error => {
            console.log('   ⚠ Token validation error:', error.message);
        });
    } else {
        console.log('   ✗ No auth token found in localStorage');
    }
    
    // Check for other auth-related storage
    const otherAuthData = [
        'user',
        'userProfile',
        'authState',
        'customDeviceProperties'
    ].map(key => ({
        key,
        value: localStorage.getItem(key),
        exists: !!localStorage.getItem(key)
    }));
    
    console.log('   - Other stored data:');
    otherAuthData.forEach(item => {
        if (item.exists) {
            console.log(`     - ${item.key}: Present`);
        }
    });
};

// Export for browser console testing
window.runTopologyTest = runTopologyTest;
window.createMockScanData = createMockScanData;
window.processTopologyData = processTopologyData;

// Auto-run if this script is loaded directly
if (typeof window !== 'undefined') {
    console.log('Topology test functions loaded. Run runTopologyTest() to begin.');
}
