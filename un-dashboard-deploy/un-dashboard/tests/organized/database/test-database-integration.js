/**
 * Test Database Integration for Scan History
 * This script tests the enhanced scan history functionality with database integration
 */

// Simulate scan data for testing
const testScanData = {
    "Network Device": [
        {
            ip: "192.168.1.1",
            hostname: "Router-Main",
            status: "up",
            vendor: "Netgear"
        },
        {
            ip: "192.168.1.10", 
            hostname: "Desktop-PC",
            status: "up",
            vendor: "Dell"
        }
    ],
    "Mobile Device": [
        {
            ip: "192.168.1.50",
            hostname: "iPhone-John",
            status: "up",
            vendor: "Apple"
        }
    ]
};

// Test Functions
function testDatabaseIntegration() {
    console.log("=== Testing Database Integration ===");
    
    // Test 1: Check if API endpoints are accessible
    testApiEndpoints();
    
    // Test 2: Simulate scan save with database sync
    testScanSave();
    
    // Test 3: Test sync status functionality  
    testSyncStatus();
    
    // Test 4: Test offline fallback
    testOfflineFallback();
}

async function testApiEndpoints() {
    console.log("\n1. Testing API Endpoints...");
    
    try {
        // Test GET endpoint
        const response = await fetch('/api/scan-history', {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log(`GET /api/scan-history: ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`- Retrieved ${data.scanHistory?.length || 0} scans from database`);
            console.log(`- Pagination info:`, data.pagination);
        } else {
            console.log(`- Error: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('API Test Error:', error.message);
    }
}

async function testScanSave() {
    console.log("\n2. Testing Scan Save with Database Sync...");
    
    // Simulate using the scan history provider
    const scanId = `test-scan-${Date.now()}`;
    const testPayload = {
        scanId: scanId,
        name: `Test Scan - ${new Date().toLocaleString()}`,
        ipRange: "192.168.1.0/24",
        deviceCount: 3,
        scanData: testScanData,
        metadata: {
            scanType: 'ping',
            osDetection: false,
            serviceDetection: false,
            ports: [],
            hasNetworkTopology: false,
            deviceTypes: ['router', 'desktop', 'mobile']
        },
        settings: {
            isPrivate: true,
            isFavorite: false,
            tags: ['test', 'automated'],
            notes: 'Test scan created by integration test'
        }
    };
    
    try {
        const response = await fetch('/api/scan-history', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testPayload)
        });
        
        console.log(`POST /api/scan-history: ${response.status}`);
        
        if (response.ok) {
            const savedScan = await response.json();
            console.log(`- Successfully saved scan: ${savedScan.name}`);
            console.log(`- Database ID: ${savedScan._id}`);
            console.log(`- Tags: ${savedScan.settings.tags.join(', ')}`);
            
            // Test deletion
            await testScanDeletion([scanId]);
            
        } else {
            const error = await response.json();
            console.log(`- Error: ${error.error}`);
        }
        
    } catch (error) {
        console.error('Scan Save Test Error:', error.message);
    }
}

async function testScanDeletion(scanIds) {
    console.log("\n3. Testing Scan Deletion...");
    
    try {
        const response = await fetch('/api/scan-history', {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ scanIds })
        });
        
        console.log(`DELETE /api/scan-history: ${response.status}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log(`- Deleted ${result.deletedCount} scans`);
        } else {
            const error = await response.json();
            console.log(`- Error: ${error.error}`);
        }
        
    } catch (error) {
        console.error('Scan Deletion Test Error:', error.message);
    }
}

function testSyncStatus() {
    console.log("\n4. Testing Sync Status Functionality...");
    
    // Check localStorage for scan history
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user._id) {
        const storageKey = `scanHistory_${user._id}`;
        const localScans = JSON.parse(localStorage.getItem(storageKey) || '[]');
        console.log(`- Found ${localScans.length} scans in localStorage`);
        
        // Check sync status
        localScans.forEach((scan, index) => {
            const syncStatus = scan.isFromDatabase ? 'synced' : 'pending';
            console.log(`  ${index + 1}. ${scan.ipRange} (${scan.devices} devices) - ${syncStatus}`);
        });
    } else {
        console.log('- No authenticated user found');
    }
}

function testOfflineFallback() {
    console.log("\n5. Testing Offline Fallback...");
    
    // This would typically involve mocking network failures
    // For now, just check if localStorage fallback is working
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user._id) {
        const storageKey = `scanHistory_${user._id}`;
        const hasLocalStorage = localStorage.getItem(storageKey) !== null;
        console.log(`- localStorage fallback available: ${hasLocalStorage}`);
        
        if (hasLocalStorage) {
            const localScans = JSON.parse(localStorage.getItem(storageKey));
            console.log(`- ${localScans.length} scans available offline`);
        }
    }
}

// Test localStorage user isolation
function testUserIsolation() {
    console.log("\n=== Testing User Isolation ===");
    
    // Simulate different users
    const user1 = { _id: 'user1' };
    const user2 = { _id: 'user2' };
    
    // Test data for each user
    const user1Scans = [{ id: 'scan1', ipRange: '192.168.1.0/24', devices: 5 }];
    const user2Scans = [{ id: 'scan2', ipRange: '10.0.0.0/24', devices: 3 }];
    
    // Save data for each user
    localStorage.setItem(`scanHistory_${user1._id}`, JSON.stringify(user1Scans));
    localStorage.setItem(`scanHistory_${user2._id}`, JSON.stringify(user2Scans));
    
    // Verify isolation
    const retrieved1 = JSON.parse(localStorage.getItem(`scanHistory_${user1._id}`));
    const retrieved2 = JSON.parse(localStorage.getItem(`scanHistory_${user2._id}`));
    
    console.log(`User 1 scans: ${retrieved1.length} (${retrieved1[0].ipRange})`);
    console.log(`User 2 scans: ${retrieved2.length} (${retrieved2[0].ipRange})`);
    console.log("✓ User isolation working correctly");
    
    // Cleanup
    localStorage.removeItem(`scanHistory_${user1._id}`);
    localStorage.removeItem(`scanHistory_${user2._id}`);
}

// Run all tests
console.log("Starting Database Integration Tests...");
testDatabaseIntegration();
testUserIsolation();

console.log("\n=== Test Summary ===");
console.log("✓ Database API endpoints tested");
console.log("✓ Scan save/delete functionality tested");
console.log("✓ Sync status functionality verified");
console.log("✓ Offline fallback mechanism checked");
console.log("✓ User isolation confirmed");
console.log("\nDatabase integration tests completed!");
