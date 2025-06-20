// Test script to validate scan data format for API submission
const testScanFormat = () => {
    console.log('=== Testing Scan Data Format ===\n');

    // Test data structure that matches what the frontend creates
    const mockScanData = {
        "Unknown": [
            {
                ip: '192.168.1.1',
                hostname: 'router.local',
                mac: '00:11:22:33:44:55',
                vendor: 'Unknown',
                ports: ['80/tcp open http', '443/tcp open https'],
                status: 'up',
                latency: '1.2ms'
            }
        ],
        "Apple Inc.": [
            {
                ip: '192.168.1.100',
                hostname: 'macbook.local',
                mac: '00:11:22:33:44:66',
                vendor: 'Apple Inc.',
                ports: ['22/tcp open ssh'],
                status: 'up',
                latency: '2.1ms'
            }
        ]
    };

    // Calculate device count properly
    let deviceCount = 0;
    Object.entries(mockScanData).forEach(([vendor, devices]) => {
        if (Array.isArray(devices)) {
            deviceCount += devices.length;
            console.log(`${vendor}: ${devices.length} devices`);
        }
    });

    console.log(`\nTotal device count: ${deviceCount}`);

    // Create the payload format that the API expects
    const apiPayload = {
        scanId: `scan-${Date.now()}`,
        name: `Test Network Scan - ${new Date().toLocaleDateString()}`,
        ipRange: '192.168.1.0/24',
        deviceCount: deviceCount, // This is the NUMBER of devices, not the device array
        scanData: {
            devices: mockScanData, // This contains the actual device data organized by vendor
            portScanResults: [],
            networkInfo: {}
        },
        metadata: {
            timestamp: new Date().toISOString(),
            scanDuration: 30,
            userAgent: 'test-script',
            scanType: 'ping',
            osDetection: false,
            serviceDetection: false,
            ports: [],
            hasNetworkTopology: false,
            deviceTypes: ['router', 'computer']
        },
        settings: {
            isPrivate: true,
            isFavorite: false,
            tags: ['test'],
            notes: 'Test scan for format validation'
        }
    };

    console.log('\n=== API Payload Structure ===');
    console.log('Required fields validation:');
    console.log(`✓ scanId: ${apiPayload.scanId ? 'Present' : 'MISSING'}`);
    console.log(`✓ ipRange: ${apiPayload.ipRange ? 'Present' : 'MISSING'}`);
    console.log(`✓ deviceCount: ${typeof apiPayload.deviceCount === 'number' ? `Present (${apiPayload.deviceCount})` : 'MISSING or invalid type'}`);
    console.log(`✓ scanData: ${apiPayload.scanData ? 'Present' : 'MISSING'}`);

    console.log('\n=== Payload JSON ===');
    console.log(JSON.stringify(apiPayload, null, 2));

    // Test what happens with no devices found
    console.log('\n=== Empty Scan Test ===');
    const emptyScanData = {};
    let emptyDeviceCount = 0;
    Object.entries(emptyScanData).forEach(([vendor, devices]) => {
        if (Array.isArray(devices)) {
            emptyDeviceCount += devices.length;
        }
    });
    console.log(`Empty scan device count: ${emptyDeviceCount}`);

    return {
        validPayload: apiPayload,
        deviceCount: deviceCount,
        isEmpty: deviceCount === 0
    };
};

// Test the format
const result = testScanFormat();
console.log('\n=== Test Results ===');
console.log(`Format is valid: ${result.validPayload && result.deviceCount >= 0}`);
console.log(`Has devices: ${result.deviceCount > 0}`);
console.log('Test completed successfully!');
