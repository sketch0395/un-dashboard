// STEP-BY-STEP TOPOLOGY TEST - Copy to browser console
// This version provides detailed feedback at each step

console.log('🎯 STEP-BY-STEP TOPOLOGY TEST');
console.log('Current page:', window.location.href);
console.log('Page title:', document.title);

// Step 1: Check if we're authenticated
function checkAuthentication() {
    console.log('\n🔐 STEP 1: Checking Authentication...');
    
    // Look for logout button or user indicator
    const logoutBtn = document.querySelector('button[onclick*="logout"], a[href*="logout"], .logout');
    const userIndicator = document.querySelector('.user-name, .username, [data-user]');
    
    if (logoutBtn || userIndicator) {
        console.log('✅ User appears to be authenticated');
        return true;
    } else {
        console.log('❌ User may not be authenticated');
        console.log('🔑 Please ensure you are logged in as admin');
        return false;
    }
}

// Step 2: Navigate to network scan page
function navigateToNetworkScan() {
    console.log('\n🧭 STEP 2: Navigation Check...');
    
    if (window.location.pathname.includes('/networkscan')) {
        console.log('✅ Already on network scan page');
        return true;
    } else {
        console.log('📍 Current page:', window.location.pathname);
        console.log('🔄 Need to navigate to /networkscan');
        
        // Try to find navigation link
        const navLinks = document.querySelectorAll('a[href*="networkscan"], button[onclick*="networkscan"]');
        if (navLinks.length > 0) {
            console.log(`🔗 Found ${navLinks.length} navigation links`);
            return false; // Will need manual navigation
        } else {
            console.log('🚨 No navigation links found - navigate manually');
            return false;
        }
    }
}

