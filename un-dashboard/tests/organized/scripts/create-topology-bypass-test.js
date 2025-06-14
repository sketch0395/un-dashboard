console.log('🔧 TOPOLOGY DISPLAY BYPASS TEST');
console.log('='.repeat(50));

// Create a client-side test to bypass server issues and test topology directly

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Topology Display Test</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            background: #1f2937; 
            color: white; 
            padding: 20px; 
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
        }
        .test-section { 
            background: #374151; 
            padding: 20px; 
            margin: 15px 0; 
            border-radius: 8px; 
        }
        .button {
            background: #3b82f6;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
        }
        .button:hover { background: #2563eb; }
        .button.success { background: #10b981; }
        .button.warning { background: #f59e0b; }
        .button.danger { background: #ef4444; }
        pre { 
            background: #111827; 
            padding: 15px; 
            border-radius: 5px; 
            overflow-x: auto; 
            white-space: pre-wrap;
        }
        .status {
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
        }
        .status.success { background: #065f46; color: #d1fae5; }
        .status.error { background: #7f1d1d; color: #fecaca; }
        .status.warning { background: #78350f; color: #fde68a; }
        .status.info { background: #1e3a8a; color: #dbeafe; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Topology Display Bypass Test</h1>
        <p>This tool tests topology display directly in the browser, bypassing server authentication issues.</p>
        
        <div class="test-section">
            <h3>Step 1: Open Network Scan Page</h3>
            <p>First, open the network scan page in a new tab:</p>
            <button class="button" onclick="openNetworkScan()">
                Open Network Scan Page
            </button>
            <div id="openStatus" class="status info" style="display: none;">
                Network scan page opened. Continue with next steps.
            </div>
        </div>
        
        <div class="test-section">
            <h3>Step 2: Inject Test Data</h3>
            <p>This will inject test topology data directly into localStorage:</p>
            <button class="button" onclick="injectTestData()">
                Inject Test Topology Data
            </button>
            <div id="dataStatus" class="status info" style="display: none;">
                Test data injected. Check the results below.
            </div>
            <pre id="dataResults" style="display: none;"></pre>
        </div>
        
        <div class="test-section">
            <h3>Step 3: Test Collaboration Mode</h3>
            <p>Toggle collaboration mode to see if it affects topology display:</p>
            <button class="button" onclick="toggleCollaboration()">
                Toggle Collaboration Mode
            </button>
            <div id="collabStatus" class="status info" style="display: none;">
                Collaboration mode toggled. Check topology display.
            </div>
        </div>
        
        <div class="test-section">
            <h3>Step 4: Debug Topology Rendering</h3>
            <p>Check if topology components are rendering correctly:</p>
            <button class="button" onclick="debugTopology()">
                Debug Topology Rendering
            </button>
            <div id="debugStatus" class="status info" style="display: none;">
                Debug information gathered. Check results below.
            </div>
            <pre id="debugResults" style="display: none;"></pre>
        </div>
        
        <div class="test-section">
            <h3>Step 5: Manual Inspection</h3>
            <p>Things to check manually in the network scan page:</p>
            <ul>
                <li>✅ Check if TopologyDebugger info appears in top-right corner</li>
                <li>✅ Look for SVG elements in the DOM (inspect element)</li>
                <li>✅ Check browser console for errors</li>
                <li>✅ Try switching between Circular and Hierarchical views</li>
                <li>✅ Test with collaboration mode ON vs OFF</li>
                <li>✅ Check if device data is being passed to components</li>
            </ul>
        </div>
    </div>
    
    <script>
        let networkScanWindow = null;
        
        function openNetworkScan() {
            networkScanWindow = window.open('http://localhost:3000/networkscan', '_blank');
            document.getElementById('openStatus').style.display = 'block';
            
            // Wait for page to load, then continue
            setTimeout(() => {
                if (networkScanWindow) {
                    document.getElementById('openStatus').innerHTML = 
                        'Network scan page opened. You should see the TopologyDebugger in the top-right corner.';
                    document.getElementById('openStatus').className = 'status success';
                }
            }, 3000);
        }
        
        function injectTestData() {
            if (!networkScanWindow) {
                alert('Please open the network scan page first');
                return;
            }
            
            try {
                // Inject test device data into the network scan page
                const testDevices = {
                    "192.168.1.1": {
                        name: "Test Gateway",
                        networkRole: "gateway",
                        isMainGateway: true,
                        color: "#10b981"
                    },
                    "192.168.1.10": {
                        name: "Test Switch", 
                        networkRole: "switch",
                        parentGateway: "192.168.1.1",
                        color: "#6366f1"
                    },
                    "192.168.1.100": {
                        name: "Test Computer 1",
                        networkRole: "device",
                        parentSwitch: "192.168.1.10", 
                        color: "#8b5cf6"
                    },
                    "192.168.1.101": {
                        name: "Test Computer 2",
                        networkRole: "device", 
                        parentSwitch: "192.168.1.10",
                        color: "#8b5cf6"
                    }
                };
                
                // Set in localStorage of the network scan window
                networkScanWindow.localStorage.setItem('customDeviceProperties', JSON.stringify(testDevices));
                
                // Also create some mock scan data
                const mockScanData = [{
                    scanId: 'topology-test-001',
                    name: 'Topology Display Test',
                    deviceCount: 4,
                    timestamp: new Date().toISOString(),
                    scanData: {
                        devices: {
                            "Cisco": [
                                {
                                    ip: "192.168.1.1",
                                    hostname: "test-gateway.local",
                                    status: "up",
                                    vendor: "Cisco",
                                    deviceType: "router"
                                },
                                {
                                    ip: "192.168.1.10", 
                                    hostname: "test-switch.local",
                                    status: "up",
                                    vendor: "Cisco",
                                    deviceType: "switch"
                                }
                            ],
                            "Dell": [
                                {
                                    ip: "192.168.1.100",
                                    hostname: "test-pc1.local",
                                    status: "up", 
                                    vendor: "Dell",
                                    deviceType: "computer"
                                },
                                {
                                    ip: "192.168.1.101",
                                    hostname: "test-pc2.local", 
                                    status: "up",
                                    vendor: "Dell",
                                    deviceType: "computer"
                                }
                            ]
                        }
                    },
                    metadata: {
                        hasNetworkTopology: true,
                        deviceTypes: ['router', 'switch', 'computer']
                    }
                }];
                
                networkScanWindow.localStorage.setItem('scanHistory', JSON.stringify(mockScanData));
                
                // Trigger a page refresh to load the new data
                networkScanWindow.location.reload();
                
                document.getElementById('dataStatus').style.display = 'block';
                document.getElementById('dataStatus').className = 'status success';
                document.getElementById('dataStatus').innerHTML = 'Test data injected and page refreshed. Check if topology appears.';
                
                document.getElementById('dataResults').style.display = 'block';
                document.getElementById('dataResults').textContent = 
                    'Injected Data:\\n' + 
                    '- 4 devices (1 gateway, 1 switch, 2 computers)\\n' + 
                    '- Custom device properties with network roles\\n' + 
                    '- Mock scan data with topology metadata\\n\\n' +
                    'Expected: Topology should now display with hierarchical structure';
                
            } catch (error) {
                document.getElementById('dataStatus').style.display = 'block';
                document.getElementById('dataStatus').className = 'status error';
                document.getElementById('dataStatus').innerHTML = 'Error injecting data: ' + error.message;
            }
        }
        
        function toggleCollaboration() {
            if (!networkScanWindow) {
                alert('Please open the network scan page first');
                return;
            }
            
            try {
                // Toggle collaboration mode in the network scan window
                const currentMode = networkScanWindow.localStorage.getItem('collaborativeMode');
                const newMode = currentMode === 'true' ? 'false' : 'true';
                networkScanWindow.localStorage.setItem('collaborativeMode', newMode);
                
                // Also set a fake scan ID for collaboration
                if (newMode === 'true') {
                    networkScanWindow.localStorage.setItem('currentScanId', 'topology-test-001');
                } else {
                    networkScanWindow.localStorage.removeItem('currentScanId');
                }
                
                document.getElementById('collabStatus').style.display = 'block';
                document.getElementById('collabStatus').className = 'status ' + (newMode === 'true' ? 'warning' : 'success');
                document.getElementById('collabStatus').innerHTML = 
                    'Collaboration mode ' + (newMode === 'true' ? 'ENABLED' : 'DISABLED') + 
                    '. Check if topology display changes.';
                    
            } catch (error) {
                document.getElementById('collabStatus').style.display = 'block';
                document.getElementById('collabStatus').className = 'status error'; 
                document.getElementById('collabStatus').innerHTML = 'Error toggling collaboration: ' + error.message;
            }
        }
        
        function debugTopology() {
            if (!networkScanWindow) {
                alert('Please open the network scan page first');
                return;
            }
            
            try {
                // Run debug checks in the network scan window
                const debugInfo = networkScanWindow.eval(\`
                    (() => {
                        const info = {
                            timestamp: new Date().toISOString(),
                            url: window.location.href,
                            localStorage: {
                                customDeviceProperties: !!localStorage.getItem('customDeviceProperties'),
                                scanHistory: !!localStorage.getItem('scanHistory'),
                                collaborativeMode: localStorage.getItem('collaborativeMode'),
                                currentScanId: localStorage.getItem('currentScanId')
                            },
                            domElements: {
                                svg: document.querySelectorAll('svg').length,
                                topologyDebugger: !!document.querySelector('[style*="position: fixed"]'),
                                networkElements: document.querySelectorAll('[class*="network"], [class*="topology"]').length,
                                circles: document.querySelectorAll('circle').length,
                                rects: document.querySelectorAll('rect').length,
                                lines: document.querySelectorAll('line').length,
                                paths: document.querySelectorAll('path').length
                            },
                            react: {
                                reactAvailable: !!window.React,
                                devToolsAvailable: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__
                            },
                            errors: window.topologyErrors || []
                        };
                        
                        // Check for specific topology containers
                        const topologyContainer = document.querySelector('.network-topology, [data-testid*="topology"]');
                        if (topologyContainer) {
                            info.topologyContainer = {
                                found: true,
                                className: topologyContainer.className,
                                childCount: topologyContainer.children.length,
                                dimensions: {
                                    width: topologyContainer.offsetWidth,
                                    height: topologyContainer.offsetHeight
                                }
                            };
                        } else {
                            info.topologyContainer = { found: false };
                        }
                        
                        return info;
                    })()
                \`);
                
                document.getElementById('debugStatus').style.display = 'block';
                document.getElementById('debugStatus').className = 'status success';
                document.getElementById('debugStatus').innerHTML = 'Debug information gathered. Check results below.';
                
                document.getElementById('debugResults').style.display = 'block';
                document.getElementById('debugResults').textContent = JSON.stringify(debugInfo, null, 2);
                
            } catch (error) {
                document.getElementById('debugStatus').style.display = 'block';
                document.getElementById('debugStatus').className = 'status error';
                document.getElementById('debugStatus').innerHTML = 'Error debugging topology: ' + error.message;
                
                document.getElementById('debugResults').style.display = 'block';
                document.getElementById('debugResults').textContent = 'Error: ' + error.message;
            }
        }
    </script>
</body>
</html>
`;

const fs = require('fs');
fs.writeFileSync('./topology-bypass-test.html', html);
console.log('✅ Created topology bypass test tool: topology-bypass-test.html');

console.log('\n🎯 BYPASS TEST INSTRUCTIONS:');
console.log('='.repeat(30));
console.log('1. Open topology-bypass-test.html in your browser');
console.log('2. Click "Open Network Scan Page" to open the app');
console.log('3. Click "Inject Test Topology Data" to add test data');
console.log('4. Check if topology appears in the network scan page');
console.log('5. Click "Toggle Collaboration Mode" to test collaboration effect');
console.log('6. Click "Debug Topology Rendering" to check component state');

console.log('\n🔍 WHAT TO LOOK FOR:');
console.log('- TopologyDebugger info in top-right corner of network scan page');
console.log('- SVG elements appearing in DOM when data is injected');
console.log('- Difference in topology display with collaboration ON vs OFF');
console.log('- Error messages in browser console');
console.log('- Network topology visualization components rendering');

console.log('\n💡 EXPECTED BEHAVIOR:');
console.log('- After injecting data: Topology should show 4 devices in hierarchy');
console.log('- Gateway at top, switch in middle, 2 computers at bottom');
console.log('- TopologyDebugger should show device count, dimensions, collaboration status');
console.log('- Switching collaboration mode should NOT break topology display');

console.log('\n🔧 TROUBLESHOOTING:');
console.log('- If no topology appears: Check console for React errors');
console.log('- If collaboration breaks topology: Compare debug info before/after');
console.log('- If TopologyDebugger missing: Component import/render error');
console.log('- If data injection fails: Browser security restrictions');
