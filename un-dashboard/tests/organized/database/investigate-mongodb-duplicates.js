// Investigation script for MongoDB scan duplication and topology visualization issues
// Date: June 9, 2025

const fs = require('fs');
const path = require('path');

console.log('=== MongoDB Scan Duplication & Topology Visualization Investigation ===\n');

// 1. Analyze the scan history component for potential duplication causes
console.log('1. ANALYZING SCAN HISTORY COMPONENT:');

const networkScanHistoryPath = path.join(__dirname, 'src/app/networkscan/components/networkscanhistory.js');
if (fs.existsSync(networkScanHistoryPath)) {
    const content = fs.readFileSync(networkScanHistoryPath, 'utf8');
    
    // Check for potential race conditions in save logic
    const saveLogicMatches = content.match(/saveScanHistory[\s\S]*?(?=const|$)/g);
    if (saveLogicMatches) {
        console.log('✓ Found saveScanHistory function');
        
        // Check for duplicate detection logic
        const duplicateCheckMatches = content.match(/isDuplicate.*?=.*?prev\.some/g);
        if (duplicateCheckMatches) {
            console.log('✓ Found duplicate detection logic');
            console.log('  - Logic:', duplicateCheckMatches[0].substring(0, 100) + '...');
        } else {
            console.log('⚠ No duplicate detection logic found in saveScanHistory');
        }
        
        // Check for database save timing
        const dbSaveMatches = content.match(/setTimeout.*?saveScanToDatabase/g);
        if (dbSaveMatches) {
            console.log('✓ Found async database save with setTimeout');
            console.log('  - This could cause timing issues if multiple scans complete quickly');
        }
    }
    
    // Check for visualizeOnTopology function
    const visualizeMatches = content.match(/visualizeOnTopology[\s\S]*?(?=const|$)/g);
    if (visualizeMatches) {
        console.log('✓ Found visualizeOnTopology function');
        
        // Check for data format conversion
        const dataConversionMatches = content.match(/Object\.values\(entry\.data.*?\)\.flat\(\)/g);
        if (dataConversionMatches) {
            console.log('✓ Found data format conversion logic');
            console.log('  - Converting:', dataConversionMatches[0]);
        }
        
        // Check for database vs localStorage handling
        const dbDataMatches = content.match(/isFromDatabase/g);
        if (dbDataMatches) {
            console.log('✓ Found database vs localStorage differentiation');
            console.log('  - Found', dbDataMatches.length, 'references to isFromDatabase flag');
        }
    }
} else {
    console.log('❌ networkscanhistory.js not found');
}

console.log('\n2. ANALYZING API ROUTE FOR DUPLICATE PREVENTION:');

const apiRoutePath = path.join(__dirname, 'src/app/api/scan-history/route.js');
if (fs.existsSync(apiRoutePath)) {
    const content = fs.readFileSync(apiRoutePath, 'utf8');
    
    // Check for duplicate checking logic
    const duplicateCheckMatches = content.match(/findOne.*?scanId/g);
    if (duplicateCheckMatches) {
        console.log('✓ Found database duplicate checking');
        console.log('  - Logic:', duplicateCheckMatches[0]);
    }
    
    // Check for 409 status code return
    const conflictMatches = content.match(/status.*?409/g);
    if (conflictMatches) {
        console.log('✓ Found 409 conflict status return for duplicates');
    }
} else {
    console.log('❌ API route not found');
}

console.log('\n3. ANALYZING POTENTIAL ISSUES:');

console.log('ISSUE 1 - MongoDB Scan Duplication:');
console.log('  Possible causes:');
console.log('  a) Race condition between frontend duplicate check and database save');
console.log('  b) Multiple scan completions firing simultaneously');
console.log('  c) Socket reconnection causing duplicate scan events');
console.log('  d) Frontend duplicate check using time+data comparison vs DB using scanId');

console.log('\nISSUE 2 - Topology Visualization for Database Scans:');
console.log('  Possible causes:');
console.log('  a) Data format mismatch between localStorage and database formats');
console.log('  b) Missing scanSource information in database-loaded scans');
console.log('  c) Custom properties not being applied correctly to database scans');
console.log('  d) Topology component expecting different data structure');

console.log('\n4. RECOMMENDED INVESTIGATION STEPS:');
console.log('  1. Add detailed logging to saveScanHistory and saveScanToDatabase');
console.log('  2. Compare data structure between localStorage and database scans');
console.log('  3. Check topology visualization data flow for database vs fresh scans');
console.log('  4. Verify scanId generation and uniqueness');
console.log('  5. Test database scan loading and topology rendering');

console.log('\n5. PROPOSED SOLUTIONS:');
console.log('  FOR DUPLICATION:');
console.log('    - Add scanId-based duplicate check in frontend before time-based check');
console.log('    - Implement proper mutex/lock for scan saving');
console.log('    - Add scan completion debouncing');
console.log('    - Better error handling for 409 conflicts');
console.log('\n  FOR TOPOLOGY:');
console.log('    - Ensure consistent data format between database and localStorage');
console.log('    - Add missing scanSource metadata to database scans');
console.log('    - Debug topology component data requirements');
console.log('    - Add data validation and transformation utilities');

console.log('\n=== Investigation Complete ===');
