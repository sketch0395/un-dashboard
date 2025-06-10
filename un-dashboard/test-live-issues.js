/**
 * Test script to investigate live duplication and topology visualization issues
 */

import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'http://localhost:3000';
let sessionCookie = null;

// Helper function to make authenticated requests
async function makeRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (sessionCookie) {
        headers['Cookie'] = sessionCookie;
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    // Store session cookie from login
    if (response.headers.get('set-cookie')) {
        sessionCookie = response.headers.get('set-cookie');
    }
    
    return response;
}

// Test 1: Login as admin
async function testLogin() {
    console.log('\n=== Testing Login ===');
    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',            body: JSON.stringify({
                username: 'admin',
                password: 'admin123!'
            })
        });
        
        const result = await response.json();
        console.log('Login result:', result);
        console.log('Login status:', response.status);
        
        if (response.status === 200) {
            console.log('✅ Login successful');
            return true;
        } else {
            console.log('❌ Login failed');
            return false;
        }
    } catch (error) {
        console.error('Login error:', error);
        return false;
    }
}

// Test 2: Check existing scan history for duplicates
async function checkExistingScans() {
    console.log('\n=== Checking Existing Scan History ===');
    try {
        const response = await makeRequest(`${BASE_URL}/api/scan-history`);
        const data = await response.json();
        const scans = data.scanHistory || [];
        
        console.log('Total scans found:', scans.length);
        
        // Check for duplicates by scanId
        const scanIds = new Map();
        const duplicates = [];
        
        scans.forEach(scan => {
            if (scanIds.has(scan.scanId)) {
                duplicates.push({
                    scanId: scan.scanId,
                    count: scanIds.get(scan.scanId) + 1
                });
                scanIds.set(scan.scanId, scanIds.get(scan.scanId) + 1);
            } else {
                scanIds.set(scan.scanId, 1);
            }
        });
        
        if (duplicates.length > 0) {
            console.log('❌ Found duplicates:', duplicates);
        } else {
            console.log('✅ No duplicates found in existing scans');
        }
          // Show recent scans
        console.log('\nRecent scans:');
        scans.slice(-5).forEach(scan => {
            console.log(`- ${scan.scanId} (${scan.createdAt}) - ${scan.deviceCount || 0} devices`);
        });
        
        return scans;
    } catch (error) {
        console.error('Error checking scans:', error);
        return [];
    }
}

// Test 3: Create multiple scans rapidly to test duplication prevention
async function testRapidScanCreation() {
    console.log('\n=== Testing Rapid Scan Creation ===');
    
    const testScans = [];
    const promises = [];        // Create 5 scans with same base data but different scanIds
        for (let i = 0; i < 5; i++) {
            const scanData = {
                scanId: uuidv4(),
                name: `Test Scan ${i + 1}`,
                ipRange: '192.168.1.0/24',
                deviceCount: 2,
                scanData: [
                    {
                        ip: '192.168.1.1',
                        mac: '00:11:22:33:44:55',
                        hostname: 'router',
                        vendor: 'Cisco',
                        openPorts: [80, 443],
                        os: 'IOS',
                        deviceType: 'router'
                    },
                    {
                        ip: '192.168.1.100',
                        mac: '00:11:22:33:44:66',
                        hostname: 'computer1',
                        vendor: 'Dell',
                        openPorts: [22, 80],
                        os: 'Linux',
                        deviceType: 'computer'
                    }
                ],
                metadata: {
                    scanType: 'ping',
                    scanDuration: 5000,
                    osDetection: true,
                    serviceDetection: true,
                    ports: [22, 80, 443],
                    hasNetworkTopology: true
                },
                settings: {
                    isPrivate: true,
                    isFavorite: false,
                    tags: ['test'],
                    notes: 'Test scan for duplication testing'
                }
            };
        
        testScans.push(scanData);
        
        // Create promise for this scan
        const promise = makeRequest(`${BASE_URL}/api/scan-history`, {
            method: 'POST',
            body: JSON.stringify(scanData)
        }).then(async response => {
            const result = await response.json();
            return {
                scanId: scanData.scanId,
                status: response.status,
                result
            };
        });
        
        promises.push(promise);
    }
    
    // Execute all requests simultaneously
    const results = await Promise.all(promises);
    
    console.log('Scan creation results:');
    results.forEach(result => {
        console.log(`- ${result.scanId}: ${result.status} ${result.status === 201 ? '✅' : '❌'}`);
        if (result.status !== 201) {
            console.log(`  Error: ${JSON.stringify(result.result)}`);
        }
    });
    
    return results;
}

