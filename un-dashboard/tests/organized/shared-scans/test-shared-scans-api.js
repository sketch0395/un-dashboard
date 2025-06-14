async function testSharedScansAPI() {
  console.log('🧪 Testing Shared Scans API');
  console.log('===========================');

  try {
    // Import fetch dynamically
    const { default: fetch } = await import('node-fetch');
    
    // Step 1: Login to get authentication cookies
    console.log('\n1. 🔐 Authenticating...');
    
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    // Extract cookies
    const setCookieHeaders = loginResponse.headers.raw()['set-cookie'];
    const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
    
    console.log('   ✅ Login successful');

    // Step 2: Test listing shared scans
    console.log('\n2. 📋 Testing shared scans listing...');
    
    const listResponse = await fetch('http://localhost:3000/api/scans/shared', {
      headers: {
        'Cookie': cookies
      }
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('   ✅ Shared scans list retrieved');
      console.log(`   📊 Found ${listData.data ? listData.data.length : 0} shared scans`);
      
      if (listData.data && listData.data.length > 0) {
        const firstScan = listData.data[0];
        console.log(`   🎯 Testing individual scan retrieval: ${firstScan._id}`);
        
        // Step 3: Test individual scan retrieval
        const scanResponse = await fetch(`http://localhost:3000/api/scans/shared/${firstScan._id}`, {
          headers: {
            'Cookie': cookies
          }
        });

        if (scanResponse.ok) {
          const scanData = await scanResponse.json();
          console.log('   ✅ Individual scan retrieved successfully');
          console.log(`   📝 Scan name: ${scanData.data?.name || 'Unknown'}`);
          console.log(`   👤 Owner: ${scanData.data?.ownerId?.username || 'Unknown'}`);
        } else {
          const errorData = await scanResponse.text();
          console.log(`   ❌ Individual scan retrieval failed: ${scanResponse.status}`);
          console.log(`   📄 Error: ${errorData}`);
        }
      } else {
        console.log('   ℹ️  No shared scans found to test individual retrieval');
      }
    } else {
      const errorData = await listResponse.text();
      console.log(`   ❌ Shared scans listing failed: ${listResponse.status}`);
      console.log(`   📄 Error: ${errorData}`);
    }

    console.log('\n✅ API test completed!');
    
  } catch (error) {
    console.error('\n❌ API test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testSharedScansAPI().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testSharedScansAPI };
