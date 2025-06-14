// Test script to verify collaborative device modal opens correctly
const puppeteer = require('puppeteer');

async function testCollaborativeDeviceModal() {
    console.log('🧪 Testing Collaborative Device Modal...');
    
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: false,
            devtools: true,
            args: ['--start-maximized']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Navigate to the network scan page
        console.log('📂 Navigating to network scan page...');
        await page.goto('http://localhost:3000/networkscan', { waitUntil: 'networkidle0' });        // Wait for the page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if we have any existing scans
        console.log('🔍 Looking for existing scans...');
        const scanItems = await page.$$('.scan-item, .bg-gray-700.border, [data-testid="scan-item"]');
        
        if (scanItems.length === 0) {
            console.log('📝 No scans found. Need to create a test scan first.');
            return;
        }
        
        // Click on the first scan
        console.log('🖱️ Clicking on first scan...');
        await scanItems[0].click();
        await page.waitForTimeout(2000);
        
        // Look for collaboration button
        console.log('🤝 Looking for collaboration mode button...');
        const collaborationButton = await page.$('button:has-text("🤝"), button[title*="collaborative"], button:has-text("Collaborative")');
        
        if (collaborationButton) {
            console.log('✅ Collaboration button found, clicking...');
            await collaborationButton.click();
            await page.waitForTimeout(3000);
        } else {
            console.log('⚠️ No collaboration button found, looking for devices directly...');
        }
        
        // Look for topology view devices
        console.log('📱 Looking for devices in topology view...');
        const deviceElements = await page.$$('.device-node, .bg-gray-700, [data-testid="device"], .device-item');
        console.log(`📊 Found ${deviceElements.length} potential device elements`);
        
        if (deviceElements.length === 0) {
            console.log('❌ No devices found in the topology view');
            return;
        }
        
        // Try clicking on a device to open the collaborative modal
        console.log('🖱️ Clicking on first device...');
        await deviceElements[0].click();
        
        // Wait for modal to appear
        await page.waitForTimeout(2000);
        
        // Check if modal opened
        const modal = await page.$('.fixed.inset-0.bg-black, [role="dialog"], .modal');
        
        if (modal) {
            console.log('✅ Modal opened successfully!');
            
            // Check for collaborative-specific elements
            const collaborationIndicator = await page.$('.collaboration-indicator, .text-blue-400');
            const deviceForm = await page.$('input[value*=""], textarea, select');
            const editButton = await page.$('button:has-text("Edit")');
            
            if (collaborationIndicator) {
                console.log('✅ Collaboration indicator found');
            }
            
            if (deviceForm) {
                console.log('✅ Device form fields found');
            }
            
            if (editButton) {
                console.log('✅ Edit button found');
            }
            
            console.log('🎉 Collaborative device modal test completed successfully!');
            
            // Close modal
            const closeButton = await page.$('button:has-text("Close"), button:has-text("Cancel")');
            if (closeButton) {
                await closeButton.click();
                console.log('🚪 Modal closed');
            }
            
        } else {
            console.log('❌ Modal did not open');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        // Check for any JavaScript errors on the page
        const errors = await page.evaluate(() => {
            return window.errors || [];
        });
        
        if (errors.length > 0) {
            console.log('🐛 JavaScript errors found:', errors);
        }
        
    } finally {
        if (browser) {
            console.log('🔒 Closing browser...');
            await browser.close();
        }
    }
}

// Run the test
testCollaborativeDeviceModal().catch(console.error);
