const http = require('http');
const fs = require('fs');

console.log('🔐 Complete Authentication and Scan Save Test');
console.log('='.repeat(50));

// Step 1: Login to get authentication token
async function login() {
  return new Promise((resolve, reject) => {
    const loginData = {
      username: 'admin',
      password: 'admin123'
    };

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    console.log('🔑 Step 1: Performing login...');
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`📡 Login Response Status: ${res.statusCode}`);
        
        try {
          const jsonResponse = JSON.parse(responseData);
          
          if (res.statusCode === 200) {
            console.log('✅ Login successful!');
            console.log(`👤 User: ${jsonResponse.user?.username}`);
            
            // Extract token and cookies
            const token = jsonResponse.token;
            const setCookieHeader = res.headers['set-cookie'];
            let authCookie = '';
            
            if (setCookieHeader) {
              const authCookieMatch = setCookieHeader.find(cookie => 
                cookie.startsWith('auth-token=')
              );
              if (authCookieMatch) {
                authCookie = authCookieMatch.split(';')[0];
              }
            }
            
            resolve({
              token: token,
              cookieHeader: authCookie,
              user: jsonResponse.user
            });
          } else {
            console.log('❌ Login failed:', jsonResponse);
            reject(new Error(`Login failed: ${jsonResponse.error}`));
          }
        } catch (e) {
          console.log('❌ Invalid JSON response:', responseData);
          reject(new Error('Invalid login response'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Login request error:', error.message);
      reject(error);
    });

    req.write(JSON.stringify(loginData));
    req.end();
  });
}

// Step 2: Save scan using authentication token
async function saveScan(authData) {
  return new Promise((resolve, reject) => {
    const testScanData = {
      scanId: `test-scan-${Date.now()}`,
      name: "Complete Auth Test Scan",
      ipRange: "192.168.1.0/24",
      deviceCount: 2,
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
          }
        ],
        scanSummary: {
          totalIPs: 254,
          upHosts: 2,
          downHosts: 252,
          totalPorts: 5,
          openPorts: 5,
          scanTime: 30000
        },
        networkTopology: {
          routers: ["192.168.1.1"],
          switches: [],
          endpoints: ["192.168.1.100"],
          connections: [
            { from: "192.168.1.1", to: "192.168.1.100", type: "ethernet" }
          ]
        }
      },
      metadata: {
        scanType: "full",
        scanDuration: 30000,
        osDetection: true,
        serviceDetection: true,
        ports: ["22", "80", "135", "443", "445"],
        hasNetworkTopology: true,
        vendor: "Mixed",
        deviceTypes: ["router", "desktop"]
      },
      settings: {
        isPrivate: true,
        isFavorite: false,
        tags: ["auth-test", "complete"],
        notes: "Complete authentication test scan"
      }
    };

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/scan-history',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`,
        'Cookie': authData.cookieHeader || ''
      }
    };

    console.log('\n💾 Step 2: Saving scan with authentication...');
    console.log(`📊 Scan ID: ${testScanData.scanId}`);
    console.log(`🔑 Using Token: ${authData.token ? authData.token.substring(0, 20) + '...' : 'None'}`);
    console.log(`🍪 Using Cookie: ${authData.cookieHeader ? 'Present' : 'None'}`);

    const postData = JSON.stringify(testScanData);
    options.headers['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`\n📡 Scan Save Response Status: ${res.statusCode}`);
        
        try {
          const jsonResponse = JSON.parse(responseData);
          
          if (res.statusCode === 201) {
            console.log('✅ SUCCESS: Scan saved successfully!');
            console.log(`📝 Saved Scan ID: ${jsonResponse.scanId}`);
            console.log(`📅 Created At: ${jsonResponse.createdAt}`);
            console.log(`👤 User ID: ${jsonResponse.userId}`);
            resolve(jsonResponse);
          } else if (res.statusCode === 409) {
            console.log('⚠️ DUPLICATE: Scan with this ID already exists');
            resolve({ status: 'duplicate', data: jsonResponse });
          } else {
            console.log('❌ ERROR:', jsonResponse);
            reject(new Error(`Scan save failed: ${jsonResponse.error}`));
          }
        } catch (e) {
          console.log('❌ Invalid JSON response:', responseData);
          reject(new Error('Invalid scan save response'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Scan save request error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Step 3: Verify scan was saved by fetching scan history
async function verifyScan(authData) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/scan-history?limit=5',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.token}`,
        'Cookie': authData.cookieHeader || ''
      }
    };

    console.log('\n🔍 Step 3: Verifying scan was saved...');

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`📡 Verification Response Status: ${res.statusCode}`);
        
        try {
          const jsonResponse = JSON.parse(responseData);
          
          if (res.statusCode === 200) {
            console.log('✅ Scan history retrieved successfully!');
            console.log(`📊 Total Scans: ${jsonResponse.pagination?.totalCount || 0}`);
            
            if (jsonResponse.scanHistory && jsonResponse.scanHistory.length > 0) {
              console.log('\n📋 Recent Scans:');
              jsonResponse.scanHistory.slice(0, 3).forEach((scan, index) => {
                console.log(`  ${index + 1}. ${scan.name} (${scan.scanId})`);
                console.log(`     IP Range: ${scan.ipRange}, Devices: ${scan.deviceCount}`);
                console.log(`     Created: ${new Date(scan.createdAt).toLocaleString()}`);
              });
            }
            
            resolve(jsonResponse);
          } else {
            console.log('❌ ERROR:', jsonResponse);
            reject(new Error(`Verification failed: ${jsonResponse.error}`));
          }
        } catch (e) {
          console.log('❌ Invalid JSON response:', responseData);
          reject(new Error('Invalid verification response'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Verification request error:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Main execution
async function runCompleteTest() {
  try {
    // Step 1: Login
    const authData = await login();
    
    // Save login data for future use
    const loginDataForSave = {
      username: 'admin',
      password: 'admin123',
      token: authData.token,
      cookieHeader: authData.cookieHeader
    };
    
    fs.writeFileSync('./login-data.json', JSON.stringify(loginDataForSave, null, 2));
    console.log('💾 Login data saved for future tests');
    
    // Step 2: Save scan
    const scanResult = await saveScan(authData);
    
    // Step 3: Verify scan
    const verificationResult = await verifyScan(authData);
    
    console.log('\n🎉 COMPLETE SUCCESS!');
    console.log('✅ All steps completed successfully');
    console.log('✅ Authentication working');
    console.log('✅ Scan save working');
    console.log('✅ Scan verification working');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
runCompleteTest();
