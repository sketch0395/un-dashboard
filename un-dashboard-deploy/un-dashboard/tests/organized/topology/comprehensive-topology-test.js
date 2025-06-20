// Comprehensive Topology Visualization Test for Browser Console
// Instructions:
// 1. Navigate to http://localhost:3000 in your browser
// 2. Log in as admin (admin/admin123!)
// 3. Open Developer Tools (F12) and go to Console tab
// 4. Copy and paste this entire script and press Enter
// 5. Follow the test results and navigate as instructed

console.log('🎯 Comprehensive Topology Visualization Test Starting...');

// Test data with various complexity levels
const testCases = [
    {
        name: "Simple Linear Network",
        data: {
            scanId: "topo-test-simple-001",
            name: "Simple Linear Network Test",
            ipRange: "10.0.1.0/24",
            deviceCount: 3,
            scanData: [
                {
                    ip: "10.0.1.1",
                    mac: "00:AA:BB:CC:DD:01",
                    hostname: "router-main",
                    vendor: "Cisco",
                    openPorts: [22, 80, 443],
                    os: "IOS",
                    deviceType: "router",
                    gateway: true,
                    connections: ["10.0.1.2"]
                },
                {
                    ip: "10.0.1.2",
                    mac: "00:AA:BB:CC:DD:02",
                    hostname: "switch-core",
                    vendor: "Cisco",
                    openPorts: [22, 161],
                    os: "IOS",
                    deviceType: "switch",
                    connectedTo: "10.0.1.1",
                    connections: ["10.0.1.100"]
                },
                {
                    ip: "10.0.1.100",
                    mac: "00:AA:BB:CC:DD:03",
                    hostname: "workstation-01",
                    vendor: "Dell",
                    openPorts: [22, 3389],
                    os: "Windows 11",
                    deviceType: "workstation",
                    connectedTo: "10.0.1.2"
                }
            ]
        }
    },
    {
        name: "Complex Hierarchical Network",
        data: {
            scanId: "topo-test-complex-002",
            name: "Complex Hierarchical Network Test",
            ipRange: "192.168.1.0/24",
            deviceCount: 10,
            scanData: [
                {
                    ip: "192.168.1.1",
                    mac: "00:11:22:33:44:55",
                    hostname: "main-router",
                    vendor: "Cisco",
                    openPorts: [22, 80, 443, 8080],
                    os: "IOS",
                    deviceType: "router",
                    gateway: true,
                    networkRole: "core",
                    connections: ["192.168.1.10", "192.168.1.20", "192.168.1.30"]
                },
                {
                    ip: "192.168.1.10",
                    mac: "00:11:22:33:44:66",
                    hostname: "switch-1",
                    vendor: "Cisco",
                    openPorts: [22, 80, 161],
                    os: "IOS",
                    deviceType: "switch",
                    networkRole: "distribution",
                    connectedTo: "192.168.1.1",
                    connections: ["192.168.1.100", "192.168.1.101", "192.168.1.102"]
                },
                {
                    ip: "192.168.1.20",
                    mac: "00:11:22:33:44:77",
                    hostname: "switch-2",
                    vendor: "HP",
                    openPorts: [22, 80, 161, 443],
                    os: "ProCurve",
                    deviceType: "switch",
                    networkRole: "distribution",
                    connectedTo: "192.168.1.1",
                    connections: ["192.168.1.110", "192.168.1.111"]
                },
                {
                    ip: "192.168.1.30",
                    mac: "00:11:22:33:44:88",
                    hostname: "wireless-ap",
                    vendor: "Ubiquiti",
                    openPorts: [22, 80, 443],
                    os: "UniFi",
                    deviceType: "access_point",
                    networkRole: "access",
                    connectedTo: "192.168.1.1",
                    connections: ["192.168.1.120"]
                },
                {
                    ip: "192.168.1.100",
                    mac: "00:11:22:33:44:99",
                    hostname: "server-web",
                    vendor: "Dell",
                    openPorts: [22, 80, 443, 3306],
                    os: "Ubuntu 22.04",
                    deviceType: "server",
                    networkRole: "server",
                    connectedTo: "192.168.1.10",
                    customProperties: {
                        role: "web-server",
                        environment: "production",
                        criticality: "high"
                    }
                },
                {
                    ip: "192.168.1.101",
                    mac: "00:11:22:33:44:AA",
                    hostname: "server-db",
                    vendor: "Dell",
                    openPorts: [22, 3306, 5432],
                    os: "Ubuntu 22.04",
                    deviceType: "server",
                    networkRole: "server",
                    connectedTo: "192.168.1.10",
                    customProperties: {
                        role: "database-server",
                        environment: "production",
                        criticality: "critical"
                    }
                },
                {
                    ip: "192.168.1.102",
                    mac: "00:11:22:33:44:BB",
                    hostname: "storage-nas",
                    vendor: "Synology",
                    openPorts: [22, 80, 443, 5000],
                    os: "DSM",
                    deviceType: "storage",
                    networkRole: "storage",
                    connectedTo: "192.168.1.10",
                    customProperties: {
                        role: "network-storage",
                        capacity: "10TB",
                        raid: "RAID 5"
                    }
                },
                {
                    ip: "192.168.1.110",
                    mac: "00:11:22:33:44:CC",
                    hostname: "workstation-dev",
                    vendor: "HP",
                    openPorts: [22, 3389, 5900],
                    os: "Windows 11 Pro",
                    deviceType: "workstation",
                    networkRole: "client",
                    connectedTo: "192.168.1.20",
                    customProperties: {
                        department: "Development",
                        user: "dev-team",
                        specs: "32GB RAM, RTX 4080"
                    }
                },
                {
                    ip: "192.168.1.111",
                    mac: "00:11:22:33:44:DD",
                    hostname: "printer-office",
                    vendor: "Canon",
                    openPorts: [80, 443, 9100],
                    os: "Embedded",
                    deviceType: "printer",
                    networkRole: "peripheral",
                    connectedTo: "192.168.1.20",
                    customProperties: {
                        model: "ImageRUNNER",
                        location: "Main Office",
                        features: "Color, Duplex, Scan"
                    }
                },
                {
                    ip: "192.168.1.120",
                    mac: "00:11:22:33:44:EE",
                    hostname: "laptop-mobile",
                    vendor: "Lenovo",
                    openPorts: [22, 3389],
                    os: "Windows 11",
                    deviceType: "laptop",
                    networkRole: "client",
                    connectedTo: "192.168.1.30",
                    customProperties: {
                        department: "Sales",
                        user: "mobile-user",
                        connection: "Wireless"
                    }
                }
            ]
        }
    }
];

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logSection = (title) => {
    console.log('\n' + '='.repeat(50));
    console.log(`📋 ${title}`);
    console.log('='.repeat(50));
};

