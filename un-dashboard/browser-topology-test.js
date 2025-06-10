// Browser-based topology visualization test
// Run this in the browser console after logging into the application

console.log('🚀 Starting Topology Visualization Test');

// Complex topology test data
const testTopologyData = {
    "scanId": "topology-test-complex-browser-001",
    "name": "Complex Network Topology Browser Test",
    "ipRange": "192.168.1.0/24",
    "deviceCount": 10,
    "scanData": [
        {
            "ip": "192.168.1.1",
            "mac": "00:11:22:33:44:55",
            "hostname": "main-router",
            "vendor": "Cisco",
            "openPorts": [22, 80, 443, 8080],
            "os": "IOS",
            "deviceType": "router",
            "gateway": true,
            "connections": ["192.168.1.10", "192.168.1.20", "192.168.1.30"]
        },
        {
            "ip": "192.168.1.10",
            "mac": "00:11:22:33:44:66",
            "hostname": "switch-1",
            "vendor": "Cisco",
            "openPorts": [22, 80, 161],
            "os": "IOS",
            "deviceType": "switch",
            "connectedTo": "192.168.1.1",
            "connections": ["192.168.1.100", "192.168.1.101", "192.168.1.102"]
        },
        {
            "ip": "192.168.1.20",
            "mac": "00:11:22:33:44:77",
            "hostname": "switch-2",
            "vendor": "HP",
            "openPorts": [22, 80, 161, 443],
            "os": "ProCurve",
            "deviceType": "switch",
            "connectedTo": "192.168.1.1",
            "connections": ["192.168.1.110", "192.168.1.111"]
        },
        {
            "ip": "192.168.1.30",
            "mac": "00:11:22:33:44:88",
            "hostname": "wireless-ap",
            "vendor": "Ubiquiti",
            "openPorts": [22, 80, 443],
            "os": "Linux",
            "deviceType": "access_point",
            "connectedTo": "192.168.1.1",
            "connections": ["192.168.1.120", "192.168.1.121", "192.168.1.122"]
        },
        {
            "ip": "192.168.1.100",
            "mac": "00:11:22:33:44:99",
            "hostname": "server-1",
            "vendor": "Dell",
            "openPorts": [22, 80, 443, 3306, 5432],
            "os": "Ubuntu 22.04",
            "deviceType": "server",
            "connectedTo": "192.168.1.10",
            "services": ["web", "database"]
        },
        {
            "ip": "192.168.1.101",
            "mac": "00:11:22:33:44:AA",
            "hostname": "workstation-1",
            "vendor": "HP",
            "openPorts": [22, 3389],
            "os": "Windows 11",
            "deviceType": "workstation",
            "connectedTo": "192.168.1.10"
        },
        {
            "ip": "192.168.1.102",
            "mac": "00:11:22:33:44:BB",
            "hostname": "printer-1",
            "vendor": "Canon",
            "openPorts": [9100, 515, 631],
            "os": "Embedded",
            "deviceType": "printer",
            "connectedTo": "192.168.1.10"
        },
        {
            "ip": "192.168.1.110",
            "mac": "00:11:22:33:44:CC",
            "hostname": "nas-storage",
            "vendor": "Synology",
            "openPorts": [22, 80, 443, 5000, 5001],
            "os": "DSM",
            "deviceType": "storage",
            "connectedTo": "192.168.1.20"
        },
        {
            "ip": "192.168.1.111",
            "mac": "00:11:22:33:44:DD",
            "hostname": "camera-1",
            "vendor": "Hikvision",
            "openPorts": [80, 554, 8000],
            "os": "Embedded Linux",
            "deviceType": "camera",
            "connectedTo": "192.168.1.20"
        },
        {
            "ip": "192.168.1.120",
            "mac": "00:11:22:33:44:EE",
            "hostname": "laptop-wifi",
            "vendor": "Apple",
            "openPorts": [22],
            "os": "macOS",
            "deviceType": "laptop",
            "connectedTo": "192.168.1.30",
            "wireless": true
        }
    ],
    "metadata": {
        "scanType": "comprehensive",
        "scanDuration": 15000,
        "osDetection": true,
        "serviceDetection": true,
        "ports": [22, 80, 443, 161, 3389, 9100, 515, 631, 5000, 5001, 554, 8000, 3306, 5432],
        "hasNetworkTopology": true,
        "deviceTypes": ["router", "switch", "access_point", "server", "workstation", "printer", "storage", "camera", "laptop"],
        "vendor": ["Cisco", "HP", "Ubiquiti", "Dell", "Canon", "Synology", "Hikvision", "Apple"]
    },
    "settings": {
        "isPrivate": false,
        "isFavorite": true,
        "tags": ["topology-test", "complex-network", "hierarchical"],
        "notes": "Complex network topology for testing visualization components in browser"
    }
};

// Function to submit topology test data
async function submitTopologyTestData() {
    try {
        console.log('📤 Submitting topology test data...');
        
        const response = await fetch('/api/scan-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testTopologyData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Failed to submit:', response.status, errorText);
            return null;
        }

        const result = await response.json();
        console.log('✅ Topology test data submitted successfully!');
        console.log('Scan ID:', result.scanId);
        return result.scanId;
        
    } catch (error) {
        console.error('❌ Error submitting test data:', error);
        return null;
    }
}

