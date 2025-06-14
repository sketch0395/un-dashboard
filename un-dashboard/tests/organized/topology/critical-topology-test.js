// CRITICAL TOPOLOGY TEST - Copy to browser console
// This test focuses on identifying specific visualization and duplication issues

console.log('🚨 CRITICAL TOPOLOGY VISUALIZATION TEST');
console.log('==========================================');

// Test configuration
const TEST_CONFIG = {
    scanId: "critical-test-" + Date.now(),
    name: "Critical Test - Issues Detection",
    ipRange: "192.168.200.0/24",
    deviceCount: 4
};

// Minimal but complete test topology
const criticalTestData = {
    ...TEST_CONFIG,
    scanData: [
        {
            ip: "192.168.200.1",
            mac: "00:AA:BB:00:00:01",
            hostname: "test-gateway",
            vendor: "Cisco",
            openPorts: [22, 80],
            deviceType: "router",
            gateway: true,
            connections: ["192.168.200.10"]
        },
        {
            ip: "192.168.200.10",
            mac: "00:AA:BB:00:00:02", 
            hostname: "test-switch",
            vendor: "HP",
            openPorts: [22, 161],
            deviceType: "switch",
            connectedTo: "192.168.200.1",
            connections: ["192.168.200.100", "192.168.200.101"]
        },
        {
            ip: "192.168.200.100",
            mac: "00:AA:BB:00:00:03",
            hostname: "test-server",
            vendor: "Dell", 
            openPorts: [22, 80, 443],
            deviceType: "server",
            connectedTo: "192.168.200.10"
        },
        {
            ip: "192.168.200.101",
            mac: "00:AA:BB:00:00:04",
            hostname: "test-workstation",
            vendor: "HP",
            openPorts: [22, 3389],
            deviceType: "workstation", 
            connectedTo: "192.168.200.10"
        }
    ]
};

// Issue detection functions
function detectDuplicationIssues() {
    console.log('\n🔍 CHECKING FOR DUPLICATION ISSUES...');
    
    // Check scan history for duplicates
    const historyItems = document.querySelectorAll('.scan-history-item, button[data-scan-id], .scan-item');
    const scanNames = Array.from(historyItems).map(item => {
        return (item.textContent || item.innerText || '').trim();
    }).filter(text => text.length > 0);
    
    const nameCounts = {};
    scanNames.forEach(name => {
        nameCounts[name] = (nameCounts[name] || 0) + 1;
    });
    
    const duplicates = Object.entries(nameCounts).filter(([name, count]) => count > 1);
    
    if (duplicates.length > 0) {
        console.log('❌ FOUND DUPLICATE SCANS:');
        duplicates.forEach(([name, count]) => {
            console.log(`  "${name}": appears ${count} times`);
        });
        return true;
    } else {
        console.log('✅ No duplicate scans detected');
        return false;
    }
}

function detectVisualizationIssues() {
    console.log('\n🎨 CHECKING VISUALIZATION RENDERING...');
    
    const issues = [];
    
    // Check for SVG container
    const svg = document.querySelector('svg');
    if (!svg) {
        issues.push('Missing SVG container');
        console.log('❌ No SVG container found');
    } else {
        console.log('✅ SVG container present');
        
        // Check SVG dimensions
        const rect = svg.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            issues.push('SVG has zero dimensions');
            console.log('❌ SVG has zero dimensions');
        } else {
            console.log(`✅ SVG dimensions: ${rect.width}x${rect.height}`);
        }
    }
    
    // Check for device nodes
    const nodes = document.querySelectorAll('.node, .device-node, circle[data-device], g[data-device]');
    console.log(`📊 Device nodes found: ${nodes.length}`);
    
    if (nodes.length === 0) {
        issues.push('No device nodes rendered');
        console.log('❌ No device nodes found');
    }
    
    // Check for connection links
    const links = document.querySelectorAll('.link, .connection, line[data-connection], path[data-connection]');
    console.log(`🔗 Connection links found: ${links.length}`);
    
    if (links.length === 0) {
        issues.push('No connection links rendered');
        console.log('❌ No connection links found');
    }
    
    // Check for topology container
    const container = document.querySelector('.network-topology, [data-testid*="network"], .topology-container');
    if (!container) {
        issues.push('Missing topology container');
        console.log('❌ No topology container found');
    } else {
        console.log('✅ Topology container present');
    }
    
    return issues;
}

function detectViewSwitchingIssues() {
    console.log('\n🔄 CHECKING VIEW SWITCHING...');
    
    const issues = [];
    
    // Look for view toggle buttons
    const allButtons = document.querySelectorAll('button');
    const viewButtons = Array.from(allButtons).filter(btn => {
        const text = (btn.textContent || '').toLowerCase();
        return text.includes('circular') || text.includes('hierarchical') || 
               text.includes('view') || btn.dataset.view;
    });
    
    console.log(`🔘 View toggle buttons found: ${viewButtons.length}`);
    
    if (viewButtons.length === 0) {
        issues.push('No view toggle buttons found');
        console.log('❌ No view switching buttons detected');
    } else {
        viewButtons.forEach((btn, i) => {
            console.log(`  ${i+1}. "${(btn.textContent || '').trim()}"`);
        });
    }
    
    return issues;
}

