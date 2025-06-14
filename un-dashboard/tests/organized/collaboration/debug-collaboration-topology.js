console.log('🐛 COLLABORATION TOPOLOGY DEBUGGING');
console.log('='.repeat(50));

// This script checks specific collaboration topology issues
// Based on the code analysis, let's check the exact issue

const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugCollaborationTopology() {
    console.log('🚀 Starting collaboration topology debugging...\n');

    let browser;
    try {
        // Launch browser
        browser = await puppeteer.launch({ 
            headless: false, 
            devtools: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set up console monitoring
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error' || text.includes('topology') || text.includes('collaboration')) {
                console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
            }
        });

        page.on('pageerror', error => {
            console.log(`[PAGE ERROR] ${error.message}`);
        });

        console.log('🌐 Navigating to network scan page...');
        await page.goto('http://localhost:3000/networkscan', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        // Wait for the page to fully load
        await page.waitForTimeout(3000);

        console.log('🔍 Analyzing topology rendering...');

        // Check for topology elements
        const topologyAnalysis = await page.evaluate(() => {
            const analysis = {
                topologyElements: {
                    topologyMap: !!document.querySelector('[class*="topology"]'),
                    networkViewManager: !!document.querySelector('[class*="NetworkViewManager"]'),
                    svgElements: document.querySelectorAll('svg').length,
                    circularView: !!document.querySelector('[class*="circular"]'),
                    hierarchicalView: !!document.querySelector('[class*="hierarchical"]'),
                    networkLegend: !!document.querySelector('[class*="legend"]')
                },
                collaborationElements: {
                    collaborationStatus: !!document.querySelector('[class*="collaboration"]'),
                    collaborationControls: !!document.querySelector('[class*="collab"]'),
                    shareButton: !!document.querySelector('button[title*="share"], button[class*="share"]'),
                    collaboratorsList: !!document.querySelector('[class*="collaborator"]')
                },
                dataState: {
                    hasDeviceData: !!window.localStorage.getItem('customDeviceProperties'),
                    hasScanHistory: !!window.localStorage.getItem('scanHistory'),
                    collaborativeMode: window.localStorage.getItem('collaborativeMode'),
                    currentScanId: window.localStorage.getItem('currentScanId')
                },
                pageContent: {
                    hasNetworkTab: !!document.querySelector('[role="tab"], button[class*="tab"]'),
                    hasTopologyTab: !!document.querySelector('button:contains("topology"), [class*="topology"]'),
                    hasMainContent: !!document.querySelector('main, [class*="content"]'),
                    hasLoadingIndicator: !!document.querySelector('[class*="loading"], [class*="spinner"]')
                }
            };

            // Check for errors in console
            if (window.console && window.console.error) {
                const originalError = window.console.error;
                window.console.error = function(...args) {
                    window.topologyErrors = window.topologyErrors || [];
                    window.topologyErrors.push(args.join(' '));
                    originalError.apply(console, args);
                };
            }

            return analysis;
        });

        console.log('📊 Topology Analysis Results:');
        console.log(JSON.stringify(topologyAnalysis, null, 2));

        // Check if we have scan data to load
        console.log('\n🔍 Checking for available scan data...');
        
        // Try to find scan history or scan selector
        const scanElements = await page.evaluate(() => {
            const scanSelectors = [
                'button[class*="scan"]',
                '[class*="scan-history"]',
                '[class*="scan-selector"]', 
                'select[class*="scan"]',
                '.scan-item',
                '[data-testid*="scan"]'
            ];

            const foundElements = {};
            scanSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    foundElements[selector] = elements.length;
                }
            });

            return foundElements;
        });

        console.log('📋 Scan Elements Found:');
        console.log(JSON.stringify(scanElements, null, 2));

        // Try to enable collaboration mode
        console.log('\n🤝 Testing collaboration mode...');
        
        const collaborationTest = await page.evaluate(() => {
            // Look for collaboration controls
            const shareButton = document.querySelector('button[title*="share"], button[class*="share"], [class*="collaboration"]');
            
            if (shareButton) {
                shareButton.click();
                return { shareButtonClicked: true, shareButtonText: shareButton.textContent };
            }
            
            return { shareButtonClicked: false, reason: 'Share button not found' };
        });

        console.log('🤝 Collaboration Test Result:');
        console.log(JSON.stringify(collaborationTest, null, 2));

        // Wait a moment for any dynamic content to load
        await page.waitForTimeout(2000);

        // Check topology again after potential collaboration mode activation
        const postCollabAnalysis = await page.evaluate(() => {
            return {
                topologyAfterCollab: {
                    svgElements: document.querySelectorAll('svg').length,
                    topologyVisible: !!document.querySelector('svg[width], svg[height]'),
                    hasTopologyContent: document.querySelectorAll('svg > *').length,
                    networkElements: document.querySelectorAll('circle, rect, line, path').length
                },
                collaborationState: {
                    isCollaborativeMode: !!document.querySelector('[class*="collaborative"]'),
                    hasWebSocketConnection: !!window.WebSocket,
                    collaborationErrors: window.topologyErrors || []
                }
            };
        });

        console.log('\n📊 Post-Collaboration Analysis:');
        console.log(JSON.stringify(postCollabAnalysis, null, 2));

        // Take a screenshot for manual inspection
        await page.screenshot({ 
            path: './topology-debug-screenshot.png', 
            fullPage: true 
        });
        console.log('📸 Screenshot saved as topology-debug-screenshot.png');

        // Keep browser open for manual inspection
        console.log('\n🔍 Browser kept open for manual inspection...');
        console.log('Press Ctrl+C to close when done inspecting');
        
        // Wait indefinitely for manual inspection
        await new Promise(() => {});

    } catch (error) {
        console.error('❌ Debugging failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        if (browser) {
            // Don't close automatically - let user inspect
            // await browser.close();
        }
    }
}

// Check if puppeteer is available
try {
    require.resolve('puppeteer');
    debugCollaborationTopology();
} catch (error) {
    console.log('❌ Puppeteer not available. Installing...');
    console.log('Run: npm install puppeteer');
    console.log('\nAlternatively, use manual inspection:');
    console.log('1. Open http://localhost:3000/networkscan in browser');
    console.log('2. Open Developer Tools (F12)'); 
    console.log('3. Check Console tab for errors');
    console.log('4. Check Elements tab for SVG elements');
    console.log('5. Try loading a scan and starting collaboration');
    console.log('6. Look for topology rendering issues');
}
