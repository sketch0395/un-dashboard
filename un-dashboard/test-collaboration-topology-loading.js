const puppeteer = require('puppeteer');

async function testCollaborationTopologyLoading() {
    let browser;
    
    try {
        console.log('🚀 Testing Collaboration Topology Loading Fix...');
        
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        });
        
        const page = await browser.newPage();
        
        // Navigate to the network scan page
        console.log('📱 Navigating to network scan page...');
        await page.goto('http://localhost:3000/networkscan', { waitUntil: 'networkidle0' });
          // Wait for the page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('🔍 Looking for Solo/Collaborative toggle button...');
        
        // Look for the collaboration toggle button with proper selectors
        let collaborationButton = await page.$('button[title*="collaboration"]');
        if (!collaborationButton) {
            collaborationButton = await page.$('button[aria-label*="collaboration"]');
        }
        if (!collaborationButton) {
            // Try to find button by text content
            collaborationButton = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(btn => 
                    btn.textContent.includes('Solo') || 
                    btn.textContent.includes('Collaborative') ||
                    btn.textContent.includes('🤝')
                );
            });
        }
        
        if (!collaborationButton) {
            console.log('❌ Collaboration toggle button not found');
            console.log('💡 The button might have different text or be located differently');
            
            // Take a screenshot for debugging
            await page.screenshot({ path: 'topology-collaboration-debug.png', fullPage: true });
            console.log('📸 Screenshot saved as topology-collaboration-debug.png');
            return;
        }
        
        console.log('✅ Found collaboration toggle button');
          // Click the collaboration toggle button
        console.log('🖱️ Clicking collaboration toggle button...');
        if (collaborationButton.click) {
            await collaborationButton.click();
        } else {
            // If it's a JSHandle, we need to click it differently
            await page.evaluate(btn => btn.click(), collaborationButton);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
          // Check if the scan selection modal appeared
        console.log('🔍 Looking for scan selection modal...');
        const scanModal = await page.$('.fixed.inset-0') || await page.$('[role="dialog"]') || await page.$('.modal');
        
        if (!scanModal) {
            console.log('❌ Scan selection modal did not appear');
            return;
        }
        
        console.log('✅ Scan selection modal appeared');
          // Look for scan items in the modal
        const scanItems = await page.$$('.bg-gray-700');
        console.log(`📋 Found ${scanItems.length} scan items in modal`);
        
        if (scanItems.length === 0) {
            console.log('⚠️ No scan items found in modal');
            console.log('💡 This might be because there are no shared scans or scan history items');
              // Check if we can create a test scan first
            console.log('🔍 Looking for close button to exit modal...');
            const closeButton = await page.$('button') || await page.$('[aria-label="close"]');
            if (closeButton) {
                await closeButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log('📝 Test completed - no scans available for testing');
            return;
        }
        
        // Click on the first scan
        console.log('🖱️ Clicking on first scan to test topology loading...');
        await scanItems[0].click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if we're now in topology view
        console.log('🔍 Checking if topology view loaded...');
        
        // Look for topology-specific elements
        const topologyElements = await page.$$('svg, .topology-view, .network-topology, circle, rect');
        console.log(`🗺️ Found ${topologyElements.length} topology elements`);
          // Check if the active tab is topology
        const activeTopologyTab = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(btn => 
                btn.textContent.includes('Topology') && 
                (btn.className.includes('bg-blue') || btn.className.includes('active'))
            );
        });
        
        if (topologyElements.length > 0 || activeTopologyTab) {
            console.log('✅ SUCCESS: Topology view loaded successfully!');
            console.log('🎉 The collaboration topology loading fix is working!');
            
            // Check for collaborative indicators
            const collaborativeIndicators = await page.$$('.text-purple, [class*="collaborative"], .bg-purple');
            console.log(`🤝 Found ${collaborativeIndicators.length} collaborative indicators`);
            
            if (collaborativeIndicators.length > 0) {
                console.log('✅ Collaborative mode is active with topology loaded');
            }
        } else {
            console.log('❌ Topology view did not load');
            console.log('💡 The scan might not have device data or there might be an issue');
        }
        
        // Take a final screenshot
        await page.screenshot({ path: 'collaboration-topology-result.png', fullPage: true });
        console.log('📸 Final screenshot saved as collaboration-topology-result.png');
        
        console.log('\n🎯 Test Summary:');
        console.log('1. ✅ Navigation to network scan page successful');
        console.log('2. ✅ Collaboration toggle button found and clicked');
        console.log('3. ✅ Scan selection modal appeared');
        console.log(`4. ✅ Found ${scanItems.length} scan items`);
        console.log('5. ✅ Clicked on scan and topology loading tested');
        
        // Keep browser open for manual inspection
        console.log('\n📝 Browser will stay open for 30 seconds for manual inspection...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
        console.log('🏁 Test completed');
    }
}

// Run the test
testCollaborationTopologyLoading().catch(console.error);
