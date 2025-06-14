/**
 * BROWSER CONSOLE TEST - Copy and paste this into browser console
 * Run this in the browser console at http://localhost:3000/networkscan
 */

console.log('🔍 BROWSER DEVICE DATA TEST');
console.log('===========================');

async function testDeviceDataInBrowser() {
    try {
        // Test scan history endpoint
        console.log('📡 Testing /api/scan-history...');
        const response = await fetch('/api/scan-history', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            const scans = data.scanHistory || [];
            console.log('✅ Found', scans.length, 'scans');
            
            if (scans.length > 0) {
                const scan = scans[0];
                console.log('📋 First scan:', {
                    scanId: scan.scanId,
                    name: scan.name,
                    deviceCount: scan.deviceCount,
                    hasScanData: !!scan.scanData
                });
                
                // Test detailed endpoint
                console.log('📡 Testing detailed endpoint...');
                const detailResponse = await fetch(`/api/scan-history/${scan.scanId}`, {
                    credentials: 'include'
                });
                
                if (detailResponse.ok) {
                    const detailData = await detailResponse.json();
                    console.log('✅ Detail response:', {
                        hasScanData: !!detailData.scanData,
                        scanDataKeys: detailData.scanData ? Object.keys(detailData.scanData) : 'none'
                    });
                    
                    if (detailData.scanData && detailData.scanData.devices) {
                        console.log('📱 Devices found:', detailData.scanData.devices.length);
                        console.log('🎯 First device:', detailData.scanData.devices[0]);
                        
                        // Test UI extraction
                        const extracted = Object.values(detailData.scanData).flat();
                        console.log('✅ UI EXTRACTION SUCCESS:', extracted.length, 'devices');
                        return true;
                    }
                }
            }
        } else {
            console.log('❌ API failed:', response.status);
        }
        
        return false;
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

// Run the test
testDeviceDataInBrowser().then(success => {
    if (success) {
        console.log('🎉 TEST PASSED - Device data is available via API!');
        console.log('🔧 If UI still not showing devices, the issue is in the frontend logic.');
        console.log('💡 Try expanding a scan and check for console messages starting with "🎯 TOGGLE ACCORDION"');
    } else {
        console.log('❌ TEST FAILED - Issue with API or data structure');
    }
});
