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

const UnifiedDeviceModal = ({
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
            // Add to history if there were changes
            const newHistory = [...deviceHistory];
            newHistory.unshift({
                timestamp: new Date().toISOString(),
                changes: {
                    name: enhancedDevice.name,
                    category: enhancedDevice.category,
                    networkRole: enhancedDevice.networkRole,
                    notes: enhancedDevice.notes
                }
            });

            // Add history to the device
            const deviceToSave = {
                ...enhancedDevice,
                history: newHistory
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

                {/* Device Information Section */}
                <div className="bg-gray-700 p-3 rounded mb-4">
                    <h3 className="text-sm font-semibold mb-2 text-blue-400 flex items-center">
                        <FaNetworkWired className="mr-2" /> Device Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <div className="mb-2">
                                <label className="block text-xs text-gray-400 mb-1">Status</label>
                                <div>
                                    {enhancedDevice?.alive || enhancedDevice?.status === 'up' ? (
                                        <span className="bg-green-800 text-green-200 px-2 py-0.5 rounded-full text-xs">
                                            Online
                                        </span>
                                    ) : (
                                        <span className="bg-red-800 text-red-200 px-2 py-0.5 rounded-full text-xs">
                                            Offline
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mb-2">
                                <label className="block text-xs text-gray-400 mb-1">Port Status</label>
                                <p className="text-white bg-gray-800 px-3 py-1.5 rounded text-xs max-h-16 overflow-y-auto">
                                    {formatPorts(enhancedDevice?.ports)}
                                </p>
                            </div>

                            <div className="mb-2">
                                <label className="block text-xs text-gray-400 mb-1">SSH Status</label>
                                <div className="text-xs bg-gray-800 px-3 py-1.5 rounded flex items-center">
                                    {enhancedDevice && (
                                        <SSHBadge 
                                            device={enhancedDevice} 
                                            onClick={handleSSHRequest}
                                            size="md"
                                            showLabel={true}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            {/* MAC Address */}
                            <div className="mb-2">
                                <label className="text-xs text-gray-400 mb-1 flex items-center">
                                    <FaAddressCard className="mr-1 text-blue-400" /> MAC Address
                                </label>
                                <p className="text-white bg-gray-800 px-3 py-1.5 rounded text-xs">
                                    {enhancedDevice?.mac || (enhancedDevice?.macInfo?.available ? enhancedDevice.macInfo.address : "Not available")}
                                </p>
                            </div>

                            {/* Vendor */}
                            <div className="mb-2">
                                <label className="block text-xs text-gray-400 mb-1">Vendor</label>
                                <p className="text-white bg-gray-800 px-3 py-1.5 rounded text-xs">
                                    {enhancedDevice?.vendor || enhancedDevice?.macInfo?.vendor || "Unknown"}
                                </p>
                            </div>

                            {/* OS Information */}
                            <div className="mb-2">
                                <label className="text-xs text-gray-400 mb-1 flex items-center">
                                    <FaDesktop className="mr-1 text-blue-400" /> Operating System
                                </label>
                                <p className="text-white bg-gray-800 px-3 py-1.5 rounded text-xs">
                                    {enhancedDevice?.osDetails?.name ? (
                                        <>
                                            {enhancedDevice.osDetails.name}
                                            {enhancedDevice.osDetails.accuracy ? ` (${enhancedDevice.osDetails.accuracy}% accuracy)` : ''}
                                        </>
                                    ) : enhancedDevice?.osInfo?.available ? (
                                        <>
                                            {enhancedDevice.osInfo.name} 
                                            {enhancedDevice.osInfo.accuracy ? ` (${enhancedDevice.osInfo.accuracy}% accuracy)` : ''}
                                            {enhancedDevice.osInfo.type ? ` - ${enhancedDevice.osInfo.type}` : ''}
                                        </>
                                    ) : "Unknown"}
                                </p>
                            </div>

                            {/* System Uptime */}
                            {systemUptime && systemUptime.available && (
                                <div className="mb-2">
                                    <label className="text-xs text-gray-400 mb-1 flex items-center">
                                        <FaClock className="mr-1 text-blue-400" /> System Uptime
                                    </label>
                                    <p className="text-white bg-gray-800 px-3 py-1.5 rounded text-xs">
                                        {formatSystemUptime(systemUptime)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Network Role Section */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-300 mb-1">Network Role</label>
                    <div className="flex gap-2">
                        <button
                            className={`px-3 py-2 rounded text-xs flex-1 ${enhancedDevice?.networkRole === 'gateway' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            onClick={() =>
                                setModalDevice((prev) => ({ ...prev, networkRole: prev.networkRole === 'gateway' ? null : 'gateway' }))
                            }
                        >
                            Gateway
                        </button>
                        <button
                            className={`px-3 py-2 rounded text-xs flex-1 ${enhancedDevice?.networkRole === 'switch' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            onClick={() =>
                                setModalDevice((prev) => ({ ...prev, networkRole: prev.networkRole === 'switch' ? null : 'switch' }))
                            }
                        >
                            Main Switch
                        </button>
                        <button
                            className={`px-3 py-2 rounded text-xs flex-1 ${enhancedDevice?.networkRole === null || enhancedDevice?.networkRole === undefined ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            onClick={() =>
                                setModalDevice((prev) => ({ ...prev, networkRole: null }))
                            }
                        >
                            Regular Device
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        You can set multiple Gateway devices (one per subnet). Each Gateway can have Switches connected to it, 
                        and regular devices can be connected to Switches. Switches connected to Gateways will have a green border.
                    </p>
                </div>

                {/* Port Configuration for Gateway or Switch */}
                {(enhancedDevice?.networkRole === 'gateway' || enhancedDevice?.networkRole === 'switch') && (
                    <div className="mb-4">
                        <label className="block text-sm text-gray-300 mb-1">Port Configuration</label>
                        <div className="flex gap-2">
                            <button
                                className={`px-3 py-2 rounded text-xs flex-1 ${enhancedDevice?.portCount === 12 ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                                onClick={() =>
                                    setModalDevice((prev) => ({ ...prev, portCount: prev.portCount === 12 ? null : 12 }))
                                }
                            >
                                12 Ports
                            </button>
                            <button
                                className={`px-3 py-2 rounded text-xs flex-1 ${enhancedDevice?.portCount === 24 ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                                onClick={() =>
                                    setModalDevice((prev) => ({ ...prev, portCount: prev.portCount === 24 ? null : 24 }))
                                }
                            >
                                24 Ports
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Gateway Setting */}
                {enhancedDevice?.networkRole === 'gateway' && (
                    <div className="mb-4">
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={enhancedDevice?.isMainGateway || false}
                                onChange={(e) =>
                                    setModalDevice((prev) => ({ ...prev, isMainGateway: e.target.checked }))
                                }
                                className="w-4 h-4 accent-blue-600 bg-gray-700 rounded"
                            />
                            <span className="text-sm text-gray-300">Set as Main Gateway</span>
                        </label>
                        <p className="text-xs text-gray-400 mt-1">
                            The main gateway will be used as the root node in the hierarchical network view.
                        </p>
                    </div>
                )}

                {/* Parent Connection for Regular Devices or Switches */}
                {(enhancedDevice?.networkRole === null || enhancedDevice?.networkRole === undefined || enhancedDevice?.networkRole === 'switch') && (
                    <div className="mb-4">
                        <label className="block text-sm text-gray-300 mb-1">
                            {enhancedDevice?.networkRole === 'switch' ? 'Connected to Gateway' : 'Connected to Switch'}
                        </label>
                        <select
                            value={enhancedDevice?.networkRole === 'switch' ? (enhancedDevice?.parentGateway || "") : (enhancedDevice?.parentSwitch || "")}
                            onChange={(e) => {
                                if (enhancedDevice?.networkRole === 'switch') {
                                    const selectedGateway = e.target.value;                                if (selectedGateway) {
                                        if (wouldCreateCircularDependency(enhancedDevice.ip, selectedGateway, 'gateway')) {
                                            alert("Circular dependency detected! This connection would create a loop in the network hierarchy.");
                                            return;
                                        }
                                    }
                                    setModalDevice((prev) => ({ ...prev, parentGateway: e.target.value }));
                                } else {
                                    setModalDevice((prev) => ({ ...prev, parentSwitch: e.target.value }));
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
                                    enhancedDevice?.networkRole === 'switch'
                                        ? props.networkRole === 'gateway' && ip !== enhancedDevice?.ip
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

                {/* Icon Selection */}
                <div className="mb-4 border border-gray-700 rounded">
                    <button 
                        onClick={() => setIconAccordionOpen(!iconAccordionOpen)}
                        className="flex justify-between items-center w-full bg-gray-700 px-4 py-2 rounded-t text-left"
                    >
                        <span className="text-sm text-gray-300">Icon</span>
                        <span>{iconAccordionOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                    </button>
                    
                    {iconAccordionOpen && (
                        <div className="p-3 border-t border-gray-700">
                            <div className="grid grid-cols-5 gap-2">
                                {Object.entries(iconMap)
                                    .filter(([key]) => ["computer", "network", "mobile", "server", "router"].includes(key))
                                    .map(([key, IconComponent]) => (
                                        <button
                                            key={key}
                                            className={`w-8 h-8 rounded-full border-2 ${enhancedDevice?.icon === key ? 'border-white' : 'border-transparent'}`}
                                            onClick={() => setModalDevice((prev) => ({ ...prev, icon: key }))}
                                        >
                                            <div className="w-full h-full flex items-center justify-center text-white">
                                                {React.createElement(IconComponent, { size: 16 })}
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Color Selection */}
                <div className="mb-4 border border-gray-700 rounded">
                    <button 
                        onClick={() => setColorAccordionOpen(!colorAccordionOpen)}
                        className="flex justify-between items-center w-full bg-gray-700 px-4 py-2 rounded-t text-left"
                    >
                        <span className="text-sm text-gray-300">Color</span>
                        <span>{colorAccordionOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                    </button>
                    
                    {colorAccordionOpen && (
                        <div className="p-3 border-t border-gray-700">
                            <div className="grid grid-cols-5 gap-2">
                                {Array.from(new Set([
                                    "#FF5733", "#33FF57", "#3357FF", "#F1C40F", 
                                    "#9B59B6", "#E74C3C", "#1ABC9C", "#2ECC71", 
                                    "#3498DB", "#34495E", "#16A085", "#27AE60", 
                                    "#2980B9", "#8E44AD"
                                ])).map((color) => (
                                    <button
                                        key={color}
                                        className={`w-8 h-8 rounded-full border-2 ${enhancedDevice?.color === color ? 'border-white' : 'border-transparent'}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setModalDevice((prev) => ({ ...prev, color }))}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Change History */}
                {deviceHistory.length > 0 && (
                    <div className="mb-4 border border-gray-700 rounded">
                        <button 
                            onClick={() => setHistoryAccordionOpen(!historyAccordionOpen)}
                            className="flex justify-between items-center w-full bg-gray-700 px-4 py-2 rounded-t text-left"
                        >
                            <div className="flex items-center">
                                <FaHistory className="mr-2" />
                                <span className="text-sm text-gray-300">Change History</span>
                            </div>
                            <span>{historyAccordionOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                        </button>
                        
                        {historyAccordionOpen && (
                            <div className="p-3 border-t border-gray-700 max-h-48 overflow-y-auto">
                                {deviceHistory.map((entry, index) => (
                                    <div key={index} className="mb-2 pb-2 border-b border-gray-700 last:border-b-0 last:mb-0 last:pb-0">
                                        <p className="text-xs text-gray-400">{entry.timestamp}</p>
                                        <div className="text-xs mt-1 text-gray-300">
                                            {formatChanges(entry.changes)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

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

export default UnifiedDeviceModal;
