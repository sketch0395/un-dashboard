'use client';

import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { 
    FaEdit, 
    FaSave, 
    FaTimes, 
    FaPlus, 
    FaTrash,
    FaServer,
    FaDatabase,
    FaNetworkWired,
    FaShieldAlt,
    FaMicrochip,
    FaDesktop,
    FaMobile,
    FaPrint,
    FaCamera,
    FaRoad
} from "react-icons/fa";
import { updateDeviceProperties } from "../utils/deviceManagementUtils";

const UnifiedDeviceModal = ({
    modalDevice, 
    setModalDevice, 
    onSave,
    onStartSSH,
    systemUptime 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [deviceHistory, setDeviceHistory] = useState([]);    // State to track which history items are expanded (first item expanded by default)
    const [expandedHistoryItems, setExpandedHistoryItems] = useState([0]);
    
    // Toggle history item expansion
    const toggleHistoryItemExpansion = (index) => {
        setExpandedHistoryItems(prev => {
            if (prev.includes(index)) {
                return prev.filter(i => i !== index);
            } else {
                return [...prev, index];
            }
        });
    };    // Enhanced device with all necessary information loaded from localStorage
    const [enhancedDevice, setEnhancedDevice] = useState(null);
    
    // Load device data from localStorage when modal opens
    useEffect(() => {
        if (modalDevice?.ip && typeof window !== 'undefined') {
            const savedCustomProperties = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
            const savedDeviceData = savedCustomProperties[modalDevice.ip] || {};
            
            // Merge modalDevice with saved properties, prioritizing saved data
            const mergedDevice = {
                ...modalDevice,
                // Load saved properties, fallback to modalDevice properties
                name: savedDeviceData.name || modalDevice.name,
                networkRole: savedDeviceData.networkRole || modalDevice.networkRole || modalDevice.category,
                category: savedDeviceData.category || modalDevice.category,
                notes: savedDeviceData.notes || modalDevice.notes || [],
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
            setEnhancedDevice(null);
            setDeviceHistory([]);
        }
    }, [modalDevice]);    // Pre-defined device types with icons and colors
    const deviceTypes = [
        { name: "Production Server", icon: FaServer, color: "#10b981" },
        { name: "Development Server", icon: FaServer, color: "#8b5cf6" },
        { name: "Database", icon: FaDatabase, color: "#f59e0b" },
        { name: "Switch", icon: FaNetworkWired, color: "#06b6d4" },
        { name: "Firewall", icon: FaShieldAlt, color: "#ef4444" },
        { name: "IoT Device", icon: FaMicrochip, color: "#f97316" },
        { name: "Workstation", icon: FaDesktop, color: "#6b7280" },
        { name: "Mobile Device", icon: FaMobile, color: "#ec4899" },
        { name: "Printer", icon: FaPrint, color: "#84cc16" },
        { name: "Camera", icon: FaCamera, color: "#14b8a6" },
        { name: "Gateway", icon: FaRoad, color: "#fbbf24" },
        { name: "Other", icon: FaMicrochip, color: "#9ca3af" }
    ];

    // Helper function to get device type configuration
    const getDeviceTypeConfig = (typeName) => {
        return deviceTypes.find(type => type.name === typeName) || deviceTypes[deviceTypes.length - 1]; // Default to "Other"
    };

    useEffect(() => {
        if (enhancedDevice?.ip && typeof window !== 'undefined') {
            const savedCustomProperties = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
            const deviceData = savedCustomProperties[enhancedDevice.ip] || {};
            setDeviceHistory(deviceData.history || []);
        }
    }, [enhancedDevice?.ip]);    // Handle main device save
    const handleSave = () => {
        if (enhancedDevice) {
            console.log("Saving device with the following relationships:", {
                ip: enhancedDevice.ip,
                networkRole: enhancedDevice.networkRole,
                parentGateway: enhancedDevice.parentGateway,
                parentSwitch: enhancedDevice.parentSwitch,
                connectedGateways: enhancedDevice.connectedGateways,
                connectedSwitches: enhancedDevice.connectedSwitches
            });
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
            if (enhancedDevice.networkRole !== prevNetworkRole) changes.networkRole = enhancedDevice.networkRole;            // Compare connection properties based on device role
            if (enhancedDevice.networkRole === 'Switch' || enhancedDevice.networkRole === 'Gateway' || enhancedDevice.networkRole === 'Router' || 
                enhancedDevice.networkRole === 'switch' || enhancedDevice.networkRole === 'gateway') {
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
            }
            
            if (enhancedDevice.networkRole !== 'Gateway' && enhancedDevice.networkRole !== 'Switch' && enhancedDevice.networkRole !== 'Router' && 
                enhancedDevice.networkRole !== 'gateway' && enhancedDevice.networkRole !== 'switch') {
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
              // DEBUG: Check connections
            if (enhancedDevice.networkRole === 'Switch' || enhancedDevice.networkRole === 'Gateway' || enhancedDevice.networkRole === 'Router' ||
                enhancedDevice.networkRole === 'switch' || enhancedDevice.networkRole === 'gateway') {
                console.log(`DEBUG - ${enhancedDevice.networkRole} parentGateway before save: "${enhancedDevice.parentGateway}"`);
                console.log(`DEBUG - ${enhancedDevice.networkRole} connected gateways before save:`, enhancedDevice.connectedGateways);
                console.log(`DEBUG - ${enhancedDevice.networkRole} parentSwitch before save: "${enhancedDevice.parentSwitch}"`);
                console.log(`DEBUG - ${enhancedDevice.networkRole} connected switches before save:`, enhancedDevice.connectedSwitches);
            }

            // DO NOT modify or nullify the parent relationships that are already set in the enhancedDevice
            // Instead, use them directly
            
            // Add history to the device without overriding parent connections
            const deviceToSave = {
                ...enhancedDevice,
                history: newHistory
                // DO NOT explicitly set parentGateway/parentSwitch here, as they are already in enhancedDevice
            };

            // Update device properties in localStorage
            updateDeviceProperties(deviceToSave);            // Call parent save handler
            onSave(deviceToSave);
            handleCloseModal();
        }
    };    // Note management
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
    };

    const handleDeleteNote = (noteId) => {
        const updatedNotes = enhancedDevice.notes.filter(note => note.id !== noteId);
        setEnhancedDevice(prev => ({ ...prev, notes: updatedNotes }));
    };// Format date
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
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            // Format: YYYY-MM-DD HH:MM:SS
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch (error) {
            return 'Invalid date';
        }
    };
    
    // Generate a summary of changes
    const generateChangeSummary = (changes) => {
        if (!changes || Object.keys(changes).length === 0) {
            return "No changes";
        }
        
        const changedItems = [];
          if (changes.name !== undefined) changedItems.push("name");
        if (changes.category !== undefined) changedItems.push("category");
        if (changes.networkRole !== undefined) changedItems.push("device type");
        if (changes.parentGateway !== undefined) changedItems.push("parent gateway");
        if (changes.parentSwitch !== undefined) changedItems.push("parent switch");
        if (changes.connectedGateways !== undefined) changedItems.push("gateway connections");
        if (changes.connectedSwitches !== undefined) changedItems.push("switch connections");
        if (changes.notes !== undefined) changedItems.push("notes");
        
        if (changedItems.length === 0) {
            return "Unknown changes";
        } else if (changedItems.length === 1) {
            return `Updated ${changedItems[0]}`;
        } else {
            const lastItem = changedItems.pop();
            return `Updated ${changedItems.join(', ')} and ${lastItem}`;
        }
    };    const handleCloseModal = () => {
        setModalDevice(null);
        setEnhancedDevice(null);
        setDeviceHistory([]);
        setIsEditing(false);
        setNewNote('');
        setExpandedHistoryItems([0]);
    };

    return (
        <Modal isVisible={!!enhancedDevice} onClose={handleCloseModal}>
            <div className="max-h-[80vh] overflow-y-auto pr-2">
                {/* Header Section */}
                <div className="sticky top-0 bg-gray-800 z-10 pb-2">
                    <div className="flex justify-between mb-4">                        {isEditing ? (
                            <input
                                type="text"
                                value={enhancedDevice?.name || ""}
                                onChange={(e) =>
                                    setEnhancedDevice((prev) => ({ ...prev, name: e.target.value }))
                                }
                                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded mr-2"
                                placeholder="Enter device name"
                            />                        ) : (
                            <div className="flex items-center">
                                <h2 className="text-white text-xl py-2">{enhancedDevice?.name || "Edit Device"}</h2>
                                {enhancedDevice?.networkRole && (
                                    <div className="ml-3 flex items-center">
                                        {(() => {
                                            const typeConfig = getDeviceTypeConfig(enhancedDevice.networkRole);
                                            const IconComponent = typeConfig.icon;
                                            return (
                                                <div className="flex items-center bg-gray-700 px-2 py-1 rounded">
                                                    <div 
                                                        className="w-2 h-2 rounded-full mr-2" 
                                                        style={{ backgroundColor: typeConfig.color }}
                                                    ></div>
                                                    <IconComponent 
                                                        className="mr-1" 
                                                        style={{ color: typeConfig.color }}
                                                        size={14}
                                                    />
                                                    <span className="text-xs text-gray-300">{enhancedDevice.networkRole}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="flex items-center">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="p-2 text-blue-400 hover:text-blue-300"
                                        title="Save changes"
                                    >
                                        <FaSave />
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="p-2 text-gray-400 hover:text-gray-300"
                                        title="Cancel editing"
                                    >
                                        <FaTimes />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 text-blue-400 hover:text-blue-300"
                                    title="Edit device name"
                                >
                                    <FaEdit />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="text-gray-400 text-sm">{enhancedDevice?.ip}</div>
                </div>                {/* Network Role/Device Type Section */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-300 mb-1">Device Type</label>
                    <div className="relative">
                        <select
                            value={enhancedDevice?.networkRole || ""}
                            onChange={(e) => {
                                const newRole = e.target.value;
                                console.log("Device type changing from", enhancedDevice?.networkRole, "to", newRole);
                                
                                setEnhancedDevice((prev) => {
                                    const updated = { ...prev, networkRole: newRole };
                                    
                                    // Handle role-specific logic
                                    if (newRole === 'Gateway') {
                                        // Gateways don't connect to other gateways
                                        updated.parentGateway = null;
                                        updated.parentSwitch = null;
                                        updated.connectedGateways = updated.connectedGateways || [];
                                        updated.connectedSwitches = updated.connectedSwitches || [];
                                        updated.isMainGateway = updated.isMainGateway || false;
                                    } else if (newRole === 'Switch') {
                                        // Switches can connect to gateways but not other switches as parent
                                        updated.connectedSwitches = updated.connectedSwitches || [];
                                        updated.connectedGateways = updated.connectedGateways || [];
                                    } else {
                                        // All other devices are regular devices that can connect to switches/gateways
                                        updated.connectedGateways = null;
                                        updated.connectedSwitches = null;
                                        updated.isMainGateway = null;
                                    }
                                    
                                    return updated;
                                });
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded appearance-none"
                        >
                            <option value="">Select device type</option>
                            {deviceTypes.map(type => (
                                <option key={type.name} value={type.name}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                        
                        {/* Display icon and color indicator for selected type */}
                        {enhancedDevice?.networkRole && (
                            <div className="absolute right-10 top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none">
                                {(() => {
                                    const typeConfig = getDeviceTypeConfig(enhancedDevice.networkRole);
                                    const IconComponent = typeConfig.icon;
                                    return (
                                        <div className="flex items-center">
                                            <div 
                                                className="w-3 h-3 rounded-full mr-2" 
                                                style={{ backgroundColor: typeConfig.color }}
                                            ></div>
                                            <IconComponent 
                                                className="text-gray-400" 
                                                style={{ color: typeConfig.color }}
                                                size={16}
                                            />
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
                  {/* Main Gateway Checkbox - only shown when device type is Gateway */}
                {enhancedDevice?.networkRole === 'Gateway' && (
                    <div className="mb-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isMainGateway"
                                checked={enhancedDevice.isMainGateway || false}                                onChange={(e) => {
                                    setEnhancedDevice((prev) => ({
                                        ...prev,
                                        isMainGateway: e.target.checked
                                    }));
                                }}
                                className="mr-2 h-4 w-4"
                            />
                            <label htmlFor="isMainGateway" className="text-sm text-gray-300">
                                Set as Main Gateway
                            </label>
                        </div>
                        <p className="text-xs text-gray-400 ml-6 mt-1">
                            Main gateways serve as the root nodes for network hierarchy and can connect to sub-gateways
                        </p>
                    </div>
                )}                {/* Connection Sections */}
                {/* 1. Gateway Connections - only shown for switches, routers, and other gateways */}
                {(enhancedDevice?.networkRole === 'Switch' || enhancedDevice?.networkRole === 'Router' || enhancedDevice?.networkRole === 'Gateway') && (
                    <div className="mb-4">
                        <label className="block text-sm text-gray-300 mb-1">
                            Connected to Gateway(s)
                        </label>
                        
                        <div>
                            {/* Show important debug info about current connections */}
                            <div className="text-xs text-gray-400 mb-2">
                                {Array.isArray(enhancedDevice?.connectedGateways) && enhancedDevice.connectedGateways.length > 0 ? 
                                    `Connected to ${enhancedDevice.connectedGateways.length} gateway(s)` : 
                                    enhancedDevice?.parentGateway ? 
                                        `Currently connected to gateway: ${enhancedDevice.parentGateway}` :
                                        'Not connected to any gateway'
                                }
                            </div>
                              {/* List of gateways with checkboxes */}
                            <div className="max-h-32 overflow-y-auto bg-gray-700 rounded p-2 mb-2">
                                {typeof window !== 'undefined' && 
                                    Object.entries(JSON.parse(localStorage.getItem("customDeviceProperties") || "{}"))
                                        .filter(([ip, props]) => (props.networkRole === 'Gateway' || props.networkRole === 'gateway') && ip !== enhancedDevice?.ip)
                                        .map(([ip, props]) => {
                                            // Check if gateway is in the connectedGateways array or is the parentGateway (for backward compatibility)
                                            const isConnected = 
                                                (Array.isArray(enhancedDevice?.connectedGateways) && 
                                                 enhancedDevice.connectedGateways.includes(ip)) ||
                                                enhancedDevice?.parentGateway === ip;
                                            
                                            return (
                                                <div key={ip} className="flex items-center py-1 border-b border-gray-600 last:border-b-0">
                                                    <input
                                                        type="checkbox"
                                                        id={`gateway-${ip}`}
                                                        checked={isConnected}
                                                        onChange={(e) => {
                                                            // Initialize connectedGateways if needed
                                                            const currentConnections = 
                                                                Array.isArray(enhancedDevice?.connectedGateways) ? 
                                                                [...enhancedDevice.connectedGateways] : 
                                                                enhancedDevice?.parentGateway ? [enhancedDevice.parentGateway] : [];
                                                            
                                                            let newConnections;
                                                            if (e.target.checked) {
                                                                // Add to connections if not already present
                                                                if (!currentConnections.includes(ip)) {
                                                                    newConnections = [...currentConnections, ip];
                                                                } else {
                                                                    newConnections = currentConnections;
                                                                }
                                                            } else {
                                                                // Remove from connections
                                                                newConnections = currentConnections.filter(conn => conn !== ip);
                                                            }
                                                            
                                                            console.log(`Updating ${enhancedDevice.networkRole} ${enhancedDevice.ip} gateway connections:`, newConnections);
                                                              // Keep the first gateway as parentGateway for backward compatibility
                                                            const newParentGateway = newConnections.length > 0 ? newConnections[0] : null;
                                                            
                                                            setEnhancedDevice((prev) => ({
                                                                ...prev, 
                                                                connectedGateways: newConnections,
                                                                parentGateway: newParentGateway
                                                            }));
                                                        }}
                                                        className="mr-2 h-4 w-4"
                                                    />
                                                    <label htmlFor={`gateway-${ip}`} className="flex-1 text-sm">
                                                        {props.name || ip} (Gateway)
                                                    </label>
                                                </div>
                                            );
                                        })
                                }
                            </div>
                              {typeof window !== 'undefined' && 
                                Object.entries(JSON.parse(localStorage.getItem("customDeviceProperties") || "{}"))
                                    .filter(([ip, props]) => (props.networkRole === 'Gateway' || props.networkRole === 'gateway') && ip !== enhancedDevice?.ip).length === 0 && (
                                <div className="text-center text-gray-500 py-2">
                                    No gateways available. Create a gateway first.
                                </div>
                            )}
                        </div>
                    </div>
                )}                {/* 2. Switch Connections - shown for regular devices, switches, routers, and gateways */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-300 mb-1">
                        {enhancedDevice?.networkRole === 'Switch' || enhancedDevice?.networkRole === 'Gateway' || enhancedDevice?.networkRole === 'Router'
                            ? 'Connected to Switch(es)' 
                            : 'Connected to Switch'}
                    </label>
                    
                    {(enhancedDevice?.networkRole === 'Switch' || enhancedDevice?.networkRole === 'Gateway' || enhancedDevice?.networkRole === 'Router') ? (
                        /* For switches and gateways - allow multiple switch connections */
                        <div>
                            {/* Show current connections info */}
                            <div className="text-xs text-gray-400 mb-2">
                                {Array.isArray(enhancedDevice?.connectedSwitches) && enhancedDevice.connectedSwitches.length > 0 ? 
                                    `Connected to ${enhancedDevice.connectedSwitches.length} switch(es)` : 
                                    enhancedDevice?.parentSwitch ? 
                                        `Currently connected to switch: ${enhancedDevice.parentSwitch}` :
                                        'Not connected to any switch'
                                }
                            </div>
                            
                            {/* List of switches with checkboxes */}                            <div className="max-h-32 overflow-y-auto bg-gray-700 rounded p-2 mb-2">
                                {typeof window !== 'undefined' && 
                                    Object.entries(JSON.parse(localStorage.getItem("customDeviceProperties") || "{}"))
                                        .filter(([ip, props]) => (props.networkRole === 'Switch' || props.networkRole === 'switch') && ip !== enhancedDevice?.ip)
                                        .map(([ip, props]) => {
                                            // Check if switch is in the connectedSwitches array or is the parentSwitch
                                            const isConnected = 
                                                (Array.isArray(enhancedDevice?.connectedSwitches) && 
                                                 enhancedDevice.connectedSwitches.includes(ip)) ||
                                                enhancedDevice?.parentSwitch === ip;
                                            
                                            return (
                                                <div key={ip} className="flex items-center py-1 border-b border-gray-600 last:border-b-0">
                                                    <input
                                                        type="checkbox"
                                                        id={`switch-${ip}`}
                                                        checked={isConnected}
                                                        onChange={(e) => {
                                                            // Initialize connectedSwitches if needed
                                                            const currentConnections = 
                                                                Array.isArray(enhancedDevice?.connectedSwitches) ? 
                                                                [...enhancedDevice.connectedSwitches] : 
                                                                enhancedDevice?.parentSwitch ? [enhancedDevice.parentSwitch] : [];
                                                            
                                                            let newConnections;
                                                            if (e.target.checked) {
                                                                // Add to connections if not already present
                                                                if (!currentConnections.includes(ip)) {
                                                                    newConnections = [...currentConnections, ip];
                                                                } else {
                                                                    newConnections = currentConnections;
                                                                }
                                                            } else {
                                                                // Remove from connections
                                                                newConnections = currentConnections.filter(conn => conn !== ip);
                                                            }
                                                            
                                                            console.log(`Updating ${enhancedDevice.networkRole} ${enhancedDevice.ip} switch connections:`, newConnections);
                                                              // Keep the first switch as parentSwitch for backward compatibility
                                                            const newParentSwitch = newConnections.length > 0 ? newConnections[0] : null;
                                                            
                                                            setEnhancedDevice((prev) => ({
                                                                ...prev, 
                                                                connectedSwitches: newConnections,
                                                                parentSwitch: newParentSwitch
                                                            }));
                                                        }}
                                                        className="mr-2 h-4 w-4"
                                                    />
                                                    <label htmlFor={`switch-${ip}`} className="flex-1 text-sm">
                                                        {props.name || ip} (Switch)
                                                    </label>
                                                </div>
                                            );
                                        })
                                }
                            </div>
                              {typeof window !== 'undefined' && 
                                Object.entries(JSON.parse(localStorage.getItem("customDeviceProperties") || "{}"))
                                    .filter(([ip, props]) => (props.networkRole === 'Switch' || props.networkRole === 'switch') && ip !== enhancedDevice?.ip).length === 0 && (
                                <div className="text-center text-gray-500 py-2">
                                    No switches available. Create a switch first.
                                </div>
                            )}
                        </div>
                    ) : (
                        /* For regular devices - single switch connection */
                        <div>
                            {/* Show important debug info about current connections */}
                            <div className="text-xs text-gray-400 mb-2">
                                {enhancedDevice?.parentSwitch ? 
                                    `Currently connected to switch: ${enhancedDevice.parentSwitch}` : 
                                    'Not connected to any switch'
                                }
                            </div>
                            <select
                                value={enhancedDevice?.parentSwitch || ""}                                onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    console.log(`Setting device ${enhancedDevice.ip} parent switch to: "${selectedValue}"`);
                                    setEnhancedDevice((prev) => ({
                                        ...prev, 
                                        parentSwitch: selectedValue === "" ? null : selectedValue,
                                        parentGateway: null
                                    }));
                                }}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                            >                                <option value="">Not connected to a switch</option>
                                {typeof window !== 'undefined' && 
                                 Object.entries(JSON.parse(localStorage.getItem("customDeviceProperties") || "{}"))
                                    .filter(([ip, props]) => 
                                        (props.networkRole === 'Switch' || props.networkRole === 'switch') && ip !== enhancedDevice?.ip
                                    )
                                    .map(([ip, props]) => (
                                        <option key={ip} value={ip}>
                                            {props.name || ip} (Switch)
                                        </option>
                                    ))
                                }
                            </select>
                        </div>
                    )}
                </div>

                {/* Notes Section */}
                <div className="mb-4">
                    <div className="bg-gray-800 p-3 rounded">
                        <h4 className="font-medium mb-2">Notes</h4>
                        
                        {/* Add New Note */}
                        <div className="mb-3 flex">
                            <input
                                type="text"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-l px-2 py-1"
                                placeholder="Add a note about this device..."
                                onKeyUp={(e) => {
                                    if (e.key === 'Enter') handleAddNote();
                                }}
                            />
                            <button
                                onClick={handleAddNote}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-r px-3"
                                title="Add note"
                            >
                                <FaPlus />
                            </button>
                        </div>
                        
                        {/* Notes List */}
                        {(!enhancedDevice?.notes || enhancedDevice.notes.length === 0) ? (
                            <div className="text-center text-gray-500 py-3">
                                No notes yet. Add notes to track important information about this device.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                {enhancedDevice.notes.map(note => (
                                    <div key={note.id} className="bg-gray-700 p-2 rounded">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-gray-400">
                                                {formatDate(note.timestamp)}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                className="p-1 text-red-400 hover:text-red-300"
                                                title="Delete note"
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                        <div className="text-sm mt-1">
                                            {note.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Device History Section */}
                <div className="mb-4">
                    <div className="bg-gray-800 p-3 rounded">
                        <h4 className="font-medium mb-2">Device History</h4>
                        
                        {/* History List */}
                        {(!deviceHistory || deviceHistory.length === 0) ? (
                            <div className="text-center text-gray-500 py-3">
                                No history records yet. Changes to device properties will be recorded here.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">                                {deviceHistory.map((record, index) => (                                    
                                    <div key={index} className="bg-gray-700 p-2 rounded">
                                        <div 
                                            className="flex justify-between mb-2 cursor-pointer hover:bg-gray-600 p-1 rounded"
                                            onClick={() => toggleHistoryItemExpansion(index)}
                                        >
                                            <div className="text-xs text-gray-400">
                                                {formatDate(record.timestamp)}
                                            </div>
                                            <div className="flex items-center">
                                                <div className="text-xs text-green-400 font-medium mr-2">
                                                    {generateChangeSummary(record.changes)}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {expandedHistoryItems.includes(index) ? '▼' : '►'}
                                                </div>
                                            </div>
                                        </div>
                                          {expandedHistoryItems.includes(index) && (
                                            <div className="text-sm border-t border-gray-600 pt-2 mt-1">
                                                {/* Track the changes that were made */}
                                                {(!record.changes || Object.keys(record.changes).length === 0) ? (
                                                    <div className="text-gray-400">No changes detected</div>
                                                ) : (
                                                <>
                                                    {record.changes.name !== undefined && (
                                                        <div><span className="text-blue-300">Name:</span> {record.changes.name}</div>
                                                    )}
                                                    {record.changes.category !== undefined && (
                                                        <div><span className="text-blue-300">Category:</span> {record.changes.category}</div>
                                                    )}                                                    {record.changes.networkRole !== undefined && (
                                                        <div>
                                                            <span className="text-blue-300">Device Type:</span> 
                                                            {record.changes.networkRole || 'Regular Device'}
                                                        </div>
                                                    )}
                                                    {record.changes.parentGateway !== undefined && (
                                                        <div>
                                                            <span className="text-blue-300">Parent Gateway:</span> 
                                                            {record.changes.parentGateway || <span className="text-gray-400">None</span>}
                                                        </div>
                                                    )}
                                                    {record.changes.parentSwitch !== undefined && (
                                                        <div>
                                                            <span className="text-blue-300">Parent Switch:</span> 
                                                            {record.changes.parentSwitch || <span className="text-gray-400">None</span>}
                                                        </div>
                                                    )}
                                                    {record.changes.connectedGateways !== undefined && (
                                                        <div>
                                                            <span className="text-blue-300">Connected Gateways:</span> 
                                                            {record.changes.connectedGateways && record.changes.connectedGateways.length > 0 
                                                                ? record.changes.connectedGateways.join(', ') 
                                                                : <span className="text-gray-400">None</span>}
                                                        </div>
                                                    )}
                                                    {record.changes.connectedSwitches !== undefined && (
                                                        <div>
                                                            <span className="text-blue-300">Connected Switches:</span> 
                                                            {record.changes.connectedSwitches && record.changes.connectedSwitches.length > 0 
                                                                ? record.changes.connectedSwitches.join(', ') 
                                                                : <span className="text-gray-400">None</span>}
                                                        </div>
                                                    )}
                                                    {record.changes.notes !== undefined && (
                                                        <div>
                                                            <span className="text-blue-300">Notes:</span> 
                                                            {record.changes.notes && record.changes.notes.length > 0
                                                                ? <span className="text-gray-400">Updated ({record.changes.notes.length} notes)</span>
                                                                : <span className="text-gray-400">Removed</span>}
                                                        </div>                                            )}
                                                </>
                                            )}
                                        </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 sticky bottom-0 bg-gray-800 py-3">                    <button
                        onClick={handleCloseModal}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                    >
                        Cancel
                    </button><button
                        onClick={() => {
                            handleSave();
                            setTimeout(() => {
                                debugParentRelationships();
                            }, 500);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                        Save
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Function to manually check parent relationships and connections
const debugParentRelationships = () => {
    try {
        const devices = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
        
        console.log("========== NETWORK RELATIONSHIP DEBUG ==========");
          // Check all switches
        const switches = Object.entries(devices).filter(([_, props]) => 
            props.networkRole === 'switch' || props.networkRole === 'Switch'
        );
        console.log(`Found ${switches.length} switches`);
        
        switches.forEach(([ip, props]) => {
            console.log(`\nSwitch: ${ip}, Name: ${props.name || ip}`);
            
            // Check for both legacy parentGateway and new connectedGateways array
            const parentGateway = props.parentGateway || 'None';
            const connectedGateways = Array.isArray(props.connectedGateways) ? props.connectedGateways : [];
            
            console.log(`  Parent Gateway: ${parentGateway}`);
            
            // Display the connectedGateways array if it exists
            if (connectedGateways.length > 0) {
                console.log(`  Connected to ${connectedGateways.length} gateway(s):`, connectedGateways);
            }
            
            // Validate that parentGateway matches first entry in connectedGateways
            if (parentGateway !== 'None' && connectedGateways.length > 0) {
                if (parentGateway !== connectedGateways[0]) {
                    console.warn(`  ⚠️ Warning: parentGateway (${parentGateway}) doesn't match first connectedGateway (${connectedGateways[0]})`);
                }
            }
            
            // Check for switch-to-switch connections
            const parentSwitch = props.parentSwitch || 'None';
            const connectedSwitches = Array.isArray(props.connectedSwitches) ? props.connectedSwitches : [];
            
            console.log(`  Parent Switch: ${parentSwitch}`);
            
            if (connectedSwitches.length > 0) {
                console.log(`  Connected to ${connectedSwitches.length} switch(es):`, connectedSwitches);
            }
            
            // Validate that parentSwitch matches first entry in connectedSwitches
            if (parentSwitch !== 'None' && connectedSwitches.length > 0) {
                if (parentSwitch !== connectedSwitches[0]) {
                    console.warn(`  ⚠️ Warning: parentSwitch (${parentSwitch}) doesn't match first connectedSwitch (${connectedSwitches[0]})`);
                }
            }
              // Find switches that connect to this switch
            const switchesConnectingToThis = Object.entries(devices)
                .filter(([_, p]) => 
                    (p.networkRole === 'switch' || p.networkRole === 'Switch') && 
                    (p.parentSwitch === ip || 
                     (Array.isArray(p.connectedSwitches) && p.connectedSwitches.includes(ip)))
                )
                .map(([connIp]) => connIp);
                
            if (switchesConnectingToThis.length > 0) {
                console.log(`  Switches connected to this switch: ${switchesConnectingToThis.length}`, switchesConnectingToThis);
            }
        });
        
        // Check all gateways
        const gateways = Object.entries(devices).filter(([_, props]) => props.networkRole === 'gateway');
        console.log(`\nFound ${gateways.length} gateways`);
        
        gateways.forEach(([ip, props]) => {
            console.log(`\nGateway: ${ip}, Name: ${props.name || ip}`);
            
            // Find all devices that reference this gateway (using both old and new methods)
            const legacyConnections = Object.entries(devices).filter(([_, p]) => p.parentGateway === ip);
            const newConnections = Object.entries(devices).filter(([_, p]) => 
                Array.isArray(p.connectedGateways) && p.connectedGateways.includes(ip)
            );
            
            // Combine both sets, removing duplicates
            const allConnectedSwitchIPs = new Set([
                ...legacyConnections.map(([connIp]) => connIp),
                ...newConnections.map(([connIp]) => connIp)
            ]);
            
            console.log(`  Connected switches: ${allConnectedSwitchIPs.size}`);
            if (allConnectedSwitchIPs.size > 0) {
                console.log(`  Connected switch IPs:`, Array.from(allConnectedSwitchIPs));
            }
            
            // Check for gateway-to-gateway connections
            const parentGateway = props.parentGateway || 'None';
            const connectedGateways = Array.isArray(props.connectedGateways) ? props.connectedGateways : [];
            
            console.log(`  Parent Gateway: ${parentGateway}`);
            
            if (connectedGateways.length > 0) {
                console.log(`  Connected to ${connectedGateways.length} gateway(s):`, connectedGateways);
            }
            
            // Check for gateway-to-switch connections
            const parentSwitch = props.parentSwitch || 'None';
            const connectedSwitches = Array.isArray(props.connectedSwitches) ? props.connectedSwitches : [];
            
            console.log(`  Parent Switch: ${parentSwitch}`);
            
            if (connectedSwitches.length > 0) {
                console.log(`  Connected to ${connectedSwitches.length} switch(es):`, connectedSwitches);
            }
            
            // Find gateways that connect to this gateway
            const gatewaysConnectingToThis = Object.entries(devices)
                .filter(([_, p]) => 
                    p.networkRole === 'gateway' && 
                    (p.parentGateway === ip || 
                     (Array.isArray(p.connectedGateways) && p.connectedGateways.includes(ip)))
                )
                .map(([connIp]) => connIp);
                
            if (gatewaysConnectingToThis.length > 0) {
                console.log(`  Gateways connected to this gateway: ${gatewaysConnectingToThis.length}`, gatewaysConnectingToThis);
            }
        });
        
        console.log("\n==============================================");
    } catch (error) {
        console.error("Debug error:", error);
    }
};

export default UnifiedDeviceModal;