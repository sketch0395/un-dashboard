// Debug script to test collaboration connection from frontend
// Run this in browser console while on the network scan page

function debugCollaborationConnection() {
  console.log('🔍 Debugging collaboration connection...');
  
  // Check if user is authenticated
  const authToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1];
  
  console.log('🔑 Auth token:', authToken ? 'present' : 'missing');
  
  // Check environment variables
  console.log('🌍 Environment:');
  console.log('- COLLABORATION_PORT:', process.env.COLLABORATION_PORT);
  console.log('- Location hostname:', window.location.hostname);
  console.log('- Location protocol:', window.location.protocol);
  
  // Build WebSocket URL
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.hostname;
  const wsPort = process.env.COLLABORATION_PORT || 4001;
  const scanId = 'debug-test-' + Date.now();
  
  let wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/collaboration-ws?scanId=${encodeURIComponent(scanId)}`;
  if (authToken) {
    wsUrl += `&token=${encodeURIComponent(authToken)}`;
  }
  
  console.log('🔗 WebSocket URL:', wsUrl.replace(/token=[^&]+/, 'token=***'));
  
  // Test connection
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('✅ WebSocket connection successful!');
    ws.close();
  };
  
  ws.onclose = (event) => {
    console.log('🔌 WebSocket closed:', event.code, event.reason);
    if (event.code === 1008) {
      console.log('❌ Authentication failed');
    } else if (event.code === 1011) {
      console.log('❌ Server not ready');
    }
  };
  
  ws.onerror = (error) => {
    console.error('🚨 WebSocket error:', error);
  };
}

// To use: Copy this script, paste in browser console on network scan page, then run:
// debugCollaborationConnection()
