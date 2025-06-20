// Simple Browser Test for Topology Visualization
// Copy and paste this into the browser console after logging into the UN Dashboard

console.log('🔍 Simple Topology Visualization Test');

// Single test case for quick validation
const testData = {
    scanId: "browser-test-" + Date.now(),
    name: "Browser Test - Topology Visualization",
    ipRange: "192.168.10.0/24",
    deviceCount: 5,
    scanData: [
        {
            ip: "192.168.10.1",
            mac: "00:AA:BB:CC:DD:01",
            hostname: "test-router",
            vendor: "Cisco",
            openPorts: [22, 80, 443],
            os: "IOS",
            deviceType: "router",
            gateway: true,
            connections: ["192.168.10.2", "192.168.10.3"]
        },
        {
            ip: "192.168.10.2",
            mac: "00:AA:BB:CC:DD:02",
            hostname: "test-switch",
            vendor: "Cisco",
            openPorts: [22, 161],
            os: "IOS",
            deviceType: "switch",
            connectedTo: "192.168.10.1",
            connections: ["192.168.10.100", "192.168.10.101"]
        },
        {
            ip: "192.168.10.3",
            mac: "00:AA:BB:CC:DD:03",
            hostname: "test-ap",
            vendor: "Ubiquiti",
            openPorts: [22, 80],
            os: "UniFi",
            deviceType: "access_point",
            connectedTo: "192.168.10.1"
        },
        {
            ip: "192.168.10.100",
            mac: "00:AA:BB:CC:DD:04",
            hostname: "test-server",
            vendor: "Dell",
            openPorts: [22, 80, 443],
            os: "Ubuntu",
            deviceType: "server",
            connectedTo: "192.168.10.2"
        },
        {
            ip: "192.168.10.101",
            mac: "00:AA:BB:CC:DD:05",
            hostname: "test-workstation",
            vendor: "HP",
            openPorts: [22, 3389],
            os: "Windows 11",
            deviceType: "workstation",
            connectedTo: "192.168.10.2"
        }
    ]
};

async function runSimpleTest() {
    console.log('🚀 Starting simple topology test...');
    
    try {
        // Step 1: Submit test data
        console.log('📤 Submitting test data...');
        const response = await fetch('/api/scan-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        const result = await response.json();
        
        if (!response.ok) {
            console.error('❌ Failed to submit test data:', result);
            return;
        }
        
        console.log('✅ Test data submitted successfully');
        console.log('📋 Scan ID:', testData.scanId);
        
        // Step 2: Check current page
        console.log('📍 Current URL:', window.location.href);
        
        // Step 3: Navigate to network scan if needed
        if (!window.location.href.includes('/networkscan')) {
            console.log('🧭 Navigating to network scan page...');
            window.location.href = '/networkscan';
            console.log('⏳ Please wait for page to load, then check the scan history for:', testData.scanId);
            return;
        }
        
        // Step 4: Look for visualization elements
        console.log('🔍 Checking for visualization elements...');
        
        const elements = {
            svg: document.querySelector('svg'),
            networkNodes: document.querySelectorAll('.node, .device-node'),
            networkLinks: document.querySelectorAll('.link, .connection'),
            topologyContainer: document.querySelector('.network-topology, [data-testid*="network"]'),
            scanHistory: document.querySelectorAll('.scan-history-item, button[data-scan-id]')
        };
        
        console.log('📊 Visualization Elements Found:');
        Object.entries(elements).forEach(([name, element]) => {
            if (element) {
                if (element.length !== undefined) {
                    console.log(`  ✅ ${name}: ${element.length} elements`);
                } else {
                    console.log(`  ✅ ${name}: Present`);
                }
            } else {
                console.log(`  ❌ ${name}: Not found`);
            }
        });
        
        // Step 5: Look for our test scan in the history
        console.log('🔍 Looking for test scan in history...');
        const historyItems = document.querySelectorAll('button, .scan-item');
        let foundTestScan = false;
        
        historyItems.forEach((item, index) => {
            const text = item.textContent || item.innerText || '';
            if (text.includes(testData.scanId) || text.includes('Browser Test')) {
                console.log(`✅ Found test scan at position ${index + 1}: "${text.trim()}"`);
                foundTestScan = true;
                
                // Try to click it
                console.log('🖱️  Attempting to click test scan...');
                item.click();
            }
        });
        
        if (!foundTestScan) {
            console.log('❌ Test scan not found in history. Available items:');
            historyItems.forEach((item, index) => {
                const text = (item.textContent || item.innerText || '').trim();
                if (text.length > 0) {
                    console.log(`  ${index + 1}. "${text}"`);
                }
            });
        }
        
        // Step 6: Check for any error messages
        const errorElements = document.querySelectorAll('.error, .alert-danger, [class*="error"]');
        if (errorElements.length > 0) {
            console.log('⚠️  Found potential error messages:');
            errorElements.forEach((el, index) => {
                const text = (el.textContent || el.innerText || '').trim();
                if (text) {
                    console.log(`  ${index + 1}. ${text}`);
                }
            });
        }
        
        // Step 7: Check localStorage for device data
        console.log('💾 Checking localStorage for device data...');
        const storageKeys = Object.keys(localStorage).filter(key => 
            key.includes('network') || key.includes('device') || key.includes('scan')
        );
        
        console.log('🗄️  Relevant localStorage keys:');
        storageKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    const parsed = JSON.parse(value);
                    console.log(`  📁 ${key}: ${Object.keys(parsed).length} items`);
                } catch {
                    console.log(`  📄 ${key}: ${value.length} characters`);
                }
            }
        });
        
        console.log('✨ Simple test completed!');
        console.log('📋 Summary:');
        console.log(`  - Test scan ID: ${testData.scanId}`);
        console.log(`  - Devices in test: ${testData.deviceCount}`);
        console.log(`  - SVG present: ${elements.svg ? 'Yes' : 'No'}`);
        console.log(`  - Network nodes: ${elements.networkNodes.length}`);
        console.log(`  - Test scan found: ${foundTestScan ? 'Yes' : 'No'}`);
        
    } catch (error) {
        console.error('❌ Error in simple test:', error);
    }
}

// Run the test
runSimpleTest();
