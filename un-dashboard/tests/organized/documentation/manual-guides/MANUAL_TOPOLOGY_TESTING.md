# Manual Topology Visualization Testing Instructions

## Prerequisites
1. Ensure the UN Dashboard is running on http://localhost:3000
2. Have browser developer tools ready (F12)

## Step-by-Step Testing Process

### Phase 1: Authentication and Navigation
1. Open http://localhost:3000 in your browser
2. Log in using admin credentials: `admin` / `admin123!`
3. Navigate to the Network Scan page
4. Open browser Developer Tools (F12) and go to the Console tab

### Phase 2: Submit Test Data
Copy and paste the following test script into the browser console:

```javascript
// Quick topology test script
const testData = {
    scanId: "manual-test-" + Date.now(),
    name: "Manual Topology Test",
    ipRange: "192.168.50.0/24",
    deviceCount: 4,
    scanData: [
        {
            ip: "192.168.50.1",
            mac: "00:11:22:33:44:01",
            hostname: "main-router",
            vendor: "Cisco",
            openPorts: [22, 80, 443],
            os: "IOS",
            deviceType: "router",
            gateway: true,
            connections: ["192.168.50.10", "192.168.50.20"]
        },
        {
            ip: "192.168.50.10",
            mac: "00:11:22:33:44:02",
            hostname: "core-switch",
            vendor: "Cisco",
            openPorts: [22, 161],
            os: "IOS",
            deviceType: "switch",
            connectedTo: "192.168.50.1",
            connections: ["192.168.50.100"]
        },
        {
            ip: "192.168.50.20",
            mac: "00:11:22:33:44:03",
            hostname: "wifi-ap",
            vendor: "Ubiquiti",
            openPorts: [22, 80],
            os: "UniFi",
            deviceType: "access_point",
            connectedTo: "192.168.50.1",
            connections: ["192.168.50.101"]
        },
        {
            ip: "192.168.50.100",
            mac: "00:11:22:33:44:04",
            hostname: "web-server",
            vendor: "Dell",
            openPorts: [22, 80, 443],
            os: "Ubuntu",
            deviceType: "server",
            connectedTo: "192.168.50.10"
        }
    ]
};

fetch('/api/scan-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
}).then(response => response.json())
.then(result => {
    console.log('✅ Test data submitted:', result);
    console.log('🔍 Look for scan ID:', testData.scanId);
}).catch(error => {
    console.error('❌ Error:', error);
});
```

### Phase 3: Test Topology Visualization
1. After submitting test data, refresh the Network Scan page
2. Look for the new scan in the scan history list
3. Click on the test scan to load its topology visualization

### Phase 4: Check for Issues
Monitor the following areas for problems:

#### A. Duplication Issues
- Check if the same scan appears multiple times in the scan history
- Verify that devices are not duplicated in the visualization
- Look for repeated network connections

#### B. Visualization Rendering
- Confirm that all 4 devices appear in the topology
- Verify that connections between devices are shown
- Check if device types are correctly represented (router, switch, access point, server)

#### C. View Switching
- Look for view toggle buttons (Circular vs Hierarchical)
- Test switching between different visualization modes
- Verify that the topology renders correctly in both views

#### D. Device Hierarchy
- Confirm that the router appears at the top/center of the hierarchy
- Check that switch and access point are connected to the router
- Verify that the server is connected to the switch

### Phase 5: Advanced Testing
Copy and paste this extended test to check for more complex scenarios:

