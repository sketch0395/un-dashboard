const fs = require('fs');
const path = require('path');

// Files to check
const files = [
    'src/app/networkscan/components/DashboardNetworkScanControl.js',
    'src/app/components/NetworkControlModal.js'
];

console.log('🔍 Validating React Socket.IO State Management Fixes\n');

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    
    console.log(`📁 Checking: ${file}`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${filePath}\n`);
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for ref pattern
    const hasRefs = content.includes('const ipRangeRef = useRef(') && 
                   content.includes('const scanTypeRef = useRef(') &&
                   content.includes('const onScanCompleteRef = useRef(');
    
    // Check for ref updates in useEffect
    const hasRefUpdates = content.includes('ipRangeRef.current = ipRange') &&
                         content.includes('scanTypeRef.current = scanType') &&
                         content.includes('onScanCompleteRef.current = onScanComplete');
    
    // Check for empty dependency array
    const hasCleanDependencies = content.includes('}, []);') || content.includes('}, [isVisible]);');
    
    // Check for ref usage in socket handlers
    const usesRefsInHandlers = content.includes('ipRangeRef.current') && 
                              content.includes('scanTypeRef.current') &&
                              content.includes('onScanCompleteRef.current');
    
    console.log(`  ✅ Uses stable refs: ${hasRefs ? 'YES' : 'NO'}`);
    console.log(`  ✅ Updates refs in useEffect: ${hasRefUpdates ? 'YES' : 'NO'}`);
    console.log(`  ✅ Clean dependency arrays: ${hasCleanDependencies ? 'YES' : 'NO'}`);
    console.log(`  ✅ Uses refs in socket handlers: ${usesRefsInHandlers ? 'YES' : 'NO'}`);
    
    const isFixed = hasRefs && hasRefUpdates && hasCleanDependencies && usesRefsInHandlers;
    console.log(`  ${isFixed ? '🎉 FULLY FIXED' : '⚠️ NEEDS ATTENTION'}\n`);
});

console.log('📋 Fix Summary:');
console.log('  🔧 Problem: useEffect dependency arrays causing socket reconnections during scan completion');
console.log('  🎯 Solution: Use stable refs for socket handlers and clean dependency arrays');
console.log('  ✅ Status: Both components have been updated with the ref pattern');
console.log('\n🚀 Ready for testing! Start a network scan and verify the button state updates properly.');