// Function to test topology visualization features
async function testTopologyVisualization() {
    const scanId = await submitTopologyTestData();
    
    if (!scanId) {
        console.error('❌ Could not submit test data. Make sure you are logged in.');
        return;
    }
    
    console.log('\n🎨 Topology Visualization Test Instructions:');
    console.log('1. Look for the scan "Complex Network Topology Browser Test" in the scan history');
    console.log('2. Click on it to view the topology visualization');
    console.log('3. Test the following features:');
    console.log('   📊 Hierarchical view mode');
    console.log('   🔄 Circular view mode');
    console.log('   🎨 Device property customization');
    console.log('   🔗 Connection rendering between devices');
    console.log('   🏷️ Device icons and labels');
    console.log('   📱 Network role assignments');
    
    console.log('\n🔍 Check for these potential issues:');
    console.log('   ❌ Duplicate device rendering');
    console.log('   🔗 Missing or incorrect connections');
    console.log('   🎨 Incorrect device icons or colors');
    console.log('   📐 Layout problems in hierarchical vs circular views');
    console.log('   💾 Custom properties not saving/loading');
    
    // Test if we can inspect the topology data in the frontend
    setTimeout(() => {
        console.log('\n🧪 Testing localStorage for custom device properties...');
        const customProps = localStorage.getItem('customDeviceProperties');
        if (customProps) {
            console.log('Custom device properties found:', JSON.parse(customProps));
        } else {
            console.log('No custom device properties found in localStorage');
        }
        
        // Check if React DevTools are available
        if (window.React) {
            console.log('✅ React DevTools detected - you can inspect component state');
        }
        
        // Check for D3.js
        if (window.d3) {
            console.log('✅ D3.js detected - topology visualization should work');
        } else {
            console.log('❌ D3.js not found - topology visualization may not work');
        }
    }, 2000);
}

// Additional test data - simpler topologies
const starTopologyData = {
    "scanId": "topology-test-star-browser-001",
    "name": "Star Topology Browser Test",
    "ipRange": "10.0.0.0/24",
    "deviceCount": 5,
    "scanData": [
        {
            "ip": "10.0.0.1",
            "mac": "00:AA:BB:CC:DD:01",
            "hostname": "central-switch",
            "deviceType": "switch",
            "vendor": "Cisco",
            "gateway": true,
            "connections": ["10.0.0.10", "10.0.0.11", "10.0.0.12", "10.0.0.13"]
        },
        {
            "ip": "10.0.0.10",
            "hostname": "pc-1",
            "deviceType": "workstation",
            "vendor": "Dell",
            "connectedTo": "10.0.0.1",
            "mac": "00:AA:BB:CC:DD:10"
        },
        {
            "ip": "10.0.0.11",
            "hostname": "pc-2",
            "deviceType": "workstation",
            "vendor": "HP",
            "connectedTo": "10.0.0.1",
            "mac": "00:AA:BB:CC:DD:11"
        },
        {
            "ip": "10.0.0.12",
            "hostname": "server-1",
            "deviceType": "server",
            "vendor": "Dell",
            "connectedTo": "10.0.0.1",
            "mac": "00:AA:BB:CC:DD:12"
        },
        {
            "ip": "10.0.0.13",
            "hostname": "printer-1",
            "deviceType": "printer",
            "vendor": "Canon",
            "connectedTo": "10.0.0.1",
            "mac": "00:AA:BB:CC:DD:13"
        }
    ],
    "metadata": {
        "hasNetworkTopology": true,
        "deviceTypes": ["switch", "workstation", "server", "printer"]
    }
};

// Function to submit multiple test topologies
async function submitAllTestTopologies() {
    console.log('🚀 Submitting multiple topology test cases...');
    
    // Submit complex topology
    await testTopologyVisualization();
    
    // Submit star topology
    try {
        const starResponse = await fetch('/api/scan-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(starTopologyData)
        });
        
        if (starResponse.ok) {
            const starResult = await starResponse.json();
            console.log('✅ Star topology submitted:', starResult.scanId);
        }
    } catch (error) {
        console.error('❌ Error submitting star topology:', error);
    }
    
    console.log('\n📊 Test Summary:');
    console.log('You now have multiple topology test cases to compare:');
    console.log('1. Complex hierarchical network (10 devices)');
    console.log('2. Simple star topology (5 devices)');
    console.log('\nCompare how each renders in both view modes!');
}

// Diagnostic function to check the current state
function diagnosticCheck() {
    console.log('🔧 Running diagnostic check...');
    
    // Check authentication
    if (document.cookie.includes('auth-token')) {
        console.log('✅ Authentication token found');
    } else {
        console.log('❌ No authentication token - please log in first');
    }
    
    // Check current page
    const currentPath = window.location.pathname;
    console.log('📍 Current page:', currentPath);
    
    if (currentPath.includes('networkscan')) {
        console.log('✅ You are on the network scan page');
    } else {
        console.log('💡 Navigate to /networkscan to see topology visualizations');
    }
    
    // Check for required libraries
    const libs = {
        'React': !!window.React,
        'D3.js': !!window.d3,
        'jQuery': !!window.$
    };
    
    console.log('📚 Library availability:', libs);
}

// Export functions for manual use
window.topologyTest = {
    submit: submitAllTestTopologies,
    single: testTopologyVisualization,
    diagnostic: diagnosticCheck,
    data: { complex: testTopologyData, star: starTopologyData }
};

console.log('🎯 Ready! Run the following commands:');
console.log('topologyTest.diagnostic() - Check current state');
console.log('topologyTest.submit() - Submit all test data');
console.log('topologyTest.single() - Submit single complex test');

// Auto-run diagnostic
diagnosticCheck();
