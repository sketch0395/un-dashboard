/**
 * Test script to verify the enhanced UnifiedDeviceModal
 * This script tests that the UnifiedDeviceModal correctly works in both
 * solo and collaborative modes without requiring separate modal components.
 */

const puppeteer = require('puppeteer');

async function testUnifiedDeviceModal() {
  console.log('🔍 Starting Enhanced UnifiedDeviceModal Test');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI environments
    args: ['--window-size=1920,1080']
  });
  
  try {
    console.log('🌐 Opening browser...');
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to the application
    console.log('🔗 Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Login
    console.log('🔐 Logging in...');
    await page.type('input[name="username"]', 'admin');
    await page.type('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    console.log('⌛ Waiting for dashboard...');
    await page.waitForSelector('.dashboard-container', { timeout: 10000 });
    
    // Test Solo Mode Modal
    console.log('🧪 Testing Solo Mode Modal...');
    
    // Click on a device to open the modal
    const devices = await page.$$('.device-node');
    if (devices.length > 0) {
      await devices[0].click();
      
      // Verify modal opens in solo mode
      const modalVisible = await page.waitForSelector('.modal-content', { 
        timeout: 5000,
        visible: true 
      });
      
      if (modalVisible) {
        console.log('✅ Modal opened in solo mode');
        
        // Check for edit button
        const editButton = await page.$('.modal-content button:has(svg[class*="FaEdit"])');
        if (editButton) {
          console.log('✅ Edit button found in solo mode');
        } else {
          console.log('❌ Edit button not found in solo mode');
        }
        
        // Close modal
        const closeButton = await page.$('.modal-content button:has(svg[class*="FaTimes"])');
        if (closeButton) {
          await closeButton.click();
          console.log('✅ Successfully closed solo mode modal');
        }
      } else {
        console.log('❌ Failed to open modal in solo mode');
      }
    } else {
      console.log('❌ No devices found to test');
      return;
    }
    
    // Navigate to shared scans to test collaborative mode
    console.log('🔀 Navigating to shared scans for collaborative testing...');
    await page.click('a[href="/networkscan/shared"]');
    await page.waitForSelector('.shared-scans-container', { timeout: 10000 });
    
    // Select the first scan if available
    const scans = await page.$$('.scan-item');
    if (scans.length > 0) {
      await scans[0].click();
      await page.waitForTimeout(1000);
      
      // Enable collaboration mode
      const collabToggle = await page.$('button:has(svg[class*="FaUsers"])');
      if (collabToggle) {
        await collabToggle.click();
        await page.waitForTimeout(2000);
        console.log('✅ Enabled collaboration mode');
        
        // Click on a device to open modal in collaborative mode
        const collabDevices = await page.$$('.device-node');
        if (collabDevices.length > 0) {
          await collabDevices[0].click();
          
          // Verify modal opens in collaborative mode  
          const collabModalVisible = await page.waitForSelector('.modal-content', { 
            timeout: 5000,
            visible: true 
          });
          
          if (collabModalVisible) {
            console.log('✅ Modal opened in collaborative mode');
            
            // Check for collaboration indicators
            const collabIndicator = await page.$('.modal-content .flex-items-center:has(svg[class*="FaWifi"])');
            if (collabIndicator) {
              console.log('✅ Collaboration indicators found');
            } else {
              console.log('❌ Collaboration indicators not found');
            }
            
            // Close modal
            const closeButton = await page.$('.modal-content button:has(svg[class*="FaTimes"])');
            if (closeButton) {
              await closeButton.click();
              console.log('✅ Successfully closed collaborative mode modal');
            }
          } else {
            console.log('❌ Failed to open modal in collaborative mode');
          }
        } else {
          console.log('❌ No devices found in collaborative mode');
        }
      } else {
        console.log('❌ Collaboration toggle button not found');
      }
    } else {
      console.log('❌ No shared scans found to test collaborative mode');
    }
    
    console.log('✨ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Close browser
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

// Run the test
testUnifiedDeviceModal().catch(console.error);
