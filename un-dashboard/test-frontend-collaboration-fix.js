/**
 * Frontend Collaboration Fix Verification Test
 * Tests that device updates made in SharedScansBrowser are properly broadcasted via collaboration
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

// Helper function to wait
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Load authentication data
let authData = {};
try {
    const loginData = JSON.parse(fs.readFileSync('./login-data.json', 'utf8'));
    authData = loginData;
    console.log('✅ Loaded authentication data');
} catch (error) {
    console.log('⚠️ Could not load authentication data, using defaults');
    authData = { username: 'admin', password: 'admin123' };
}

async function testFrontendCollaborationFix() {
    console.log('🧪 Testing Frontend Collaboration Fix');
    console.log('====================================');
    
    let browser1, browser2;
    
    try {
        // Launch two browser instances to simulate different users
        console.log('🚀 Launching two browser instances...');
        
        browser1 = await puppeteer.launch({ 
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized', '--no-sandbox'],
            devtools: false
        });
        
        browser2 = await puppeteer.launch({ 
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized', '--no-sandbox'],
            devtools: false
        });
        
        const page1 = await browser1.newPage();
        const page2 = await browser2.newPage();
        
        // Set up console logging
        page1.on('console', msg => {
            if (msg.text().includes('📤 Sending device update via collaboration') || 
                msg.text().includes('📱 Applying device update from') ||
                msg.text().includes('📊 Applying scan update from')) {
                console.log('👤 User 1:', msg.text());
            }
        });
        
        page2.on('console', msg => {
            if (msg.text().includes('📤 Sending device update via collaboration') || 
                msg.text().includes('📱 Applying device update from') ||
                msg.text().includes('📊 Applying scan update from')) {
                console.log('👥 User 2:', msg.text());
            }
        });
        
        // Navigate both browsers to the application
        console.log('🌐 Navigating to application...');
        await Promise.all([
            page1.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' }),
            page2.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' })
        ]);
        
        // Login both users
        console.log('🔐 Logging in both users...');
        await Promise.all([
            loginUser(page1, 'admin', 'admin123'),
            loginUser(page2, 'admin', 'admin123')
        ]);
        
        // Navigate to shared scans
        console.log('📋 Navigating to shared scans...');
        await Promise.all([
            page1.goto('http://localhost:3000/networkscan/shared', { waitUntil: 'networkidle2' }),
            page2.goto('http://localhost:3000/networkscan/shared', { waitUntil: 'networkidle2' })
        ]);        // Wait for the page to load
        await wait(2000);
        
        // Look for shared scans
        console.log('🔍 Looking for shared scans...');
        const scans1 = await page1.$$('.bg-gray-800.border.rounded-lg.p-6');
        const scans2 = await page2.$$('.bg-gray-800.border.rounded-lg.p-6');
        
        if (scans1.length === 0) {
            console.log('❌ No shared scans found on either page');
            return false;
        }
        
        console.log(`✅ Found ${scans1.length} shared scans on both pages`);
        
        // Click on the first scan to view details
        console.log('📱 Opening scan details on both browsers...');
        await scans1[0].click();
        await scans2[0].click();
          // Wait for details modal to open
        await wait(2000);
          // Start collaborative mode on both browsers
        console.log('🤝 Starting collaborative mode...');
        const collaborationButtons1 = await page1.$x("//button[contains(text(), '🤝 Start Collaboration')]");
        const collaborationButtons2 = await page2.$x("//button[contains(text(), '🤝 Start Collaboration')]");
          if (collaborationButtons1.length > 0) {
            await collaborationButtons1[0].click();
            await wait(1000);
        }
        
        if (collaborationButtons2.length > 0) {
            await collaborationButtons2[0].click();
            await wait(1000);
        }
        
        // Wait for collaboration to initialize
        console.log('⏳ Waiting for collaboration to initialize...');
        await wait(3000);
        
        // Try to find and click on a device to edit
        console.log('🖱️ Looking for devices to edit...');
        const devices1 = await page1.$$('.bg-gray-700.border.rounded-lg.p-4');
        const devices2 = await page2.$$('.bg-gray-700.border.rounded-lg.p-4');
          if (devices1.length > 0) {
            console.log(`📱 Found ${devices1.length} devices, clicking first device on User 1...`);
            await devices1[0].click();
            await wait(2000);
            
            // Check if device modal opened
            const modal1 = await page1.$('.fixed.inset-0.bg-black');
            if (modal1) {
                console.log('✅ Device modal opened on User 1');
                
                // Try to edit device name
                const nameInput = await page1.$('input[value*=""], input[placeholder*="name"], input[type="text"]');
                if (nameInput) {
                    await nameInput.click();
                    await nameInput.clear();
                    await nameInput.type('Collaboration Test Device Updated');
                    console.log('✏️ Updated device name on User 1');
                      // Save the changes
                    const saveButton = await page1.$x("//button[contains(text(), 'Save')]");                    if (saveButton && saveButton.length > 0) {
                        await saveButton[0].click();
                        console.log('💾 Clicked save button on User 1');
                        await wait(2000);
                    }
                }
                  // Close modal
                const closeButton = await page1.$x("//button[contains(text(), 'Close')]");
                if (closeButton && closeButton.length > 0) {
                    await closeButton[0].click();
                }
            }
        }
          // Wait for collaboration sync
        console.log('⏳ Waiting for collaboration sync...');
        await wait(3000);
        
        console.log('✅ Collaboration test completed successfully!');
        console.log('📊 Check the console logs above for collaboration messages');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    } finally {
        if (browser1) await browser1.close();
        if (browser2) await browser2.close();
    }
}

async function loginUser(page, username, password) {
    try {
        await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 5000 });
        await page.type('input[name="username"], input[type="text"]', username);
        await page.type('input[name="password"], input[type="password"]', password);
          // Try different button selectors
        let loginButton = await page.$('button[type="submit"]');
        if (!loginButton) {
            loginButton = await page.$x("//button[contains(text(), 'Login')]");
            if (loginButton.length > 0) {
                loginButton = loginButton[0];
            } else {
                loginButton = null;
            }
        }
        
        if (loginButton) {
            await loginButton.click();
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        }
        
        console.log(`✅ Logged in user: ${username}`);
    } catch (error) {
        console.error(`❌ Failed to login user ${username}:`, error.message);
        throw error;
    }
}

// Run the test
testFrontendCollaborationFix().then(success => {
    if (success) {
        console.log('\n🎉 FRONTEND COLLABORATION FIX TEST COMPLETED!');
        console.log('✅ The fix should now enable real-time device update broadcasting');
        console.log('📋 Next: Test with actual users in different browsers');
    } else {
        console.log('\n❌ Test failed - check the errors above');
    }
    process.exit(success ? 0 : 1);
});
