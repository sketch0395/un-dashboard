// IMMEDIATE TOPOLOGY TEST - Copy to browser console
// This version executes immediately without setTimeout

console.log('🎯 IMMEDIATE TOPOLOGY TEST - STARTING NOW');
console.log('Current page:', window.location.href);
console.log('Page title:', document.title);

// Step 1: Authentication check
console.log('\n🔐 STEP 1: Authentication Check');
const logoutBtn = document.querySelector('button[onclick*="logout"], a[href*="logout"], .logout');
const userIndicator = document.querySelector('.user-name, .username, [data-user]');
const authCookies = document.cookie.includes('auth-token') || document.cookie.includes('session');

console.log('Logout button found:', !!logoutBtn);
console.log('User indicator found:', !!userIndicator);
console.log('Auth cookies present:', authCookies);

if (logoutBtn || userIndicator || authCookies) {
    console.log('✅ Authentication appears OK');
} else {
    console.log('❌ May need to log in');
}

// Step 2: Page check
console.log('\n🧭 STEP 2: Page Check');
const isNetworkScanPage = window.location.pathname.includes('/networkscan');
console.log('On network scan page:', isNetworkScanPage);

if (!isNetworkScanPage) {
    console.log('❌ Need to navigate to /networkscan page first');
    console.log('Current path:', window.location.pathname);
} else {
    console.log('✅ On correct page');
}

// Step 3: Quick API test
console.log('\n📤 STEP 3: Testing API Access');

const quickTestData = {
    scanId: "immediate-test-" + Date.now(),
    name: "Immediate API Test",
    ipRange: "192.168.99.0/24",
    deviceCount: 1,
    scanData: [{
        ip: "192.168.99.1",
        mac: "00:11:22:33:44:55",
        hostname: "test-device",
        vendor: "Test",
        deviceType: "router"
    }]
};

fetch('/api/scan-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quickTestData)
})
.then(response => {
    console.log('API Response status:', response.status);
    console.log('API Response ok:', response.ok);
    return response.json();
})
.then(data => {
    console.log('API Response data:', data);
    if (data.error) {
        console.log('❌ API Error:', data.error);
    } else {
        console.log('✅ API Success');
    }
})
.catch(error => {
    console.log('❌ API Network Error:', error.message);
});

// Step 4: Check current DOM elements
console.log('\n🔍 STEP 4: DOM Element Check');

const elements = {
    svg: document.querySelector('svg'),
    buttons: document.querySelectorAll('button'),
    forms: document.querySelectorAll('form'),
    inputs: document.querySelectorAll('input'),
    scanHistory: document.querySelectorAll('[class*="scan"], [id*="scan"]'),
    networkElements: document.querySelectorAll('[class*="network"], [class*="topology"]')
};

Object.entries(elements).forEach(([name, element]) => {
    if (element.length !== undefined) {
        console.log(`${name}: ${element.length} found`);
        if (name === 'scanHistory' && element.length > 0) {
            console.log('  First 3 scan elements:');
            Array.from(element).slice(0, 3).forEach((el, i) => {
                const text = (el.textContent || '').trim().substring(0, 50);
                console.log(`    ${i+1}. ${text}...`);
            });
        }
    } else {
        console.log(`${name}: ${element ? 'Present' : 'Not found'}`);
    }
});

// Step 5: Check localStorage
console.log('\n💾 STEP 5: Storage Check');
const storageKeys = Object.keys(localStorage);
const relevantKeys = storageKeys.filter(key => 
    key.includes('scan') || key.includes('device') || key.includes('network') || key.includes('auth')
);

console.log('Total localStorage keys:', storageKeys.length);
console.log('Relevant keys:', relevantKeys.length);
relevantKeys.forEach(key => {
    const value = localStorage.getItem(key);
    const preview = value ? value.substring(0, 50) + '...' : 'null';
    console.log(`  ${key}: ${preview}`);
});

// Step 6: Manual instructions
console.log('\n📋 STEP 6: Manual Next Steps');
console.log('If you see this output, the script is working properly.');
console.log('');
console.log('Next steps:');
console.log('1. If not authenticated, log in with: admin / admin123!');
console.log('2. If not on network scan page, navigate to /networkscan');
console.log('3. Look for any scan history items and click one');
console.log('4. Check if topology visualization appears');
console.log('');
console.log('🔍 Watch the Network tab in DevTools for API requests');
console.log('⚠️  Check Console tab for any JavaScript errors');

console.log('\n✨ IMMEDIATE TEST COMPLETE - Check output above');
