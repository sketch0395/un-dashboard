// Quick manual topology test - works with current server on port 3000
console.log('🔍 QUICK TOPOLOGY DEBUG TEST');

// Create simple test data to inject
const testData = {
    scanId: 'manual-topology-debug-' + Date.now(),
    name: 'Manual Topology Debug Test',
    ipRange: '192.168.1.0/24',
    deviceCount: 4,
    scanData: {
        'Cisco': [
            {
                ip: '192.168.1.1',
                hostname: 'gateway.local',
                mac: '00:11:22:33:44:01',
                ports: [22, 80, 443],
                vendor: 'Cisco',
                deviceType: 'router'
            },
            {
                ip: '192.168.1.10',
                hostname: 'switch.local',
                mac: '00:11:22:33:44:02',
                ports: [22, 80, 161],
                vendor: 'Cisco',
                deviceType: 'switch'
            }
        ],
        'Dell': [
            {
                ip: '192.168.1.100',
                hostname: 'workstation1.local',
                mac: '00:11:22:33:44:03',
                ports: [22, 3389],
                vendor: 'Dell',
                deviceType: 'workstation'
            }
        ],
        'HP': [
            {
                ip: '192.168.1.101',
                hostname: 'workstation2.local',
                mac: '00:11:22:33:44:04',
                ports: [22, 80],
                vendor: 'HP',
                deviceType: 'workstation'
            }
        ]
    },
    metadata: {
        scanType: 'full',
        hasNetworkTopology: true,
        deviceTypes: ['router', 'switch', 'workstation']
    }
};

console.log('📊 Test data created:', testData.deviceCount, 'devices');

// Instructions for manual testing
console.log('\n🎯 MANUAL TESTING INSTRUCTIONS:');
console.log('1. Open browser to http://localhost:3000/networkscan');
console.log('2. Open browser console (F12)');
console.log('3. Copy and paste this code:');
console.log('');
console.log('// === TOPOLOGY TEST DATA INJECTION ===');
console.log('const testTopologyData = ' + JSON.stringify(testData, null, 2) + ';');
console.log('');
console.log('// Submit the test data');
console.log('fetch("/api/scan-history", {');
console.log('  method: "POST",');
console.log('  headers: {"Content-Type": "application/json"},');
console.log('  body: JSON.stringify(testTopologyData)');
console.log('}).then(r => r.json()).then(result => {');
console.log('  console.log("✅ Test data submitted:", result);');
console.log('  // Refresh the page to see the topology');
console.log('  setTimeout(() => location.reload(), 1000);');
console.log('}).catch(e => console.error("❌ Error:", e));');

console.log('\n4. After running the code, check if:');
console.log('   - TopologyDebugger appears in top-right corner');
console.log('   - Network topology visualization renders');
console.log('   - SVG elements appear in DOM');
console.log('   - No console errors');

console.log('\n5. Test collaboration mode:');
console.log('   - Look for collaboration toggle');
console.log('   - Enable collaboration mode');
console.log('   - Check if topology still displays');
console.log('   - Compare TopologyDebugger info before/after');

console.log('\n✅ Manual test setup complete!');
