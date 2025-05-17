"use client";

import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { iconMap } from "./icons/iconMapping";
import { 
    FaChevronDown, 
    FaChevronUp, 
    FaHistory, 
    FaDesktop, 
    FaNetworkWired, 
    FaAddressCard,
    FaClock,
    FaEdit,
    FaSave,
    FaTimes,
    FaTrash,
    FaPlus,
    FaTerminal
} from "react-icons/fa";
import SSHBadge from "./SSHBadge";
import { getSSHStatus, getMacInfo, getOSInfo } from "../utils/sshScanUtils";
import { updateDeviceProperties, wouldCreateCircularDependency } from "../utils/deviceManagementUtils";

const UnifiedDeviceModalFull = ({
    modalDevice, 
    setModalDevice, 
    onSave,
    onStartSSH,
    systemUptime 
}) => {
    // UI State
    const [colorAccordionOpen, setColorAccordionOpen] = useState(false);
    const [iconAccordionOpen, setIconAccordionOpen] = useState(false);
    const [historyAccordionOpen, setHistoryAccordionOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [deviceHistory, setDeviceHistory] = useState([]);

    // Enhanced device with all necessary information
    const enhancedDevice = modalDevice ? {
        ...modalDevice,
        ssh: modalDevice.ssh || getSSHStatus(modalDevice),
        macInfo: modalDevice.macInfo || getMacInfo(modalDevice),
        osInfo: modalDevice.osInfo || getOSInfo(modalDevice),
        osDetails: modalDevice.osDetails || null,
        notes: modalDevice.notes || []
    } : null;
    
    // Debug output for development
    React.useEffect(() => {
        if (enhancedDevice) {
            console.log("Current device state:", {
                name: enhancedDevice.name,
                ip: enhancedDevice.ip,
                networkRole: enhancedDevice.networkRole,
                parentGateway: enhancedDevice.parentGateway,
                parentSwitch: enhancedDevice.parentSwitch
            });
        }
    }, [enhancedDevice?.parentGateway, enhancedDevice?.parentSwitch, enhancedDevice?.networkRole]);
    
    // Ensure parent-child relationships are loaded from localStorage when device is opened
    React.useEffect(() => {
        if (enhancedDevice?.ip && typeof window !== 'undefined') {
            const savedCustomProperties = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
            const deviceData = savedCustomProperties[enhancedDevice.ip] || {};
            
            // If the device properties exist in localStorage but the modalDevice doesn't have them,
            // update the modal state to include them
            if (deviceData) {
                const needsUpdate = (
                    (enhancedDevice.networkRole === 'switch' && deviceData.parentGateway && enhancedDevice.parentGateway !== deviceData.parentGateway) ||
                    ((!enhancedDevice.networkRole || enhancedDevice.networkRole === null) && deviceData.parentSwitch && enhancedDevice.parentSwitch !== deviceData.parentSwitch)
                );
                
                if (needsUpdate) {
                    console.log("Updating device with stored parent relationships:", deviceData);
                    setModalDevice(prev => ({
                        ...prev,
                        parentGateway: deviceData.parentGateway || null,
                        parentSwitch: deviceData.parentSwitch || null
                    }));
                }
            }
        }
    }, [enhancedDevice?.ip, enhancedDevice?.networkRole]);

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
    }, [enhancedDevice?.ip]);
    
    // Handle main device save
    const handleSave = () => {
        if (enhancedDevice) {
            console.log("Saving device with the following relationships:", {
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
                    parentGateway: enhancedDevice.networkRole === 'switch' ? enhancedDevice.parentGateway : undefined,
                    parentSwitch: enhancedDevice.networkRole !== 'gateway' && enhancedDevice.networkRole !== 'switch' ? enhancedDevice.parentSwitch : undefined,
                    notes: enhancedDevice.notes
                }
            });

            // Add history to the device and ensure parent relationships are included
            const deviceToSave = {
                ...enhancedDevice,
                history: newHistory,
                // Explicitly include these to ensure they're saved
                parentGateway: enhancedDevice.networkRole === 'switch' ? enhancedDevice.parentGateway : null,
                parentSwitch: enhancedDevice.networkRole !== 'gateway' && enhancedDevice.networkRole !== 'switch' ? enhancedDevice.parentSwitch : null
            };

            // Update device properties in localStorage
            updateDeviceProperties(deviceToSave);

            // Call parent save handler
            onSave(deviceToSave);
            setModalDevice(null);
        }
    };

    // Handle SSH request
    const handleSSHRequest = () => {
        if (enhancedDevice) {
            setModalDevice(null);
            if (onStartSSH) {
                onStartSSH(enhancedDevice);
            }
        }
    };

    // Helper functions
    const formatPorts = (ports) => {
        if (!ports || !Array.isArray(ports) || ports.length === 0) return 'No ports';
        
        return ports.map(port => {
            const match = port.match(/(\d+)\/tcp\s+(open|closed|filtered)\s*(.*)?/i);
            if (match) {
                const [_, portNumber, state, service] = match;
                return `${portNumber}${service ? ` (${service})` : ''} - ${state}`;
            }
            return port;
        }).join(', ');
    };

    const formatChanges = (changes) => {
        if (!changes || Object.keys(changes).length === 0) return "No changes recorded";
        return Object.entries(changes).map(([key, value]) => (
            <div key={key}>
                <span className="font-semibold capitalize">{key}:</span> {value || "(cleared)"}
            </div>
        ));
    };

    const formatDate = (isoString) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleString();
        } catch (error) {
            return 'Invalid date';
        }
    };

    const formatSystemUptime = (uptimeData) => {
        if (!uptimeData || !uptimeData.available) return 'Not available';
        return uptimeData.uptimeString || 'Unknown';
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

    return (
        <Modal isVisible={!!enhancedDevice} onClose={() => setModalDevice(null)}>
            <div className="max-h-[80vh] overflow-y-auto scrollbar-hide pr-2">
                {/* Header Section */}
                <div className="sticky top-0 bg-gray-800 z-10 pb-2">
                    <div className="flex items-center justify-between mb-4">
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

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 sticky bottom-0 bg-gray-800 py-3">
                    <button
                        onClick={() => setModalDevice(null)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                        Save
                    </button>
                </div>
            </div>
            
            {/* Global styles */}
            <style jsx global>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </Modal>
    );
};

export default UnifiedDeviceModalFull;
