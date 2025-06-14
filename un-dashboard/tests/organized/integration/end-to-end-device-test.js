/**
 * End-to-End Device Data Test
 * This creates a scan via the API and tests the complete flow
 */

console.log('🔄 END-TO-END DEVICE DATA TEST');
console.log('==============================');

async function testCompleteFlow() {
    try {
        // First, check if we're authenticated
        console.log('🔐 Checking authentication...');
        const authCheck = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!authCheck.ok) {
            console.log('❌ Not authenticated. Please login first.');
            return;
        }
        
        const user = await authCheck.json();
        console.log('✅ Authenticated as:', user.username);
        
        // Create a test scan via the API
        console.log('\n📝 Creating test scan...');
        const scanData = {
            scanId: `test-flow-${Date.now()}`,
            name: `Flow Test Scan ${new Date().toLocaleTimeString()}`,
            ipRange: '192.168.1.0/24',
            deviceCount: 2,
            scanData: {
                devices: [
                    {
                        ip: '192.168.1.1',
                        status: 'up',
                        vendor: 'Test Router Co',
                        responseTime: 15,
                        name: 'Test Router'
                    },
                    {
                        ip: '192.168.1.100',
                        status: 'up',
                        vendor: 'Test Device Co',
                        responseTime: 25,
                        name: 'Test Device'
                    }
                ]
            },
            metadata: {
                timestamp: new Date().toISOString(),
                scanDuration: 30
            },
            settings: {
                isPrivate: true,
                isFavorite: false,
                tags: [],
                notes: 'End-to-end test scan'
            }
        };
        
        const createResponse = await fetch('/api/scan-history', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scanData)
        });
        
        if (createResponse.ok) {
            const created = await createResponse.json();
            console.log('✅ Created scan:', created.scanId || created._id);
            
            // Now test the list endpoint (should exclude scanData)
            console.log('\n📡 Testing scan list (should exclude device data)...');
            const listResponse = await fetch('/api/scan-history', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (listResponse.ok) {
                const scans = await listResponse.json();
                console.log('✅ Got scan list:', scans.length, 'scans');
                
                const ourScan = scans.find(s => s.scanId === scanData.scanId);
                if (ourScan) {
                    console.log('✅ Found our scan in list:');
                    console.log('  - scanId:', ourScan.scanId);
                    console.log('  - deviceCount:', ourScan.deviceCount);
                    console.log('  - has scanData:', !!ourScan.scanData);
                    console.log('  - (should be false for list endpoint)');
                    
                    // Now test the detail endpoint (should include scanData)
                    console.log('\n📡 Testing scan detail (should include device data)...');
                    const detailResponse = await fetch(`/api/scan-history/${ourScan.scanId}`, {
                        method: 'GET',
                        credentials: 'include'
                    });
                    
                    if (detailResponse.ok) {
                        const detailScan = await detailResponse.json();
                        console.log('✅ Got scan detail:');
                        console.log('  - has scanData:', !!detailScan.scanData);
                        console.log('  - scanData keys:', detailScan.scanData ? Object.keys(detailScan.scanData) : 'none');
                        
                        if (detailScan.scanData && detailScan.scanData.devices) {
                            console.log('  - devices count:', detailScan.scanData.devices.length);
                            console.log('  - first device IP:', detailScan.scanData.devices[0]?.ip);
                            
                            // Test the UI extraction logic
                            const extracted = Object.values(detailScan.scanData).flat();
                            console.log('  - UI extraction result:', extracted.length, 'devices');
                            
                            if (extracted.length > 0) {
                                console.log('✅ SUCCESS: Devices can be extracted from API!');
                                console.log('🎯 The fix should work. Check browser console when expanding scans.');
                            } else {
                                console.log('❌ FAILURE: Device extraction failed');
                            }
                        } else {
                            console.log('❌ FAILURE: No devices in scanData');
                        }
                    } else {
                        console.log('❌ Detail endpoint failed:', detailResponse.status);
                    }
                } else {
                    console.log('❌ Could not find our scan in the list');
                }
            } else {
                console.log('❌ List endpoint failed:', listResponse.status);
            }
        } else {
            const error = await createResponse.text();
            console.log('❌ Failed to create scan:', createResponse.status, error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testCompleteFlow();