function detectDataProcessingIssues() {
    console.log('\n💾 CHECKING DATA PROCESSING...');
    
    const issues = [];
    
    // Check localStorage for device data
    const customNames = localStorage.getItem('customDeviceNames');
    if (customNames) {
        try {
            const parsed = JSON.parse(customNames);
            console.log(`✅ Custom device data: ${Object.keys(parsed).length} devices`);
        } catch (e) {
            issues.push('Invalid custom device data in localStorage');
            console.log('❌ Invalid custom device data format');
        }
    } else {
        console.log('ℹ️  No custom device data found (may be normal)');
    }
    
    // Check for error messages in DOM
    const errorElements = document.querySelectorAll('.error, .alert-danger, [class*="error"], [class*="warning"]');
    if (errorElements.length > 0) {
        console.log(`⚠️  Found ${errorElements.length} error/warning elements:`);
        errorElements.forEach((el, i) => {
            const text = (el.textContent || '').trim();
            if (text) {
                console.log(`  ${i+1}. ${text}`);
                issues.push(`UI Error: ${text}`);
            }
        });
    } else {
        console.log('✅ No error messages in UI');
    }
    
    return issues;
}

// Main test execution
async function runCriticalTest() {
    console.log('\n🚀 STARTING CRITICAL TEST EXECUTION...');
    
    try {
        // Step 1: Submit test data
        console.log('\n📤 SUBMITTING TEST DATA...');
        const response = await fetch('/api/scan-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(criticalTestData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            console.error('❌ FAILED TO SUBMIT TEST DATA:', result);
            return { success: false, error: result };
        }
        
        console.log('✅ TEST DATA SUBMITTED SUCCESSFULLY');
        console.log(`📋 Scan ID: ${TEST_CONFIG.scanId}`);
        
        // Step 2: Wait for UI update
        console.log('\n⏳ WAITING FOR UI UPDATE...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 3: Run issue detection
        console.log('\n🔍 RUNNING ISSUE DETECTION...');
        
        const duplicationIssues = detectDuplicationIssues();
        const visualizationIssues = detectVisualizationIssues();
        const viewSwitchingIssues = detectViewSwitchingIssues();
        const dataProcessingIssues = detectDataProcessingIssues();
        
        // Step 4: Generate comprehensive report
        console.log('\n📊 CRITICAL TEST RESULTS SUMMARY');
        console.log('='.repeat(50));
        
        const allIssues = [
            ...visualizationIssues.map(issue => `Visualization: ${issue}`),
            ...viewSwitchingIssues.map(issue => `View Switching: ${issue}`),
            ...dataProcessingIssues.map(issue => `Data Processing: ${issue}`)
        ];
        
        if (duplicationIssues) {
            allIssues.push('Duplication: Duplicate scans detected');
        }
        
        if (allIssues.length === 0) {
            console.log('🎉 NO CRITICAL ISSUES DETECTED!');
            console.log('✅ Topology visualization appears to be working correctly');
        } else {
            console.log('❌ CRITICAL ISSUES DETECTED:');
            allIssues.forEach((issue, i) => {
                console.log(`  ${i+1}. ${issue}`);
            });
        }
        
        // Step 5: Generate next steps
        console.log('\n🎯 RECOMMENDED NEXT STEPS:');
        
        if (allIssues.length === 0) {
            console.log('1. ✅ System appears healthy - perform additional stress testing');
            console.log('2. 🧪 Test with larger topology datasets');
            console.log('3. 🔄 Test rapid scan creation/deletion');
        } else {
            console.log('1. 🔧 Focus on fixing the identified issues');
            console.log('2. 📋 Check browser console for JavaScript errors');
            console.log('3. 🧬 Examine React component state and props');
            console.log('4. 💾 Verify database data integrity');
        }
        
        console.log('\n✨ CRITICAL TEST COMPLETED');
        
        return {
            success: true,
            scanId: TEST_CONFIG.scanId,
            issues: allIssues,
            duplicationDetected: duplicationIssues
        };
        
    } catch (error) {
        console.error('💥 CRITICAL ERROR DURING TEST:', error);
        return { success: false, error: error.message };
    }
}

// Auto-execute the critical test
console.log('⏰ Starting critical test in 3 seconds...');
console.log('🎯 Focus: Duplication and visualization issues');

setTimeout(() => {
    runCriticalTest().then(result => {
        console.log('\n🏁 CRITICAL TEST EXECUTION COMPLETE');
        console.log('Result:', result);
    });
}, 3000);
