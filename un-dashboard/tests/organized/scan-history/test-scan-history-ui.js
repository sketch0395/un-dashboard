// Test script to verify scan history UI functionality
import fetch from 'node-fetch';

// Test data with valid scanType values
const testScanData = {
    devices: {
        "Cisco": [
            {
                ip: "192.168.1.1",
                hostname: "router.local",
                mac: "00:11:22:33:44:55",
                vendor: "Cisco",
                ports: ["80/tcp open http", "443/tcp open https"],
                status: "up"
            }
        ],
        "Intel": [
            {
                ip: "192.168.1.10", 
                hostname: "desktop.local",
                mac: "00:11:22:33:44:66",
                vendor: "Intel",
                ports: ["22/tcp open ssh"],
                status: "up"
            }
        ]
    },
    ipRange: "192.168.1.0/24",
    scanType: "full", // Valid scanType value
    scanTime: new Date().toISOString()
};

async function testScanHistoryAPI() {
    console.log("🧪 Testing Scan History API with UI Display...");
    
    try {
        // Test 1: Save scan to database
        console.log("\n1. Testing scan save to database...");
        const saveResponse = await fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: "Test Scan UI Display",
                ipRange: testScanData.ipRange,
                deviceCount: 2, // Should match the actual device count
                scanData: testScanData.devices,
                settings: {
                    scanType: testScanData.scanType
                },
                metadata: {
                    scanType: testScanData.scanType,
                    deviceCount: 2,
                    ipRange: testScanData.ipRange
                }
            })
        });
        
        if (saveResponse.ok) {
            const saveResult = await saveResponse.json();
            console.log("✅ Scan saved successfully:", saveResult.scanId);
            
            // Test 2: Retrieve and verify the scan
            console.log("\n2. Testing scan retrieval...");
            const getResponse = await fetch('http://localhost:3000/api/scan-history');
            
            if (getResponse.ok) {
                const scans = await getResponse.json();
                console.log("✅ Retrieved scans:", scans.length);
                
                // Find our test scan
                const testScan = scans.find(scan => scan.name === "Test Scan UI Display");
                if (testScan) {
                    console.log("✅ Test scan found in database");
                    console.log("   - Device Count:", testScan.deviceCount);
                    console.log("   - Scan Type:", testScan.metadata?.scanType);
                    console.log("   - IP Range:", testScan.ipRange);
                    
                    // Verify device data structure
                    if (testScan.scanData && testScan.scanData.devices) {
                        let totalDevices = 0;
                        Object.entries(testScan.scanData.devices).forEach(([vendor, devices]) => {
                            if (Array.isArray(devices)) {
                                totalDevices += devices.length;
                                console.log(`   - ${vendor}: ${devices.length} devices`);
                            }
                        });
                        
                        if (totalDevices === testScan.deviceCount) {
                            console.log("✅ Device count matches actual device data");
                        } else {
                            console.log(`❌ Device count mismatch: ${testScan.deviceCount} stored vs ${totalDevices} actual`);
                        }
                    } else {
                        console.log("❌ Scan data structure issue - no devices property");
                    }
                    
                    // Test 3: Test individual scan retrieval
                    console.log("\n3. Testing individual scan retrieval...");
                    const singleScanResponse = await fetch(`http://localhost:3000/api/scan-history/${testScan.scanId}`);
                    
                    if (singleScanResponse.ok) {
                        const singleScan = await singleScanResponse.json();
                        console.log("✅ Individual scan retrieved successfully");
                        console.log("   - Has scan data:", !!singleScan.scanData);
                        console.log("   - Devices structure:", typeof singleScan.scanData);
                    } else {
                        console.log("❌ Failed to retrieve individual scan");
                    }
                } else {
                    console.log("❌ Test scan not found in database");
                }
            } else {
                console.log("❌ Failed to retrieve scans");
            }
        } else {
            const errorResult = await saveResponse.text();
            console.log("❌ Failed to save scan:", errorResult);
        }
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

// Test device count calculation
function testDeviceCountCalculation() {
    console.log("\n🔢 Testing Device Count Calculation...");
    
    const testData = testScanData.devices;
    let calculatedCount = 0;
    
    Object.entries(testData).forEach(([vendor, devices]) => {
        if (Array.isArray(devices)) {
            calculatedCount += devices.length;
            console.log(`   - ${vendor}: ${devices.length} devices`);
        }
    });
    
    console.log(`✅ Total calculated device count: ${calculatedCount}`);
    return calculatedCount;
}

// Run tests
console.log("🚀 Starting Scan History UI Tests...");
testDeviceCountCalculation();
testScanHistoryAPI();
