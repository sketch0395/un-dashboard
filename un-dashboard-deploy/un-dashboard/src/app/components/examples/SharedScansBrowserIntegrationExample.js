/**
 * This is an example of how to integrate the DeviceDataManager with
 * the SharedScansBrowser component. This isn't a complete implementation,
 * but shows how the key parts would be integrated.
 */

import React, { useState, useEffect } from 'react';
import { useDeviceDataManager } from '../../hooks/useDeviceDataManager';
import { useCollaboration } from '../../hooks/useCollaboration';
import { UnifiedDeviceModalAdapter } from '../../components/UnifiedDeviceModalAdapter';
import { toast } from 'react-toastify';

// This is just a snippet to demonstrate integration
export function SharedScansBrowserIntegrationExample({ selectedScan }) {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [collaborativeMode, setCollaborativeMode] = useState(false);
  
  // Initialize collaboration hook only when in collaborative mode
  const collaboration = useCollaboration(
    collaborativeMode && selectedScan ? selectedScan._id : null
  );
  
  // Initialize the device data manager with appropriate mode
  const deviceDataManager = useDeviceDataManager({
    scanId: selectedScan?._id,
    isCollaborative: collaborativeMode,
    collaboration: collaborativeMode ? collaboration : null,
    onUpdateCallback: (deviceId, updatedDevice) => {
      // Update the UI or other components as needed
      console.log(`Device ${deviceId} updated, refreshing UI`);
    }
  });
  
  // Handle device click - this is just an example
  const handleDeviceClick = async (device) => {
    const deviceId = device.id || device.ip;
    
    if (collaborativeMode) {
      // In collaborative mode, we need to lock the device before editing
      setSelectedDevice(device);
      setShowDeviceModal(true);
      // Note: The locking is handled inside the UnifiedDeviceModalAdapter
    } else {
      // In solo mode, just open the modal
      setSelectedDevice(device);
      setShowDeviceModal(true);
    }
  };
  
  // Listen for real-time updates in collaborative mode
  useEffect(() => {
    if (!collaborativeMode || !selectedScan) return;
    
    // The device data manager already handles most of the updates,
    // but you might want to listen for specific events to update the UI
    
    const handleScanUpdate = (event) => {
      const { changes, userId, username } = event.detail;
      
      // Update the scan metadata if needed
      console.log(`Scan updated by ${username}`);
      
      // Show notification to user
      toast.info(`Scan updated by ${username}`);
    };
    
    // Listen for scan-level updates
    window.addEventListener('collaborationScanUpdate', handleScanUpdate);
    
    return () => {
      window.removeEventListener('collaborationScanUpdate', handleScanUpdate);
    };
  }, [collaborativeMode, selectedScan]);
  
  // Example of how to render devices in a grid
  const renderDeviceGrid = () => {
    if (!selectedScan?.scanData?.devices) {
      return <div>No devices found</div>;
    }
    
    // Flatten device arrays from all vendors
    const devices = [];
    Object.keys(selectedScan.scanData.devices).forEach(vendor => {
      if (Array.isArray(selectedScan.scanData.devices[vendor])) {
        selectedScan.scanData.devices[vendor].forEach(device => {
          // Add vendor information to each device
          devices.push({ ...device, vendor, id: device.ip || device.id });
        });
      }
    });
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {devices.map((device) => {
          const deviceId = device.id;
          const isLocked = deviceDataManager.isDeviceLocked(deviceId);
          const isLockedByMe = deviceDataManager.isDeviceLockedByMe(deviceId);
          const canEdit = !isLocked || isLockedByMe;
          
          return (
            <div 
              key={deviceId}
              onClick={() => handleDeviceClick(device)}
              className={`bg-gray-750 border p-4 rounded-lg cursor-pointer transition-all ${
                isLocked 
                  ? isLockedByMe 
                    ? 'border-blue-500' // Locked by me
                    : 'border-red-500' // Locked by someone else
                  : 'border-gray-600 hover:border-blue-400' // Unlocked
              }`}
            >
              <div className="flex flex-col h-full">
                {/* Device content */}
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-white mb-2">
                    {device.name || device.hostname || device.ip}
                  </h3>
                  
                  {/* Device details */}
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-300">
                      <span className="text-gray-400">IP:</span> {device.ip}
                    </div>
                    {device.mac && (
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">MAC:</span> {device.mac}
                      </div>
                    )}
                    {device.vendor && (
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">Vendor:</span> {device.vendor}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Lock status indicator */}
                {collaborativeMode && (
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-1 rounded ${
                      canEdit ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {canEdit ? 'Can Edit' : 'Locked'}
                    </span>
                    {isLocked && collaboration?.getDeviceLock?.(deviceId)?.username && (
                      <span className="text-gray-400">
                        {isLockedByMe ? 'You' : collaboration.getDeviceLock(deviceId).username}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div>
      {/* Render device grid */}
      {renderDeviceGrid()}
      
      {/* Unified device modal that works in both modes */}
      {showDeviceModal && selectedDevice && (
        <UnifiedDeviceModalAdapter
          device={selectedDevice}
          scanId={selectedScan._id}
          isOpen={showDeviceModal}
          onClose={() => {
            setShowDeviceModal(false);
            setSelectedDevice(null);
          }}
          onSave={async (updatedDevice) => {
            // All the saving logic is handled inside the adapter
            // and the deviceDataManager, so we don't need to do anything here
          }}
          isCollaborative={collaborativeMode}
          collaboration={collaborativeMode ? collaboration : null}
        />
      )}
    </div>
  );
}
