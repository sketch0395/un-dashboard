// Simple test to check if servers are running
const http = require('http');

console.log('Checking port 3000...');
const options3000 = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
    timeout: 2000
};

const req3000 = http.request(options3000, (res) => {
    console.log('✅ Port 3000 is responding:', res.statusCode);
}).on('error', (err) => {
    console.log('❌ Port 3000 error:', err.message);
});

req3000.end();

console.log('Checking port 4000...');
const options4000 = {
    hostname: 'localhost',
    port: 4000,
    path: '/',
    method: 'GET',
    timeout: 2000
};

const req4000 = http.request(options4000, (res) => {
    console.log('✅ Port 4000 is responding:', res.statusCode);
}).on('error', (err) => {
    console.log('❌ Port 4000 error:', err.message);
});

req4000.end();
