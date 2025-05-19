"use client";

import { useState } from 'react';
import { FaPlay, FaStop, FaSync, FaFilter, FaDocker } from 'react-icons/fa';
import PageControls from './PageControls';

const DockerControls = () => {
  const [filterValue, setFilterValue] = useState('');
  const [showStoppedContainers, setShowStoppedContainers] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  
  const handleRefresh = () => {
    console.log('Refreshing Docker containers...');
    // TODO: Implement refresh functionality
  };
  
  const handleStartAll = () => {
    console.log('Starting all containers...');
    // TODO: Implement start all containers functionality
  };
  
  const handleStopAll = () => {
    console.log('Stopping all containers...');
    // TODO: Implement stop all containers functionality
  };
  
  const handleTestConnection = () => {
    // Import Socket.IO client dynamically to avoid SSR issues
    import('socket.io-client').then(({ io }) => {
      setIsTestingConnection(true);
      setConnectionStatus('connecting');
      
      // Determine the server URL based on environment
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      let serverUrl = "http://10.5.1.83:4002";
      
      // If not on localhost, use the same hostname but different port
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        serverUrl = `${protocol}//${hostname}:4002`;
      }
      
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
  
  return (
    <PageControls title="Docker Controls">
      <div className="space-y-4">        <div className="mb-4">
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
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={showStoppedContainers}
                onChange={() => setShowStoppedContainers(!showStoppedContainers)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 transition-colors">
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-5"></div>
              </div>
              <span className="ml-2 text-sm">Show Stopped</span>
            </label>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
          >
            <FaSync /> Refresh
          </button>
          <button 
            onClick={handleStartAll}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 rounded-md"
          >
            <FaPlay /> Start All
          </button>
          <button 
            onClick={handleStopAll}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-md"
          >
            <FaStop /> Stop All
          </button>
        </div>
      </div>
    </PageControls>
  );
};

export default DockerControls;
