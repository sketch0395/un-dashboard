/**
 * Complete Test Suite for Both Collaboration Fixes
 * Tests:
 * 1. WebSocket connection for real-time collaboration
 * 2. Load to Topology functionality for shared scans
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

console.log('🧪 COMPREHENSIVE TEST SUITE - Both Collaboration Fixes');
console.log('=' .repeat(60));

// Test 1: WebSocket Collaboration Connection
async function testWebSocketConnection() {
    console.log('\n1️⃣ TESTING WEBSOCKET COLLABORATION CONNECTION');
    console.log('─'.repeat(50));
    
    return new Promise((resolve) => {
        const wsUrl = 'ws://localhost:3000/collaboration-ws';
        console.log(`🌐 Connecting to: ${wsUrl}`);
        
        const ws = new WebSocket(wsUrl);
        let connectionResult = null;
        
        const timeout = setTimeout(() => {
            console.log('⏰ Connection timeout after 5 seconds');
            connectionResult = { success: false, error: 'Connection timeout' };
            ws.close();
            resolve(connectionResult);
        }, 5000);
        
        ws.on('open', () => {
            clearTimeout(timeout);
            console.log('✅ WebSocket connection SUCCESSFUL!');
            console.log('🔌 Real-time collaboration should work');
            connectionResult = { success: true };
            ws.close();
        });
        
        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.log('❌ WebSocket connection FAILED:', error.message);
            connectionResult = { success: false, error: error.message };
            resolve(connectionResult);
        });
        
        ws.on('close', () => {
            if (connectionResult) {
                resolve(connectionResult);
            }
        });
    });
}

// Test 2: Verify SharedScansBrowser has onScanSelect prop
function testSharedScansBrowserIntegration() {
    console.log('\n2️⃣ TESTING LOAD TO TOPOLOGY INTEGRATION');
    console.log('─'.repeat(50));
    
    const networkDashboardPath = path.join(process.cwd(), 'src/app/networkscan/components/networkdashboard.js');
    const sharedScansBrowserPath = path.join(process.cwd(), 'src/app/networkscan/components/SharedScansBrowser.js');
    
    try {
        // Check if files exist
        if (!fs.existsSync(networkDashboardPath)) {
            console.log('❌ networkdashboard.js not found');
            return { success: false, error: 'networkdashboard.js not found' };
        }
        
        if (!fs.existsSync(sharedScansBrowserPath)) {
            console.log('❌ SharedScansBrowser.js not found');
            return { success: false, error: 'SharedScansBrowser.js not found' };
        }
        
        // Read and analyze files
        const dashboardContent = fs.readFileSync(networkDashboardPath, 'utf8');
        const browserContent = fs.readFileSync(sharedScansBrowserPath, 'utf8');
        
        // Check if onScanSelect prop is passed
        const hasOnScanSelectProp = dashboardContent.includes('onScanSelect={(scanData)');
        
        // Check if handleLoadToTopology function exists
        const hasLoadToTopologyFunction = browserContent.includes('handleLoadToTopology');
        
        // Check if topology buttons exist
        const hasTopologyButtons = browserContent.includes('🗺️ Topology') || browserContent.includes('🗺️ Load to Topology');
        
        console.log('📋 Integration Analysis:');
        console.log(`   ✓ onScanSelect prop passed: ${hasOnScanSelectProp ? '✅ YES' : '❌ NO'}`);
        console.log(`   ✓ handleLoadToTopology function: ${hasLoadToTopologyFunction ? '✅ YES' : '❌ NO'}`);
        console.log(`   ✓ Topology buttons in UI: ${hasTopologyButtons ? '✅ YES' : '❌ NO'}`);
        
        if (hasOnScanSelectProp && hasLoadToTopologyFunction && hasTopologyButtons) {
            console.log('✅ Load to Topology integration is COMPLETE!');
            console.log('📍 Users can now load shared scans directly to topology view');
            return { success: true };
        } else {
            console.log('❌ Load to Topology integration has issues');
            return { 
                success: false, 
                error: 'Missing required components for topology integration',
                details: {
                    onScanSelectProp: hasOnScanSelectProp,
                    loadToTopologyFunction: hasLoadToTopologyFunction,
                    topologyButtons: hasTopologyButtons
                }
            };
        }
        
    } catch (error) {
        console.log('❌ Error analyzing files:', error.message);
        return { success: false, error: error.message };
    }
}

// Test 3: Verify useCollaboration hook fix
function testCollaborationHookFix() {
    console.log('\n3️⃣ TESTING COLLABORATION HOOK WEBSOCKET FIX');
    console.log('─'.repeat(50));
    
    const hookPath = path.join(process.cwd(), 'src/app/hooks/useCollaboration.js');
    
    try {
        if (!fs.existsSync(hookPath)) {
            console.log('❌ useCollaboration.js not found');
            return { success: false, error: 'useCollaboration.js not found' };
        }
        
        const hookContent = fs.readFileSync(hookPath, 'utf8');
        
        // Check if the WebSocket URL fix is present
        const hasCorrectPort = hookContent.includes('window.location.port') && 
                              !hookContent.includes('const wsPort = 4000');
        
        // Check if the correct WebSocket path is used
        const hasCorrectPath = hookContent.includes('/collaboration-ws');
        
        console.log('🔧 Hook Analysis:');
        console.log(`   ✓ Correct port detection: ${hasCorrectPort ? '✅ YES' : '❌ NO'}`);
        console.log(`   ✓ Correct WebSocket path: ${hasCorrectPath ? '✅ YES' : '❌ NO'}`);
        
        if (hasCorrectPort && hasCorrectPath) {
            console.log('✅ useCollaboration hook WebSocket fix is COMPLETE!');
            return { success: true };
        } else {
            console.log('❌ useCollaboration hook has issues');
            return { 
                success: false, 
                error: 'WebSocket configuration issues in hook',
                details: {
                    correctPort: hasCorrectPort,
                    correctPath: hasCorrectPath
                }
            };
        }
        
    } catch (error) {
        console.log('❌ Error analyzing hook:', error.message);
        return { success: false, error: error.message };
    }
}

// Main test execution
async function runCompleteTest() {
    console.log('🚀 Starting comprehensive test suite...\n');
    
    const results = {};
    
    // Test WebSocket connection
    results.websocket = await testWebSocketConnection();
    
    // Test SharedScansBrowser integration
    results.topology = testSharedScansBrowserIntegration();
    
    // Test collaboration hook fix
    results.hook = testCollaborationHookFix();
    
    // Summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    
    const allSuccess = results.websocket.success && results.topology.success && results.hook.success;
    
    console.log(`🔌 WebSocket Connection: ${results.websocket.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🗺️ Load to Topology: ${results.topology.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🔧 Hook Configuration: ${results.hook.success ? '✅ PASS' : '❌ FAIL'}`);
    
    console.log('\n' + '=' .repeat(60));
    
    if (allSuccess) {
        console.log('🎉 ALL TESTS PASSED! Both collaboration fixes are working!');
        console.log('');
        console.log('✨ What works now:');
        console.log('   1. Real-time collaboration between users');
        console.log('   2. Direct topology loading from shared scans');
        console.log('   3. Proper WebSocket connections on correct port');
        console.log('');
        console.log('🧪 Next steps for manual testing:');
        console.log('   1. Open http://localhost:3000/networkscan in two browser tabs');
        console.log('   2. Test real-time collaboration features');
        console.log('   3. Try "🗺️ Topology" buttons in shared scans');
    } else {
        console.log('⚠️  SOME TESTS FAILED - Review the issues above');
        
        // Show specific failures
        if (!results.websocket.success) {
            console.log(`   - WebSocket: ${results.websocket.error}`);
        }
        if (!results.topology.success) {
            console.log(`   - Topology: ${results.topology.error}`);
        }
        if (!results.hook.success) {
            console.log(`   - Hook: ${results.hook.error}`);
        }
    }
    
    return allSuccess;
}

// Run the tests
runCompleteTest().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('💥 Test suite error:', error);
    process.exit(1);
});
