// Temporary file with the fixed handleRefresh function
const handleRefresh = (quickRefresh = false) => {
  const operation = quickRefresh ? 'Quick refreshing' : 'Full refreshing';
  console.log(`${operation} Docker containers${!quickRefresh ? ' and stats' : ''}...`);
  setIsRefreshing(true);
  
  // Import Socket.IO dynamically to avoid SSR issues
  import('socket.io-client').then(({ io }) => {
    const serverUrl = getServerUrl();
    
    const socket = io(serverUrl, {
      transports: ['polling', 'websocket'], // Start with polling for reliability, upgrade to WebSocket if possible
      timeout: quickRefresh ? 5000 : 8000, // Use shorter timeout for quick refresh
      forceNew: true
    });
    
    // Fast refresh just gets container list without stats
    if (quickRefresh) {
      socket.emit('quickRefreshContainers');
    } else {
      socket.emit('refreshContainers');
    }
    
    // Handle acknowledgment
    socket.on('operation', (data) => {
      if (data.type === 'refresh' && data.status === 'complete') {
        setIsRefreshing(false);
        console.log(`Container refresh complete${data.skipStats ? ' (without stats)' : ' with stats'}`);
        
        // For quick refresh, we still want to show "refreshing" state until stats arrive
        if (quickRefresh && !data.skipStats) {
          console.log('Waiting for stats to arrive...');
        }
      } else if (data.type === 'refresh' && data.status === 'error') {
        setIsRefreshing(false);
        console.error('Refresh error:', data.message);
      }
    });
    
    // Safety timeout to ensure loading state is reset
    const timeout = quickRefresh ? 5000 : 10000;
    setTimeout(() => {
      setIsRefreshing(false);
      socket.disconnect();
    }, timeout);
  }).catch(err => {
    console.error("Error importing socket.io-client:", err);
    setIsRefreshing(false);
  });
};

const handleStartAll = () => {
  console.log('Starting all containers...');
  setIsStartingAll(true);
  
  // Import Socket.IO dynamically to avoid SSR issues
  import('socket.io-client').then(({ io }) => {
    const serverUrl = getServerUrl();
    
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      forceNew: true
    });
    
    socket.emit('startAllContainers');
    
    // Handle acknowledgment
    socket.on('operation', (data) => {
      if (data.type === 'batchOperation' && data.action === 'start' && data.status === 'complete') {
        setIsStartingAll(false);
      } else if (data.type === 'batchOperation' && data.action === 'start' && data.status === 'error') {
        setIsStartingAll(false);
        console.error('Start all error:', data.message);
      }
    });
    
    // Safety timeout to ensure loading state is reset
    setTimeout(() => {
      setIsStartingAll(false);
      socket.disconnect();
    }, 10000);
  }).catch(err => {
    console.error("Error importing socket.io-client:", err);
    setIsStartingAll(false);
  });
};
