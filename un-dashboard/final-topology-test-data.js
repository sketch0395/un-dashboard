#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');

async function createTopologyTestData() {
    console.log('🚀 CREATING TOPOLOGY TEST DATA FOR UI TESTING');
    
    try {
        const loginData = JSON.parse(fs.readFileSync('login-data.json', 'utf8'));
          // Create test scan data in the correct API format
        const scanDevices = [
            {
                ip: '192.168.1.1',
                hostname: 'Main-Gateway',
                mac: '00:11:22:33:44:01',
                deviceType: 'Gateway',
                manufacturer: 'Cisco',
                openPorts: [22, 80, 443],
                services: ['SSH', 'HTTP', 'HTTPS'],
                responseTime: 2,
                lastSeen: new Date().toISOString(),
                isOnline: true,
                connections: ['192.168.1.10', '192.168.1.20']
            },
            {
                ip: '192.168.1.10',
                hostname: 'Core-Switch-A',
                mac: '00:11:22:33:44:10',
                deviceType: 'Switch',
                manufacturer: 'HP',
                openPorts: [22, 80, 161],
                services: ['SSH', 'HTTP', 'SNMP'],
                responseTime: 1,
                lastSeen: new Date().toISOString(),
                isOnline: true,
                connections: ['192.168.1.1', '192.168.1.101', '192.168.1.102', '192.168.1.103']
            },
            {
                ip: '192.168.1.20',
                hostname: 'Core-Switch-B',
                mac: '00:11:22:33:44:20',
                deviceType: 'Switch',
                manufacturer: 'Dell',
                openPorts: [22, 80, 161],
                services: ['SSH', 'HTTP', 'SNMP'],
                responseTime: 1,
                lastSeen: new Date().toISOString(),
                isOnline: true,
                connections: ['192.168.1.1', '192.168.1.201', '192.168.1.202']
            },
            {
                ip: '192.168.1.101',
                hostname: 'Workstation-Alpha',
                mac: '00:11:22:33:44:A1',
                deviceType: 'Workstation',
                manufacturer: 'Dell',
                openPorts: [22, 3389],
                services: ['SSH', 'RDP'],
                responseTime: 5,
                lastSeen: new Date().toISOString(),
                isOnline: true,
                connections: ['192.168.1.10']
            },
            {
                ip: '192.168.1.102',
                hostname: 'Server-DB',
                mac: '00:11:22:33:44:A2',
                deviceType: 'Server',
                manufacturer: 'HP',
                openPorts: [22, 3306, 5432],
                services: ['SSH', 'MySQL', 'PostgreSQL'],
                responseTime: 3,
                lastSeen: new Date().toISOString(),
                isOnline: true,
                connections: ['192.168.1.10']
            },
            {
                ip: '192.168.1.103',
                hostname: 'Printer-Office',
                mac: '00:11:22:33:44:A3',
                deviceType: 'Printer',
                manufacturer: 'Canon',
                openPorts: [9100, 631],
                services: ['RAW', 'IPP'],
                responseTime: 10,
                lastSeen: new Date().toISOString(),
                isOnline: true,
                connections: ['192.168.1.10']
            },
            {
                ip: '192.168.1.201',
                hostname: 'Server-Web',
                mac: '00:11:22:33:44:B1',
                deviceType: 'Server',
                manufacturer: 'Dell',
                openPorts: [22, 80, 443],
                services: ['SSH', 'HTTP', 'HTTPS'],
                responseTime: 4,
                lastSeen: new Date().toISOString(),
                isOnline: true,
                connections: ['192.168.1.20']
            },
            {
                ip: '192.168.1.202',
                hostname: 'NAS-Storage',
                mac: '00:11:22:33:44:B2',
                deviceType: 'Storage',
                manufacturer: 'Synology',
                openPorts: [22, 139, 445, 5000],
                services: ['SSH', 'SMB', 'DSM'],
                responseTime: 6,
                lastSeen: new Date().toISOString(),
                isOnline: true,
                connections: ['192.168.1.20']
            }
        ];

        const topologyTestData = {
            scanId: `topology-test-${Date.now()}`,
            name: 'Topology Test Network - Gateway/Switch/Device Hierarchy',
            ipRange: '192.168.1.0/24',
            deviceCount: scanDevices.length,
            scanData: {
                network: '192.168.1.0/24',
                gateway: '192.168.1.1',
                devices: scanDevices,
                timestamp: new Date().toISOString()
            },
            metadata: {
                scanType: 'full',
                scanDuration: 45.7,
                osDetection: true,
                serviceDetection: true,
                ports: [22, 80, 443, 161, 3389, 3306, 5432, 9100, 631, 139, 445, 5000],
                hasNetworkTopology: true,
                vendor: 'UN Dashboard',
                deviceTypes: ['Gateway', 'Switch', 'Workstation', 'Server', 'Printer', 'Storage']
            },
            settings: {
                isPrivate: false,
                isFavorite: true,
                tags: ['topology', 'test', 'network-hierarchy'],
                notes: 'Test data for topology visualization with gateway-switch-device hierarchy'
            }
        };
        
        console.log('📤 Sending topology test data...');
        
        // Save to database
        const response = await fetch('http://localhost:3001/api/scan-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.authToken}`
            },
            body: JSON.stringify(topologyTestData)
        });
        
        console.log(`Response status: ${response.status}`);
        
        if (response.ok) {
            const result = await response.json();            console.log('✅ Topology test data created successfully');
            console.log(`📊 Created scan with ${scanDevices.length} devices`);
            console.log('🌐 Network hierarchy:');
            console.log('   Gateway: Main-Gateway (192.168.1.1)');
            console.log('   ├── Core-Switch-A (192.168.1.10)');
            console.log('   │   ├── Workstation-Alpha (192.168.1.101)');
            console.log('   │   ├── Server-DB (192.168.1.102)');
            console.log('   │   └── Printer-Office (192.168.1.103)');
            console.log('   └── Core-Switch-B (192.168.1.20)');
            console.log('       ├── Server-Web (192.168.1.201)');
            console.log('       └── NAS-Storage (192.168.1.202)');
            console.log('');
            console.log('🎯 READY FOR UI TOPOLOGY TESTING!');
        } else {
            const errorText = await response.text();
            console.log('❌ Failed to create test data:', response.status, errorText);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

createTopologyTestData();
