// Browser console test for admin authentication
// Open browser console on http://localhost:3000 and run this

console.log('🔍 Testing admin authentication...');

// Test 1: Try to login via API
async function testAdminLogin() {
  try {
    console.log('Testing login with admin/admin123!...');
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123!'
      })
    });
    
    const data = await response.json();
    console.log('Login response status:', response.status);
    console.log('Login response data:', data);
    
    if (response.ok) {
      console.log('✅ Login successful!');
      
      // Test profile endpoint
      console.log('Testing user profile endpoint...');
      const profileResponse = await fetch('/api/user/profile', {
        credentials: 'include'
      });
      
      const profileData = await profileResponse.json();
      console.log('Profile response status:', profileResponse.status);
      console.log('Profile response data:', profileData);
      
      if (profileResponse.ok) {
        console.log('✅ Profile fetch successful!');
        console.log('User data:', profileData.user);
        
        // Check cookies
        console.log('Current cookies:', document.cookie);
        
        // Force authentication context to update
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.log('❌ Profile fetch failed');
      }
    } else {
      console.log('❌ Login failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Test 2: Check current auth state
function checkAuthState() {
  console.log('Current cookies:', document.cookie);
  console.log('Current pathname:', window.location.pathname);
  
  // Check if user menu is present
  const userMenu = document.querySelector('[data-testid="user-menu"]') || 
                  document.querySelector('.user-menu') ||
                  document.querySelector('[class*="user"]');
  console.log('User menu element found:', !!userMenu);
  
  // Check for logout button
  const logoutBtn = document.querySelector('[data-testid="logout"]') ||
                   document.querySelector('button[onclick*="logout"]') ||
                   document.querySelector('button:contains("Logout")');
  console.log('Logout button found:', !!logoutBtn);
}

// Run tests
console.log('Running authentication tests...');
checkAuthState();
testAdminLogin();
