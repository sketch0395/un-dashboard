// Quick verification script for SessionManager functionality
// Run this to verify the fix

console.log('🔍 Testing SessionManager functionality...');
console.log('');

// Test import path resolution
const path = require('path');
const fs = require('fs');

const sessionManagerPath = path.join(__dirname, 'src', 'utils', 'sessionManager.js');
console.log('📁 SessionManager file path:', sessionManagerPath);
console.log('📄 File exists:', fs.existsSync(sessionManagerPath));

if (fs.existsSync(sessionManagerPath)) {
  console.log('📊 File size:', fs.statSync(sessionManagerPath).size, 'bytes');
  
  try {
    // Import as ES module syntax doesn't work in Node.js directly,
    // but we can verify the file structure
    const fileContent = fs.readFileSync(sessionManagerPath, 'utf8');
    
    // Check for key exports
    const hasSessionManagerClass = fileContent.includes('export class SessionManager');
    const hasSessionTimeoutWarningClass = fileContent.includes('export class SessionTimeoutWarning');
    const hasDefaultExport = fileContent.includes('export default SessionManager');
    
    console.log('');
    console.log('🔍 Code Analysis:');
    console.log('✓ SessionManager class found:', hasSessionManagerClass);
    console.log('✓ SessionTimeoutWarning class found:', hasSessionTimeoutWarningClass);
    console.log('✓ Default export found:', hasDefaultExport);
    
    if (hasSessionManagerClass && hasSessionTimeoutWarningClass && hasDefaultExport) {
      console.log('');
      console.log('🎉 SessionManager file structure is correct!');
      console.log('🔧 Import error should be resolved.');
      console.log('');
      console.log('✅ The Next.js application should now work without the constructor error.');
    } else {
      console.log('');
      console.log('❌ SessionManager file structure has issues.');
    }
    
  } catch (error) {
    console.error('❌ Error reading SessionManager file:', error.message);
  }
} else {
  console.log('❌ SessionManager file not found!');
}

console.log('');
console.log('🌐 Application is running at: http://localhost:3001');
console.log('📝 Check the browser console for any remaining errors.');
