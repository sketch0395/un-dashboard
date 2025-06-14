/**
 * Simple API-based Scan Investigation
 * 
 * Uses the existing API endpoints to investigate scan data
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
let authCookies = '';

async function login() {
    console.log('🔐 Logging in...');
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: 'admin',
            password: 'admin123'
        })
    });
    
    if (!loginResponse.ok) {
        throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    // Extract cookies from response
    const setCookieHeaders = loginResponse.headers.raw()['set-cookie'];
    if (setCookieHeaders) {
        authCookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
        console.log('✅ Successfully logged in\n');
        return true;
    }
    
    throw new Error('No authentication cookies received');
}

async function investigateScansViaAPI() {
    console.log('🔍 SCAN INVESTIGATION VIA API');
    console.log('==============================');
    
    try {
        // Login first
        await login();
        
        // Get scan list (without device data for performance)
        console.log('📋 Step 1: Fetching scan list...');
        const listResponse = await fetch(`${BASE_URL}/api/scan-history`, {
            method: 'GET',
            headers: {
                'Cookie': authCookies
            }
        });
        
        if (!listResponse.ok) {
            throw new Error(`Failed to fetch scan list: ${listResponse.status}`);
        }
        
        const listData = await listResponse.json();
        const scans = listData.scanHistory || [];
        
        console.log(`📊 Found ${scans.length} scans in database\n`);
        
        if (scans.length === 0) {
            console.log('❌ No scans found in database');
            return;
        }
        
        // Investigate each scan
        for (let i = 0; i < scans.length; i++) {
            const scan = scans[i];
            console.log(`🔍 Scan ${i + 1}:`);
            console.log(`   ID: ${scan.scanId}`);
            console.log(`   Name: ${scan.name || 'Unnamed'}`);
            console.log(`   IP Range: ${scan.ipRange}`);
            console.log(`   Device Count: ${scan.deviceCount}`);
            console.log(`   Created: ${scan.createdAt}`);
            console.log(`   Has scanData in list: ${!!scan.scanData}`);
            
            // Fetch full scan data
            console.log(`   📡 Fetching full scan data...`);
            
            const detailResponse = await fetch(`${BASE_URL}/api/scan-history/${scan.scanId}`, {
                method: 'GET',
                headers: {
                    'Cookie': authCookies
                }
            });
            
            if (detailResponse.ok) {
                const fullScan = await detailResponse.json();
                console.log(`   ✅ Full scan data retrieved`);
                console.log(`   📊 Full scanData exists: ${!!fullScan.scanData}`);
                
                if (fullScan.scanData) {
                    console.log(`   📋 scanData structure:`);
                    console.log(`      Type: ${typeof fullScan.scanData}`);
                    
                    if (typeof fullScan.scanData === 'object') {
                        const keys = Object.keys(fullScan.scanData);
                        console.log(`      Keys: [${keys.join(', ')}]`);
                        
                        if (fullScan.scanData.devices) {
                            console.log(`      📱 Devices field exists`);
                            console.log(`      📊 Devices type: ${typeof fullScan.scanData.devices}`);
                            
                            if (typeof fullScan.scanData.devices === 'object') {
                                const vendorKeys = Object.keys(fullScan.scanData.devices);
                                console.log(`      🏷️  Vendor groups: [${vendorKeys.join(', ')}]`);
                                
                                let totalDevices = 0;
                                vendorKeys.forEach(vendor => {
                                    const vendorDevices = fullScan.scanData.devices[vendor];
                                    if (Array.isArray(vendorDevices)) {
                                        totalDevices += vendorDevices.length;
                                        console.log(`         📱 ${vendor}: ${vendorDevices.length} devices`);
                                        
                                        // Show sample device
                                        if (vendorDevices.length > 0) {
                                            const sample = vendorDevices[0];
                                            console.log(`            🔍 Sample: ${sample.ip || 'no IP'} (${sample.hostname || sample.name || 'no name'})`);
                                        }
                                    }
                                });
                                
                                console.log(`      ✅ Total devices found: ${totalDevices}`);
                                
                                if (totalDevices === fullScan.deviceCount) {
                                    console.log(`      ✅ Device count matches`);
                                } else {
                                    console.log(`      ⚠️  Device count mismatch: ${totalDevices} vs ${fullScan.deviceCount}`);
                                }
                            }
                        } else {
                            console.log(`      ❌ No devices field in scanData`);
                        }
                    }
                } else {
                    console.log(`   ❌ No scanData in full scan response`);
                }
            } else {
                console.log(`   ❌ Failed to fetch full scan data: ${detailResponse.status}`);
            }
            
            console.log(''); // Empty line
        }
        
        // Summary
        console.log('📈 INVESTIGATION SUMMARY:');
        console.log('=========================');
        
        // Test the client-side logic that was failing
        console.log('\n🔧 Testing Client-Side Logic:');
        
        for (const scan of scans) {
            console.log(`\n📋 Testing scan: ${scan.name || scan.scanId}`);
            
            // Simulate the problematic client-side logic
            console.log(`   🔍 Initial scan data: ${!!scan.scanData} (from list API)`);
            console.log(`   📊 Device count: ${scan.deviceCount}`);
            
            // This is what the client was doing (and failing)
            let extractedDevices = [];
            if (scan.scanData && typeof scan.scanData === 'object') {
                extractedDevices = Object.values(scan.scanData).flat();
            }
            console.log(`   ❌ Original logic extracted: ${extractedDevices.length} devices`);
            
            // Now test the fix
            if (!scan.scanData || Object.keys(scan.scanData).length === 0) {
                console.log(`   🔧 Fix: Would fetch full data from /api/scan-history/${scan.scanId}`);
                
                // Simulate the fetch
                const detailResponse = await fetch(`${BASE_URL}/api/scan-history/${scan.scanId}`, {
                    method: 'GET',
                    headers: { 'Cookie': authCookies }
                });
                
                if (detailResponse.ok) {
                    const fullScan = await detailResponse.json();
                    if (fullScan.scanData && fullScan.scanData.devices) {
                        const fixedDevices = Object.values(fullScan.scanData.devices).flat();
                        console.log(`   ✅ Fixed logic extracted: ${fixedDevices.length} devices`);
                        
                        if (fixedDevices.length > 0) {
                            console.log(`   🎉 FIX WORKING: Devices now available for visualization`);
                        } else {
                            console.log(`   ⚠️  Issue: Full data fetched but no devices found`);
                        }
                    } else {
                        console.log(`   ❌ Issue: Full data has no devices`);
                    }
                } else {
                    console.log(`   ❌ Issue: Cannot fetch full data (${detailResponse.status})`);
                }
            } else {
                console.log(`   ✅ Scan already has data, no fix needed`);
            }
        }
        
    } catch (error) {
        console.error('💥 Investigation failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the investigation
investigateScansViaAPI().catch(console.error);
