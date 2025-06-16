'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";
import Modal from "./Modal";
import { 
    FaEdit, 
    FaSave, 
    FaTimes, 
    FaPlus, 
    FaTrash,
    FaLock,
    FaUnlock,
    FaUsers,
    FaEye
} from "react-icons/fa";
import { updateDeviceProperties } from "../utils/deviceManagementUtils";
import { DEVICE_TYPES, getDeviceTypeById, migrateDeviceType } from "../utils/deviceTypes";
import DeviceTypeSelector from "./DeviceTypeSelector";
import ParentDeviceSelector from "./ParentDeviceSelector";
import NetworkTopologyVisualization from "./NetworkTopologyVisualization";
import { 
    DeviceLockIndicator, 
    TypingIndicator,
    CursorPosition,
    CollaborationIndicator 
} from "./CollaborationUI";
import { useCollaboration } from "../hooks/useCollaboration";

const UnifiedDeviceModal = ({
    modalDevice, 
    setModalDevice, 
    onSave,
    onStartSSH,
    systemUptime,
    scanId = null,
    isCollaborative = false,
    readOnly = false
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [deviceHistory, setDeviceHistory] = useState([]);    
    const [expandedHistoryItems, setExpandedHistoryItems] = useState([0]);
    const [focusedField, setFocusedField] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    
    // Enhanced device with all necessary information loaded from localStorage
    const [enhancedDevice, setEnhancedDevice] = useState(null);
    
    // Collaboration refs
    const typingTimeoutRef = useRef(null);    const saveTimeoutRef = useRef(null);
    const formRef = useRef(null);

    // Always call the collaboration hook, but use it conditionally
    const collaboration = useCollaboration(isCollaborative ? scanId : null);
    
    const deviceId = modalDevice?.ip;    // Collaboration-related variables
    const isCollaborationConnected = isCollaborative && collaboration && collaboration.isConnected;
    const lock = isCollaborative && collaboration ? collaboration.getDeviceLock(deviceId) : null;
    const isLocked = !!lock;
    const isLockedByMe = isCollaborative && collaboration && collaboration.isDeviceLockedByMe(deviceId);
    const isLockedByOther = isCollaborative && collaboration && collaboration.isDeviceLockedByOther(deviceId);
    const canEdit = !readOnly && (!isLocked || isLockedByMe);
    
    // Toggle history item expansion
    const toggleHistoryItemExpansion = (index) => {
        setExpandedHistoryItems(prev => {
            if (prev.includes(index)) {
                return prev.filter(i => i !== index);
            } else {
                return [...prev, index];
            }
        });
    };    
    
    // Load device data from localStorage when modal opens
    useEffect(() => {
        if (modalDevice?.ip && typeof window !== 'undefined') {
            const savedCustomProperties = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
            const savedDeviceData = savedCustomProperties[modalDevice.ip] || {};
              // Merge modalDevice with saved properties, prioritizing saved data
            const mergedDevice = {
                ...modalDevice,                // Load saved properties, fallback to modalDevice properties
                name: savedDeviceData.name || modalDevice.name,
                networkRole: migrateDeviceType(savedDeviceData.networkRole || modalDevice.networkRole || modalDevice.category),
                category: savedDeviceData.category || modalDevice.category,
                notes: savedDeviceData.notes || modalDevice.notes || [],
                
                // New unified parent device field
                parentDevice: savedDeviceData.parentDevice || modalDevice.parentDevice,
                
                // Legacy fields for backward compatibility
                parentGateway: savedDeviceData.parentGateway || modalDevice.parentGateway,
                parentSwitch: savedDeviceData.parentSwitch || modalDevice.parentSwitch,
                connectedGateways: savedDeviceData.connectedGateways || modalDevice.connectedGateways || [],
                connectedSwitches: savedDeviceData.connectedSwitches || modalDevice.connectedSwitches || [],
                isMainGateway: savedDeviceData.isMainGateway || modalDevice.isMainGateway || false,
                color: savedDeviceData.color || modalDevice.color,
                icon: savedDeviceData.icon || modalDevice.icon
            };            
            setEnhancedDevice(mergedDevice);
            setDeviceHistory(savedDeviceData.history || []);
        } else {
            setEnhancedDevice(null);            setDeviceHistory([]);
        }    
    }, [modalDevice]);

    // Listen for collaboration updates if in collaborative mode
    useEffect(() => {
        if (!isCollaborative || !collaboration || !deviceId) return;
        
        const handleDeviceUpdate = (event) => {
            const { deviceId: updatedDeviceId, changes, userId } = event.detail;
            
            if (updatedDeviceId === deviceId) {
                // Apply changes from collaboration system
                setEnhancedDevice(prev => ({
                    ...prev,
                    ...changes
                }));
                setHasUnsavedChanges(false);
            }
        };

        const handleLockFailed = (event) => {
            const { deviceId: failedDeviceId, reason } = event.detail;
            if (failedDeviceId === deviceId) {
                setIsEditing(false);
                alert(`Cannot edit device: ${reason}`);
            }
        };

        window.addEventListener('collaborationDeviceUpdate', handleDeviceUpdate);
        window.addEventListener('collaborationLockFailed', handleLockFailed);

        return () => {
            window.removeEventListener('collaborationDeviceUpdate', handleDeviceUpdate);
            window.removeEventListener('collaborationLockFailed', handleLockFailed);        };
    }, [deviceId, collaboration, isCollaborative]);    

    // Cleanup on unmount for collaboration
    useEffect(() => {
        return () => {
            if (isCollaborative && isLockedByMe && collaboration) {
                collaboration.unlockDevice(deviceId);
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };    }, [deviceId, isLockedByMe, isCollaborative, collaboration]);

    const handleCloseModal = useCallback(() => {
        // If in collaborative mode and we have the lock, release it
        if (isCollaborative && isLockedByMe) {
            collaboration.unlockDevice(deviceId);
        }
          setModalDevice(null);
        setIsEditing(false);
    }, [isCollaborative, isLockedByMe, collaboration, deviceId, setModalDevice, setIsEditing]);    // Handle main device save
    const handleSave = useCallback(() => {
        if (enhancedDevice) {
            // Add to history if there were changes
            const newHistory = [...deviceHistory];            // Get the previous history entry to compare changes
            const previousEntry = deviceHistory.length > 0 ? deviceHistory[0] : null;
            const previousChanges = (previousEntry && previousEntry.changes) ? previousEntry.changes : {};
            
            // Track only the properties that have actually changed
            const changes = {};
              // Compare basic properties (handle undefined values properly)
            const prevName = previousChanges ? previousChanges.name : undefined;
            const prevCategory = previousChanges ? previousChanges.category : undefined;
            const prevNetworkRole = previousChanges ? previousChanges.networkRole : undefined;
              if (enhancedDevice.name !== prevName) changes.name = enhancedDevice.name;
            if (enhancedDevice.category !== prevCategory) changes.category = enhancedDevice.category;
            if (enhancedDevice.networkRole !== prevNetworkRole) changes.networkRole = enhancedDevice.networkRole;
            
            // Compare new unified parent device field
            const prevParentDevice = previousChanges ? previousChanges.parentDevice : undefined;
            if (enhancedDevice.parentDevice !== prevParentDevice) changes.parentDevice = enhancedDevice.parentDevice;
              // Legacy connection comparisons for backward compatibility
            if (['switch', 'gateway', 'router'].includes(enhancedDevice.networkRole)) {
                const prevParentGateway = previousChanges ? previousChanges.parentGateway : undefined;
                if (enhancedDevice.parentGateway !== prevParentGateway) {
                    changes.parentGateway = enhancedDevice.parentGateway;
                }
                
                // Compare arrays properly
                const prevGateways = (previousChanges && previousChanges.connectedGateways) ? previousChanges.connectedGateways : [];
                const currGateways = enhancedDevice.connectedGateways || [];
                if (JSON.stringify(prevGateways) !== JSON.stringify(currGateways)) {
                    changes.connectedGateways = currGateways;
                }
                
                const prevSwitches = (previousChanges && previousChanges.connectedSwitches) ? previousChanges.connectedSwitches : [];
                const currSwitches = enhancedDevice.connectedSwitches || [];
                if (JSON.stringify(prevSwitches) !== JSON.stringify(currSwitches)) {
                    changes.connectedSwitches = currSwitches;
                }            
            } else {
                // For regular devices, compare parent switch
                const prevParentSwitch = previousChanges ? previousChanges.parentSwitch : undefined;
                if (enhancedDevice.parentSwitch !== prevParentSwitch) {
                    changes.parentSwitch = enhancedDevice.parentSwitch;
                }
            }
            
            // Compare notes
            const prevNotes = (previousChanges && previousChanges.notes) ? previousChanges.notes : [];
            const currNotes = enhancedDevice.notes || [];
            if (JSON.stringify(prevNotes) !== JSON.stringify(currNotes)) {
                changes.notes = currNotes;
            }
            
            // Only add a history entry if something actually changed
            if (Object.keys(changes).length > 0) {
                newHistory.unshift({
                    timestamp: new Date().toISOString(),
                    changes: changes
                });
            }
            
            // Add history to the device without overriding parent connections
            const deviceToSave = {
                ...enhancedDevice,
                history: newHistory
            };            // Update device properties in localStorage
            updateDeviceProperties(deviceToSave);
            
            // Update local history state to reflect the saved changes
            setDeviceHistory(newHistory);
            
            // If in collaborative mode, update through the collaboration API
            if (isCollaborative && collaboration) {
                collaboration.updateDevice(deviceId, deviceToSave, collaboration.sessionVersion);
            }

            // Call parent save handler
            onSave(deviceToSave);
            
            // Reset state
            setHasUnsavedChanges(false);
            
            // For collaborative mode, don't close the modal automatically
            if (!isCollaborative) {
                handleCloseModal();
            }
        }
    }, [enhancedDevice, deviceHistory, isCollaborative, collaboration, deviceId, onSave, handleCloseModal]);

    // Handle toggling edit mode with collaboration lock support
    const handleToggleEdit = useCallback(async () => {
        if (readOnly) return;
        
        if (!isEditing) {
            // Starting edit mode
            if (isCollaborative) {
                if (isLockedByOther) {
                    alert(`This device is currently being edited by ${lock?.username || 'another user'}`);
                    return;
                }
                
                if (!isLockedByMe && collaboration) {
                    await collaboration.lockDevice(deviceId);
                }
            }
            setIsEditing(true);        } else {
            // Ending edit mode - call the full save function
            if (hasUnsavedChanges && enhancedDevice) {
                handleSave();
            }
            
            if (isCollaborative && isLockedByMe && collaboration) {
                collaboration.unlockDevice(deviceId);
            }
            setIsEditing(false);
            setFocusedField(null);
        }
    }, [readOnly, isEditing, isCollaborative, isLockedByOther, isLockedByMe, deviceId, lock, hasUnsavedChanges, enhancedDevice, collaboration, handleSave]);// Handle field focus and cursor position for collaboration
    const handleFieldFocus = useCallback((field, event) => {
        setFocusedField(field);
        
        // Send cursor position for collaboration
        if (isCollaborationConnected && event?.target && collaboration) {
            const rect = event.target.getBoundingClientRect();
            collaboration.setCursorPosition(deviceId, {
                x: rect.left + rect.width / 2,
                y: rect.top,
                field
            });
        }
    }, [deviceId, isCollaborationConnected, collaboration]);

    // Handle field blur and typing indicator
    const handleFieldBlur = useCallback((field) => {
        setFocusedField(null);
        
        // Stop typing indicator for collaboration
        if (isCollaborationConnected && collaboration) {
            collaboration.setTypingIndicator(deviceId, field, false);
        }
    }, [deviceId, isCollaborationConnected, collaboration]);

    // Handle typing indicator for collaboration
    const handleTyping = useCallback((field) => {
        if (!isCollaborationConnected || !isLockedByMe || !collaboration) return;

        // Send typing indicator
        collaboration.setTypingIndicator(deviceId, field, true);

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing indicator after delay
        typingTimeoutRef.current = setTimeout(() => {
            collaboration.setTypingIndicator(deviceId, field, false);
        }, 1000);
    }, [deviceId, isCollaborationConnected, isLockedByMe, collaboration]);

    // Handle field change with support for collaboration
    const handleFieldChange = useCallback((field, value) => {
        if (!canEdit) return;

        setEnhancedDevice(prev => ({
            ...prev,
            [field]: value
        }));
        setHasUnsavedChanges(true);        
        if (isCollaborationConnected) {
            handleTyping(field);
        }    }, [canEdit, isCollaborationConnected, handleTyping]);
    
    // Auto-save changes with debouncing in collaboration mode
    useEffect(() => {
        if (!isCollaborative || !hasUnsavedChanges || !isLockedByMe || !collaboration) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            // Auto-save implementation - call the full save logic including history
            if (enhancedDevice) {
                handleSave();
            }
        }, 2000); // Auto-save after 2 seconds of inactivity

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [enhancedDevice, hasUnsavedChanges, isLockedByMe, isCollaborative, collaboration, deviceId, onSave, handleSave]);

    // Note management
    const handleAddNote = () => {
        if (!newNote.trim()) return;
        
        const newNoteObj = {
            id: Date.now(),
            text: newNote.trim(),
            timestamp: new Date().toISOString()
        };
        
        const updatedNotes = [...(enhancedDevice.notes || []), newNoteObj];
        setEnhancedDevice(prev => ({ ...prev, notes: updatedNotes }));
        setNewNote('');
        setHasUnsavedChanges(true);
    };

    const handleDeleteNote = (noteId) => {
        const updatedNotes = enhancedDevice.notes.filter(note => note.id !== noteId);
        setEnhancedDevice(prev => ({ ...prev, notes: updatedNotes }));
        setHasUnsavedChanges(true);
    };

    // Format date
    const formatDate = (isoString) => {
        try {
            const date = new Date(isoString);
            
            // Get date components
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            // Get time components
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        } catch (e) {
            console.error("Invalid date string:", isoString);            return "Invalid date";
        }
    };

    // Format string with separator and fallback
    const formatWithFallback = (str, separator = ", ", fallback = "-") => {
        if (!str || str.length === 0) return fallback;
        if (Array.isArray(str)) return str.join(separator) || fallback;
        return str;
    };    // Get device icon
    const getDeviceIcon = (networkRole) => {
        const deviceType = getDeviceTypeById(networkRole || 'unknown');
        if (deviceType && deviceType.icon) {
            const IconComponent = deviceType.icon;
            return <IconComponent />;
        }
        return '🖥️';
    };

    // Determine active section for visualization targeting
    const determineActiveSection = () => {
        if (!enhancedDevice) return null;
        
        if (['switch', 'gateway', 'router'].includes(enhancedDevice.networkRole)) {
            return 'network';
        }
        
        return 'device';
    };

    // If no device is selected, don't render the modal
    if (!modalDevice) return null;

    return (
        <Modal 
            isOpen={!!modalDevice} 
            onClose={handleCloseModal} 
            title={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                        <span className="mr-2 text-xl">{getDeviceIcon(enhancedDevice?.networkRole)}</span>
                        <h2 className="text-xl font-semibold truncate">
                            {enhancedDevice?.name || enhancedDevice?.hostname || modalDevice?.ip || "Device Details"}
                        </h2>
                    </div>
                    
                    {/* Collaboration indicators */}
                    {isCollaborative && (
                        <div className="flex items-center space-x-2">
                            <CollaborationIndicator 
                                isConnected={collaboration?.isConnected}
                                collaborators={collaboration?.collaborators || []}
                                className="text-xs"
                            />
                            
                            <DeviceLockIndicator 
                                deviceId={deviceId}
                                lock={lock}
                                isLockedByMe={isLockedByMe}
                                isLockedByOther={isLockedByOther}
                                onUnlock={handleToggleEdit}
                                className="text-xs" 
                            />
                        </div>
                    )}
                </div>
            } 
            size="lg"
        >
            {enhancedDevice && (
                <div className="flex flex-col space-y-6 p-1" ref={formRef}>
                    {/* Collaboration typing indicators */}
                    {isCollaborative && (
                        <TypingIndicator 
                            indicators={collaboration?.getTypingIndicators(deviceId) || []}
                            className="mb-2"
                        />
                    )}

                    {/* Device information section */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-800">Device Information</h3>
                            
                            <div className="flex space-x-2 items-center">
                                {/* Display read-only notification if applicable */}
                                {readOnly && (
                                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center">
                                        <FaEye className="mr-1 w-3 h-3" /> View Only
                                    </div>
                                )}
                                
                                {!readOnly && (
                                    <button 
                                        onClick={handleToggleEdit} 
                                        disabled={readOnly || isLockedByOther}
                                        className={`px-3 py-1 rounded-full text-white text-sm flex items-center ${
                                            isEditing ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                                        } ${
                                            (readOnly || isLockedByOther) ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        {isEditing ? (
                                            <>
                                                <FaSave className="mr-1" /> Save
                                            </>
                                        ) : (
                                            <>
                                                <FaEdit className="mr-1" /> {isCollaborative ? 'Lock & Edit' : 'Edit'}
                                            </>
                                        )}
                                    </button>
                                )}
                                
                                {/* SSH Button if provided */}
                                {onStartSSH && (
                                    <button 
                                        onClick={() => onStartSSH(enhancedDevice)}
                                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm flex items-center"
                                    >
                                        <span className="mr-1">🔒</span> SSH
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left column - Basic information */}
                            <div className="space-y-4">
                                {/* IP Address */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                                    <input
                                        type="text"
                                        disabled={true}  // IP addresses are always read-only
                                        value={enhancedDevice?.ip || ''}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                                    />
                                </div>                                {/* Hostname/Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name / Hostname
                                    </label>
                                    <input
                                        type="text"
                                        disabled={!isEditing}
                                        value={enhancedDevice?.name || ''}
                                        onChange={(e) => handleFieldChange('name', e.target.value)}
                                        onFocus={(e) => handleFieldFocus('name', e)}
                                        onBlur={() => handleFieldBlur('name')}
                                        onKeyDown={() => handleTyping('name')}
                                        placeholder={enhancedDevice?.hostname || 'Set a name for this device'}
                                        className={`w-full p-2 border rounded-md ${
                                            isEditing ? 'border-blue-300 bg-white' : 'border-gray-300 bg-gray-50'
                                        }`}
                                    />
                                </div>
                                
                                {/* MAC Address */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
                                    <input
                                        type="text"
                                        disabled={true}
                                        value={formatWithFallback(enhancedDevice?.mac)}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                                    />
                                </div>
                                
                                {/* Vendor */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                                    <input
                                        type="text"
                                        disabled={true}
                                        value={formatWithFallback(enhancedDevice?.vendor)}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                                    />
                                </div>
                                
                                {/* Last Seen */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Seen</label>
                                    <input
                                        type="text"
                                        disabled={true}
                                        value={enhancedDevice?.lastSeen ? formatDate(enhancedDevice.lastSeen) : '-'}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                                    />
                                </div>

                                {/* Uptime if available */}
                                {enhancedDevice?.uptime && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Device Uptime</label>
                                        <input
                                            type="text"
                                            disabled={true}
                                            value={enhancedDevice.uptime}
                                            className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                                        />
                                    </div>
                                )}
                            </div>
                            
                            {/* Right column - Network information */}
                            <div className="space-y-4">                                {/* Device Type / Network Role */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>                                    <DeviceTypeSelector
                                        value={enhancedDevice?.category || enhancedDevice?.networkRole}
                                        onChange={(value) => {
                                            handleFieldChange('category', value);
                                            handleFieldChange('networkRole', value); // Keep backward compatibility
                                        }}
                                        disabled={!isEditing}
                                        onFocus={(e) => handleFieldFocus('category', e)}
                                        onBlur={() => handleFieldBlur('category')}
                                        onKeyDown={() => handleTyping('category')}
                                        className={`w-full ${
                                            isEditing ? 'border-blue-300 bg-white' : 'border-gray-300 bg-gray-50'
                                        }`}
                                    />
                                </div>
                                  {/* Parent Device */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent Device</label>                                    <ParentDeviceSelector
                                        deviceType={enhancedDevice?.category || enhancedDevice?.networkRole}
                                        currentParent={enhancedDevice?.parentDevice}
                                        onParentChange={(value) => handleFieldChange('parentDevice', value)}
                                        excludeDeviceId={enhancedDevice?.ip}
                                        className={`w-full ${
                                            isEditing ? 'border-blue-300 bg-white' : 'border-gray-300 bg-gray-50'
                                        }`}
                                    />
                                </div>
                                
                                {/* Open Ports if available */}
                                {enhancedDevice?.openPorts && enhancedDevice.openPorts.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Open Ports</label>
                                        <input
                                            type="text"
                                            disabled={true}
                                            value={enhancedDevice.openPorts.join(', ')}
                                            className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                                        />
                                    </div>
                                )}
                                
                                {/* OS if available */}
                                {enhancedDevice?.os && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Operating System</label>
                                        <input
                                            type="text"
                                            disabled={true}
                                            value={enhancedDevice.os}
                                            className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Notes Section */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-medium text-gray-800 mb-4">Notes</h3>
                        
                        {/* Existing notes */}
                        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                            {enhancedDevice.notes && enhancedDevice.notes.length > 0 ? (
                                enhancedDevice.notes.map((note) => (
                                    <div key={note.id} className="flex space-x-2 bg-gray-50 p-3 rounded-md">
                                        <div className="flex-grow">
                                            <p className="text-gray-800">{note.text}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formatDate(note.timestamp)}
                                            </p>
                                        </div>
                                        {isEditing && (
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                className="text-red-500 hover:text-red-700"
                                                title="Delete note"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 italic">No notes for this device.</p>
                            )}
                        </div>
                        
                        {/* Add new note */}
                        {isEditing && (
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    onFocus={(e) => handleFieldFocus('notes', e)}
                                    onBlur={() => handleFieldBlur('notes')}
                                    onKeyDown={(e) => {
                                        handleTyping('notes');
                                        if (e.key === 'Enter' && newNote.trim()) {
                                            handleAddNote();
                                        }
                                    }}
                                    placeholder="Add a note about this device..."
                                    className="flex-grow p-2 border border-gray-300 rounded-md"
                                />
                                <button
                                    onClick={handleAddNote}
                                    disabled={!newNote.trim()}
                                    className={`px-3 py-2 rounded-md text-white flex items-center ${
                                        newNote.trim() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'
                                    }`}
                                >
                                    <FaPlus className="mr-1" /> Add
                                </button>
                            </div>
                        )}
                    </div>
                      {/* History Section - Always show for debugging */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-medium text-gray-800 mb-4">
                            History ({deviceHistory.length} entries)
                        </h3>
                        
                        {deviceHistory.length > 0 ? (
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {deviceHistory.map((item, index) => (
                                    <div 
                                        key={index} 
                                        className="border border-gray-200 rounded-md overflow-hidden"
                                    >
                                        <div 
                                            onClick={() => toggleHistoryItemExpansion(index)}
                                            className="flex justify-between items-center p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                                        >
                                            <span className="text-sm font-medium">
                                                {formatDate(item.timestamp)}
                                            </span>
                                            <span className="text-xs text-gray-600">
                                                {expandedHistoryItems.includes(index) ? 'Hide Details' : 'Show Details'}
                                            </span>
                                        </div>
                                        
                                        {expandedHistoryItems.includes(index) && (
                                            <div className="p-3 text-sm space-y-2">
                                                {Object.entries(item.changes).map(([key, value]) => (
                                                    <div key={key}>
                                                        <span className="font-medium">{key}: </span>
                                                        <span className="text-gray-700">
                                                            {Array.isArray(value) 
                                                                ? value.join(', ') || 'none'
                                                                : value || 'none'
                                                            }
                                                        </span>
                                                    </div>                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 italic">
                                No history entries yet. Make some changes to see them here.
                            </div>
                        )}
                    </div>
                    
                    {/* Network visualization section for the device */}
                    <NetworkTopologyVisualization
                        device={enhancedDevice}
                        activeSection={determineActiveSection()}
                    />

                    {/* Actions row */}
                    <div className="flex justify-end space-x-3 border-t pt-4 mt-4">
                        <button
                            onClick={handleCloseModal}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Close
                        </button>
                        
                        {!readOnly && (isEditing || hasUnsavedChanges) && (
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                                disabled={isCollaborative && isLockedByOther}
                            >
                                <FaSave className="mr-2" /> Save Changes
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            {/* Display cursor positions from other users */}
            {isCollaborative && collaboration?.cursorPositions && Array.from(collaboration.cursorPositions.values()).map((cursor, index) => (
                cursor.deviceId === deviceId && cursor.userId !== collaboration.user?.userId && (
                    <CursorPosition 
                        key={`cursor-${index}`}
                        cursor={cursor}
                    />
                )
            ))}
        </Modal>
    );
};

export default UnifiedDeviceModal;