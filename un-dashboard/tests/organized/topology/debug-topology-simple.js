// Simple topology debugging script
// This will test topology display by examining the React components and their state

console.log('🔍 SIMPLE TOPOLOGY DEBUG');
console.log('='.repeat(50));

const puppeteer = require('puppeteer');

async function debugTopologySimple() {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: false,
            devtools: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Listen for console messages
        page.on('console', msg => {
            if (msg.text().includes('TOPOLOGY DEBUGGER')) {
                console.log('📊 TOPOLOGY DEBUG:', msg.text());
            } else if (msg.type() === 'error') {
                console.log('❌ BROWSER ERROR:', msg.text());
            } else if (msg.text().includes('topology') || msg.text().includes('collaboration')) {
                console.log('🔍 RELEVANT LOG:', msg.text());
            }
        });

        // Listen for page errors
        page.on('pageerror', error => {
            console.log('💥 PAGE ERROR:', error.message);
        });

        console.log('🌐 Opening application...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        
        console.log('🔍 Waiting for page to load...');
        await page.waitForTimeout(3000);
        
        // Check if we're on the homepage
        const title = await page.title();
        console.log('📄 Page title:', title);
        
        // Navigate to network scan
        console.log('🔄 Navigating to network scan...');
        try {
            await page.click('a[href="/networkscan"]');
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log('⚠️ Could not find networkscan link, trying direct navigation...');
            await page.goto('http://localhost:3000/networkscan', { waitUntil: 'networkidle0' });
        }
        
        // Wait for the page to load
        await page.waitForTimeout(3000);
        
        // Check for TopologyDebugger
        console.log('🔍 Checking for TopologyDebugger component...');
        const debuggerExists = await page.evaluate(() => {
            return document.querySelector('[class*="topology-debugger"]') !== null ||
                   document.querySelector('[data-testid="topology-debugger"]') !== null ||
                   document.textContent.includes('TopologyDebugger');
        });
        
        console.log('🔧 TopologyDebugger present:', debuggerExists);
        
        // Check for SVG elements (topology visualization)
        const svgInfo = await page.evaluate(() => {
            const svgs = document.querySelectorAll('svg');
            return {
                count: svgs.length,
                hasDimensions: Array.from(svgs).some(svg => svg.getAttribute('width') && svg.getAttribute('height')),
                hasContent: Array.from(svgs).some(svg => svg.children.length > 0)
            };
        });
        
        console.log('🎨 SVG elements:', svgInfo);
        
        // Check for network topology related elements
        const topologyInfo = await page.evaluate(() => {
            const networkElements = {
                circularView: document.querySelector('[class*="circular"]') !== null,
                hierarchicalView: document.querySelector('[class*="hierarchical"]') !== null,
                networkContainer: document.querySelector('[class*="network"]') !== null,
                d3Elements: document.querySelectorAll('.node, .link, circle, line').length,
                hasReactComponents: document.querySelector('[data-reactroot]') !== null
            };
            return networkElements;
        });
        
        console.log('🌐 Topology elements:', topologyInfo);
        
        // Check collaboration state
        console.log('🤝 Checking collaboration state...');
        const collaborationState = await page.evaluate(() => {
            // Try to find collaboration toggle or status
            const hasCollabToggle = document.querySelector('[class*="collab"]') !== null ||
                                  document.textContent.includes('Collaboration');
            const hasWebSocket = window.WebSocket !== undefined;
            return {
                hasCollabToggle,
                hasWebSocket,
                localStorage: Object.keys(localStorage),
                sessionStorage: Object.keys(sessionStorage)
            };
        });
        
        console.log('🤝 Collaboration info:', collaborationState);
        
        // Check for error messages
        const errors = await page.evaluate(() => {
            const errorSelectors = [
                '[class*="error"]',
                '[class*="warning"]',
                '.alert',
                '[role="alert"]'
            ];
            
            let foundErrors = [];
            errorSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.textContent.trim()) {
                        foundErrors.push({
                            selector,
                            text: el.textContent.trim()
                        });
                    }
                });
            });
            
            return foundErrors;
        });
        
        if (errors.length > 0) {
            console.log('⚠️ Found error messages:', errors);
        } else {
            console.log('✅ No error messages found');
        }
        
        // Take a screenshot
        console.log('📸 Taking screenshot...');
        await page.screenshot({ path: 'topology-debug-screenshot.png', fullPage: true });
        
        console.log('✅ Debug complete! Check topology-debug-screenshot.png');
        console.log('\n🎯 SUMMARY:');
        console.log('- TopologyDebugger:', debuggerExists ? '✅ Present' : '❌ Missing');
        console.log('- SVG Elements:', svgInfo.count > 0 ? `✅ ${svgInfo.count} found` : '❌ None found');
        console.log('- Topology Elements:', topologyInfo.d3Elements > 0 ? `✅ ${topologyInfo.d3Elements} found` : '❌ None found');
        console.log('- Collaboration Toggle:', collaborationState.hasCollabToggle ? '✅ Found' : '❌ Missing');
        
        // Wait a bit more to see any delayed loading
        console.log('⏳ Waiting for any delayed loading...');
        await page.waitForTimeout(5000);
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Check if puppeteer is available
try {
    require('puppeteer');
    debugTopologySimple();
} catch (e) {
    console.log('⚠️ Puppeteer not available, installing...');
    const { exec } = require('child_process');
    exec('npm install puppeteer', (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Failed to install puppeteer:', error);
        } else {
            console.log('✅ Puppeteer installed, restart the script');
        }
    });
}
