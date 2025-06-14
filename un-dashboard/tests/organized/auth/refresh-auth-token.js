/**
 * Fresh Authentication Token Generator
 * This script will generate a fresh authentication token for testing
 */

const fs = require('fs');

async function getFreshToken() {
    console.log('🔐 Getting fresh authentication token...');
    
    try {
        // Import fetch for Node.js
        const { default: fetch } = await import('node-fetch');
        
        const loginData = {
            username: 'admin',
            password: 'admin123'
        };
        
        console.log('📝 Attempting login with admin credentials...');
        
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        console.log(`   Response status: ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            
            // Extract auth token from set-cookie header
            const setCookieHeader = response.headers.get('set-cookie');
            let authToken = null;
            
            if (setCookieHeader) {
                const authCookie = setCookieHeader
                    .split(',')
                    .find(cookie => cookie.trim().startsWith('auth-token='));
                
                if (authCookie) {
                    authToken = authCookie.split('=')[1].split(';')[0];
                }
            }
            
            if (authToken) {
                console.log('✅ Login successful! New token generated.');
                
                const updatedLoginData = {
                    username: 'admin',
                    password: 'admin123',
                    authToken: authToken,
                    token: authToken, // Keep both for compatibility
                    cookieHeader: `auth-token=${authToken}`,
                    timestamp: new Date().toISOString()
                };
                
                // Save the new token
                fs.writeFileSync('./login-data.json', JSON.stringify(updatedLoginData, null, 2));
                console.log('💾 Updated login-data.json with fresh token');
                
                return authToken;
            } else {
                console.log('❌ No auth token found in response headers');
                return null;
            }
        } else {
            const errorText = await response.text();
            console.log(`❌ Login failed: ${errorText}`);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error during login:', error.message);
        return null;
    }
}

async function testTokenValidity(token) {
    console.log('\n🔍 Testing token validity...');
    
    try {
        const { default: fetch } = await import('node-fetch');
        
        const response = await fetch('http://localhost:3000/api/scan-history?limit=1', {
            method: 'GET',
            headers: {
                'Cookie': `auth-token=${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`   Token test status: ${response.status}`);
        
        if (response.ok) {
            console.log('✅ Token is valid and working');
            return true;
        } else {
            const errorText = await response.text();
            console.log(`❌ Token validation failed: ${errorText}`);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error testing token:', error.message);
        return false;
    }
}

// Run the token refresh
async function refreshAuthToken() {
    const token = await getFreshToken();
    
    if (token) {
        const isValid = await testTokenValidity(token);
        if (isValid) {
            console.log('\n🎉 Fresh token generated and validated successfully!');
            console.log('You can now run the database save diagnosis again.');
        } else {
            console.log('\n❌ Token was generated but validation failed');
        }
    } else {
        console.log('\n❌ Failed to generate fresh token');
        console.log('Make sure the development server is running and admin user exists.');
    }
}

// Export for use in other scripts
module.exports = { getFreshToken, testTokenValidity };

// Run if called directly
if (require.main === module) {
    refreshAuthToken().catch(console.error);
}
