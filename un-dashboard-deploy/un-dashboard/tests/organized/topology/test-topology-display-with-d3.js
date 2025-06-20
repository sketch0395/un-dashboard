// Test script to verify topology display after D3.js installation
const puppeteer = require('puppeteer');

async function testTopologyDisplay() {
    console.log('🔍 TESTING TOPOLOGY DISPLAY WITH D3.js');
    console.log('=====================================');
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            const type = msg.type();
            if (type === 'error' || type === 'warn' || msg.text().includes('TOPOLOGY')) {
                console.log(`[BROWSER ${type.toUpperCase()}]: ${msg.text()}`);
            }
        });
        
        console.log('🌐 Navigating to login page...');
        await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle0' });
        
        console.log('🔑 Logging in as admin...');
        await page.type('#username', 'admin');
        await page.type('#password', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        console.log('📊 Navigating to network scan page...');
        await page.goto('http://localhost:3000/networkscan', { waitUntil: 'networkidle0' });
        
        // Wait for page to fully load
        await page.waitForTimeout(3000);
        
        console.log('🔍 Checking for TopologyDebugger...');
        const debugInfo = await page.evaluate(() => {
            const debugElement = document.querySelector('div[style*="position: fixed"][style*="top: 10px"]');
            if (!debugElement) return { found: false };
            
            return {
                found: true,
                text: debugElement.textContent,
                visible: debugElement.offsetParent !== null
            };
        });
        
        if (debugInfo.found) {
            console.log('✅ TopologyDebugger found!');
            console.log('📝 Debug info:', debugInfo.text);
        } else {
            console.log('❌ TopologyDebugger not found');
        }
        
        console.log('🔍 Checking for D3.js availability...');
        const d3Status = await page.evaluate(() => {
            return {
                windowD3: typeof window.d3 !== 'undefined',
                d3Version: window.d3 ? window.d3.version : 'Not available',
                svgElements: document.querySelectorAll('svg').length
            };
        });
        
        console.log('🎨 D3.js Status:');
        console.log(`   - Window D3: ${d3Status.windowD3 ? '✅' : '❌'}`);
        console.log(`   - D3 Version: ${d3Status.d3Version}`);
        console.log(`   - SVG Elements: ${d3Status.svgElements}`);
        
        // Check for any error messages
        console.log('🔍 Checking for errors...');
        const errors = await page.evaluate(() => {
            const errorElements = Array.from(document.querySelectorAll('*')).filter(el => 
                el.textContent && el.textContent.toLowerCase().includes('error')
            ).map(el => el.textContent.trim()).slice(0, 5);
            return errorElements;
        });
        
        if (errors.length > 0) {
            console.log('⚠️ Found potential errors:');
            errors.forEach(error => console.log(`   - ${error}`));
        } else {
            console.log('✅ No obvious error messages found');
        }
        
        // Take a screenshot
        await page.screenshot({ path: 'topology-display-test.png', fullPage: true });
        console.log('📸 Screenshot saved as topology-display-test.png');
        
        console.log('✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testTopologyDisplay().catch(console.error);