const logSuccess = (message) => {
    console.log(`✅ ${message}`);
};

const logError = (message, error = null) => {
    console.log(`❌ ${message}`);
    if (error) {
        console.error('Error details:', error);
    }
};

const logWarning = (message) => {
    console.log(`⚠️  ${message}`);
};

const logInfo = (message) => {
    console.log(`ℹ️  ${message}`);
};

// Test execution functions
async function submitTopologyData(testCase) {
    logSection(`Submitting Test Case: ${testCase.name}`);
    
    try {
        const response = await fetch('/api/scan-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testCase.data)
        });

        const result = await response.json();
        
        if (response.ok) {
            logSuccess(`Test case "${testCase.name}" submitted successfully`);
            logInfo(`Scan ID: ${testCase.data.scanId}`);
            logInfo(`Device Count: ${testCase.data.deviceCount}`);
            return { success: true, scanId: testCase.data.scanId, data: result };
        } else {
            logError(`Failed to submit test case: ${result.message || 'Unknown error'}`);
            return { success: false, error: result.message };
        }
    } catch (error) {
        logError(`Network error submitting test case: ${error.message}`, error);
        return { success: false, error: error.message };
    }
}

async function checkVisualizationElements() {
    logSection('Checking Visualization Elements in DOM');
    
    const elements = {
        networkViewManager: document.querySelector('[data-testid="network-view-manager"]'),
        hierarchicalView: document.querySelector('[data-testid="hierarchical-network-view"]'),
        circularView: document.querySelector('[data-testid="circular-network-view"]'),
        networkTopology: document.querySelector('.network-topology'),
        svgContainer: document.querySelector('svg'),
        d3Elements: document.querySelectorAll('.node, .link, .device-node')
    };
    
    logInfo('Checking for visualization components...');
    
    Object.entries(elements).forEach(([name, element]) => {
        if (element) {
            if (name === 'd3Elements') {
                logSuccess(`${name}: Found ${element.length} elements`);
            } else {
                logSuccess(`${name}: Found`);
            }
        } else {
            logWarning(`${name}: Not found`);
        }
    });
    
    // Check for React components
    const reactElements = document.querySelectorAll('[data-reactroot], [data-react-helmet]');
    logInfo(`React elements found: ${reactElements.length}`);
    
    return elements;
}

