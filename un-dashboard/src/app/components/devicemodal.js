import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { iconMap } from "./icons/iconMapping";
import { FaChevronDown, FaChevronUp, FaHistory, FaDesktop, FaNetworkWired, FaAddressCard } from "react-icons/fa";
import SSHBadge from "./SSHBadge";
import { getSSHStatus, getMacInfo, getOSInfo } from "../utils/sshScanUtils";

const DeviceModal = ({ modalDevice, setModalDevice, onSave }) => {
    const [colorAccordionOpen, setColorAccordionOpen] = useState(false);
    const [iconAccordionOpen, setIconAccordionOpen] = useState(false);
    const [historyAccordionOpen, setHistoryAccordionOpen] = useState(false);
    const [deviceHistory, setDeviceHistory] = useState([]);
      // Enhance device with additional info if needed
    const enhancedDevice = modalDevice ? {
        ...modalDevice,
        ssh: modalDevice.ssh || getSSHStatus(modalDevice),
        macInfo: modalDevice.macInfo || getMacInfo(modalDevice),
        osInfo: modalDevice.osInfo || getOSInfo(modalDevice),
        // Keep original osDetails from raw scan data if available
        osDetails: modalDevice.osDetails || null
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
        // Load device history from localStorage when modal opens with a device
        if (enhancedDevice?.ip) {
            const savedCustomProperties = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
            const deviceData = savedCustomProperties[enhancedDevice.ip] || {};
            setDeviceHistory(deviceData.history || []);
        }
    }, [enhancedDevice?.ip]);
    
    const handleSave = () => {
        onSave(enhancedDevice);
        setModalDevice(null);
    };

    // Helper function to request SSH
    const handleSSHRequest = () => {
        if (enhancedDevice) {
            setModalDevice(null); // Close this modal first
            // The parent will need to detect this device was meant for SSH
            // and open the SSH modal for it
            onSave({
                ...enhancedDevice, 
                _requestSSH: true // Special flag to request SSH
            });
        }
    };

    // Helper function to format ports for display
    const formatPorts = (ports) => {
        if (!ports) return "None";
        if (Array.isArray(ports)) {
            return ports.join(", ");
        }
        if (typeof ports === 'object') {
            return Object.keys(ports).join(", ");
        }
        return String(ports);
    };
    
    // Format change history for display
    const formatChanges = (changes) => {
        if (!changes || Object.keys(changes).length === 0) return "No changes recorded";
        
        return Object.entries(changes).map(([key, value]) => (
            <div key={key}>
                <span className="font-semibold capitalize">{key}:</span> {value || "(cleared)"}
            </div>
        ));
    };

    return (
        <Modal isVisible={!!enhancedDevice} onClose={() => setModalDevice(null)}>
            <div className="max-h-[80vh] overflow-y-auto scrollbar-hide pr-2">
                <div className="sticky top-0 bg-gray-800 z-10 pb-2">
                    <h2 className="text-white text-xl mb-4 py-2">Edit Device</h2>
                    <div className="mb-4">
                        <label className="block text-sm text-gray-300 mb-1">Name</label>
                        <input
                            type="text"
                            value={enhancedDevice?.name || ""}
                            onChange={(e) =>
                                setModalDevice((prev) => ({ ...prev, name: e.target.value }))
                            }
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                        />
                    </div>
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
                                <label className="block text-xs text-gray-400 mb-1">IP Address</label>
                                <p className="text-white bg-gray-800 px-3 py-1.5 rounded text-xs">{enhancedDevice?.ip || "N/A"}</p>
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
                            {/* MAC Address Section */}
                            <div className="mb-2">
                                <label className="text-xs text-gray-400 mb-1 flex items-center">
                                    <FaAddressCard className="mr-1 text-blue-400" /> MAC Address
                                </label>
                                <p className="text-white bg-gray-800 px-3 py-1.5 rounded text-xs">
                                    {enhancedDevice?.mac || (enhancedDevice?.macInfo?.available ? enhancedDevice.macInfo.address : "Not available")}
                                </p>
                            </div>
                            
                            {/* Vendor Section */}
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
                        </div>
                    </div>
                </div>
                
                {/* Notes Field */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-300 mb-1">Notes</label>
                    <textarea
                        value={enhancedDevice?.notes || ""}
                        onChange={(e) =>
                            setModalDevice((prev) => ({ ...prev, notes: e.target.value }))
                        }
                        placeholder="Add notes about this device..."
                        rows="3"
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded resize-none"
                    />
                </div>
                
                {/* Color Selection Accordion */}
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
                                {Array.from(new Set(["#FF5733", "#33FF57", "#3357FF", "#F1C40F", "#9B59B6", "#E74C3C", "#1ABC9C", "#2ECC71", "#3498DB", "#34495E", "#16A085", "#27AE60", "#2980B9", "#8E44AD"])).map((color) => (
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
                
                {/* Icon Selection Accordion */}
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
                                {Object.entries(iconMap).filter(([key]) => ["computer", "network", "mobile", "server", "router"].includes(key)).map(([key, IconComponent]) => (
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
                
                {/* Change History Accordion */}
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
            
            {/* Add global styles for scrollbar hiding */}
            <style jsx global>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;  /* Chrome, Safari and Opera */
                }
            `}</style>
        </Modal>
    );
};

export default DeviceModal;