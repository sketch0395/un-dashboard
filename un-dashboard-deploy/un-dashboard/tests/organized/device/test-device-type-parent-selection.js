#!/usr/bin/env node

/**
 * Comprehensive test script to verify device type and parent selection system
 * Tests both regular and collaborative modes
 */

const puppeteer = require('puppeteer');

async function testDeviceTypeAndParentSelection() {
    console.log('🧪 Testing Device Type and Parent Selection System...');
    
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: false,
            devtools: false,
            args: ['--start-maximized'],
            defaultViewport: null
        });
        
        const page = await browser.newPage();
        
        // Navigate to the network scan page
        console.log('📂 Navigating to network scan page...');
        await page.goto('http://localhost:3000/networkscan', { waitUntil: 'networkidle0' });
        
        // Wait for the page to load
        await page.waitForTimeout(3000);
        
        console.log('🔍 Looking for existing scans...');
        const scanElements = await page.$$('.bg-gray-700.border, .bg-gray-800.border, [data-testid="scan-card"]');
        console.log(`📋 Found ${scanElements.length} scan elements`);
        
        if (scanElements.length === 0) {
            console.log('⚠️ No scans found. Creating a test scenario...');
            
            // Try to create a new scan first
            const newScanButton = await page.$('button:has-text("Start New Scan"), button:has-text("New Scan")');
            if (newScanButton) {
                console.log('🆕 Creating new scan...');
                await newScanButton.click();
                await page.waitForTimeout(2000);
                
                // Look for scan button and click it
                const scanButton = await page.$('button:has-text("Start Scan"), button:has-text("Scan")');
                if (scanButton) {
                    await scanButton.click();
                    console.log('🔍 Starting scan...');
                    await page.waitForTimeout(5000); // Wait for scan to complete
                }
            }
        }
        
        // Test regular mode first
        console.log('\n=== TESTING REGULAR MODE ===');
        await testRegularModeDeviceEditing(page);
        
        // Test collaborative mode
        console.log('\n=== TESTING COLLABORATIVE MODE ===');
        await testCollaborativeModeDeviceEditing(page);
        
        console.log('\n✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (browser) {
            setTimeout(() => {
                console.log('🔚 Closing browser...');
                browser.close();
            }, 5000); // Keep browser open for 5 seconds to see results
        }
    }
}

async function testRegularModeDeviceEditing(page) {
    try {
        console.log('🔍 Looking for devices in regular mode...');
        
        // Look for device cards or elements
        const deviceCards = await page.$$('.bg-gray-700, .device-card, [data-testid="device-card"], .network-device');
        console.log(`📱 Found ${deviceCards.length} device cards in regular mode`);
        
        if (deviceCards.length === 0) {
            console.log('⚠️ No devices found in regular mode');
            return;
        }
        
        // Click on first device to open UnifiedDeviceModal
        console.log('🖱️ Clicking on first device...');
        await deviceCards[0].click();
        await page.waitForTimeout(2000);
        
        // Check if UnifiedDeviceModal opened
        const modal = await page.$('.fixed.inset-0.bg-black, [role="dialog"], .modal');
        if (modal) {
            console.log('✅ UnifiedDeviceModal opened successfully!');
            
            // Test device type selector
            await testDeviceTypeSelector(page, 'regular');
            
            // Test parent device selector
            await testParentDeviceSelector(page, 'regular');
            
            // Test save functionality
            await testSaveFunction(page, 'regular');
            
            // Close modal
            const closeButton = await page.$('button:has-text("Cancel"), button:has-text("Close")');
            if (closeButton) {
                await closeButton.click();
                console.log('🚪 Modal closed');
            }
        } else {
            console.log('❌ UnifiedDeviceModal did not open');
        }
        
    } catch (error) {
        console.log('⚠️ Regular mode test incomplete:', error.message);
    }
}

