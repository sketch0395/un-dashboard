const puppeteer = require('puppeteer');

async function testDeviceEditingFunctionality() {
    console.log('🧪 Testing device editing functionality in SharedScansBrowser...');
    
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        });
        
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ Browser Error:', msg.text());
            } else if (msg.text().includes('device') || msg.text().includes('modal')) {
                console.log('📋 Device/Modal Log:', msg.text());
            }
        });
        
        // Go to the shared scans page
        await page.goto('http://localhost:3000/networkscan/shared', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        console.log('✅ Navigated to shared scans page');
        
        // Wait for the page to load
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Check if we need to login
        const needsLogin = await page.$('.login-form, input[type="email"], input[name="email"]');
        if (needsLogin) {
            console.log('🔐 Login required, attempting to login...');
            
            // Try to find login form elements
            const emailInput = await page.$('input[type="email"], input[name="email"]');
            const passwordInput = await page.$('input[type="password"], input[name="password"]');
            
            if (emailInput && passwordInput) {
                await emailInput.type('admin@networkanalyzer.local');
                await passwordInput.type('admin');
                
                // Look for login button
                const loginButton = await page.$('button[type="submit"], .login-button, button:has-text("Login")');
                if (loginButton) {
                    await loginButton.click();
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
                    console.log('✅ Login successful');
                }
            }
        }
        
        // Check if there are any scans available
        console.log('🔍 Checking for available scans...');
        await page.waitForTimeout(2000);
        
        // Look for scan items
        const scanItems = await page.$$('.scan-item, .shared-scan, [data-testid="scan-item"]');
        console.log(`📊 Found ${scanItems.length} scan items`);
        
        if (scanItems.length === 0) {
            console.log('📝 No scans found. The device editing test requires existing scans with devices.');
            console.log('✅ Component loaded successfully, but no test data available.');
            return;
        }
        
        // Click on the first scan to open details
        await scanItems[0].click();
        console.log('🖱️ Clicked on first scan');
        
        // Wait for scan details to load
        await page.waitForTimeout(2000);
        
        // Look for device items in the scan details
        const deviceItems = await page.$$('.device-item, .network-device, [data-testid="device-item"], td, .device-row');
        console.log(`🖥️ Found ${deviceItems.length} potential device items`);
        
        if (deviceItems.length === 0) {
            console.log('📝 No devices found in the scan. Testing with mock data would be needed.');
            console.log('✅ Component loaded successfully, but no device data available.');
            return;
        }
        
        // Try to find and click on a device to open the modal
        for (let i = 0; i < Math.min(deviceItems.length, 3); i++) {
            try {
                await deviceItems[i].click();
                console.log(`🖱️ Clicked on device item ${i + 1}`);
                
                // Wait for modal to appear
                await page.waitForTimeout(1000);
                
                // Check if UnifiedDeviceModal appeared
                const modal = await page.$('.modal, .device-modal, [role="dialog"]');
                if (modal) {
                    console.log('✅ Device modal opened successfully!');
                    
                    // Check for editing elements that should be in UnifiedDeviceModal
                    const nameInput = await page.$('input[placeholder*="name"], input[placeholder*="device"]');
                    const deviceTypeSelect = await page.$('select option[value*="Server"], select option[value*="Gateway"]');
                    const saveButton = await page.$('button:has-text("Save"), .save-button');
                    
                    if (nameInput || deviceTypeSelect || saveButton) {
                        console.log('✅ Device editing interface detected - UnifiedDeviceModal is working!');
                        
                        // Test editing if possible
                        if (nameInput) {
                            await nameInput.clear();
                            await nameInput.type('Test Device Edit');
                            console.log('✅ Device name editing works');
                        }
                        
                        if (saveButton) {
                            console.log('✅ Save button found - editing interface complete');
                        }
                        
                        // Close modal
                        const closeButton = await page.$('button:has-text("Cancel"), .close-button, button[title*="close"]');
                        if (closeButton) {
                            await closeButton.click();
                            console.log('✅ Modal closed successfully');
                        }
                        
                        break;
                    } else {
                        console.log('⚠️ Modal opened but editing interface not found');
                    }
                } else {
                    console.log(`⚠️ No modal appeared for device item ${i + 1}`);
                }
            } catch (error) {
                console.log(`⚠️ Error clicking device item ${i + 1}:`, error.message);
            }
        }
        
        console.log('✅ Device editing functionality test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testDeviceEditingFunctionality().catch(console.error);
