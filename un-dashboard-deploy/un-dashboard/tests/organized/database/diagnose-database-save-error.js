/**
 * Comprehensive Database Save Error Diagnosis
 * This script will test the scan history API endpoint to identify the 500 error
 */

const fs = require('fs');

// Read authentication token from login data
let authData;
try {
    authData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));
    console.log('✅ Authentication data loaded');
} catch (error) {
    console.error('❌ Failed to load authentication data:', error.message);
    process.exit(1);
}

const authToken = authData.authToken;

// Test payload that matches what the client sends
const testScanPayload = {
    scanId: `diagnose-test-${Date.now()}`,
    name: "Database Save Test Scan",
    ipRange: "192.168.1.0/24",
    deviceCount: 2,
    scanData: {
        devices: {
            "Test Vendor": [
                {
                    ip: "192.168.1.1",
                    hostname: "test-router",
                    status: "up",
                    vendor: "Test Vendor",
                    ports: [{ port: 80, state: "open", service: "http" }]
                },
                {
                    ip: "192.168.1.100",
                    hostname: "test-device",
                    status: "up", 
                    vendor: "Test Vendor",
                    ports: [{ port: 22, state: "open", service: "ssh" }]
                }
            ]
        },
        portScanResults: [],
        networkInfo: {}
    },
    metadata: {
        timestamp: new Date().toISOString(),
        scanDuration: 5000,
        userAgent: "Node.js Test Script",
        scanType: "ping",
        osDetection: false,
        serviceDetection: false,
        ports: [],
        hasNetworkTopology: false,
        deviceTypes: ["router", "device"]
    },
    settings: {
        isPrivate: true,
        isFavorite: false,
        tags: ["test", "diagnosis"],
        notes: "Diagnosis test scan"
    }
};

async function testDatabaseSave() {
    console.log("\n=== DATABASE SAVE ERROR DIAGNOSIS ===");
    console.log(`Testing scan save with payload size: ${JSON.stringify(testScanPayload).length} bytes`);
    
    try {
        // Import fetch for Node.js if not already available
        if (typeof fetch === 'undefined') {
            const { default: fetch } = await import('node-fetch');
            global.fetch = fetch;
        }
        
        console.log('\n1. Testing authentication...');
        
        // First test authentication with a simple GET request
        const authTestResponse = await fetch('http://localhost:3000/api/scan-history?limit=1', {
            method: 'GET',
            headers: {
                'Cookie': `auth-token=${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`   Auth test status: ${authTestResponse.status}`);
        if (!authTestResponse.ok) {
            const authError = await authTestResponse.text();
            console.log(`   Auth error: ${authError}`);
            return;
        }
        console.log('   ✅ Authentication working');
        
        console.log('\n2. Testing database save...');
        console.log(`   Scan ID: ${testScanPayload.scanId}`);
        console.log(`   Device count: ${testScanPayload.deviceCount}`);
        console.log(`   IP range: ${testScanPayload.ipRange}`);
        
        // Now test the POST request that's failing
        const response = await fetch('http://localhost:3000/api/scan-history', {
            method: 'POST',
            headers: {
                'Cookie': `auth-token=${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testScanPayload)
        });
        
        console.log(`   Response status: ${response.status}`);
        console.log(`   Response headers:`, Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const savedScan = await response.json();
            console.log('   ✅ Database save successful!');
            console.log(`   Saved scan ID: ${savedScan._id}`);
            console.log(`   Saved scan name: ${savedScan.name}`);
        } else {
            console.log('   ❌ Database save failed');
            const errorText = await response.text();
            console.log(`   Error response: ${errorText}`);
            
            try {
                const errorJson = JSON.parse(errorText);
                console.log(`   Error details: ${JSON.stringify(errorJson, null, 2)}`);
            } catch (e) {
                console.log(`   Raw error: ${errorText}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Network/Connection error:', error.message);
        console.log('\nPossible causes:');
        console.log('- Development server not running (npm run dev)');
        console.log('- MongoDB connection issue');
        console.log('- Network connectivity problem');
    }
}

async function validatePayloadStructure() {
    console.log('\n=== PAYLOAD VALIDATION ===');
    
    // Check required fields
    const requiredFields = ['scanId', 'ipRange', 'deviceCount', 'scanData'];
    const missingFields = requiredFields.filter(field => !testScanPayload[field]);
    
    if (missingFields.length > 0) {
        console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
        return false;
    }
    
    console.log('✅ All required fields present');
    
    // Validate field types
    if (typeof testScanPayload.deviceCount !== 'number') {
        console.log('❌ deviceCount is not a number');
        return false;
    }
    
    if (typeof testScanPayload.scanData !== 'object') {
        console.log('❌ scanData is not an object');
        return false;
    }
    
    console.log('✅ Field types are valid');
    console.log(`   scanId: ${typeof testScanPayload.scanId} (${testScanPayload.scanId})`);
    console.log(`   ipRange: ${typeof testScanPayload.ipRange} (${testScanPayload.ipRange})`);
    console.log(`   deviceCount: ${typeof testScanPayload.deviceCount} (${testScanPayload.deviceCount})`);
    console.log(`   scanData: ${typeof testScanPayload.scanData} (${Object.keys(testScanPayload.scanData).length} keys)`);
    
    return true;
}

async function testServerConnectivity() {
    console.log('\n=== SERVER CONNECTIVITY TEST ===');
    
    try {
        // Import fetch for Node.js
        const { default: fetch } = await import('node-fetch');
        global.fetch = fetch;
        
        const response = await fetch('http://localhost:3000/api/auth/status', {
            method: 'GET'
        });
        
        if (response.ok) {
            console.log('✅ Server is reachable');
            return true;
        } else {
            console.log(`❌ Server returned error: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Server connectivity failed: ${error.message}`);
        return false;
    }
}

// Run all tests
async function runDiagnosis() {
    console.log('🔍 Starting database save error diagnosis...');
    
    const isValid = await validatePayloadStructure();
    if (!isValid) {
        console.log('\n❌ Payload validation failed - fix payload structure first');
        return;
    }
    
    // Skip server connectivity test and go directly to the database save test
    console.log('\n⏭️  Skipping server connectivity test - testing database save directly...');
    
    await testDatabaseSave();
    
    console.log('\n=== DIAGNOSIS COMPLETE ===');
    console.log('If the error persists:');
    console.log('1. Check server console logs for detailed error messages');
    console.log('2. Verify MongoDB connection is working');
    console.log('3. Check the ScanHistory model schema matches the payload');
    console.log('4. Ensure all required indexes exist in MongoDB');
}

// Export for use in other scripts
module.exports = { testDatabaseSave, validatePayloadStructure, testServerConnectivity };

// Run if called directly
if (require.main === module) {
    runDiagnosis().catch(console.error);
}
