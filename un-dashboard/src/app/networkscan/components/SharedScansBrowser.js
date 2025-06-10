'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { useCollaboration } from '../../hooks/useCollaboration';
import { CollaborativeDeviceModal } from '../../components/collaboration/CollaborativeDeviceModal';
import CollaborationIndicator from '../../components/collaboration/CollaborationIndicator';
import UserPresenceList from '../../components/collaboration/UserPresenceList';
import DeviceLockIndicator from '../../components/collaboration/DeviceLockIndicator';

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

  // Collaboration hook - only initialize when a scan is selected for collaboration
  const collaboration = useCollaboration(
    collaborativeMode && selectedScan ? selectedScan._id : null
  );

  const {
    isConnected,
    collaborators,
    deviceLocks,
    getDeviceLock,
    lockDevice,
    unlockDevice,
    isDeviceLockedByMe,
    isDeviceLockedByOther
  } = collaboration;

  useEffect(() => {
    fetchSharedScans();
  }, [filters, pagination.current]);

  const fetchSharedScans = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: '12',
        search: filters.search
      });
      
      const response = await fetch(`/api/scans/shared?${params}`);
      const data = await response.json();
        if (response.ok) {
        setSharedScans(data.data);
        setPagination(data.pagination);
      } else {
        throw new Error(data.error || 'Failed to fetch shared scans');
      }
    } catch (error) {
      console.error('Error fetching shared scans:', error);
      setError(error.message);
      showToast('Failed to fetch shared scans', 'error');
    } finally {
      setLoading(false);
    }
  };  const handleScanView = async (scan) => {
    try {
      const response = await fetch(`/api/scans/shared/${scan._id}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setSelectedScan(data.data);
        setShowDetails(true);
      } else {
        throw new Error(data.message || 'Failed to load scan details');
      }
    } catch (error) {
      console.error('Error fetching scan details:', error);
      showToast('Failed to load scan details', 'error');
    }
  };  const handleScanDownload = async (scan) => {
    try {
      const response = await fetch(`/api/scans/shared/${scan._id}/download`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${scan.name}_scan.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Refresh the list to update download counts
        fetchSharedScans();
        
        showToast('Scan downloaded successfully', 'success');
        
        try {
          // Parse the blob to provide data for import
          const jsonData = JSON.parse(await blob.text());
          onImportSuccess?.(jsonData);
        } catch (parseError) {
          console.error('Error parsing downloaded scan:', parseError);
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to download scan');
      }
    } catch (error) {
      console.error('Error downloading scan:', error);
      showToast('Failed to download scan', 'error');
    }
  };  const handleScanDelete = async (scan) => {
    // Check authentication state before attempting delete
    if (!user) {
      showToast('Please log in to delete scans', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${scan.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/scans/shared/${scan._id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast('Scan deleted successfully', 'success');
        fetchSharedScans(); // Refresh the list
        if (selectedScan && selectedScan._id === scan._id) {
          setShowDetails(false); // Close details modal if it was open
        }
      } else {
        const errorMessage = data.message || `Failed to delete scan (${response.status})`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting scan:', error);
      showToast(`Failed to delete scan: ${error.message}`, 'error');
    }
  };

  const canDeleteScan = (scan) => {
    return user && (
      scan.ownerId?._id === user._id || 
      scan.ownerId?.toString() === user._id.toString() || 
      user.role === 'admin'
    );
  };
  const canModifyScan = (scan) => {
    return user && scan.collaboration?.allowModification && (
      scan.ownerId?._id === user._id || 
      scan.ownerId?.toString() === user._id.toString() || 
      user.role === 'admin'
    );
  };
  // Collaborative functions
  const handleCollaborativeView = async (scan) => {
    try {
      console.log('Loading collaborative view for scan:', scan._id);
      
      // Load full scan data
      const response = await fetch(`/api/scans/shared/${scan._id}`, {
        credentials: 'include'
      });
      
      console.log('API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Scan data loaded successfully:', data);
        setSelectedScan(data.data);
        setCollaborativeMode(true);
        setShowDetails(true);
      } else {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to load scan data: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error loading collaborative view:', error);
      showToast(`Failed to load collaborative view: ${error.message}`, 'error');
    }
  };
  const handleDeviceClick = async (device) => {
    if (collaborativeMode && selectedScan) {
      const deviceId = device.id || device.ip;
      
      // Try to lock the device for editing
      try {
        const success = await lockDevice(deviceId);
        if (success) {
          setSelectedDevice(device);
          setShowDeviceModal(true);
        } else {
          const lock = getDeviceLock(deviceId);
          const lockedBy = lock?.username || 'another user';
          showToast(`Device is currently being edited by ${lockedBy}`, 'warning');
        }
      } catch (error) {
        console.error('Error locking device:', error);
        showToast('Failed to start editing device', 'error');
      }
    } else {
      // Non-collaborative mode - just open modal
      setSelectedDevice(device);
      setShowDeviceModal(true);
    }
  };

  const handleDeviceSave = async (updatedDevice) => {
    try {
      // Update the device in the scan data
      const updatedScanData = {
        ...selectedScan.scanData,
        [updatedDevice.id]: updatedDevice
      };

      // Send update to server
      const response = await fetch(`/api/scans/shared/${selectedScan._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scanData: updatedScanData
        })
      });

      if (response.ok) {
        setSelectedScan(prev => ({
          ...prev,
          scanData: updatedScanData
        }));
        showToast('Device updated successfully', 'success');
      } else {
        throw new Error('Failed to update device');
      }
    } catch (error) {
      console.error('Error saving device:', error);
      showToast('Failed to save device changes', 'error');
    }
  };

  const exitCollaborativeMode = () => {
    setCollaborativeMode(false);
    setSelectedScan(null);
    setShowDetails(false);
    setSelectedDevice(null);
    setShowDeviceModal(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getVisibilityBadge = (visibility) => {
    const colors = {
      public: 'bg-green-100 text-green-800',
      private: 'bg-gray-100 text-gray-800',
      restricted: 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[visibility]}`}>
        {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
      </span>
    );
  };

  const getCategoryIcon = (category) => {
    const icons = {
      infrastructure: '🏗️',
      security: '🔒',
      monitoring: '📊',
      compliance: '✅',
      research: '🔬',
      other: '📋'
    };
    return icons[category] || '📋';
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
                {/* Lock indicator */}
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

                  {/* Edit status */}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Shared Network Scans</h2>
        <p className="text-gray-300 mt-2">Browse and download shared network scans from the community</p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search scans..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="security">Security</option>
              <option value="monitoring">Monitoring</option>
              <option value="compliance">Compliance</option>
              <option value="research">Research</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters({ ...filters, sortBy, sortOrder });
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="stats.viewCount-desc">Most Viewed</option>
              <option value="stats.downloadCount-desc">Most Downloaded</option>
              <option value="stats.rating-desc">Highest Rated</option>
              <option value="name-asc">Name A-Z</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setPagination({ ...pagination, current: 1 })}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Scans Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading shared scans...</p>
        </div>
      ) : sharedScans.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-300">No shared scans found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sharedScans.map((scan) => (
            <div key={scan._id} className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors">
              {/* Scan Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getCategoryIcon(scan.category)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white truncate">{scan.name}</h3>
                    <p className="text-sm text-gray-400">by {scan.ownerId?.username}</p>
                  </div>
                </div>
                {getVisibilityBadge(scan.sharing.visibility)}
              </div>

              {/* Description */}
              {scan.description && (
                <p className="text-sm text-gray-300 mb-4 line-clamp-3">{scan.description}</p>
              )}

              {/* Metadata */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">IP Range:</span>
                  <span className="text-gray-300">{scan.metadata?.ipRange || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Devices:</span>
                  <span className="text-gray-300">{scan.metadata?.deviceCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Date:</span>
                  <span className="text-gray-300">{formatDate(scan.createdAt)}</span>
                </div>
              </div>

              {/* Tags */}
              {scan.tags && scan.tags.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {scan.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {tag}
                      </span>
                    ))}
                    {scan.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{scan.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex justify-between text-sm text-gray-400 mb-4">
                <span>👁 {scan.stats.viewCount}</span>
                <span>⬇ {scan.stats.downloadCount}</span>
                {scan.stats.rating > 0 && (
                  <span>⭐ {scan.stats.rating.toFixed(1)}</span>
                )}
              </div>              {/* Actions */}
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleScanView(scan)}
                    className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors"
                  >
                    View Details
                  </button>                  <button
                    onClick={() => handleScanDownload(scan)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleCollaborativeView(scan)}
                    className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm transition-colors"
                    title="Open collaborative view"
                  >
                    🤝 Collaborate
                  </button>
                </div>
                
                {/* Owner/Admin Actions */}
                {canDeleteScan(scan) && (
                  <div className="flex space-x-2">
                    {canModifyScan(scan) && (
                      <button
                        onClick={() => handleScanView(scan)} // For now, redirect to details view
                        className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm transition-colors"
                        title="Edit scan details"
                      >
                        ✏️ Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleScanDelete(scan)}
                      className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
                      title="Delete scan"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}

                {/* Collaboration Indicators */}
                {scan.collaboration && (
                  <div className="flex space-x-1 text-xs text-gray-400">
                    {scan.collaboration.allowComments && (
                      <span className="px-2 py-1 bg-gray-700 rounded" title="Comments allowed">
                        💬
                      </span>
                    )}
                    {scan.collaboration.allowRating && (
                      <span className="px-2 py-1 bg-gray-700 rounded" title="Rating allowed">
                        ⭐
                      </span>
                    )}
                    {scan.collaboration.allowModification && (
                      <span className="px-2 py-1 bg-gray-700 rounded" title="Modifications allowed">
                        ✏️
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            Page {pagination.current} of {pagination.total} ({pagination.count} total)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination({ ...pagination, current: pagination.current - 1 })}
              disabled={pagination.current === 1}
              className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md">
              {pagination.current}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, current: pagination.current + 1 })}
              disabled={pagination.current === pagination.total}
              className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Scan Details Modal */}
      {showDetails && selectedScan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-bold text-white">{selectedScan.name}</h2>
                  {collaborativeMode && (
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        🤝 Collaborative Mode
                      </span>
                      <button
                        onClick={exitCollaborativeMode}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                      >
                        Exit Collaboration
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-200 text-xl"
                >
                  ×
                </button>
              </div>              <div className="space-y-6">
                {/* Collaborative Device Grid */}
                {collaborativeMode ? (
                  renderCollaborativeDeviceGrid()
                ) : (
                  <>
                    {/* Basic Info */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Scan Information</h3>
                      <div className="bg-gray-750 p-4 rounded-lg space-y-2">
                        <p><strong className="text-gray-300">Owner:</strong> <span className="text-white">{selectedScan.ownerId?.username}</span></p>
                        <p><strong className="text-gray-300">Description:</strong> <span className="text-white">{selectedScan.description || 'No description'}</span></p>
                        <p><strong className="text-gray-300">Category:</strong> <span className="text-white capitalize">{selectedScan.category}</span></p>
                        <p><strong className="text-gray-300">Created:</strong> <span className="text-white">{formatDate(selectedScan.createdAt)}</span></p>
                        <p><strong className="text-gray-300">IP Range:</strong> <span className="text-white">{selectedScan.metadata?.ipRange}</span></p>
                        <p><strong className="text-gray-300">Devices Found:</strong> <span className="text-white">{selectedScan.metadata?.deviceCount}</span></p>
                      </div>
                    </div>

                    {/* Tags */}
                    {selectedScan.tags && selectedScan.tags.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedScan.tags.map((tag, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Device Summary */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Device Summary</h3>
                      <div className="bg-gray-750 p-4 rounded-lg">
                        {Object.entries(selectedScan.scanData?.devices || {}).map(([vendor, devices]) => (
                          <div key={vendor} className="mb-2">
                            <span className="text-gray-300">{vendor}:</span> 
                            <span className="text-white ml-2">{devices.length} devices</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Collaboration Settings */}
                    {selectedScan.collaboration && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Collaboration Features</h3>
                        <div className="bg-gray-750 p-4 rounded-lg space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className={`w-3 h-3 rounded-full ${selectedScan.collaboration.allowComments ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                            <span className="text-gray-300">Comments: {selectedScan.collaboration.allowComments ? 'Enabled' : 'Disabled'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`w-3 h-3 rounded-full ${selectedScan.collaboration.allowRating ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                            <span className="text-gray-300">Rating: {selectedScan.collaboration.allowRating ? 'Enabled' : 'Disabled'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`w-3 h-3 rounded-full ${selectedScan.collaboration.allowModification ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                            <span className="text-gray-300">Modification: {selectedScan.collaboration.allowModification ? 'Enabled' : 'Disabled'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sharing Settings */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Sharing Settings</h3>
                      <div className="bg-gray-750 p-4 rounded-lg space-y-2">
                        <p><strong className="text-gray-300">Visibility:</strong> 
                          <span className="ml-2">
                            {getVisibilityBadge(selectedScan.sharing?.visibility)}
                          </span>
                        </p>
                        {selectedScan.sharing?.visibility === 'restricted' && (
                          <>
                            {selectedScan.sharing.allowedUsers && selectedScan.sharing.allowedUsers.length > 0 && (
                              <p><strong className="text-gray-300">Allowed Users:</strong> <span className="text-white">{selectedScan.sharing.allowedUsers.length} users</span></p>
                            )}
                            {selectedScan.sharing.allowedRoles && selectedScan.sharing.allowedRoles.length > 0 && (
                              <p><strong className="text-gray-300">Allowed Roles:</strong> <span className="text-white">{selectedScan.sharing.allowedRoles.join(', ')}</span></p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Usage Statistics</h3>
                      <div className="bg-gray-750 p-4 rounded-lg grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">{selectedScan.stats?.viewCount || 0}</div>
                          <div className="text-sm text-gray-400">Views</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">{selectedScan.stats?.downloadCount || 0}</div>
                          <div className="text-sm text-gray-400">Downloads</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-400">
                            {selectedScan.stats?.rating > 0 ? selectedScan.stats.rating.toFixed(1) : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-400">
                            Rating {selectedScan.stats?.ratingCount > 0 && `(${selectedScan.stats.ratingCount})`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}                {/* Actions */}
                <div className="flex justify-between space-x-3 pt-4 border-t border-gray-700">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowDetails(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                    >
                      Close
                    </button>
                    {!collaborativeMode && selectedScan.collaboration?.allowModification && (
                      <button
                        onClick={() => handleCollaborativeView(selectedScan)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                      >
                        🤝 Start Collaboration
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    {canModifyScan(selectedScan) && (
                      <button
                        onClick={() => {
                          // TODO: Implement edit functionality
                          showToast('Edit functionality coming soon!', 'info');
                        }}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors"
                      >
                        ✏️ Edit Scan
                      </button>
                    )}
                    {canDeleteScan(selectedScan) && (
                      <button
                        onClick={() => {
                          handleScanDelete(selectedScan);
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                      >
                        🗑️ Delete Scan
                      </button>
                    )}
                    <button
                      onClick={() => handleScanDownload(selectedScan)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      Download Scan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>      )}

      {/* Collaborative Device Modal */}
      {showDeviceModal && selectedDevice && collaborativeMode && (
        <CollaborativeDeviceModal
          device={selectedDevice}
          scanId={selectedScan?._id}
          isOpen={showDeviceModal}
          onClose={() => {
            setShowDeviceModal(false);
            setSelectedDevice(null);
            // Unlock device when closing
            if (selectedDevice) {
              unlockDevice(selectedDevice.id || selectedDevice.ip);
            }
          }}
          onSave={handleDeviceSave}
          readOnly={!canModifyScan(selectedScan)}
        />
      )}

      <ToastContainer />
    </div>
  );
}
