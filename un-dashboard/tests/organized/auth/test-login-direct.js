const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('🔐 Testing admin login...');
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123!'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.text();
    console.log('Response body:', result);

    if (response.ok) {
      console.log('✅ Login successful!');
      
      // Try parsing as JSON
      try {
        const jsonResult = JSON.parse(result);
        console.log('Parsed result:', jsonResult);
      } catch (e) {
        console.log('Response is not JSON');
      }
    } else {
      console.log('❌ Login failed');
    }

  } catch (error) {
    console.error('❌ Login test failed:', error.message);
  }
}

testLogin();
