"use client";

import { useState, useEffect, useRef } from 'react';
import { FaPlay, FaStop, FaSync, FaFilter, FaDocker, FaPlus } from 'react-icons/fa';
import PageControls from './PageControls';
import AddDockerContainer from './addDockerContainer';

const DockerControls = ({ 
  filterValue, 
  setFilterValue, 
  showStoppedContainers, 
  setShowStoppedContainers 
}) => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStartingAll, setIsStartingAll] = useState(false);
  const [isStoppingAll, setIsStoppingAll] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const refreshTimerRef = useRef(null);  // Set up automatic refresh every 30 seconds to keep stats updated
  useEffect(() => {
    // Function to handle refresh that can be safely used in useEffect
    const performFullRefresh = () => {
      console.log('Auto-refreshing Docker containers and stats...');
      handleRefresh(false); // Full refresh with stats
    };
    
    // Initial quick refresh for faster initial load
    console.log('Initial quick refresh for faster loading...');
    handleRefresh(true); // Quick refresh without stats first
    
    // Schedule a full refresh with stats shortly after
    const fullRefreshTimer = setTimeout(() => {
      performFullRefresh();
    }, 1000);
    
    // Set up interval for auto-refresh (30 seconds = 30000 ms)
    // This more frequent polling ensures container stats stay current
    refreshTimerRef.current = setInterval(performFullRefresh, 30000);
    
    // Clean up the interval when the component unmounts
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      clearTimeout(fullRefreshTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  };    const handleStopAll = () => {
    console.log('Stopping all containers...');
    setIsStoppingAll(true);
    
    // Import Socket.IO dynamically to avoid SSR issues
    import('socket.io-client').then(({ io }) => {
      const serverUrl = getServerUrl();
      
      console.log(`Connecting to Docker server at: ${serverUrl}`);
      
      // Create a socket with longer timeout for the stop operation
      const socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,  // Increased timeout
        forceNew: true,
        reconnectionAttempts: 3
      });
      
      socket.on('connect', () => {
        console.log('Connected to Docker server, emitting stopAllContainers event');
        socket.emit('stopAllContainers');
      });
      
      socket.on('connect_error', (error) => {
        console.error('Docker server connection error:', error);
        setIsStoppingAll(false);
      });
      
      // Handle acknowledgment
      socket.on('operation', (data) => {
        console.log('Received operation update:', data);
        if (data.type === 'batchOperation' && data.action === 'stop') {
          if (data.status === 'complete') {
            console.log('Stop all operation completed');
            setIsStoppingAll(false);
            socket.disconnect();
          } else if (data.status === 'error') {
            console.error('Stop all error:', data.message);
            setIsStoppingAll(false);
            socket.disconnect();
          }
        }
      });
        // Set a longer operation timeout since stopping containers can take time
      const operationTimeout = 30000; // 30 seconds
      
      // Listen for container updates after the stop operation
      socket.on('containers', () => {
        console.log('Received updated container list');
        // If we get a containers update after requesting a stop, we can consider
        // the operation completed successfully even if we missed the 'complete' message
        setIsStoppingAll(false);
        socket.disconnect();
      });
      
      // Safety timeout to ensure loading state is reset
      setTimeout(() => {
        console.log('Safety timeout reached, resetting stop all state');
        setIsStoppingAll(false);
        socket.disconnect();
      }, operationTimeout);
    }).catch(err => {
      console.error("Error importing socket.io-client:", err);
      setIsStoppingAll(false);
    });
  };
  // Helper function to get the Docker server URL
  const getServerUrl = () => {
    // Default server URL
    let serverUrl = "http://10.5.1.83:4002";
    
    // Check if window is defined (client-side only)
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      
      // If not on localhost, use the same hostname but different port
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        serverUrl = `${protocol}//${hostname}:4002`;
      }
    }
    
    return serverUrl;
  };

  const handleTestConnection = () => {
    // Import Socket.IO client dynamically to avoid SSR issues
    import('socket.io-client').then(({ io }) => {
      setIsTestingConnection(true);
      setConnectionStatus('connecting');
      
      const serverUrl = getServerUrl();
      
      console.log(`Testing Docker server connection to: ${serverUrl}`);
      
      // Connect with timeout
      const socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true
      });
      
      // Set a timeout to abort if it takes too long
      const timeoutId = setTimeout(() => {
        socket.disconnect();
        setConnectionStatus('timeout');
        setIsTestingConnection(false);
      }, 6000);
      
      socket.on('connect', () => {
        clearTimeout(timeoutId);
        setConnectionStatus('success');
        socket.disconnect();
        setIsTestingConnection(false);
      });
      
      socket.on('connect_error', (err) => {
        clearTimeout(timeoutId);
        console.error("Docker server connection error:", err);
        setConnectionStatus('error');
        socket.disconnect();
        setIsTestingConnection(false);
      });
    }).catch(err => {
      console.error("Error importing socket.io-client:", err);
      setConnectionStatus('error');
      setIsTestingConnection(false);
    });
  };
  
  // Create a component for the action buttons so they can be used in both places
  const ActionButtons = ({ showLabels = false }) => (
    <div className="flex gap-2">      <button
        onClick={(e) => {
          e.stopPropagation();
          // Use quick refresh for button clicks for faster response
          handleRefresh(true);
          // Schedule a full refresh to follow shortly after
          setTimeout(() => handleRefresh(false), 800);
        }}
        title="Refresh containers"
        disabled={isRefreshing}
        className={`flex items-center gap-2 px-3 py-1 ${
          isRefreshing 
          ? 'bg-gray-600 cursor-not-allowed' 
          : 'bg-gray-700 hover:bg-gray-600'
        } rounded-md text-sm`}
      >
        {isRefreshing ? (
          <>
            <FaSync className="animate-spin h-3 w-3 mr-1" />
            {showLabels && <span>Refreshing...</span>}
          </>
        ) : (
          <>
            <FaSync />
            {showLabels && <span>Refresh</span>}
          </>
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleStartAll();
        }}
        title="Start all containers"
        disabled={isStartingAll}
        className={`flex items-center gap-2 px-3 py-1 ${
          isStartingAll 
          ? 'bg-green-600 cursor-not-allowed' 
          : 'bg-green-700 hover:bg-green-600'
        } rounded-md text-sm`}
      >
        {isStartingAll ? (
          <>
            <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {showLabels && <span>Starting...</span>}
          </>
        ) : (
          <>
            <FaPlay />
            {showLabels && <span>Start All</span>}
          </>
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleStopAll();
        }}
        title="Stop all containers"
        disabled={isStoppingAll}
        className={`flex items-center gap-2 px-3 py-1 ${
          isStoppingAll 
          ? 'bg-red-600 cursor-not-allowed' 
          : 'bg-red-700 hover:bg-red-600'
        } rounded-md text-sm`}
      >
        {isStoppingAll ? (
          <>
            <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {showLabels && <span>Stopping...</span>}
          </>
        ) : (
          <>
            <FaStop />
            {showLabels && <span>Stop All</span>}
          </>
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowCreateModal(true);
        }}
        title="Create new container"
        className="flex items-center gap-2 px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded-md text-sm"
      >
        <FaPlus />
        {showLabels && <span>Create</span>}      </button>
    </div>
  );
  
  return (
    <PageControls 
      title="Docker Controls" 
      initialExpanded={false}
      headerButtons={<ActionButtons showLabels={false} />}
    >
      <div className="space-y-4"><div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Docker Server Connection
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isTestingConnection 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isTestingConnection ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Testing Connection...</span>
                </>
              ) : (
                <>
                  <FaDocker />
                  <span>Test Docker Connection</span>
                </>
              )}
            </button>
            
            {connectionStatus && (
              <div className={`px-4 py-2 rounded-md text-sm ${
                connectionStatus === 'success' ? 'bg-green-800 text-green-100' :
                connectionStatus === 'error' ? 'bg-red-800 text-red-100' :
                connectionStatus === 'timeout' ? 'bg-yellow-800 text-yellow-100' :
                'bg-blue-800 text-blue-100'
              }`}>
                {connectionStatus === 'success' && 'Docker connection successful ✓'}
                {connectionStatus === 'error' && 'Docker connection failed ✗'}
                {connectionStatus === 'timeout' && 'Docker connection timeout ⚠'}
                {connectionStatus === 'connecting' && 'Connecting to Docker server...'}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Filter Containers
            </label>
            <div className="relative">
              <FaFilter className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="Filter by name or status..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>          </div>          <div className="flex flex-col items-center gap-2">
            <label className="inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={showStoppedContainers}
                onChange={() => setShowStoppedContainers(!showStoppedContainers)}
                className="sr-only"
              />
              <div 
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  showStoppedContainers ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <div 
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                    showStoppedContainers ? 'left-6' : 'left-1'
                  }`}
                ></div>
              </div>
            </label>
            <span className="text-sm font-medium text-center">
              {showStoppedContainers ? "Showing Stopped" : "Hide Stopped"}
            </span>
          </div>        </div>          {/* Action buttons with text labels for expanded view */}
        <div className="flex flex-wrap gap-2">
          <ActionButtons showLabels={true} />
        </div>
        
        {/* Add Docker Container Modal */}
        <AddDockerContainer 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          socketUrl={getServerUrl()}
        />
      </div>
    </PageControls>
  );
};

export default DockerControls;
