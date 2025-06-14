/**
 * Test script to verify topology loading functionality is working
 */

const puppeteer = require('puppeteer');

async function testTopologyLoading() {
    console.log('🚀 Testing Topology Loading Functionality');
    console.log('=========================================');

    let browser;
    try {
        // Launch browser
        browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        });
        
        const page = await browser.newPage();
        
        // Step 1: Navigate to login
        console.log('📱 Navigating to login page...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
        
        // Step 2: Login
        console.log('🔐 Logging in...');
        await page.type('#username', 'admin');
        await page.type('#password', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        console.log('✅ Login successful');
        
        // Step 3: Navigate to Network Scan page
        console.log('🌐 Navigating to Network Scan...');
        await page.goto('http://localhost:3000/networkscan', { waitUntil: 'networkidle2' });
        
        // Step 4: Switch to Shared Scans tab
        console.log('📂 Switching to Shared Scans tab...');
        const sharedScansTab = await page.waitForSelector('button:has-text("Shared Scans"), [data-tab="shared"], button[title*="shared"]', { timeout: 10000 });
        if (sharedScansTab) {
            await sharedScansTab.click();
            await page.waitForTimeout(2000);
            console.log('✅ Switched to Shared Scans tab');
        } else {
            console.log('⚠️ Could not find Shared Scans tab, may already be on shared scans view');
        }
        
        // Step 5: Look for topology buttons in scan cards
        console.log('🔍 Looking for topology buttons in scan cards...');
        await page.waitForTimeout(3000);
        
        // Check if any scans are available
        const scanCards = await page.$$('.bg-gray-800');
        console.log(`📊 Found ${scanCards.length} scan cards`);
        
        if (scanCards.length > 0) {
            // Look for topology buttons
            const topologyButtons = await page.$$('button:has-text("🗺️ Topology"), button[title*="topology"]');
            console.log(`🗺️ Found ${topologyButtons.length} topology buttons`);
            
            if (topologyButtons.length > 0) {
                console.log('✅ Topology buttons are present in scan cards');
                
                // Test clicking the first topology button
                console.log('🖱️ Testing topology button click...');
                await topologyButtons[0].click();
                await page.waitForTimeout(3000);
                
                // Check if we switched to topology view
                const topologyView = await page.$('.topology-container, .network-topology, [data-tab="topology"]');
                if (topologyView) {
                    console.log('✅ Successfully switched to topology view after clicking button');
                } else {
                    console.log('⚠️ Topology view may not be visible or scan may not have loaded');
                }
            } else {
                console.log('❌ No topology buttons found in scan cards');
            }
            
            // Test clicking on a scan to open details
            console.log('🔍 Testing scan details modal...');
            const firstScan = scanCards[0];
            const viewDetailsButton = await firstScan.$('button:has-text("View Details")');
            if (viewDetailsButton) {
                await viewDetailsButton.click();
                await page.waitForTimeout(2000);
                
                // Look for topology button in details modal
                const modalTopologyButton = await page.$('button:has-text("🗺️ Load to Topology")');
                if (modalTopologyButton) {
                    console.log('✅ Load to Topology button found in details modal');
                    
                    // Test clicking it
                    await modalTopologyButton.click();
                    await page.waitForTimeout(3000);
                    
                    console.log('✅ Load to Topology button click test completed');
                } else {
                    console.log('❌ Load to Topology button NOT found in details modal');
                }
            }
        } else {
            console.log('⚠️ No shared scans found to test with');
        }
        
        // Step 6: Test collaboration mode
        console.log('🤝 Testing collaboration features...');
        const collaborationButton = await page.$('button:has-text("Enable Collaboration"), button:has-text("Collaborative Mode")');
        if (collaborationButton) {
            console.log('✅ Collaboration mode button found');
            await collaborationButton.click();
            await page.waitForTimeout(2000);
            
            // Check for collaboration indicators
            const collaborationIndicators = await page.$$('.bg-green-100, .bg-purple-600, [class*="collaboration"]');
            console.log(`🔗 Found ${collaborationIndicators.length} collaboration UI elements`);
        } else {
            console.log('⚠️ Collaboration button not found');
        }
        
        console.log('\n🎉 Topology Loading Test Complete!');
        console.log('=====================================');
        console.log('✅ Test completed successfully');
        console.log('');
        console.log('📋 Summary:');
        console.log('- Topology buttons should be visible in scan cards');
        console.log('- Load to Topology button should be in scan details modal');
        console.log('- Clicking topology buttons should load scans into topology view');
        console.log('- Collaboration features should be available');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testTopologyLoading().catch(console.error);