// Step 3: Submit simple test data
async function submitTestData() {
    console.log('\n📤 STEP 3: Submitting Test Data...');
    
    const testData = {
        scanId: "step-test-" + Date.now(),
        name: "Step-by-Step Test",
        ipRange: "10.10.10.0/24",
        deviceCount: 2,
        scanData: [
            {
                ip: "10.10.10.1",
                mac: "00:AA:BB:CC:DD:01",
                hostname: "test-router",
                vendor: "Cisco",
                deviceType: "router",
                gateway: true,
                connections: ["10.10.10.100"]
            },
            {
                ip: "10.10.10.100",
                mac: "00:AA:BB:CC:DD:02",
                hostname: "test-device",
                vendor: "Dell",
                deviceType: "workstation",
                connectedTo: "10.10.10.1"
            }
        ]
    };
    
    try {
        console.log('🚀 Sending POST request...');
        const response = await fetch('/api/scan-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        console.log('📊 Response status:', response.status);
        console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
        
        const result = await response.json();
        console.log('📋 Response data:', result);
        
        if (response.ok) {
            console.log('✅ Test data submitted successfully');
            console.log('🆔 Scan ID:', testData.scanId);
            return { success: true, scanId: testData.scanId };
        } else {
            console.log('❌ Failed to submit test data');
            console.log('Error:', result);
            return { success: false, error: result };
        }
        
    } catch (error) {
        console.log('💥 Network error:', error.message);
        return { success: false, error: error.message };
    }
}

// Step 4: Check scan history
function checkScanHistory() {
    console.log('\n📜 STEP 4: Checking Scan History...');
    
    const historyItems = document.querySelectorAll(
        '.scan-history-item, .scan-item, button[data-scan-id], ' +
        'div[class*="scan"], li[class*="scan"], tr[class*="scan"]'
    );
    
    console.log(`📋 Found ${historyItems.length} potential scan history items`);
    
    if (historyItems.length > 0) {
        console.log('📝 Scan history items:');
        historyItems.forEach((item, index) => {
            const text = (item.textContent || item.innerText || '').trim();
            const clickable = item.tagName === 'BUTTON' || item.onclick || item.href;
            console.log(`  ${index + 1}. "${text}" ${clickable ? '(clickable)' : ''}`);
        });
        return historyItems;
    } else {
        console.log('❌ No scan history items found');
        return [];
    }
}

// Step 5: Check visualization elements
function checkVisualizationElements() {
    console.log('\n🎨 STEP 5: Checking Visualization Elements...');
    
    const elements = {
        svg: document.querySelector('svg'),
        canvas: document.querySelector('canvas'),
        networkContainer: document.querySelector('.network-topology, [data-testid*="network"], .topology'),
        nodes: document.querySelectorAll('.node, .device-node, circle[data-device]'),
        links: document.querySelectorAll('.link, .connection, line'),
        buttons: document.querySelectorAll('button')
    };
    
    console.log('🔍 Visualization elements:');
    Object.entries(elements).forEach(([name, element]) => {
        if (element) {
            if (element.length !== undefined) {
                console.log(`  ✅ ${name}: ${element.length} found`);
            } else {
                console.log(`  ✅ ${name}: Present`);
                if (name === 'svg' && element.getBoundingClientRect) {
                    const rect = element.getBoundingClientRect();
                    console.log(`    📐 Dimensions: ${rect.width}x${rect.height}`);
                }
            }
        } else {
            console.log(`  ❌ ${name}: Not found`);
        }
    });
    
    return elements;
}

// Main execution function
async function runStepByStepTest() {
    console.log('🚀 STARTING STEP-BY-STEP TEST');
    console.log('=' .repeat(40));
    
    // Step 1: Authentication check
    const isAuthenticated = checkAuthentication();
    if (!isAuthenticated) {
        console.log('\n🛑 STOP: Please log in first');
        console.log('👤 Go to login page and use: admin / admin123!');
        return;
    }
    
    // Step 2: Navigation check
    const onCorrectPage = navigateToNetworkScan();
    if (!onCorrectPage) {
        console.log('\n🧭 NAVIGATION NEEDED');
        console.log('Please navigate to the Network Scan page');
        console.log('URL: /networkscan');
        console.log('Then run this test again');
        return;
    }
    
    // Step 3: Submit test data
    const submitResult = await submitTestData();
    if (!submitResult.success) {
        console.log('\n❌ SUBMISSION FAILED');
        console.log('Error details:', submitResult.error);
        return;
    }
    
    // Step 4: Wait and refresh
    console.log('\n⏳ Waiting 3 seconds for UI update...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 5: Check scan history
    const historyItems = checkScanHistory();
    
    // Step 6: Check visualization
    const vizElements = checkVisualizationElements();
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('=' .repeat(30));
    console.log(`✅ Authenticated: ${isAuthenticated ? 'Yes' : 'No'}`);
    console.log(`✅ Correct page: ${onCorrectPage ? 'Yes' : 'No'}`);
    console.log(`✅ Data submitted: ${submitResult.success ? 'Yes' : 'No'}`);
    console.log(`📋 History items: ${historyItems.length}`);
    console.log(`🎨 SVG present: ${vizElements.svg ? 'Yes' : 'No'}`);
    console.log(`📊 Nodes found: ${vizElements.nodes.length}`);
    console.log(`🔗 Links found: ${vizElements.links.length}`);
    
    if (submitResult.success && historyItems.length > 0 && vizElements.svg) {
        console.log('\n🎉 BASIC TEST PASSED');
        console.log('📋 Try clicking on a scan in the history to load topology');
    } else {
        console.log('\n⚠️  ISSUES DETECTED');
        console.log('🔧 Check the individual step results above');
    }
    
    return {
        authenticated: isAuthenticated,
        correctPage: onCorrectPage,
        dataSubmitted: submitResult.success,
        historyCount: historyItems.length,
        svgPresent: !!vizElements.svg,
        nodesCount: vizElements.nodes.length,
        linksCount: vizElements.links.length
    };
}

// Execute the test
console.log('⏰ Starting in 2 seconds...');
setTimeout(() => {
    runStepByStepTest().then(result => {
        console.log('\n🏁 STEP-BY-STEP TEST COMPLETE');
        console.log('Final result:', result);
    }).catch(error => {
        console.error('💥 Test error:', error);
    });
}, 2000);
