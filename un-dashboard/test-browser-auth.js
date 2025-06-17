// Quick test to verify authentication status
const testAuth = async () => {
    try {
        console.log('🔍 Testing authentication...');
        const response = await fetch('/api/auth/verify', {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log('Auth response:', response.status, data);
        
        if (data.authenticated) {
            console.log('✅ Authenticated as:', data.user.username);
            console.log('🍪 Cookies:', document.cookie);
        } else {
            console.log('❌ Not authenticated');
        }
    } catch (error) {
        console.error('Auth test failed:', error);
    }
};

testAuth();
