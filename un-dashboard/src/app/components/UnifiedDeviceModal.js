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
                parentSwitch: enhancedDevice.parentSwitch
            });
            
            // Add to history if there were changes
            const newHistory = [...deviceHistory];
            newHistory.unshift({
                timestamp: new Date().toISOString(),
                changes: {
                    name: enhancedDevice.name,
                    category: enhancedDevice.category,
                    networkRole: enhancedDevice.networkRole,
                    parentGateway: enhancedDevice.networkRole === 'switch' ? enhancedDevice.parentGateway : null,
                    parentSwitch: enhancedDevice.networkRole !== 'gateway' && enhancedDevice.networkRole !== 'switch' ? enhancedDevice.parentSwitch : null,
                    notes: enhancedDevice.notes
                }
            });
            
            // DEBUG: Check if parentGateway is properly set for switches
            if (enhancedDevice.networkRole === 'switch') {
                console.log(`DEBUG - Switch parentGateway before save: "${enhancedDevice.parentGateway}"`);
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
                    <div className="flex gap-2">
                        <button
                            className={`px-3 py-2 rounded text-xs flex-1 ${enhancedDevice?.networkRole === 'gateway' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}                            
                            onClick={() => {
                                if (enhancedDevice?.networkRole !== 'gateway') {
                                    setModalDevice((prev) => ({ 
                                        ...prev, 
                                        networkRole: 'gateway',
                                        parentGateway: null,
                                        parentSwitch: null 
                                    }));
                                } else {
                                    setModalDevice((prev) => ({ ...prev, networkRole: null }));
                                }
                            }}
                        >
                            Gateway
                        </button>
                        <button
                            className={`px-3 py-2 rounded text-xs flex-1 ${enhancedDevice?.networkRole === 'switch' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}                            
                            onClick={() => {
                                if (enhancedDevice?.networkRole !== 'switch') {
                                    setModalDevice((prev) => ({ 
                                        ...prev, 
                                        networkRole: 'switch',
                                        parentSwitch: null
                                    }));
                                } else {
                                    setModalDevice((prev) => ({ ...prev, networkRole: null }));
                                }
                            }}
                        >
                            Main Switch
                        </button>
                        <button
                            className={`px-3 py-2 rounded text-xs flex-1 ${enhancedDevice?.networkRole === null || enhancedDevice?.networkRole === undefined ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}                            
                            onClick={() => {
                                setModalDevice((prev) => ({ 
                                    ...prev, 
                                    networkRole: null,
                                    parentGateway: null, 
                                    isMainGateway: false 
                                }));
                            }}
                        >
                            Regular Device
                        </button>
                    </div>
                </div>                {/* Parent Connection */}
                {(enhancedDevice?.networkRole === null || enhancedDevice?.networkRole === undefined || enhancedDevice?.networkRole === 'switch') && (
                    <div className="mb-4">
                        <label className="block text-sm text-gray-300 mb-1">
                            {enhancedDevice?.networkRole === 'switch' ? 'Connected to Gateway' : 'Connected to Switch'}
                        </label>
                        
                        {/* Show important debug info about current connections */}
                        <div className="text-xs text-gray-400 mb-2">
                            {enhancedDevice?.networkRole === 'switch' ? 
                                (enhancedDevice?.parentGateway ? 
                                    `Currently connected to gateway: ${enhancedDevice.parentGateway}` : 
                                    'Not connected to any gateway') 
                                : 
                                (enhancedDevice?.parentSwitch ? 
                                    `Currently connected to switch: ${enhancedDevice.parentSwitch}` : 
                                    'Not connected to any switch')
                            }
                        </div>
                          <select
                            value={enhancedDevice?.networkRole === 'switch' ? 
                                  (enhancedDevice?.parentGateway || "") : 
                                  (enhancedDevice?.parentSwitch || "")}
                            onChange={(e) => {
                                // Keep the raw selected value - don't convert empty string to null yet
                                const selectedValue = e.target.value;
                                
                                if (enhancedDevice?.networkRole === 'switch') {
                                    console.log(`Setting switch ${enhancedDevice.ip} parent gateway to: "${selectedValue}"`);
                                    setModalDevice((prev) => ({
                                        ...prev, 
                                        parentGateway: selectedValue === "" ? null : selectedValue,
                                        parentSwitch: null
                                    }));
                                } else {
                                    console.log(`Setting device ${enhancedDevice.ip} parent switch to: "${selectedValue}"`);
                                    setModalDevice((prev) => ({
                                        ...prev, 
                                        parentSwitch: selectedValue === "" ? null : selectedValue,
                                        parentGateway: null
                                    }));
                                }
                            }}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                        >
                            <option value="">
                                {enhancedDevice?.networkRole === 'switch' ? 'Not connected to a gateway' : 'Not connected to a switch'}
                            </option>
                            {typeof window !== 'undefined' && 
                             Object.entries(JSON.parse(localStorage.getItem("customDeviceProperties") || "{}"))
                                .filter(([ip, props]) => 
                                    // Switches can only connect to gateways
                                    enhancedDevice?.networkRole === 'switch'
                                        ? props.networkRole === 'gateway' && ip !== enhancedDevice?.ip
                                        // Regular devices can only connect to switches
                                        : props.networkRole === 'switch' && ip !== enhancedDevice?.ip
                                )
                                .map(([ip, props]) => (
                                    <option key={ip} value={ip}>
                                        {props.name || ip} ({props.networkRole === 'gateway' ? 'Gateway' : 'Switch'})
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                )}

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
                        onClick={enhancedHandleSave} /* Use the enhanced save function */
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                        Save
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Function to manually check parent relationships for switches
const debugParentRelationships = () => {
    try {
        const devices = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
        
        console.log("========== PARENT RELATIONSHIP DEBUG ==========");
        
        // Check all switches
        const switches = Object.entries(devices).filter(([_, props]) => props.networkRole === 'switch');
        console.log(`Found ${switches.length} switches`);
        
        switches.forEach(([ip, props]) => {
            console.log(`Switch: ${ip}, Parent Gateway: ${props.parentGateway || 'None'}`);
        });
        
        // Check all gateways
        const gateways = Object.entries(devices).filter(([_, props]) => props.networkRole === 'gateway');
        console.log(`Found ${gateways.length} gateways`);
        
        gateways.forEach(([ip, props]) => {
            console.log(`Gateway: ${ip}, Name: ${props.name || ip}`);
            
            // Find all devices that reference this gateway
            const connectedSwitches = Object.entries(devices).filter(([_, p]) => p.parentGateway === ip);
            console.log(`  Connected switches: ${connectedSwitches.length}`);
        });
        
        console.log("==============================================");
    } catch (error) {
        console.error("Debug error:", error);
    }
};

// Call the debug function when the save button is clicked
const enhancedHandleSave = () => {
    handleSave();
    setTimeout(() => {
        debugParentRelationships();
    }, 500);
};

export default UnifiedDeviceModal;