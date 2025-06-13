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
    updateDevice,
    updateScan,
    isDeviceLockedByMe,
    isDeviceLockedByOther
  } = collaboration;
  
  // Your existing useEffect and other functions here...
  
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
  
  // Render method with your existing implementation...
  // Make sure to include the UnifiedDeviceModal component with proper props
  
  return (
    <div className="container mx-auto p-4">
      {/* Your existing UI components */}
      
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
