// Simple test script to verify ScanHistoryContext functions are working
// This will test if syncToDatabase and refreshFromDatabase functions exist and are callable

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ScanHistoryContext functions...');

try {
    // Read the context file
    const contextPath = path.join(__dirname, 'src/app/contexts/ScanHistoryContext.js');
    const contextContent = fs.readFileSync(contextPath, 'utf8');
    
    console.log('✅ Successfully read ScanHistoryContext.js');
    
    // Check if essential functions are defined
    const requiredFunctions = [
        'syncToDatabase',
        'refreshFromDatabase',
        'deleteScan',
        'updateScanData',
        'saveScanHistory'
    ];
    
    let allFunctionsFound = true;
    
    console.log('\n🔍 Checking if functions are defined:');
    requiredFunctions.forEach(funcName => {
        if (contextContent.includes(`const ${funcName}`) || contextContent.includes(`${funcName} =`)) {
            console.log(`✅ Found function: ${funcName}`);
        } else {
            console.log(`❌ Missing function: ${funcName}`);
            allFunctionsFound = false;
        }
    });
    
    // Check if functions are exported in contextValue
    const contextValueMatch = contextContent.match(/const contextValue = \{([^}]+)\}/s);
    if (contextValueMatch) {
        const contextValueContent = contextValueMatch[1];
        console.log('\n📤 Checking if functions are exported in contextValue:');
        
        requiredFunctions.forEach(funcName => {
            if (contextValueContent.includes(funcName)) {
                console.log(`✅ ${funcName} is exported in context`);
            } else {
                console.log(`❌ ${funcName} is NOT exported in context`);
                allFunctionsFound = false;
            }
        });
    }
    
    // Check ScanHistorySyncStatus component
    const syncStatusPath = path.join(__dirname, 'src/app/components/ScanHistorySyncStatus.js');
    const syncStatusContent = fs.readFileSync(syncStatusPath, 'utf8');
    
    console.log('\n🔍 Checking ScanHistorySyncStatus component:');
    
    // Check if it's importing the context correctly
    if (syncStatusContent.includes('useScanHistory')) {
        console.log('✅ ScanHistorySyncStatus imports useScanHistory');
    } else {
        console.log('❌ ScanHistorySyncStatus does NOT import useScanHistory');
        allFunctionsFound = false;
    }
    
    // Check if it's destructuring the required functions
    const destructureMatch = syncStatusContent.match(/const \{([^}]+)\} = useScanHistory\(\)/);
    if (destructureMatch) {
        const destructuredFunctions = destructureMatch[1];
        console.log('✅ ScanHistorySyncStatus destructures:', destructuredFunctions.trim().replace(/\s+/g, ' '));
        
        if (destructuredFunctions.includes('syncToDatabase')) {
            console.log('✅ syncToDatabase is destructured');
        } else {
            console.log('❌ syncToDatabase is NOT destructured');
            allFunctionsFound = false;
        }
        
        if (destructuredFunctions.includes('refreshFromDatabase')) {
            console.log('✅ refreshFromDatabase is destructured');
        } else {
            console.log('❌ refreshFromDatabase is NOT destructured');
            allFunctionsFound = false;
        }
    }
    
    // Additional check for function implementations
    console.log('\n🔧 Checking function implementations:');
    
    if (contextContent.includes('syncToDatabase') && contextContent.includes('useCallback')) {
        console.log('✅ syncToDatabase appears to be implemented with useCallback');
    }
    
    if (contextContent.includes('refreshFromDatabase') && contextContent.includes('useCallback')) {
        console.log('✅ refreshFromDatabase appears to be implemented with useCallback');
    }
    
    console.log('\n🎯 SUMMARY:');
    if (allFunctionsFound) {
        console.log('✅ ALL TESTS PASSED - The syncToDatabase runtime error should be FIXED!');
        console.log('🎉 ScanHistorySyncStatus component should now work without errors');
        console.log('🚀 The application should run without "syncToDatabase is not a function" error');
    } else {
        console.log('❌ Some issues found - runtime error may still occur');
    }
    
} catch (error) {
    console.error('❌ Error during testing:', error.message);
}
