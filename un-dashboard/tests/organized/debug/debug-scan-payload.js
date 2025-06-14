// Debug script to test the exact payload being sent to the scan history API

async function testScanPayload() {
    console.log('=== DEBUGGING SCAN HISTORY 500 ERROR ===\n');
    
    // Simulate the exact payload structure from networkscanhistory.js
    const mockScanEntry = {
        id: 'test-scan-' + Date.now(),
        timestamp: new Date().toISOString(),
        ipRange: '10.5.1.1-255',
        devices: 3, // This is the NUMBER of devices (not an array)
        data: {
            // This is the actual device data structure from localStorage
            'Test Vendor': [
                {
                    ip: '10.5.1.1',
                    hostname: 'router.local',
                    mac: '00:11:22:33:44:55',
                    vendor: 'Test Vendor',
                    ports: ['80/tcp open http', '443/tcp open https'],
                    status: 'up'
                },
                {
                    ip: '10.5.1.100',
                    hostname: 'desktop.local',
                    mac: '00:11:22:33:44:66',
                    vendor: 'Test Vendor',
                    ports: ['22/tcp open ssh'],
                    status: 'up'
                }
            ],
            'Another Vendor': [
                {
                    ip: '10.5.1.200',
                    hostname: 'printer.local',
                    mac: '00:11:22:33:44:77',
                    vendor: 'Another Vendor',
                    ports: ['80/tcp open http'],
                    status: 'up'
                }
            ]
        },
        settings: {
            isPrivate: true,
            isFavorite: false,
            tags: [],
            notes: ''
        }
    };

    // Create the exact dbPayload that networkscanhistory.js creates
    const dbPayload = {
        scanId: mockScanEntry.id,
        name: mockScanEntry.name || `Network Scan Test`,
        ipRange: mockScanEntry.ipRange,
        deviceCount: mockScanEntry.devices || 0, // This should be 3
        scanData: {
            devices: mockScanEntry.data || {}, // This contains the actual device data
            portScanResults: mockScanEntry.portScanResults || [],
            networkInfo: mockScanEntry.networkInfo || {}
        },
        metadata: {
            timestamp: mockScanEntry.timestamp,
            scanDuration: mockScanEntry.scanDuration || 0,
            userAgent: 'Node.js Test Script'
        },
        settings: mockScanEntry.settings || {
            isPrivate: true,
            isFavorite: false,
            tags: [],
            notes: ''
        }
    };

    console.log('1. Mock scan entry structure:');
    console.log(JSON.stringify(mockScanEntry, null, 2));
    
    console.log('\n2. Database payload structure (what gets sent to API):');
    console.log(JSON.stringify(dbPayload, null, 2));
    
    console.log('\n3. Validating required fields for API:');
    console.log('- scanId:', !!dbPayload.scanId);
    console.log('- ipRange:', !!dbPayload.ipRange);
    console.log('- deviceCount:', dbPayload.deviceCount, typeof dbPayload.deviceCount);
    console.log('- scanData:', !!dbPayload.scanData);
    console.log('- scanData.devices:', !!dbPayload.scanData.devices);
    
    console.log('\n4. Device count calculation verification:');
    let calculatedDeviceCount = 0;
    if (dbPayload.scanData && dbPayload.scanData.devices) {
        Object.entries(dbPayload.scanData.devices).forEach(([vendor, devices]) => {
            if (Array.isArray(devices)) {
                calculatedDeviceCount += devices.length;
                console.log(`- ${vendor}: ${devices.length} devices`);
            }
        });
    }
    console.log(`- Total calculated: ${calculatedDeviceCount}`);
    console.log(`- Payload deviceCount: ${dbPayload.deviceCount}`);
    console.log(`- Match: ${calculatedDeviceCount === dbPayload.deviceCount}`);
      // Test with actual API call (you'll need to run this while server is running and authenticated)
    console.log('\n5. API call test skipped (would need auth and running server)');
    console.log('Payload appears valid based on structure analysis.');
}

testScanPayload().catch(console.error);