async function navigateToNetworkScan() {
    logSection('Navigating to Network Scan Page');
    
    try {
        // Check if we're already on the network scan page
        if (window.location.pathname.includes('/networkscan')) {
            logSuccess('Already on network scan page');
            return true;
        }
        
        // Try to find navigation link
        const navLinks = document.querySelectorAll('a[href*="networkscan"], button[onclick*="networkscan"]');
        
        if (navLinks.length > 0) {
            logInfo('Found network scan navigation link, clicking...');
            navLinks[0].click();
            await delay(2000);
            logSuccess('Navigated to network scan page');
            return true;
        } else {
            logWarning('Navigation link not found, trying direct navigation...');
            window.location.href = '/networkscan';
            await delay(3000);
            return true;
        }
    } catch (error) {
        logError('Failed to navigate to network scan page', error);
        return false;
    }
}

async function testTopologyVisualization(scanId) {
    logSection(`Testing Topology Visualization for Scan ID: ${scanId}`);
    
    try {
        // Wait for page to load
        await delay(2000);
        
        // Check for scan history and try to select our test scan
        const historyButtons = document.querySelectorAll('button[data-scan-id], .scan-history-item');
        logInfo(`Found ${historyButtons.length} scan history items`);
        
        // Look for our specific scan
        let targetScan = null;
        historyButtons.forEach(button => {
            const buttonText = button.textContent || button.innerText;
            if (buttonText.includes(scanId) || button.dataset.scanId === scanId) {
                targetScan = button;
            }
        });
        
        if (targetScan) {
            logSuccess(`Found target scan button for ${scanId}`);
            targetScan.click();
            await delay(3000);
            
            // Check for topology visualization after selecting scan
            await checkVisualizationElements();
            
            // Test view switching
            await testViewSwitching();
            
            return true;
        } else {
            logWarning(`Could not find scan ${scanId} in history. Available scans:`);
            historyButtons.forEach((button, index) => {
                const text = (button.textContent || button.innerText).trim();
                logInfo(`  ${index + 1}. ${text}`);
            });
            return false;
        }
    } catch (error) {
        logError('Error testing topology visualization', error);
        return false;
    }
}

async function testViewSwitching() {
    logSection('Testing View Switching (Hierarchical vs Circular)');
    
    try {
        // Look for view toggle buttons
        const viewButtons = document.querySelectorAll('button[data-view], .view-toggle, button[onclick*="view"]');
        logInfo(`Found ${viewButtons.length} potential view toggle buttons`);
        
        viewButtons.forEach((button, index) => {
            const text = (button.textContent || button.innerText).trim();
            logInfo(`  Button ${index + 1}: "${text}"`);
        });
        
        // Try clicking different view buttons
        for (let i = 0; i < Math.min(viewButtons.length, 3); i++) {
            const button = viewButtons[i];
            const buttonText = (button.textContent || button.innerText).trim();
            
            logInfo(`Testing button: "${buttonText}"`);
            button.click();
            await delay(2000);
            
            // Check what changed in the visualization
            const elements = await checkVisualizationElements();
            logInfo(`After clicking "${buttonText}": SVG elements = ${elements.svgContainer ? 'Present' : 'Absent'}`);
        }
        
        return true;
    } catch (error) {
        logError('Error testing view switching', error);
        return false;
    }
}

