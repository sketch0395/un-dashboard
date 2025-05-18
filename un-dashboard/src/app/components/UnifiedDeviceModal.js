                                                                                                                                                                                                                                                                                                                                        'use client';

import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { FaEdit, FaSave, FaTimes, FaPlus, FaTrash } from "react-icons/fa";
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
    const [deviceHistory, setDeviceHistory] = useState([]);

    // Enhanced device with all necessary information
    const enhancedDevice = modalDevice ? {
        ...modalDevice,
        notes: modalDevice.notes || []
    } : null;

    // Pre-defined device categories
    const deviceCategories = [
        "Production Server",
        "Development Server",
        "Database",
        "Router",
        "Switch",
        "Firewall",
        "IoT Device",
        "Workstation",
        "Mobile Device",
        "Printer",
        "Camera",
        "Other"
    ];

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
            const newHistory = [...deviceHistory];
            newHistory.unshift({
                timestamp: new Date().toISOString(),
                changes: {
                    name: enhancedDevice.name,
                    category: enhancedDevice.category,
                    networkRole: enhancedDevice.networkRole,
                    // Track connections based on device role
                    parentGateway: (enhancedDevice.networkRole === 'switch' || enhancedDevice.networkRole === 'gateway') ? 
                        enhancedDevice.parentGateway : null,
                    connectedGateways: (enhancedDevice.networkRole === 'switch' || enhancedDevice.networkRole === 'gateway') ? 
                        enhancedDevice.connectedGateways : null,
                    parentSwitch: enhancedDevice.networkRole !== 'gateway' && enhancedDevice.networkRole !== 'switch' ? 
                        enhancedDevice.parentSwitch : null,
                    connectedSwitches: (enhancedDevice.networkRole === 'switch' || enhancedDevice.networkRole === 'gateway') ? 
                        enhancedDevice.connectedSwitches : null,
                    notes: enhancedDevice.notes
                }
            });
            
            // DEBUG: Check connections
            if (enhancedDevice.networkRole === 'switch' || enhancedDevice.networkRole === 'gateway') {
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
            updateDeviceProperties(deviceToSave);

            // Call parent save handler
            onSave(deviceToSave);
            setModalDevice(null);
        }
    };

    // Note management
    const handleAddNote = () => {
        if (!newNote.trim()) return;
        
        const newNoteObj = {
            id: Date.now(),
            text: newNote.trim(),
            timestamp: new Date().toISOString()
        };
        
        const updatedNotes = [...(enhancedDevice.notes || []), newNoteObj];
        setModalDevice(prev => ({ ...prev, notes: updatedNotes }));
        setNewNote('');
    };

    const handleDeleteNote = (noteId) => {
        const updatedNotes = enhancedDevice.notes.filter(note => note.id !== noteId);
        setModalDevice(prev => ({ ...prev, notes: updatedNotes }));
    };

    // Format date
    const formatDate = (isoString) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleString();
        } catch (error) {
            return 'Invalid date';
        }
    };

    return (
        <Modal isVisible={!!enhancedDevice} onClose={() => setModalDevice(null)}>
            <div className="max-h-[80vh] overflow-y-auto pr-2">
                {/* Header Section */}
                <div className="sticky top-0 bg-gray-800 z-10 pb-2">
                    <div className="flex justify-between mb-4">
                        {isEditing ? (
                            <input
                                type="text"
                                value={enhancedDevice?.name || ""}
                                onChange={(e) =>
                                    setModalDevice((prev) => ({ ...prev, name: e.target.value }))
                                }
                                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded mr-2"
                                placeholder="Enter device name"
                            />
                        ) : (
                            <h2 className="text-white text-xl py-2">{enhancedDevice?.name || "Edit Device"}</h2>
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
                </div>

                {/* Category Selection */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-300 mb-1">Category</label>
                    <select
                        value={enhancedDevice?.category || ""}
                        onChange={(e) =>
                            setModalDevice((prev) => ({ ...prev, category: e.target.value }))
                        }
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                    >
                        <option value="">Select a category</option>
                        {deviceCategories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>

                {/* Network Role Section */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-300 mb-1">Network Role</label>
                    <div className="flex gap-2">                        <button
                            className={`px-3 py-2 rounded text-xs flex-1 ${enhancedDevice?.networkRole === 'gateway' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}                            
                            onClick={() => {
                                if (enhancedDevice?.networkRole !== 'gateway') {
                                    setModalDevice((prev) => ({ 
                                        ...prev, 
                                        networkRole: 'gateway',
                                        parentGateway: null,
                                        parentSwitch: null,
                                        connectedGateways: [],
                                        connectedSwitches: []
                                    }));
                                } else {
                                    setModalDevice((prev) => ({ ...prev, networkRole: null }));
                                }
                            }}
                        >
                            Gateway
                        </button>                        <button
                            className={`px-3 py-2 rounded text-xs flex-1 ${enhancedDevice?.networkRole === 'switch' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}                            
                            onClick={() => {
                                if (enhancedDevice?.networkRole !== 'switch') {
                                    setModalDevice((prev) => ({ 
                                        ...prev, 
                                        networkRole: 'switch',
                                        parentSwitch: null,
                                        connectedGateways: [],
                                        connectedSwitches: []
                                    }));
                                } else {
                                    setModalDevice((prev) => ({ ...prev, networkRole: null }));
                                }
                            }}
                        >
                            Switch
                        </button>                        <button
                            className={`px-3 py-2 rounded text-xs flex-1 ${enhancedDevice?.networkRole === null || enhancedDevice?.networkRole === undefined ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}                            
                            onClick={() => {
                                setModalDevice((prev) => ({ 
                                    ...prev, 
                                    networkRole: null,
                                    parentGateway: null, 
                                    isMainGateway: false,
                                    connectedGateways: null,
                                    connectedSwitches: null
                                }));
                            }}
                        >
                            Regular Device
                        </button>
                    </div>
                </div>                {/* Connection Sections */}
                {/* 1. Gateway Connections - only shown for switches and other gateways */}
                {(enhancedDevice?.networkRole === 'switch' || enhancedDevice?.networkRole === 'gateway') && (
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
                                        .filter(([ip, props]) => props.networkRole === 'gateway' && ip !== enhancedDevice?.ip)
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
                                                            
                                                            setModalDevice((prev) => ({
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
                                    .filter(([ip, props]) => props.networkRole === 'gateway' && ip !== enhancedDevice?.ip).length === 0 && (
                                <div className="text-center text-gray-500 py-2">
                                    No gateways available. Create a gateway first.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. Switch Connections - shown for regular devices, switches, and gateways */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-300 mb-1">
                        {enhancedDevice?.networkRole === 'switch' || enhancedDevice?.networkRole === 'gateway'
                            ? 'Connected to Switch(es)' 
                            : 'Connected to Switch'}
                    </label>
                    
                    {(enhancedDevice?.networkRole === 'switch' || enhancedDevice?.networkRole === 'gateway') ? (
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
                            
                            {/* List of switches with checkboxes */}
                            <div className="max-h-32 overflow-y-auto bg-gray-700 rounded p-2 mb-2">
                                {typeof window !== 'undefined' && 
                                    Object.entries(JSON.parse(localStorage.getItem("customDeviceProperties") || "{}"))
                                        .filter(([ip, props]) => props.networkRole === 'switch' && ip !== enhancedDevice?.ip)
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
                                                            
                                                            setModalDevice((prev) => ({
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
                                    .filter(([ip, props]) => props.networkRole === 'switch' && ip !== enhancedDevice?.ip).length === 0 && (
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
                                value={enhancedDevice?.parentSwitch || ""}
                                onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    console.log(`Setting device ${enhancedDevice.ip} parent switch to: "${selectedValue}"`);
                                    setModalDevice((prev) => ({
                                        ...prev, 
                                        parentSwitch: selectedValue === "" ? null : selectedValue,
                                        parentGateway: null
                                    }));
                                }}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                            >
                                <option value="">Not connected to a switch</option>
                                {typeof window !== 'undefined' && 
                                 Object.entries(JSON.parse(localStorage.getItem("customDeviceProperties") || "{}"))
                                    .filter(([ip, props]) => 
                                        props.networkRole === 'switch' && ip !== enhancedDevice?.ip
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

                {/* Action Buttons */}                <div className="flex justify-end gap-2 sticky bottom-0 bg-gray-800 py-3">
                    <button
                        onClick={() => setModalDevice(null)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                    >
                        Cancel
                    </button>                    <button
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
        const switches = Object.entries(devices).filter(([_, props]) => props.networkRole === 'switch');
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
                    p.networkRole === 'switch' && 
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