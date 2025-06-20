/**
 * useDeviceDataManager - A centralized hook for managing device data across all contexts
 * 
 * This hook provides a unified interface for working with device information,
 * ensuring consistent behavior across solo and collaboration modes.
 * 
 * Features:
 * - Single source of truth for device data
 * - Unified API for both solo and collaborative modes
 * - Automatic sync between localStorage, database, and real-time collaboration
 * - Supports device updates, locking, and state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { updateDeviceProperties } from '../utils/deviceManagementUtils';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

export function useDeviceDataManager(options = {}) {
  const {
    scanId = null,
    isCollaborative = false,
    collaboration = null,
    localStorageKey = "customDeviceProperties",
    onUpdateCallback = null,
  } = options;
  
  const { user } = useAuth();
  const [deviceCache, setDeviceCache] = useState({});
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef(null);
  
  // Initialize device data from localStorage
  useEffect(() => {
    try {
      // Load initial data from localStorage
      const storedData = localStorage.getItem(localStorageKey) || "{}";
      const parsedData = JSON.parse(storedData);
      setDeviceCache(parsedData);
      setIsInitialized(true);
      
      console.log('🔄 DeviceDataManager initialized with', Object.keys(parsedData).length, 'devices');
    } catch (error) {
      console.error('Error initializing device data manager:', error);
      setDeviceCache({});
      setIsInitialized(true);
    }
  }, [localStorageKey]);

  // Set up collaboration listeners if in collaborative mode
  useEffect(() => {
    if (!isCollaborative || !collaboration || !scanId || !isInitialized) return;

    const handleDeviceUpdate = (event) => {
      const { deviceId, changes, userId, username } = event.detail;
      
      // Update the device in local cache
      console.log(`📱 DeviceDataManager: Received update from ${username} for device ${deviceId}`);
      updateDeviceInCache(deviceId, changes);
    };

    // Set up listeners for collaboration events
    window.addEventListener('collaborationDeviceUpdate', handleDeviceUpdate);
    
    return () => {
      window.removeEventListener('collaborationDeviceUpdate', handleDeviceUpdate);
    };
  }, [isCollaborative, collaboration, scanId, isInitialized]);

  // Function to update a device in the local cache
  const updateDeviceInCache = useCallback((deviceId, changes) => {
    if (!deviceId) {
      console.error('Cannot update device without deviceId');
      return null;
    }

    setDeviceCache(prevCache => {
      const updatedCache = { ...prevCache };
      
      // Create or update the device in the cache
      updatedCache[deviceId] = {
        ...(updatedCache[deviceId] || {}),
        ...changes
      };
      
      return updatedCache;
    });

    return changes;
  }, []);

  // Update device across all contexts (localStorage, database, collaboration)
  const updateDevice = useCallback(async (deviceToUpdate) => {
    if (!deviceToUpdate || !deviceToUpdate.ip) {
      console.error('Invalid device object for update');
      return null;
    }

    const deviceId = deviceToUpdate.id || deviceToUpdate.ip;
    console.log(`🔄 DeviceDataManager: Updating device ${deviceId}`, deviceToUpdate);

    try {
      // 1. Update in localStorage
      const updatedCustomProps = updateDeviceProperties(deviceToUpdate);
      
      // 2. Update in local cache
      updateDeviceInCache(deviceId, deviceToUpdate);
      
      // 3. If in collaborative mode, send real-time update
      if (isCollaborative && collaboration && collaboration.isConnected) {
        console.log('📤 DeviceDataManager: Sending collaborative update for', deviceId);
        
        if (collaboration.isDeviceLockedByMe && collaboration.isDeviceLockedByMe(deviceId)) {
          // Send the update via collaboration system
          collaboration.updateDevice(deviceId, deviceToUpdate, collaboration.sessionVersion);
        } else {
          // If the device isn't locked by us, try to lock it first
          if (!collaboration.isDeviceLockedByOther(deviceId)) {
            const locked = await collaboration.lockDevice(deviceId);
            if (locked) {
              collaboration.updateDevice(deviceId, deviceToUpdate, collaboration.sessionVersion);
              // Remember to unlock it afterward (could be immediate or after a short delay)
              setTimeout(() => {
                if (collaboration.isDeviceLockedByMe(deviceId)) {
                  collaboration.unlockDevice(deviceId);
                }
              }, 1000);
            } else {
              console.warn('Failed to acquire lock for device update', deviceId);
            }
          } else {
            console.warn('Cannot update device - already locked by another user', deviceId);
            toast.warn('This device is being edited by another user');
            return null;
          }
        }
      }
      
      // 4. If direct database update is needed, queue it for batch processing
      // This is primarily for devices from solo mode that need to be synced to DB
      if (scanId && !isCollaborative) {
        setPendingUpdates(prev => ({
          ...prev,
          [deviceId]: { ...deviceToUpdate, timestamp: Date.now() }
        }));
        
        // Schedule sync
        scheduleDatabaseSync();
      }
      
      // 5. Call external callback if provided
      if (onUpdateCallback) {
        onUpdateCallback(deviceId, deviceToUpdate);
      }
      
      return updatedCustomProps;
    } catch (error) {
      console.error('Error updating device:', error);
      return null;
    }
  }, [isCollaborative, collaboration, scanId, updateDeviceInCache, onUpdateCallback]);

  // Schedule a debounced sync to the database
  const scheduleDatabaseSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      syncToDatabase();
    }, 2000); // Delay to batch updates
  }, []);

  // Sync pending updates to the database
  const syncToDatabase = useCallback(async () => {
    if (!scanId || !user || Object.keys(pendingUpdates).length === 0 || isSyncing) {
      return;
    }

    try {
      setIsSyncing(true);
      console.log('💾 DeviceDataManager: Syncing pending updates to database', Object.keys(pendingUpdates).length, 'updates');
      
      // Clone and clear pending updates to avoid race conditions
      const updatesToSync = { ...pendingUpdates };
      setPendingUpdates({});
      
      // If this is for a shared scan, use the shared scan API
      if (scanId.startsWith('shared_') || scanId.length === 24) {
        // For shared scans we need to retrieve the full scan data first
        const response = await fetch(`/api/scans/shared/${scanId}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to retrieve scan data: ${response.status}`);
        }
        
        const { data: scanData } = await response.json();
        
        // Update the devices in the scan data structure
        const updatedScanData = { ...scanData.scanData };
        let updatesMade = false;
        
        // Update each device in the vendor structure
        Object.keys(updatedScanData.devices || {}).forEach(vendor => {
          if (Array.isArray(updatedScanData.devices[vendor])) {
            updatedScanData.devices[vendor] = updatedScanData.devices[vendor].map(device => {
              const deviceId = device.id || device.ip;
              if (deviceId && updatesToSync[deviceId]) {
                updatesMade = true;
                return { ...device, ...updatesToSync[deviceId] };
              }
              return device;
            });
          }
        });
        
        if (updatesMade) {
          // Save the updated scan data
          const saveResponse = await fetch(`/api/scans/shared/${scanId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              scanData: updatedScanData
            })
          });
          
          if (!saveResponse.ok) {
            throw new Error(`Failed to save scan data: ${saveResponse.status}`);
          }
          
          console.log('✅ DeviceDataManager: Successfully synced with database');
        } else {
          console.log('ℹ️ DeviceDataManager: No device updates to apply');
        }
      } else {
        // For local scans, we would implement the appropriate API call here
        // This depends on how your local scan data is structured
        console.log('ℹ️ DeviceDataManager: Local scan sync not implemented yet');
      }
    } catch (error) {
      console.error('Error syncing to database:', error);
      
      // Put updates back in the queue to retry later
      setPendingUpdates(prev => ({ ...prev, ...pendingUpdates }));
    } finally {
      setIsSyncing(false);
    }
  }, [scanId, user, pendingUpdates, isSyncing]);

  // Force sync to database immediately
  const forceDatabaseSync = useCallback(async () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    return syncToDatabase();
  }, [syncToDatabase]);

  // Get a device by ID
  const getDevice = useCallback((deviceId) => {
    if (!deviceId || !isInitialized) return null;
    
    // Check cache first
    const cachedDevice = deviceCache[deviceId];
    if (cachedDevice) return cachedDevice;
    
    // If not in cache, check localStorage directly
    try {
      const storedData = localStorage.getItem(localStorageKey) || "{}";
      const parsedData = JSON.parse(storedData);
      return parsedData[deviceId] || null;
    } catch (error) {
      console.error('Error getting device from localStorage:', error);
      return null;
    }
  }, [deviceCache, isInitialized, localStorageKey]);
  
  // Get all devices
  const getAllDevices = useCallback(() => {
    return { ...deviceCache };
  }, [deviceCache]);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Merge device state with defaults and updates
  const mergeDeviceState = useCallback((deviceId, baseDevice = {}, updates = {}) => {
    // Get stored custom properties
    const storedProps = getDevice(deviceId) || {};
    
    // Merge in order of precedence: base < stored < updates
    return {
      ...baseDevice,
      ...storedProps,
      ...updates,
      id: deviceId, // Ensure ID is preserved
      ip: deviceId  // Ensure IP is preserved
    };
  }, [getDevice]);

  // Lock a device (collaboration mode only)
  const lockDevice = useCallback(async (deviceId) => {
    if (!isCollaborative || !collaboration) {
      // In solo mode, we don't need locks
      return true;
    }
    
    return collaboration.lockDevice(deviceId);
  }, [isCollaborative, collaboration]);

  // Unlock a device (collaboration mode only)
  const unlockDevice = useCallback((deviceId) => {
    if (!isCollaborative || !collaboration) {
      // In solo mode, we don't need locks
      return;
    }
    
    collaboration.unlockDevice(deviceId);
  }, [isCollaborative, collaboration]);

  // Check if a device is locked
  const isDeviceLocked = useCallback((deviceId) => {
    if (!isCollaborative || !collaboration) {
      // In solo mode, devices are never locked
      return false;
    }
    
    return collaboration.isDeviceLocked?.(deviceId) || false;
  }, [isCollaborative, collaboration]);

  // Check if a device is locked by the current user
  const isDeviceLockedByMe = useCallback((deviceId) => {
    if (!isCollaborative || !collaboration) {
      // In solo mode, the user can always edit
      return true;
    }
    
    return collaboration.isDeviceLockedByMe?.(deviceId) || false;
  }, [isCollaborative, collaboration]);

  // Check if a device is locked by another user
  const isDeviceLockedByOther = useCallback((deviceId) => {
    if (!isCollaborative || !collaboration) {
      // In solo mode, no other users exist
      return false;
    }
    
    return collaboration.isDeviceLockedByOther?.(deviceId) || false;
  }, [isCollaborative, collaboration]);

  // Return the hook's API
  return {
    // State
    deviceCache,
    isInitialized,
    isSyncing,
    pendingUpdates: Object.keys(pendingUpdates).length,
    
    // Core methods
    updateDevice,
    getDevice,
    getAllDevices,
    mergeDeviceState,
    
    // Database sync
    syncToDatabase: forceDatabaseSync,
    
    // Collaboration methods
    lockDevice,
    unlockDevice,
    isDeviceLocked,
    isDeviceLockedByMe,
    isDeviceLockedByOther,
  };
}
