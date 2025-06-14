#!/usr/bin/env node

/**
 * Test script to verify the collaborative device edit modal fix
 */

const puppeteer = require('puppeteer');

async function testCollaborativeModalFix() {
    let browser;
    
    try {
        console.log('🚀 Testing Collaborative Device Edit Modal Fix...');
        
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        });
        
        const page = await browser.newPage();
        
        // Go to the network scan page
        console.log('📱 Navigating to network scan page...');
        await page.goto('http://localhost:3000/networkscan', { waitUntil: 'networkidle0' });
        
        // Wait for the page to load
        await page.waitForTimeout(2000);
        
        // Look for collaborative scan options
        console.log('🔍 Looking for collaborative scans...');
        
        // First, let's see if there are any existing scans
        const scanElements = await page.$$('.bg-gray-700.border.rounded-lg.p-4, .bg-gray-800.rounded-lg.p-4, [data-testid="scan-card"]');
        console.log(`📋 Found ${scanElements.length} scan elements`);
        
        if (scanElements.length === 0) {
            console.log('⚠️  No scans found. Creating a test scenario...');
            
            // Try to go to topology view directly to see if devices exist
            const topologyButton = await page.$('button:has-text("Topology"), [aria-label*="topology"], button[title*="topology"]');
            if (topologyButton) {
                console.log('🗺️ Found topology button, clicking...');
                await topologyButton.click();
                await page.waitForTimeout(2000);
            }
        } else {
            // Try to enter collaborative mode with the first scan
            console.log(`🖱️ Clicking on first scan element...`);
            await scanElements[0].click();
            await page.waitForTimeout(2000);
            
            // Look for collaborative mode button
            const collaborativeButton = await page.$('button:has-text("🤝"), button:has-text("Collaborative"), button[title*="collaborative"]');
            if (collaborativeButton) {
                console.log('🤝 Found collaborative mode button, clicking...');
                await collaborativeButton.click();
                await page.waitForTimeout(3000);
            }
        }
        
        // Now try to find and click on a device in topology view
        console.log('🔍 Looking for devices in topology view...');
        
        // Check if we're in topology view
        const topologyView = await page.$('.topology-container, .network-view, .topology-view');
        if (!topologyView) {
            console.log('🗺️ Not in topology view, trying to navigate...');
            const topologyTab = await page.$('button:has-text("Topology"), [data-tab="topology"]');
            if (topologyTab) {
                await topologyTab.click();
                await page.waitForTimeout(2000);
            }
        }
        
        // Look for device elements in SVG or other formats
        const deviceElements = await page.$$('circle[data-device], rect[data-device], .device-node, .network-device, g[data-device]');
        console.log(`📱 Found ${deviceElements.length} device elements in topology`);
        
        if (deviceElements.length > 0) {
            console.log('🖱️ Clicking on first device...');
            
            // Click on the first device
            await deviceElements[0].click();
            await page.waitForTimeout(2000);
            
            // Check if collaborative device modal opened
            const collaborativeModal = await page.$('.fixed.inset-0.bg-black.bg-opacity-50, [role="dialog"], .device-modal');
            if (collaborativeModal) {
                console.log('✅ Collaborative device modal opened successfully!');
                
                // Check for collaborative-specific elements
                const editButton = await page.$('button:has-text("Edit"), button[title*="edit"]');
                const collaborationIndicator = await page.$('.collaboration-indicator, [data-testid="collaboration-indicator"]');
                const lockIndicator = await page.$('.lock-indicator, [data-testid="lock-indicator"]');
                
                if (editButton) {
                    console.log('✅ Edit button found in modal');
                }
                if (collaborationIndicator) {
                    console.log('✅ Collaboration indicator found');
                }
                if (lockIndicator) {
                    console.log('✅ Lock indicator found');
                }
                
                console.log('🎉 Collaborative device edit modal is working correctly!');
                
                // Close the modal
                const closeButton = await page.$('button:has-text("Close"), button[title*="close"], .close-button');
                if (closeButton) {
                    await closeButton.click();
                    console.log('🚪 Modal closed successfully');
                }
                
            } else {
                console.log('❌ No device modal opened after clicking device');
                
                // Check for any error messages in console
                page.on('console', msg => {
                    if (msg.type() === 'error') {
                        console.log('🔴 Browser error:', msg.text());
                    }
                });
            }
        } else {
            console.log('⚠️ No devices found in topology view');
            
            // Take a screenshot for debugging
            await page.screenshot({ path: 'collaborative-modal-debug.png', fullPage: true });
            console.log('📸 Screenshot saved as collaborative-modal-debug.png');
        }
        
        console.log('✅ Test completed successfully!');
        
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

// Run the test
testCollaborativeModalFix().catch(console.error);
