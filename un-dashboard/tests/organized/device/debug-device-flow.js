// Add this debug function to your NetworkScanHistory component temporarily
// Place it before the return statement

const debugDeviceFlow = () => {
    console.log('\n🔍 DEBUGGING DEVICE FLOW');
    console.log('========================');
    
    scanHistory.forEach((entry, index) => {
        console.log(`\n📋 Scan ${index + 1}: ${entry.name || 'Unnamed'}`);
        console.log(`   📊 Device Count: ${entry.devices}`);
        console.log(`   🔗 Is From Database: ${entry.isFromDatabase}`);
        console.log(`   📦 Data Type: ${typeof entry.data}`);
        console.log(`   🔑 Data Keys: [${entry.data ? Object.keys(entry.data).join(', ') : 'no data'}]`);
        
        if (entry.data) {
            // Test device extraction
            const extractedDevices = Object.values(entry.data).flat();
            console.log(`   📱 Extracted Devices: ${extractedDevices.length}`);
            
            if (extractedDevices.length > 0) {
                console.log(`   📄 First Device Sample:`);
                const firstDevice = extractedDevices[0];
                console.log(`      🌐 IP: ${firstDevice.ip}`);
                console.log(`      📡 Status: ${firstDevice.status}`);
                console.log(`      🏭 Vendor: ${firstDevice.vendor}`);
                console.log(`      🔑 All Keys: [${Object.keys(firstDevice).join(', ')}]`);
                
                // Check if device would be visible
                const hasRequiredFields = firstDevice.ip && firstDevice.status;
                console.log(`      👁️  Would be visible: ${hasRequiredFields ? 'YES' : 'NO'}`);
                
                if (!hasRequiredFields) {
                    console.log(`      ⚠️  ISSUE: Missing required fields for UI display`);
                }
            } else {
                console.log(`   ❌ No devices extracted - checking data structure...`);
                console.log(`   📄 Raw data sample: ${JSON.stringify(entry.data, null, 2).substring(0, 200)}...`);
            }
        } else {
            console.log(`   ❌ No data available`);
        }
    });
    
    console.log('\n🎯 SUMMARY:');
    console.log(`📊 Total scans: ${scanHistory.length}`);
    const totalDevicesExpected = scanHistory.reduce((sum, entry) => sum + (entry.devices || 0), 0);
    console.log(`📱 Total devices expected: ${totalDevicesExpected}`);
    
    const scansWithData = scanHistory.filter(entry => entry.data && Object.keys(entry.data).length > 0);
    console.log(`✅ Scans with data: ${scansWithData.length}`);
    
    const scansNeedingFetch = scanHistory.filter(entry => 
        entry.isFromDatabase && (!entry.data || Object.keys(entry.data).length === 0)
    );
    console.log(`🔄 Scans needing data fetch: ${scansNeedingFetch.length}`);
};

// Call this function when you expand a scan to see devices
// Add this line in the toggleAccordion function:
// if (expandedIndex === index) debugDeviceFlow();