```javascript
// Extended test with custom properties and complex hierarchy
const complexTestData = {
    scanId: "complex-test-" + Date.now(),
    name: "Complex Hierarchy Test",
    ipRange: "172.16.0.0/24",
    deviceCount: 8,
    scanData: [
        {
            ip: "172.16.0.1",
            mac: "00:AA:BB:CC:DD:01",
            hostname: "edge-router",
            vendor: "Cisco",
            openPorts: [22, 80, 443],
            deviceType: "router",
            gateway: true,
            networkRole: "core",
            connections: ["172.16.0.10", "172.16.0.20"]
        },
        {
            ip: "172.16.0.10",
            mac: "00:AA:BB:CC:DD:02",
            hostname: "dist-switch-1",
            vendor: "Cisco",
            deviceType: "switch",
            networkRole: "distribution",
            connectedTo: "172.16.0.1",
            connections: ["172.16.0.100", "172.16.0.101"]
        },
        {
            ip: "172.16.0.20",
            mac: "00:AA:BB:CC:DD:03",
            hostname: "dist-switch-2",
            vendor: "HP",
            deviceType: "switch",
            networkRole: "distribution",
            connectedTo: "172.16.0.1",
            connections: ["172.16.0.110", "172.16.0.111"]
        },
        {
            ip: "172.16.0.100",
            mac: "00:AA:BB:CC:DD:04",
            hostname: "app-server",
            vendor: "Dell",
            deviceType: "server",
            networkRole: "server",
            connectedTo: "172.16.0.10",
            customProperties: { role: "application", criticality: "high" }
        },
        {
            ip: "172.16.0.101",
            mac: "00:AA:BB:CC:DD:05",
            hostname: "db-server",
            vendor: "Dell",
            deviceType: "server",
            networkRole: "server",
            connectedTo: "172.16.0.10",
            customProperties: { role: "database", criticality: "critical" }
        },
        {
            ip: "172.16.0.110",
            mac: "00:AA:BB:CC:DD:06",
            hostname: "workstation-1",
            vendor: "HP",
            deviceType: "workstation",
            networkRole: "client",
            connectedTo: "172.16.0.20",
            customProperties: { department: "IT", user: "admin" }
        },
        {
            ip: "172.16.0.111",
            mac: "00:AA:BB:CC:DD:07",
            hostname: "printer-main",
            vendor: "Canon",
            deviceType: "printer",
            networkRole: "peripheral",
            connectedTo: "172.16.0.20",
            customProperties: { location: "Office Floor 1" }
        },
        {
            ip: "172.16.0.30",
            mac: "00:AA:BB:CC:DD:08",
            hostname: "wireless-controller",
            vendor: "Aruba",
            deviceType: "access_point",
            networkRole: "access",
            connectedTo: "172.16.0.1",
            customProperties: { type: "controller", managed_aps: 5 }
        }
    ]
};

fetch('/api/scan-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(complexTestData)
}).then(response => response.json())
.then(result => {
    console.log('✅ Complex test data submitted:', result);
    console.log('🔍 Look for scan ID:', complexTestData.scanId);
}).catch(error => {
    console.error('❌ Error:', error);
});
```

### Phase 6: Diagnostic Checks
Run this diagnostic script to check the current state:

```javascript
// Diagnostic script
console.log('🔍 Running diagnostics...');

// Check for visualization elements
const elements = {
    svg: document.querySelector('svg'),
    nodes: document.querySelectorAll('.node, .device-node, circle'),
    links: document.querySelectorAll('.link, .connection, line'),
    container: document.querySelector('.network-topology, [data-testid*="network"]')
};

console.log('📊 Elements found:');
Object.entries(elements).forEach(([name, el]) => {
    if (el && el.length !== undefined) {
        console.log(`  ${name}: ${el.length} elements`);
    } else {
        console.log(`  ${name}: ${el ? 'Present' : 'Not found'}`);
    }
});

// Check localStorage
const storage = Object.keys(localStorage).filter(k => 
    k.includes('network') || k.includes('device') || k.includes('scan')
);
console.log('💾 Storage keys:', storage);

// Check for errors
const errors = document.querySelectorAll('.error, .alert-danger, [class*="error"]');
console.log('⚠️  Error elements:', errors.length);
errors.forEach((el, i) => {
    const text = el.textContent?.trim();
    if (text) console.log(`  ${i+1}. ${text}`);
});
```

## Expected Results

### Success Indicators:
- ✅ Test scans appear in scan history without duplicates
- ✅ Clicking a scan loads the topology visualization
- ✅ All devices appear as nodes in the visualization
- ✅ Connections between devices are visible as lines/links
- ✅ Device types are correctly represented with appropriate icons/colors
- ✅ View switching (Circular ↔ Hierarchical) works correctly
- ✅ Hierarchical view shows proper device hierarchy (router → switches → endpoints)

### Potential Issues to Identify:
- ❌ Duplicate scans in history
- ❌ Missing devices in topology
- ❌ Missing or incorrect connections
- ❌ Visualization not rendering at all
- ❌ View switching not working
- ❌ Incorrect device hierarchy
- ❌ Custom properties not displaying
- ❌ Network roles not affecting layout

## Next Steps
Based on the results of this manual testing, we can identify specific issues and apply targeted fixes to the visualization components.
