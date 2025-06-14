const fs = require('fs');
const http = require('http');

// Load login data from previous test
const loginDataPath = './login-data.json';
let loginData = {};

if (fs.existsSync(loginDataPath)) {
  loginData = JSON.parse(fs.readFileSync(loginDataPath, 'utf8'));
  console.log('✓ Loaded saved login data');
} else {
  console.error('❌ No login data found. Please run authenticated-scan-test.js first');
  process.exit(1);
}

// Test data that should work with the API
const testScanData = {
  scanId: `test-scan-${Date.now()}`,
  name: "Debug Test Scan",
  ipRange: "192.168.1.0/24",
  deviceCount: 3,
  scanData: {
    devices: [
      {
        ip: "192.168.1.1",
        status: "up",
        hostname: "router.local",
        mac: "00:11:22:33:44:55",
        vendor: "Cisco",
        os: "Linux 3.x",
        ports: [22, 80, 443],
        services: [
          { port: 22, service: "ssh", state: "open" },
          { port: 80, service: "http", state: "open" },
          { port: 443, service: "https", state: "open" }
        ]
      },
      {
        ip: "192.168.1.100",
        status: "up",
        hostname: "desktop.local",
        mac: "AA:BB:CC:DD:EE:FF",
        vendor: "Dell",
        os: "Windows 10",
        ports: [135, 445],
        services: [
          { port: 135, service: "msrpc", state: "open" },
          { port: 445, service: "microsoft-ds", state: "open" }
        ]
      },
      {
        ip: "192.168.1.50",
        status: "up",
        hostname: "printer.local",
        mac: "11:22:33:44:55:66",
        vendor: "HP",
        os: "Unknown",
        ports: [80, 9100],
        services: [
          { port: 80, service: "http", state: "open" },
          { port: 9100, service: "jetdirect", state: "open" }
        ]
      }
    ],
    scanSummary: {
      totalIPs: 254,
      upHosts: 3,
      downHosts: 251,
      totalPorts: 6,
      openPorts: 6,
      scanTime: 45000
    },
    networkTopology: {
      routers: ["192.168.1.1"],
      switches: [],
      endpoints: ["192.168.1.100", "192.168.1.50"],
      connections: [
        { from: "192.168.1.1", to: "192.168.1.100", type: "ethernet" },
        { from: "192.168.1.1", to: "192.168.1.50", type: "ethernet" }
      ]
    }
  },
  metadata: {
    scanType: "full",
    scanDuration: 45000,
    osDetection: true,
    serviceDetection: true,
    ports: ["22", "80", "135", "443", "445", "9100"],
    hasNetworkTopology: true,
    vendor: "Mixed",
    deviceTypes: ["router", "desktop", "printer"]
  },
  settings: {
    isPrivate: true,
    isFavorite: false,
    tags: ["debug", "test"],
    notes: "Debug test to identify API error"
  }
};

console.log('🧪 Testing API scan save with detailed error capture...');
console.log('📊 Test Data:');
console.log(`- Scan ID: ${testScanData.scanId}`);
console.log(`- IP Range: ${testScanData.ipRange}`);
console.log(`- Device Count: ${testScanData.deviceCount}`);
console.log(`- Has Topology: ${testScanData.metadata.hasNetworkTopology}`);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/scan-history',
  method: 'POST',  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${loginData.token}`,
    'Cookie': loginData.cookieHeader || ''
  }
};

const postData = JSON.stringify(testScanData);
options.headers['Content-Length'] = Buffer.byteLength(postData);

console.log('\n🔑 Authentication:');
console.log(`- Token: ${loginData.token ? loginData.token.substring(0, 20) + '...' : 'Not found'}`);
console.log(`- Cookie: ${loginData.cookieHeader ? 'Present' : 'Not found'}`);

const req = http.request(options, (res) => {
  console.log(`\n📡 Response Status: ${res.statusCode}`);
  console.log(`📋 Response Headers:`, res.headers);

  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('\n📄 Response Body:');
    try {
      const jsonResponse = JSON.parse(responseData);
      console.log(JSON.stringify(jsonResponse, null, 2));
      
      if (res.statusCode === 201) {
        console.log('\n✅ SUCCESS: Scan saved successfully!');
      } else if (res.statusCode === 409) {
        console.log('\n⚠️  DUPLICATE: Scan with this ID already exists');
      } else if (res.statusCode === 500) {
        console.log('\n❌ SERVER ERROR: 500 Internal Server Error');
        console.log('This indicates a problem in the API endpoint code.');
      } else {
        console.log(`\n❌ ERROR: HTTP ${res.statusCode}`);
      }
    } catch (e) {
      console.log('Raw response (not JSON):', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request Error:', error.message);
  
  if (error.code === 'ECONNREFUSED') {
    console.log('\n💡 Suggestion: Make sure the application is running on port 3000');
    console.log('   Run: npm run dev');
  } else if (error.code === 'ENOTFOUND') {
    console.log('\n💡 Suggestion: Check if localhost is accessible');
  }
});

req.write(postData);
req.end();

console.log('\n⏳ Sending request to API...');