// Test 4: Test creating scan with duplicate scanId
async function testDuplicateScanId() {
    console.log('\n=== Testing Duplicate ScanId Prevention ===');
      const duplicateScanId = uuidv4();
    const scanData = {
        scanId: duplicateScanId,
        name: 'Duplicate Test Scan',
        ipRange: '192.168.1.0/24',
        deviceCount: 1,
        scanData: [
            {
                ip: '192.168.1.1',
                mac: '00:11:22:33:44:55',
                hostname: 'router',
                vendor: 'Cisco',
                openPorts: [80, 443],
                os: 'IOS',
                deviceType: 'router'
            }
        ],
        metadata: {
            scanType: 'ping',
            scanDuration: 2000,
            osDetection: false,
            serviceDetection: false,
            ports: [80, 443],
            hasNetworkTopology: false
        },
        settings: {
            isPrivate: true,
            isFavorite: false,
            tags: ['duplicate-test'],
            notes: 'Testing duplicate prevention'
        }
    };
    
    // Create first scan
    console.log('Creating first scan...');
    const response1 = await makeRequest(`${BASE_URL}/api/scan-history`, {
        method: 'POST',
        body: JSON.stringify(scanData)
    });
    
    const result1 = await response1.json();
    console.log(`First scan: ${response1.status} ${response1.status === 201 ? '✅' : '❌'}`);
    
    // Try to create duplicate
    console.log('Attempting to create duplicate scan...');
    const response2 = await makeRequest(`${BASE_URL}/api/scan-history`, {
        method: 'POST',
        body: JSON.stringify(scanData)
    });
    
    const result2 = await response2.json();
    console.log(`Duplicate scan: ${response2.status} ${response2.status === 409 ? '✅ (correctly rejected)' : '❌ (should be rejected)'}`);
    console.log('Duplicate response:', result2);
}

// Test 5: Check database state after tests
async function checkFinalState() {
    console.log('\n=== Final Database State Check ===');
    
    const scans = await checkExistingScans();
      // Count scans by timestamp (recent ones from our tests)
    const recentScans = scans.filter(scan => {
        const scanTime = new Date(scan.createdAt);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return scanTime > fiveMinutesAgo;
    });
    
    console.log(`Recent scans (last 5 minutes): ${recentScans.length}`);
    
    // Check for any duplicates in recent scans
    const recentScanIds = new Set();
    const recentDuplicates = [];
    
    recentScans.forEach(scan => {
        if (recentScanIds.has(scan.scanId)) {
            recentDuplicates.push(scan.scanId);
        } else {
            recentScanIds.add(scan.scanId);
        }
    });
    
    if (recentDuplicates.length > 0) {
        console.log('❌ Found recent duplicates:', recentDuplicates);
    } else {
        console.log('✅ No duplicates in recent scans');
    }
}

// Main test runner
async function runTests() {
    console.log('🔍 Starting Live Issue Investigation...');
    
    // Test 1: Login
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
        console.log('❌ Cannot proceed without authentication');
        return;
    }
    
    // Test 2: Check existing state
    await checkExistingScans();
    
    // Test 3: Rapid scan creation
    await testRapidScanCreation();
    
    // Test 4: Duplicate prevention
    await testDuplicateScanId();
    
    // Test 5: Final state
    await checkFinalState();
    
    console.log('\n🏁 Investigation complete!');
}

// Run the tests
runTests().catch(console.error);
