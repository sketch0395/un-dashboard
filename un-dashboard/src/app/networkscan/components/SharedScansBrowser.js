'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { useCollaboration } from '../../hooks/useCollaboration';
import UnifiedDeviceModal from '../../components/UnifiedDeviceModal';
import { 
  CollaborationIndicator,
  UserPresenceList,
  DeviceLockIndicator 
} from '../../components/CollaborationUI';
import NetworkTopologyVisualization from '../../components/NetworkTopologyVisualization';

export default function SharedScansBrowser({ onScanSelect, onImportSuccess }) {
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [sharedScans, setSharedScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    count: 0
  });
  const [selectedScan, setSelectedScan] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [collaborativeMode, setCollaborativeMode] = useState(false);
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(false);
  // Collaboration hook - always call hook but conditionally use the scanId
  const collaboration = useCollaboration(
    collaborativeMode && selectedScan ? selectedScan._id : null
  );
  
  // Safely destructure collaboration methods with defaults to avoid errors
  const {
    isConnected = false,
    collaborators = [],
    deviceLocks = new Map(),
    getDeviceLock = () => null,
    lockDevice = () => {},
    unlockDevice = () => {},
    updateDevice = async () => {},
    updateScan = async () => {},
    isDeviceLockedByMe = () => false,
    isDeviceLockedByOther = () => false
  } = collaboration || {};
  
  useEffect(() => {
    fetchSharedScans();
  }, [filters, pagination.current]);

  const fetchSharedScans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: '20',
        ...filters
      });
      
      const response = await fetch(`/api/scans/shared?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch shared scans: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSharedScans(data.data || []);
        setPagination(data.pagination || {
          current: 1,
          total: 0,
          count: 0
        });
      } else {
        throw new Error(data.message || 'Failed to fetch shared scans');
      }
    } catch (error) {
      console.error('Error fetching shared scans:', error);
      setError(error.message || 'Failed to load shared scans');
      showToast('error', 'Failed to load shared scans', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSelect = (scan) => {
    setSelectedScan(scan);
    setShowDetails(true);
    
    // If the caller provided an onScanSelect callback, call it
    if (onScanSelect && typeof onScanSelect === 'function') {
      onScanSelect(scan);
    }
  };

  const handleDeviceClick = (device) => {
    // Before showing the modal, if in collaborative mode,
    // attempt to lock the device
    if (collaborativeMode && selectedScan) {
      lockDevice(device.id);
    }
    
    setSelectedDevice(device);
    setShowDeviceModal(true);
  };

  const handleDeviceSave = async (updatedDevice) => {
    try {
      if (collaborativeMode && selectedScan) {
        // In collaborative mode, use the collaboration context to update the device
        await updateDevice(updatedDevice.id, updatedDevice);
        
        // Release the lock after saving
        unlockDevice(updatedDevice.id);
        
        showToast('success', 'Device updated', 'Device information has been updated');
      } else {
        // In non-collaborative mode, handle the update locally
        // This would depend on your application's data flow
        showToast('success', 'Device updated', 'Device information has been updated locally');
      }
    } catch (error) {
      console.error('Error updating device:', error);
      showToast('error', 'Failed to update device', error.message);
    }
  };
  
  // Load scan directly to topology map without downloading file
  const handleLoadToTopology = async (scan) => {
    try {
      showToast('info', 'Loading scan to topology...', 'Please wait while we load the scan data');
      
      // Fetch the full scan data
      const response = await fetch(`/api/scans/shared/${scan._id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const scanData = data.data;
        
        console.log('Loading scan to topology:', scanData.name);
        
        // Transform scan data to topology-compatible format
        const topologyData = {
          scanId: scanData.originalScanId || scanData._id,
          name: scanData.name,
          ipRange: scanData.metadata?.ipRange || 'Unknown Range',
          deviceCount: scanData.metadata?.deviceCount || 0,
          scanData: scanData.scanData,
          metadata: scanData.metadata,
          isFromSharedScan: true,
          sharedScanId: scanData._id
        };
        
        // Call the topology visualization function
        if (onScanSelect) {
          // Pass the scan data to parent component for topology visualization
          onScanSelect(topologyData);
          showToast('success', 'Scan loaded to topology!', 'The scan has been loaded into the topology view');
        } else {
          // Fallback: navigate to topology page with scan data
          window.location.href = `/networkscan?scanId=${encodeURIComponent(topologyData.scanId)}`;
        }
        
        // Update view count
        fetchSharedScans();
        
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load scan data');
      }
    } catch (error) {
      console.error('Error loading scan to topology:', error);
      showToast('error', 'Failed to load scan to topology', error.message);
    }
  };
  
  // Enhanced collaborative device grid
  const renderCollaborativeDeviceGrid = () => {
    if (!selectedScan?.scanData?.devices) return null;

    const devices = [];
    Object.entries(selectedScan.scanData.devices).forEach(([vendor, vendorDevices]) => {
      if (Array.isArray(vendorDevices)) {
        vendorDevices.forEach(device => {
          devices.push({ ...device, vendor, id: device.ip || device.id });
        });
      }
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Devices ({devices.length})</h3>
          <div className="flex items-center space-x-4">
            <CollaborationIndicator 
              isConnected={isConnected}
              collaborators={collaborators}
              className="text-sm"
            />
            <button
              onClick={() => setShowCollaborationPanel(!showCollaborationPanel)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
            >
              {showCollaborationPanel ? 'Hide' : 'Show'} Collaboration
            </button>
          </div>
        </div>

        {/* Collaboration Panel */}
        {showCollaborationPanel && (
          <div className="bg-gray-750 border border-gray-600 rounded-lg p-4">
            <UserPresenceList 
              collaborators={collaborators}
              currentUserId={user?._id}
              className="mb-4"
            />
            {collaborators.length === 0 && (
              <p className="text-gray-400 text-sm">No other users are currently collaborating on this scan.</p>
            )}
          </div>
        )}

        {/* Device Grid with Collaboration Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {devices.map((device) => {
            const deviceId = device.id;
            const lock = getDeviceLock(deviceId);
            const isLocked = !!lock;
            const canEdit = !isLocked || isDeviceLockedByMe(deviceId);
            
            return (
              <div 
                key={deviceId}
                className={`bg-gray-700 border rounded-lg p-4 hover:border-gray-500 transition-colors cursor-pointer relative ${
                  isLocked ? (isDeviceLockedByMe(deviceId) ? 'border-blue-500' : 'border-red-500') : 'border-gray-600'
                }`}
                onClick={() => handleDeviceClick(device)}
              >
                {isLocked && (
                  <div className="absolute top-2 right-2">
                    <DeviceLockIndicator
                      deviceId={deviceId}
                      lock={lock}
                      isLockedByMe={isDeviceLockedByMe(deviceId)}
                      isLockedByOther={isDeviceLockedByOther(deviceId)}
                      onUnlock={unlockDevice}
                      className="text-xs"
                    />
                  </div>
                )}

                {/* Device info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white text-sm">{device.hostname || device.ip}</h4>
                    <span className="text-xs text-gray-400">{device.vendor}</span>
                  </div>
                  
                  <div className="text-xs text-gray-300 space-y-1">
                    <div>IP: {device.ip}</div>
                    {device.mac && <div>MAC: {device.mac}</div>}
                    {device.os && <div>OS: {device.os}</div>}
                    {device.role && (
                      <div className="flex items-center space-x-1">
                        <span>Role:</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          device.role === 'Gateway' ? 'bg-green-100 text-green-800' :
                          device.role === 'Switch' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {device.role}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-1 rounded ${
                      canEdit ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {canEdit ? 'Can Edit' : 'Locked'}
                    </span>
                    {isLocked && lock.username && (
                      <span className="text-gray-400">
                        {isDeviceLockedByMe(deviceId) ? 'You' : lock.username}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {devices.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">No devices found in this scan.</p>
          </div>
        )}
      </div>
    );
  };
  
  const renderScans = () => {
    if (loading) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-400">Loading shared scans...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-10">
          <p className="text-red-500">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={fetchSharedScans}
          >
            Try Again
          </button>
        </div>
      );
    }

    if (sharedScans.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-400">No shared scans available.</p>
        </div>
      );
    }    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sharedScans.map(scan => (
          <div 
            key={scan._id} 
            className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-blue-500 transition-colors"
          >
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-white">{scan.name}</h3>
                <span className="text-xs px-2 py-1 bg-gray-700 rounded-full text-gray-300">
                  {scan.category}
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                {scan.description || "No description available"}
              </p>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center text-gray-400 text-sm">
                  <span>By {scan.ownerId?.username || "Unknown"}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(scan.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScanSelect(scan);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadToTopology(scan);
                  }}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                  title="Load scan directly to topology map"
                >
                  🗺️ Topology
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="container mx-auto p-4">
      {/* Header with filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Shared Network Scans</h1>
          <p className="text-gray-400">Browse and collaborate on shared network scans</p>
        </div>
        
        {/* Filters */}
        <div className="mt-4 md:mt-0 w-full md:w-auto flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
          <input
            type="text"
            placeholder="Search scans..."
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
          
          <select 
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
          >
            <option value="">All Categories</option>
            <option value="network">Network</option>
            <option value="security">Security</option>
            <option value="performance">Performance</option>
            <option value="other">Other</option>
          </select>
          
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => fetchSharedScans()}
          >
            Apply Filters
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="space-y-6">
        {selectedScan ? (
          // Selected scan details view
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">{selectedScan.name}</h2>
              <button 
                className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                onClick={() => {
                  setSelectedScan(null);
                  setShowDetails(false);
                  // Reset collaborative mode when going back to scan list
                  setCollaborativeMode(false);
                }}
              >
                Back to Scans
              </button>
            </div>
            
            <div className="mb-6 text-gray-300">
              <p>{selectedScan.description || "No description available"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedScan.tags && selectedScan.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-gray-700 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Owner</p>
                  <p>{selectedScan.ownerId?.username || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Created</p>
                  <p>{new Date(selectedScan.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Devices</p>
                  <p>{selectedScan.metadata?.deviceCount || "Unknown"}</p>
                </div>
              </div>
            </div>
              <div className="flex flex-wrap gap-3 mb-6">
              <button
                className={`px-4 py-2 rounded ${
                  collaborativeMode ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
                onClick={() => setCollaborativeMode(!collaborativeMode)}
              >
                {collaborativeMode ? '✓ Collaborative Mode' : 'Enable Collaboration'}
              </button>
              
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => handleLoadToTopology(selectedScan)}
                title="Load scan directly to topology visualization"
              >
                🗺️ Load to Topology
              </button>
              
              {selectedScan.collaboration?.allowModification && (
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => onImportSuccess && onImportSuccess(selectedScan)}
                >
                  Import Scan
                </button>
              )}
            </div>
            
            {/* Collaboration mode warning/info */}
            {collaborativeMode && (
              <div className="mb-6 p-4 bg-purple-900 bg-opacity-30 border border-purple-500 rounded">
                <p className="text-purple-300">
                  <span className="font-semibold">Collaborative Mode:</span> You can view and edit devices in real-time with other users.
                  Changes are saved automatically and visible to all collaborators.
                </p>
              </div>
            )}
            
            {/* Device grid or visualization */}
            {renderCollaborativeDeviceGrid()}
            
            {/* Network topology visualization if available */}
            {selectedScan.scanData?.topology && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Network Topology</h3>
                <NetworkTopologyVisualization 
                  data={selectedScan.scanData.topology}
                  onNodeClick={handleDeviceClick}
                />
              </div>
            )}
          </div>
        ) : (
          // Scan list view
          renderScans()
        )}
        
        {/* Pagination */}
        {!selectedScan && sharedScans.length > 0 && (
          <div className="flex justify-center mt-6">
            <nav className="flex space-x-2">
              <button
                className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                onClick={() => setPagination({...pagination, current: pagination.current - 1})}
                disabled={pagination.current <= 1}
              >
                Previous
              </button>
              <span className="px-3 py-1 bg-gray-800 text-white rounded">
                {pagination.current} of {pagination.total || 1}
              </span>
              <button
                className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                onClick={() => setPagination({...pagination, current: pagination.current + 1})}
                disabled={pagination.current >= pagination.total}
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
      
      {/* Render the UnifiedDeviceModal with the updated props structure */}
      {showDeviceModal && selectedDevice && (
        <div>
          {/* Collaboration status banner when in collaborative mode */}
          {collaborativeMode && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] max-w-md">
              <div className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
                <span className="text-sm font-medium">🤝 Collaborative Editing</span>
                <CollaborationIndicator 
                  isConnected={isConnected}
                  collaborators={collaborators}
                  className="text-xs"
                />
              </div>
            </div>
          )}
          <UnifiedDeviceModal
            modalDevice={selectedDevice}
            scanId={collaborativeMode ? selectedScan._id : null}
            isCollaborative={collaborativeMode}
            setModalDevice={() => {
              setShowDeviceModal(false);
              setSelectedDevice(null);
            }}
            onSave={async (updatedDevice) => {
              await handleDeviceSave(updatedDevice);
              setShowDeviceModal(false);
              setSelectedDevice(null);
            }}
            onStartSSH={(device) => {
              console.log("SSH requested for device:", device);
              // SSH functionality can be added here if needed
            }}
          />
        </div>
      )}

      {/* Include your Toast container */}
      <ToastContainer />
    </div>
  );
}
