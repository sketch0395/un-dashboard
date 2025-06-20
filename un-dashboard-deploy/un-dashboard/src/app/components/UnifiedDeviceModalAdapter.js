/**
 * UnifiedDeviceModalAdapter - A unified modal component for device editing
 * 
 * This component adapts between solo and collaborative device editing modes,
 * using the DeviceDataManager hook to ensure consistent data handling across
 * both modes.
 * 
 * Note: The enhanced UnifiedDeviceModal now supports both solo and collaborative editing
 * directly, but this adapter maintains compatibility with existing code.
 */

import React, { useEffect, useState } from 'react';
import UnifiedDeviceModal from './UnifiedDeviceModal';
import { useDeviceDataManager } from '../hooks/useDeviceDataManager';
import { toast } from 'react-toastify';

export function UnifiedDeviceModalAdapter({
  device,
  scanId = null,
  isOpen,
  onClose,
  onSave,
  onStartSSH = null,
  isCollaborative = false,
  collaboration = null,
  readOnly = false
}) {
  // Initialize the device data manager
  const deviceDataManager = useDeviceDataManager({
    scanId,
    isCollaborative,
    collaboration,
    onUpdateCallback: (deviceId, updatedDevice) => {
      // This callback is called whenever a device is updated
      // Use it to broadcast or sync changes as needed
      console.log(`📢 Device ${deviceId} updated in DataManager`);
    }
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const deviceId = device?.id || device?.ip;

  // Lock the device automatically when opening in collaborative mode
  useEffect(() => {
    if (!isOpen || !deviceId || !isCollaborative || readOnly) return;

    const acquireLock = async () => {
      try {
        const locked = await deviceDataManager.lockDevice(deviceId);
        if (!locked) {
          // Show notification and close modal if lock failed
          const lock = collaboration?.getDeviceLock?.(deviceId);
          const lockOwner = lock?.username || 'another user';
          
          toast.warning(`This device is currently being edited by ${lockOwner}`);
          onClose();
        }
      } catch (error) {
        console.error('Error acquiring device lock:', error);
        onClose();
      }
    };

    acquireLock();

    // Clean up lock when modal closes
    return () => {
      if (isCollaborative && deviceDataManager.isDeviceLockedByMe(deviceId)) {
        deviceDataManager.unlockDevice(deviceId);
      }
    };
  }, [isOpen, deviceId, isCollaborative, readOnly, deviceDataManager, onClose, collaboration]);

  // Handle device save through the data manager
  const handleSave = async (updatedDevice) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Use the data manager to update the device
      await deviceDataManager.updateDevice(updatedDevice);
      
      // Sync to database immediately in solo mode
      if (!isCollaborative) {
        await deviceDataManager.syncToDatabase();
      }
      
      // Call parent onSave handler if provided
      if (onSave) {
        await onSave(updatedDevice);
      }

      toast.success('Device updated successfully');
      
      // Don't automatically close in collaborative mode to allow for multiple edits
      if (!isCollaborative) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving device:', error);
      toast.error('Failed to update device');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !device) return null;
  // Use the enhanced UnifiedDeviceModal that now supports both solo and collaborative modes
  return (
    <UnifiedDeviceModal
      modalDevice={device}
      setModalDevice={onClose}
      onSave={handleSave}
      onStartSSH={onStartSSH}
      scanId={scanId}
      isCollaborative={isCollaborative}
      readOnly={readOnly}
    />
  );
}