async function analyzeNetworkData() {
    logSection('Analyzing Network Data in Browser Storage');
    
    try {
        // Check localStorage for network data
        const localStorageKeys = Object.keys(localStorage);
        const networkKeys = localStorageKeys.filter(key => 
            key.includes('network') || key.includes('scan') || key.includes('topology')
        );
        
        logInfo('Network-related localStorage keys:');
        networkKeys.forEach(key => {
            const value = localStorage.getItem(key);
            logInfo(`  ${key}: ${value ? value.substring(0, 100) + '...' : 'null'}`);
        });
        
        // Check for React component state
        const reactContainers = document.querySelectorAll('[data-reactroot]');
        logInfo(`React containers found: ${reactContainers.length}`);
        
        // Check for any error messages
        const errorElements = document.querySelectorAll('.error, .alert-danger, [class*="error"]');
        if (errorElements.length > 0) {
            logWarning(`Found ${errorElements.length} potential error messages:`);
            errorElements.forEach((el, index) => {
                const text = (el.textContent || el.innerText).trim();
                if (text) {
                    logWarning(`  Error ${index + 1}: ${text}`);
                }
            });
        } else {
            logSuccess('No error messages found in DOM');
        }
        
        return true;
    } catch (error) {
        logError('Error analyzing network data', error);
        return false;
    }
}

// Main test execution
async function runComprehensiveTest() {
    logSection('🚀 Starting Comprehensive Topology Visualization Test');
    
    try {
        // Step 1: Check initial page state
        logInfo(`Current URL: ${window.location.href}`);
        logInfo(`Page title: ${document.title}`);
        
        // Step 2: Navigate to network scan page
        const navigationSuccess = await navigateToNetworkScan();
        if (!navigationSuccess) {
            logError('Failed to navigate to network scan page, continuing anyway...');
        }
        
        // Step 3: Submit test cases
        const results = [];
        for (const testCase of testCases) {
            const result = await submitTopologyData(testCase);
            results.push(result);
            await delay(1000); // Brief pause between submissions
        }
        
        // Step 4: Test visualization for successful submissions
        for (const result of results) {
            if (result.success) {
                await testTopologyVisualization(result.scanId);
                await delay(2000);
            }
        }
        
        // Step 5: Analyze current state
        await analyzeNetworkData();
        
        // Step 6: Final summary
        logSection('📊 Test Summary');
        logInfo(`Total test cases: ${testCases.length}`);
        logInfo(`Successful submissions: ${results.filter(r => r.success).length}`);
        logInfo(`Failed submissions: ${results.filter(r => !r.success).length}`);
        
        logSuccess('Comprehensive test completed!');
        
        logSection('🎯 Next Steps');
        logInfo('1. Check the Network Scan page for the submitted test data');
        logInfo('2. Try switching between Hierarchical and Circular views');
        logInfo('3. Look for any rendering issues or missing connections');
        logInfo('4. Test device detail panels and custom properties');
        logInfo('5. Verify that complex hierarchical relationships are displayed correctly');
        
        return results;
        
    } catch (error) {
        logError('Critical error in comprehensive test', error);
        return [];
    }
}

// Auto-start the test
logInfo('Test script loaded successfully!');
logInfo('Starting test in 3 seconds...');

setTimeout(() => {
    runComprehensiveTest().then(results => {
        console.log('🏁 Test execution completed!');
        console.log('Results:', results);
    });
}, 3000);
