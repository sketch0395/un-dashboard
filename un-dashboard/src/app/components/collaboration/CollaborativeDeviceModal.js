'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaLock, FaUnlock, FaUsers, FaSave, FaTimes, FaEdit, FaEye } from 'react-icons/fa';
import { useCollaboration } from '../../hooks/useCollaboration';
import { 
  DeviceLockIndicator, 
  TypingIndicator, 
  CursorPosition,
  CollaborationIndicator 
} from './CollaborationUI';

export function CollaborativeDeviceModal({ 
  device, 
  scanId, 
  isOpen, 
  onClose, 
  onSave,
  readOnly = false 
}) {
  const [localDevice, setLocalDevice] = useState(device);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  
  const collaboration = useCollaboration(scanId);
  const formRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const {
    isConnected,
    collaborators,
    lockDevice,
    unlockDevice,
    updateDevice,
    setTypingIndicator,
    setCursorPosition,
    isDeviceLockedByMe,
    isDeviceLockedByOther,
    getDeviceLock,
    getTypingIndicators
  } = collaboration;

  const deviceId = device?.id || device?.ip;
  const lock = getDeviceLock(deviceId);
  const isLocked = !!lock;
  const canEdit = !readOnly && (!isLocked || isDeviceLockedByMe(deviceId));

  // Sync device data when props change
  useEffect(() => {
    setLocalDevice(device);
    setHasUnsavedChanges(false);
  }, [device]);

  // Listen for collaboration updates
  useEffect(() => {
    const handleDeviceUpdate = (event) => {
      const { deviceId: updatedDeviceId, changes, userId } = event.detail;
      
      if (updatedDeviceId === deviceId && userId !== collaboration.user?._id) {
        // Apply remote changes
        setLocalDevice(prev => ({
          ...prev,
          ...changes
        }));
        setHasUnsavedChanges(false);
      }
    };

    const handleLockFailed = (event) => {
      const { deviceId: failedDeviceId, reason } = event.detail;
      if (failedDeviceId === deviceId) {
        setEditMode(false);
        alert(`Cannot edit device: ${reason}`);
      }
    };

    window.addEventListener('collaborationDeviceUpdate', handleDeviceUpdate);
    window.addEventListener('collaborationLockFailed', handleLockFailed);

    return () => {
      window.removeEventListener('collaborationDeviceUpdate', handleDeviceUpdate);
      window.removeEventListener('collaborationLockFailed', handleLockFailed);
    };
  }, [deviceId, collaboration.user]);

  // Auto-save changes with debouncing
  useEffect(() => {
    if (!hasUnsavedChanges || !isDeviceLockedByMe(deviceId)) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveChanges();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [localDevice, hasUnsavedChanges, deviceId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isDeviceLockedByMe(deviceId)) {
        unlockDevice(deviceId);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [deviceId, unlockDevice, isDeviceLockedByMe]);

  const handleStartEdit = useCallback(async () => {
    if (readOnly || isDeviceLockedByOther(deviceId)) return;
    
    if (!isDeviceLockedByMe(deviceId)) {
      lockDevice(deviceId);
    }
    setEditMode(true);
  }, [deviceId, readOnly, lockDevice, isDeviceLockedByMe, isDeviceLockedByOther]);

  const handleStopEdit = useCallback(() => {
    if (isDeviceLockedByMe(deviceId)) {
      // Save any pending changes before unlocking
      if (hasUnsavedChanges) {
        saveChanges();
      }
      unlockDevice(deviceId);
    }
    setEditMode(false);
    setFocusedField(null);
  }, [deviceId, unlockDevice, isDeviceLockedByMe, hasUnsavedChanges]);

  const handleFieldChange = useCallback((field, value) => {
    if (!canEdit) return;

    setLocalDevice(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  }, [canEdit]);

  const handleFieldFocus = useCallback((field, event) => {
    setFocusedField(field);
    
    // Send cursor position
    if (event?.target && isConnected) {
      const rect = event.target.getBoundingClientRect();
      setCursorPosition(deviceId, {
        x: rect.left + rect.width / 2,
        y: rect.top,
        field
      });
    }
  }, [deviceId, setCursorPosition, isConnected]);

  const handleFieldBlur = useCallback((field) => {
    setFocusedField(null);
    
    // Stop typing indicator
    if (isConnected) {
      setTypingIndicator(deviceId, field, false);
    }
  }, [deviceId, setTypingIndicator, isConnected]);

  const handleTyping = useCallback((field) => {
    if (!isConnected || !isDeviceLockedByMe(deviceId)) return;

    // Send typing indicator
    setTypingIndicator(deviceId, field, true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing indicator after delay
    typingTimeoutRef.current = setTimeout(() => {
      setTypingIndicator(deviceId, field, false);
    }, 1000);
  }, [deviceId, setTypingIndicator, isConnected, isDeviceLockedByMe]);

  const saveChanges = useCallback(async () => {
    if (!hasUnsavedChanges || !isDeviceLockedByMe(deviceId)) return;

    try {
      // Send changes via collaboration
      if (isConnected) {
        updateDevice(deviceId, localDevice, collaboration.sessionVersion);
      }

      // Also save locally
      if (onSave) {
        await onSave(localDevice);
      }

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving device changes:', error);
    }
  }, [
    deviceId, 
    localDevice, 
    hasUnsavedChanges, 
    isDeviceLockedByMe, 
    isConnected, 
    updateDevice, 
    collaboration.sessionVersion, 
    onSave
  ]);

  const handleSave = useCallback(() => {
    if (hasUnsavedChanges) {
      saveChanges();
    }
  }, [hasUnsavedChanges, saveChanges]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const shouldSave = confirm('You have unsaved changes. Save before closing?');
      if (shouldSave) {
        saveChanges();
      }
    }
    
    handleStopEdit();
    onClose();
  }, [hasUnsavedChanges, saveChanges, handleStopEdit, onClose]);

  if (!isOpen || !device) return null;

  const typingIndicators = getTypingIndicators(deviceId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Device Details: {device.ip || device.hostname}
            </h2>
            
            {/* Collaboration indicators */}
            <CollaborationIndicator 
              isConnected={isConnected}
              collaborators={collaborators}
            />
            
            <DeviceLockIndicator
              deviceId={deviceId}
              lock={lock}
              isLockedByMe={isDeviceLockedByMe(deviceId)}
              isLockedByOther={isDeviceLockedByOther(deviceId)}
              onUnlock={handleStopEdit}
            />
          </div>

          <div className="flex items-center space-x-2">
            {!readOnly && (
              <>
                {!editMode ? (
                  <button
                    onClick={handleStartEdit}
                    disabled={isDeviceLockedByOther(deviceId)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${
                      isDeviceLockedByOther(deviceId)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    <FaEdit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopEdit}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600"
                  >
                    <FaUnlock className="w-4 h-4" />
                    <span>Stop Editing</span>
                  </button>
                )}

                {hasUnsavedChanges && (
                  <button
                    onClick={handleSave}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                  >
                    <FaSave className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={handleClose}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600"
            >
              <FaTimes className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] relative" ref={formRef}>
          {/* Typing indicators */}
          {typingIndicators.length > 0 && (
            <div className="mb-4">
              <TypingIndicator indicators={typingIndicators} />
            </div>
          )}

          {/* Device form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IP Address
                </label>
                <input
                  type="text"
                  value={localDevice.ip || ''}
                  onChange={(e) => handleFieldChange('ip', e.target.value)}
                  onFocus={(e) => handleFieldFocus('ip', e)}
                  onBlur={() => handleFieldBlur('ip')}
                  onInput={() => handleTyping('ip')}
                  disabled={!canEdit}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    canEdit 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                />
                {getTypingIndicators(deviceId, 'ip').length > 0 && (
                  <TypingIndicator 
                    indicators={getTypingIndicators(deviceId, 'ip')} 
                    className="mt-1"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hostname
                </label>
                <input
                  type="text"
                  value={localDevice.hostname || ''}
                  onChange={(e) => handleFieldChange('hostname', e.target.value)}
                  onFocus={(e) => handleFieldFocus('hostname', e)}
                  onBlur={() => handleFieldBlur('hostname')}
                  onInput={() => handleTyping('hostname')}
                  disabled={!canEdit}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    canEdit 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                />
                {getTypingIndicators(deviceId, 'hostname').length > 0 && (
                  <TypingIndicator 
                    indicators={getTypingIndicators(deviceId, 'hostname')} 
                    className="mt-1"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MAC Address
                </label>
                <input
                  type="text"
                  value={localDevice.mac || ''}
                  onChange={(e) => handleFieldChange('mac', e.target.value)}
                  onFocus={(e) => handleFieldFocus('mac', e)}
                  onBlur={() => handleFieldBlur('mac')}
                  onInput={() => handleTyping('mac')}
                  disabled={!canEdit}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    canEdit 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operating System
                </label>
                <input
                  type="text"
                  value={localDevice.os || ''}
                  onChange={(e) => handleFieldChange('os', e.target.value)}
                  onFocus={(e) => handleFieldFocus('os', e)}
                  onBlur={() => handleFieldBlur('os')}
                  onInput={() => handleTyping('os')}
                  disabled={!canEdit}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    canEdit 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Type
                </label>
                <select
                  value={localDevice.type || ''}
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                  onFocus={(e) => handleFieldFocus('type', e)}
                  onBlur={() => handleFieldBlur('type')}
                  disabled={!canEdit}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    canEdit 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  <option value="">Unknown</option>
                  <option value="router">Router</option>
                  <option value="switch">Switch</option>
                  <option value="server">Server</option>
                  <option value="workstation">Workstation</option>
                  <option value="printer">Printer</option>
                  <option value="mobile">Mobile Device</option>
                  <option value="iot">IoT Device</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor
                </label>
                <input
                  type="text"
                  value={localDevice.vendor || ''}
                  onChange={(e) => handleFieldChange('vendor', e.target.value)}
                  onFocus={(e) => handleFieldFocus('vendor', e)}
                  onBlur={() => handleFieldBlur('vendor')}
                  onInput={() => handleTyping('vendor')}
                  disabled={!canEdit}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    canEdit 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={localDevice.status || 'unknown'}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  onFocus={(e) => handleFieldFocus('status', e)}
                  onBlur={() => handleFieldBlur('status')}
                  disabled={!canEdit}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    canEdit 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={localDevice.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  onFocus={(e) => handleFieldFocus('notes', e)}
                  onBlur={() => handleFieldBlur('notes')}
                  onInput={() => handleTyping('notes')}
                  disabled={!canEdit}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    canEdit 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                  placeholder="Add any additional notes about this device..."
                />
                {getTypingIndicators(deviceId, 'notes').length > 0 && (
                  <TypingIndicator 
                    indicators={getTypingIndicators(deviceId, 'notes')} 
                    className="mt-1"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Ports and Services */}
          {localDevice.ports && localDevice.ports.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Open Ports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localDevice.ports.map((port, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm font-medium">Port {port.port}/{port.protocol}</div>
                    {port.service && (
                      <div className="text-xs text-gray-600">{port.service}</div>
                    )}
                    {port.version && (
                      <div className="text-xs text-gray-500">{port.version}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status indicator */}
          {hasUnsavedChanges && (
            <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg text-sm">
              Unsaved changes
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
