#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');

async function verifyTopologyData() {
    console.log('🔍 VERIFYING TOPOLOGY TEST DATA ACCESS');
    
    try {
        const loginData = JSON.parse(fs.readFileSync('login-data.json', 'utf8'));
        
        // Check scan history endpoint
        console.log('📡 Fetching scan history...');
        const response = await fetch('http://localhost:3001/api/scan-history', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${loginData.authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Response status: ${response.status}`);
        
        if (response.ok) {
            const scans = await response.json();
            console.log(`✅ Found ${scans.length} scans in database`);
            
            // Find our topology test data
            const topologyTest = scans.find(scan => 
                scan.scanId === 'topology-test-2025' || 
                scan.metadata?.scanName === 'Full Network Topology Test'
            );
            
            if (topologyTest) {
                console.log('🎯 TOPOLOGY TEST DATA FOUND:');
                console.log(`   Scan ID: ${topologyTest.scanId}`);
                console.log(`   Scan Name: ${topologyTest.metadata?.scanName}`);
                console.log(`   Device Count: ${topologyTest.deviceCount}`);
                console.log(`   IP Range: ${topologyTest.ipRange}`);
                console.log(`   Scan Type: ${topologyTest.metadata?.scanType}`);
                console.log(`   Created: ${topologyTest.createdAt}`);
                
                // Check device data structure
                if (topologyTest.scanData && topologyTest.scanData.devices) {
                    console.log(`\n📊 DEVICE BREAKDOWN:`);
                    const devices = topologyTest.scanData.devices;
                    const deviceTypes = {};
                    
                    devices.forEach(device => {
                        const type = device.deviceType || 'Unknown';
                        deviceTypes[type] = (deviceTypes[type] || 0) + 1;
                        console.log(`   ${device.hostname} (${device.ip}) - ${type}`);
                    });
                    
                    console.log(`\n📈 DEVICE TYPE SUMMARY:`);
                    Object.entries(deviceTypes).forEach(([type, count]) => {
                        console.log(`   ${type}: ${count} devices`);
                    });
                    
                    // Check connections
                    const connectionsFound = devices.filter(d => d.connections && d.connections.length > 0);
                    console.log(`\n🔗 NETWORK CONNECTIONS:`);
                    console.log(`   Devices with connections: ${connectionsFound.length}/${devices.length}`);
                    connectionsFound.forEach(device => {
                        console.log(`   ${device.hostname}: connected to ${device.connections.join(', ')}`);
                    });
                    
                } else {
                    console.log('⚠️  No device data found in scan');
                }
                
                console.log('\n✅ TOPOLOGY DATA VERIFICATION COMPLETE');
                console.log('🌐 Ready for UI testing at: http://localhost:3001/networkscan');
                
            } else {
                console.log('❌ Topology test data not found');
                console.log('Available scans:');
                scans.forEach(scan => {
                    console.log(`   - ${scan.scanId}: ${scan.metadata?.scanName || 'Unnamed'} (${scan.deviceCount} devices)`);
                });
            }
            
        } else {
            const error = await response.text();
            console.error('❌ Failed to fetch scan history:', error);
        }
        
    } catch (error) {
        console.error('❌ Error verifying topology data:', error.message);
    }
}

verifyTopologyData();
