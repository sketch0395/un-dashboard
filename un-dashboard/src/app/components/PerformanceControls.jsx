"use client";

import { useState } from 'react';
import { FaPlay, FaStop, FaSync, FaChartBar, FaTachometerAlt } from 'react-icons/fa';
import PageControls from './PageControls';

const PerformanceControls = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [monitorType, setMonitorType] = useState('system');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  
  const handleRefresh = () => {
    console.log('Refreshing performance metrics...');
    // TODO: Implement refresh functionality
  };
  
  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    console.log(isMonitoring ? 'Stopping monitoring...' : 'Starting monitoring...');
    // TODO: Implement start/stop monitoring functionality
  };
  
  const handleTestConnection = () => {
    // Import Socket.IO client dynamically to avoid SSR issues
    import('socket.io-client').then(({ io }) => {
      setIsTestingConnection(true);
      setConnectionStatus('connecting');
      
      // Determine the server URL based on environment
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      let serverUrl = "http://10.5.1.83:4000";
      
      // If not on localhost, use the same hostname but different port
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        serverUrl = `${protocol}//${hostname}:4000`;
      }
      
      console.log(`Testing performance server connection to: ${serverUrl}`);
      
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
        console.error("Performance server connection error:", err);
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
    return (
    <PageControls title="Performance Controls" initialExpanded={false}>      <div className="space-y-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Performance Server Connection
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isTestingConnection 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-500 text-white'
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
                  <FaTachometerAlt />
                  <span>Test Performance Connection</span>
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
                {connectionStatus === 'success' && 'Connection successful ✓'}
                {connectionStatus === 'error' && 'Connection failed ✗'}
                {connectionStatus === 'timeout' && 'Connection timeout ⚠'}
                {connectionStatus === 'connecting' && 'Connecting...'}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Refresh Interval (seconds)
            </label>
            <input 
              type="number"
              min="5"
              max="300"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Monitoring Options
            </label>
            <div className="flex flex-wrap gap-2">
              {['system', 'network', 'docker'].map((type) => (
                <button
                  key={type}
                  onClick={() => setMonitorType(type)}
                  className={`
                    px-4 py-2 rounded-md capitalize transition-colors
                    ${monitorType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }
                  `}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={toggleMonitoring}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md
              ${isMonitoring 
                ? 'bg-red-700 hover:bg-red-600' 
                : 'bg-green-700 hover:bg-green-600'
              }
            `}
          >
            {isMonitoring ? <FaStop /> : <FaPlay />}
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
          >
            <FaSync /> Refresh Now
          </button>
          
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-md"
          >
            <FaChartBar /> Change View
          </button>
        </div>
      </div>
    </PageControls>
  );
};

export default PerformanceControls;
