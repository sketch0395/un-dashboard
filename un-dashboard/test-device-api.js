/**
 * Direct API Test for Device Data
 */

async function testDeviceDataAPI() {
    console.log('🧪 TESTING DEVICE DATA API');
    console.log('==========================');
    
    try {
        // Test the main scan history endpoint
        console.log('📡 Testing /api/scan-history...');
        const mainResponse = await fetch('/api/scan-history', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (mainResponse.ok) {
            const scans = await mainResponse.json();
            console.log('✅ Main API response:', scans.length, 'scans');
            
            if (scans.length > 0) {
                const scan = scans[0];
                console.log('📋 First scan:');
                console.log('  - scanId:', scan.scanId);
                console.log('  - name:', scan.name);
                console.log('  - deviceCount:', scan.deviceCount);
                console.log('  - has scanData:', !!scan.scanData);
                console.log('  - isFromDatabase should be:', true);
                
                // Test the detailed endpoint
                console.log('\n📡 Testing /api/scan-history/' + scan.scanId + '...');
                const detailResponse = await fetch(`/api/scan-history/${scan.scanId}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                
                if (detailResponse.ok) {
                    const detailedScan = await detailResponse.json();
                    console.log('✅ Detailed API response received');
                    console.log('  - has scanData:', !!detailedScan.scanData);
                    console.log('  - scanData keys:', detailedScan.scanData ? Object.keys(detailedScan.scanData) : 'none');
                    
                    if (detailedScan.scanData && detailedScan.scanData.devices) {
                        console.log('  - devices count:', detailedScan.scanData.devices.length);
                        console.log('  - first device:', detailedScan.scanData.devices[0]);
                        
                        // Test UI extraction logic
                        const extracted = Object.values(detailedScan.scanData).flat();
                        console.log('  - UI extraction result:', extracted.length, 'devices');
                        
                        if (extracted.length > 0) {
                            console.log('✅ DEVICES SUCCESSFULLY EXTRACTABLE!');
                        } else {
                            console.log('❌ DEVICE EXTRACTION FAILED');
                        }
                    } else {
                        console.log('❌ No devices found in scanData');
                    }
                } else {
                    console.log('❌ Detailed API failed:', detailResponse.status);
                }
            } else {
                console.log('❌ No scans found');
            }
        } else {
            console.log('❌ Main API failed:', mainResponse.status, await mainResponse.text());
        }
        
    } catch (error) {
        console.error('❌ API test failed:', error);
    }
}

// Run the test
testDeviceDataAPI();