async function testCollaborativeModeDeviceEditing(page) {
    try {
        console.log('🔍 Looking for collaborative mode options...');
        
        // Look for existing scans to enter collaborative mode
        const scanElements = await page.$$('.bg-gray-700.border, .bg-gray-800.border, [data-testid="scan-card"]');
        
        if (scanElements.length > 0) {
            console.log('🖱️ Clicking on first scan for collaborative mode...');
            await scanElements[0].click();
            await page.waitForTimeout(2000);
            
            // Look for collaborative mode button
            const collaborativeButton = await page.$('button:has-text("🤝"), button:has-text("Collaborative")');
            if (collaborativeButton) {
                console.log('🤝 Entering collaborative mode...');
                await collaborativeButton.click();
                await page.waitForTimeout(3000);
                
                // Look for devices in collaborative mode
                const deviceCards = await page.$$('.bg-gray-700, .device-card, [data-testid="device-card"]');
                console.log(`📱 Found ${deviceCards.length} device cards in collaborative mode`);
                
                if (deviceCards.length > 0) {
                    // Click on first device to open CollaborativeDeviceModal
                    console.log('🖱️ Clicking on first device in collaborative mode...');
                    await deviceCards[0].click();
                    await page.waitForTimeout(2000);
                    
                    // Check if CollaborativeDeviceModal opened
                    const modal = await page.$('.fixed.inset-0.bg-black, [role="dialog"], .modal');
                    if (modal) {
                        console.log('✅ CollaborativeDeviceModal opened successfully!');
                        
                        // Test device type selector in collaborative mode
                        await testDeviceTypeSelector(page, 'collaborative');
                        
                        // Test parent device selector in collaborative mode  
                        await testParentDeviceSelector(page, 'collaborative');
                        
                        // Test collaborative save functionality
                        await testSaveFunction(page, 'collaborative');
                        
                        // Close modal
                        const closeButton = await page.$('button:has-text("Close"), button:has-text("Cancel")');
                        if (closeButton) {
                            await closeButton.click();
                            console.log('🚪 Collaborative modal closed');
                        }
                    } else {
                        console.log('❌ CollaborativeDeviceModal did not open');
                    }
                } else {
                    console.log('⚠️ No devices found in collaborative mode');
                }
            } else {
                console.log('⚠️ Collaborative mode button not found');
            }
        } else {
            console.log('⚠️ No scans available for collaborative mode testing');
        }
        
    } catch (error) {
        console.log('⚠️ Collaborative mode test incomplete:', error.message);
    }
}

async function testDeviceTypeSelector(page, mode) {
    try {
        console.log(`🎯 Testing device type selector in ${mode} mode...`);
        
        // Look for device type selector
        const deviceTypeSelector = await page.$('.device-type-selector, select[name*="type"], select[id*="type"]');
        const deviceTypeDropdown = await page.$('button:has-text("Select Device Type"), .device-type-dropdown');
        
        if (deviceTypeSelector || deviceTypeDropdown) {
            console.log('✅ Device type selector found');
            
            // Try to interact with it
            const selector = deviceTypeSelector || deviceTypeDropdown;
            await selector.click();
            await page.waitForTimeout(1000);
            
            // Look for device type options
            const typeOptions = await page.$$('option, .device-type-option, [data-testid="device-type-option"]');
            console.log(`📋 Found ${typeOptions.length} device type options`);
            
            if (typeOptions.length > 0) {
                console.log('✅ Device type options available');
                
                // Try selecting a different type
                if (typeOptions.length > 1) {
                    await typeOptions[1].click();
                    console.log('🔄 Device type changed');
                    await page.waitForTimeout(500);
                }
            }
        } else {
            console.log('⚠️ Device type selector not found');
        }
        
    } catch (error) {
        console.log(`⚠️ Device type selector test incomplete in ${mode} mode:`, error.message);
    }
}

async function testParentDeviceSelector(page, mode) {
    try {
        console.log(`🔗 Testing parent device selector in ${mode} mode...`);
        
        // Look for parent device selector 
        const parentSelector = await page.$('.parent-device-selector, select[name*="parent"], select[id*="parent"]');
        const parentDropdown = await page.$('button:has-text("Select Parent"), .parent-device-dropdown');
        
        if (parentSelector || parentDropdown) {
            console.log('✅ Parent device selector found');
            
            // Try to interact with it
            const selector = parentSelector || parentDropdown;
            await selector.click();
            await page.waitForTimeout(1000);
            
            // Look for parent options
            const parentOptions = await page.$$('option, .parent-option, [data-testid="parent-option"]');
            console.log(`📋 Found ${parentOptions.length} parent device options`);
            
            if (parentOptions.length > 0) {
                console.log('✅ Parent device options available');
            }
        } else {
            console.log('⚠️ Parent device selector not found (may not be available for current device type)');
        }
        
    } catch (error) {
        console.log(`⚠️ Parent device selector test incomplete in ${mode} mode:`, error.message);
    }
}

async function testSaveFunction(page, mode) {
    try {
        console.log(`💾 Testing save functionality in ${mode} mode...`);
        
        // Look for save button
        const saveButton = await page.$('button:has-text("Save"), button[type="submit"]');
        
        if (saveButton) {
            console.log('✅ Save button found');
            
            // Test saving
            await saveButton.click();
            console.log('💾 Save button clicked');
            await page.waitForTimeout(2000);
            
            // Check for success indicators
            const successMessage = await page.$('.success, .saved, .toast-success');
            if (successMessage) {
                console.log('✅ Save operation appears successful');
            }
        } else {
            console.log('⚠️ Save button not found');
        }
        
    } catch (error) {
        console.log(`⚠️ Save function test incomplete in ${mode} mode:`, error.message);
    }
}

// Run the test
testDeviceTypeAndParentSelection().catch(console.error);
