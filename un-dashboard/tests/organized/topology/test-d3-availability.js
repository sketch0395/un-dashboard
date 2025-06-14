// Quick test to verify D3.js availability and TopologyDebugger functionality
console.log('🔍 D3.js availability test');

// Test 1: Check if D3 is available in the global scope
if (typeof window !== 'undefined' && window.d3) {
    console.log('✅ D3.js is available globally');
    console.log('📊 D3.js version:', window.d3.version);
} else {
    console.log('❌ D3.js is NOT available globally');
}

// Test 2: Try to import D3 as a module
try {
    const d3 = require('d3');
    console.log('✅ D3.js can be imported via require');
    console.log('📊 D3.js version via require:', d3.version);
} catch (error) {
    console.log('❌ D3.js cannot be imported via require:', error.message);
}

// Test 3: Check if TopologyDebugger component exists
setTimeout(() => {
    if (typeof document !== 'undefined') {
        const debugElement = document.querySelector('div[style*="position: fixed"][style*="top: 10px"]');
        if (debugElement) {
            console.log('✅ TopologyDebugger found in DOM');
            console.log('📝 TopologyDebugger content:', debugElement.textContent);
        } else {
            console.log('❌ TopologyDebugger NOT found in DOM');
        }
        
        const svgElements = document.querySelectorAll('svg');
        console.log('🎨 SVG elements found:', svgElements.length);
        
        if (svgElements.length > 0) {
            console.log('✅ SVG elements are present - topology might be rendering');
        } else {
            console.log('❌ No SVG elements found - topology is not rendering');
        }
    }
}, 2000);
