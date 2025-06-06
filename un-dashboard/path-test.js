// Test script to verify the correct relative path from download route
const path = require('path');

// Simulate the path from download route to root
const downloadRoutePath = 'src/app/api/scans/shared/[id]/download/route.js';
const rootPath = '.';

// Calculate relative path
const downloadDir = path.dirname(downloadRoutePath);
const relativePath = path.relative(downloadDir, rootPath);

console.log('Download route directory:', downloadDir);
console.log('Relative path to root:', relativePath);
console.log('Relative path with forward slashes:', relativePath.replace(/\\/g, '/'));

// Count the number of ../ needed
const levels = relativePath.split(path.sep).length;
console.log('Number of levels up:', levels);
console.log('Required path prefix:', '../'.repeat(levels));
