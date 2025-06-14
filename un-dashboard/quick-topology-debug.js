console.log('🔍 COLLABORATION TOPOLOGY QUICK DEBUG');
console.log('='.repeat(50));

// Simple debugging script to check common topology issues
// without requiring additional dependencies

async function quickTopologyDebug() {
    console.log('🐛 Running quick topology debugging checks...\n');

    // Check 1: Verify component files exist and are valid
    console.log('📁 Checking component files...');
    
    const fs = require('fs');
    const path = require('path');
    
    const componentFiles = [
        'src/app/networkscan/components/networktopology.js',
        'src/app/networkscan/networkviews/NetworkViewManager.js',
        'src/app/networkscan/networkviews/CircularNetworkView.js',
        'src/app/networkscan/networkviews/HierarchicalNetworkView.js',
        'src/app/components/NetworkTopologyVisualization.js'
    ];
    
    componentFiles.forEach(file => {
        const fullPath = path.join(__dirname, file);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const hasCollaborationProps = content.includes('collaborativeMode') || content.includes('collaboration');
            console.log(`✅ ${file}: ${hasCollaborationProps ? 'Has collaboration props' : 'No collaboration props'}`);
            
            // Check for common issues
            if (content.includes('useEffect') && content.includes('dependencies')) {
                const effectCount = (content.match(/useEffect/g) || []).length;
                console.log(`   - useEffect hooks: ${effectCount}`);
            }
            
            if (content.includes('d3.select') || content.includes('svg')) {
                console.log(`   - Contains D3/SVG rendering: Yes`);
            }
        } else {
            console.log(`❌ ${file}: File not found`);
        }
    });

    // Check 2: Look for potential prop flow issues
    console.log('\n🔗 Checking prop flow...');
    
    const networkTopologyPath = path.join(__dirname, 'src/app/networkscan/components/networktopology.js');
    if (fs.existsSync(networkTopologyPath)) {
        const content = fs.readFileSync(networkTopologyPath, 'utf8');
        
        // Check if collaboration props are properly passed
        const collaborationProps = [
            'collaborativeMode',
            'scanId', 
            'isConnected',
            'collaborators',
            'deviceLocks',
            'onCollaborativeDeviceClick',
            'isDeviceLockedByMe',
            'isDeviceLockedByOther',
            'getDeviceLock'
        ];
        
        console.log('Collaboration props in TopologyMap:');
        collaborationProps.forEach(prop => {
            const hasProp = content.includes(prop);
            console.log(`   ${hasProp ? '✅' : '❌'} ${prop}`);
        });
    }

    // Check 3: Look for common rendering conditions
    console.log('\n🎨 Checking rendering conditions...');
    
    const viewManagerPath = path.join(__dirname, 'src/app/networkscan/networkviews/NetworkViewManager.js');
    if (fs.existsSync(viewManagerPath)) {
        const content = fs.readFileSync(viewManagerPath, 'utf8');
        
        // Check for conditional rendering that might affect topology
        const renderingChecks = [
            { pattern: /if\s*\(\s*!?devices/, description: 'Device data check' },
            { pattern: /if\s*\(\s*!?collaborativeMode/, description: 'Collaboration mode check' },
            { pattern: /dimensions\.width.*dimensions\.height/, description: 'Dimensions check' },
            { pattern: /return\s*null/, description: 'Early return conditions' },
            { pattern: /renderVisualization/, description: 'Render visualization function' }
        ];
        
        renderingChecks.forEach(check => {
            const matches = content.match(check.pattern);
            if (matches) {
                console.log(`   ✅ Found ${check.description}: ${matches.length} occurrence(s)`);
            } else {
                console.log(`   ❌ Missing ${check.description}`);
            }
        });
    }

    // Check 4: Look for error handling
    console.log('\n🚨 Checking error handling...');
    
    const circularViewPath = path.join(__dirname, 'src/app/networkscan/networkviews/CircularNetworkView.js');
    const hierarchicalViewPath = path.join(__dirname, 'src/app/networkscan/networkviews/HierarchicalNetworkView.js');
    
    [circularViewPath, hierarchicalViewPath].forEach(filePath => {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const fileName = path.basename(filePath);
            
            const errorChecks = [
                { pattern: /try\s*{/, description: 'Try-catch blocks' },
                { pattern: /console\.error/, description: 'Error logging' },
                { pattern: /if\s*\(\s*!.*devices/, description: 'Device validation' },
                { pattern: /useEffect.*\[\]/, description: 'useEffect dependencies' }
            ];
            
            console.log(`${fileName}:`);
            errorChecks.forEach(check => {
                const matches = (content.match(check.pattern) || []).length;
                console.log(`   ${matches > 0 ? '✅' : '❌'} ${check.description}: ${matches}`);
            });
        }
    });

    // Check 5: Generate debugging recommendations
    console.log('\n💡 DEBUGGING RECOMMENDATIONS:');
    console.log('='.repeat(30));
    
    console.log('1. IMMEDIATE CHECKS:');
    console.log('   - Open browser console while on /networkscan page');
    console.log('   - Look for JavaScript errors or warnings');
    console.log('   - Check if SVG elements are being created in DOM');
    console.log('   - Verify device data is loaded (check Network tab)');
    
    console.log('\n2. COLLABORATION-SPECIFIC:');
    console.log('   - Check if collaboration props are received by components');
    console.log('   - Verify WebSocket connection status');
    console.log('   - Test topology with collaboration OFF vs ON');
    console.log('   - Check if collaboration state affects rendering conditions');
    
    console.log('\n3. COMPONENT-SPECIFIC:');
    console.log('   - Add console.log in TopologyMap render method');
    console.log('   - Check NetworkViewManager props and state');
    console.log('   - Verify CircularNetworkView/HierarchicalNetworkView receive props');
    console.log('   - Check if D3 selections are working correctly');
    
    console.log('\n4. DATA FLOW:');
    console.log('   - Verify devices data structure');
    console.log('   - Check customNames localStorage');
    console.log('   - Validate scan data format');
    console.log('   - Test with minimal scan data first');
    
    console.log('\n🔧 QUICK FIXES TO TRY:');
    console.log('1. Clear browser localStorage and refresh');
    console.log('2. Disable collaboration mode temporarily');
    console.log('3. Test with a simple scan (few devices)');
    console.log('4. Check browser compatibility (try different browser)');
    console.log('5. Restart development servers');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Open http://localhost:3000/networkscan');
    console.log('2. Open Developer Tools (F12)');
    console.log('3. Navigate to Console tab');
    console.log('4. Load a scan and check for errors');
    console.log('5. Try enabling collaboration and see if topology disappears');
    console.log('6. Check Elements tab for SVG/topology DOM elements');
    
    return true;
}

quickTopologyDebug();
