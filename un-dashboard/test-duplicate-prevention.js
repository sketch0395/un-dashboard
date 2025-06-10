/**
 * Simple test to trigger a network scan and verify our duplicate prevention fixes
 */

const testScanDuplicatePrevention = async () => {
    console.log('🔧 Testing duplicate prevention fixes...');
    
    // Test data that simulates a scan result
    const testScanData = {
        "Unknown": [
            {
                "ip": "10.5.1.1",
                "mac": "00:11:22:33:44:55",
                "vendor": "Test Vendor",
                "ports": [
                    { "port": 22, "state": "open", "service": "ssh" },
                    { "port": 80, "state": "open", "service": "http" }
                ]
            },
            {
                "ip": "10.5.1.2", 
                "mac": "66:77:88:99:AA:BB",
                "vendor": "Another Vendor",
                "ports": [
                    { "port": 443, "state": "open", "service": "https" }
                ]
            }
        ]
    };
    
    const ipRange = "10.5.1.1-10";
    
    console.log('📊 Test scan data prepared:', {
        deviceCount: testScanData.Unknown.length,
        ipRange: ipRange
    });
    
    // Simulate the scan being saved multiple times rapidly (race condition test)
    console.log('🚀 Simulating rapid duplicate saves...');
    
    const results = await Promise.allSettled([
        fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                scanId: `test-scan-${Date.now()}`,
                name: `Test Scan ${new Date().toISOString()}`,
                ipRange: ipRange,
                deviceCount: testScanData.Unknown.length,
                scanData: testScanData,
                metadata: {
                    scanType: 'ping',
                    timestamp: new Date().toISOString()
                },
                settings: {
                    isPrivate: true,
                    isFavorite: false,
                    tags: ['test'],
                    notes: 'Automated test scan'
                }
            })
        }),
        // Try to save the same scan again immediately (should be prevented)
        fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                scanId: `test-scan-${Date.now()}`, // Different ID but same content
                name: `Test Scan ${new Date().toISOString()}`,
                ipRange: ipRange,
                deviceCount: testScanData.Unknown.length,
                scanData: testScanData,
                metadata: {
                    scanType: 'ping',
                    timestamp: new Date().toISOString()
                },
                settings: {
                    isPrivate: true,
                    isFavorite: false,
                    tags: ['test'],
                    notes: 'Automated test scan'
                }
            })
        })
    ]);
    
    console.log('📈 Results from duplicate save test:');
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`  Request ${index + 1}: Status ${result.value.status}`);
        } else {
            console.log(`  Request ${index + 1}: Failed -`, result.reason.message);
        }
    });
    
    // Check current database state
    console.log('📋 Checking database state...');
    try {
        const dbCheckResponse = await fetch('http://localhost:3000/api/scan-history', {
            credentials: 'include'
        });
        
        if (dbCheckResponse.ok) {
            const scans = await dbCheckResponse.json();
            console.log(`✅ Database currently has ${scans.length} scans`);
            
            // Look for test scans
            const testScans = scans.filter(scan => 
                scan.name.includes('Test Scan') || 
                (scan.settings && scan.settings.tags && scan.settings.tags.includes('test'))
            );
            console.log(`🧪 Found ${testScans.length} test scans in database`);
            
            if (testScans.length > 0) {
                console.log('Test scan details:');
                testScans.forEach((scan, index) => {
                    console.log(`  ${index + 1}. ${scan.name} (${scan.ipRange}) - ${scan.deviceCount} devices`);
                });
            }
        } else {
            console.error('❌ Failed to fetch scan history:', dbCheckResponse.status);
        }
    } catch (error) {
        console.error('❌ Error checking database:', error.message);
    }
    
    console.log('✅ Duplicate prevention test completed');
};

// Run the test
if (require.main === module) {
    testScanDuplicatePrevention().catch(console.error);
}

module.exports = { testScanDuplicatePrevention };
