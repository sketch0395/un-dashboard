import React, { useState } from "react";
import Modal from "./Modal";
import { iconMap } from "./icons/iconMapping";
import { FaChevronDown, FaChevronUp, FaTerminal } from "react-icons/fa";

const DeviceModal = ({ modalDevice, setModalDevice, onSave }) => {
    const [colorAccordionOpen, setColorAccordionOpen] = useState(false);
    const [iconAccordionOpen, setIconAccordionOpen] = useState(false);
    
    const handleSave = () => {
        onSave(modalDevice);
        setModalDevice(null);
    };

    // Helper function to check if SSH is available
    const isSSHAvailable = (device) => {
        if (!device || !device.ports) return false;

        // Check if port 22 is not marked as "filtered" or "closed"
        if (Array.isArray(device.ports)) {
            return device.ports.some(port =>
                typeof port === 'string' &&
                port.includes('22/tcp') &&
                !port.includes('filtered') &&
                !port.includes('closed')
            );
        }

        if (typeof device.ports === 'object') {
            return Object.entries(device.ports).some(([key, value]) =>
                (key === '22' || key === 22) &&
                typeof value === 'string' &&
                !value.toLowerCase().includes('filtered') &&
                !value.toLowerCase().includes('closed')
            );
        }

        return false;
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

    return (
        <Modal isVisible={!!modalDevice} onClose={() => setModalDevice(null)}>
            <div className="max-h-[80vh] overflow-y-auto scrollbar-hide pr-2">
                <div className="sticky top-0 bg-gray-800 z-10 pb-2">
                    <h2 className="text-white text-xl mb-4 py-2">Edit Device</h2>
                    <div className="mb-4">
                        <label className="block text-sm text-gray-300 mb-1">Name</label>
                        <input
                            type="text"
                            value={modalDevice?.name || ""}
                            onChange={(e) =>
                                setModalDevice((prev) => ({ ...prev, name: e.target.value }))
                            }
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                        />
                    </div>
                </div>
                
                <div className="mb-3">
                    <label className="block text-xs text-gray-300 mb-1">IP Address</label>
                    <p className="text-white bg-gray-800 px-3 py-1.5 rounded text-xs">{modalDevice?.ip || "N/A"}</p>
                </div>
                <div className="mb-3">
                    <label className="block text-xs text-gray-300 mb-1">MAC Address</label>
                    <p className="text-white bg-gray-800 px-3 py-1.5 rounded text-xs">{modalDevice?.mac || "N/A"}</p>
                </div>
                <div className="mb-3">
                    <label className="block text-xs text-gray-300 mb-1">Vendor</label>
                    <p className="text-white bg-gray-800 px-3 py-1.5 rounded text-xs">{modalDevice?.vendor || "N/A"}</p>
                </div>
                <div className="mb-3">
                    <label className="block text-xs text-gray-300 mb-1">Port Status</label>
                    <p className="text-white bg-gray-800 px-3 py-1.5 rounded text-xs max-h-16 overflow-y-auto">
                        {formatPorts(modalDevice?.ports)}
                    </p>
                </div>
                
                {/* SSH Availability */}
                <div className="mb-3">
                    <label className="block text-xs text-gray-300 mb-1">SSH Status</label>
                    <div className="flex items-center justify-between">
                        <div className="text-xs bg-gray-800 px-3 py-1.5 rounded flex items-center">
                            <span 
                                className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                    isSSHAvailable(modalDevice) ? "bg-green-500" : "bg-red-500"
                                }`}
                            ></span>
                            <span>
                                {isSSHAvailable(modalDevice) ? "Available" : "Not available"}
                            </span>
                        </div>
                        {isSSHAvailable(modalDevice) && (
                            <button
                                className="bg-green-600 hover:bg-green-700 text-xs text-white px-2 py-1 rounded flex items-center gap-1"
                                onClick={() => {
                                    // This action will be handled in the parent NetworkScanHistory component
                                    // via the openSSHModal function that's already available there
                                    if (modalDevice) {
                                        setModalDevice(null); // Close this modal first
                                        // The parent will need to detect this device was meant for SSH
                                        // and open the SSH modal for it
                                        onSave({
                                            ...modalDevice, 
                                            _requestSSH: true // Special flag to request SSH
                                        });
                                    }
                                }}
                            >
                                <FaTerminal size={12} /> Connect
                            </button>
                        )}
                    </div>
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
                                        className={`w-8 h-8 rounded-full border-2 ${modalDevice?.color === color ? 'border-white' : 'border-transparent'}`}
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
                                {Object.entries(iconMap).filter(([key]) => ["computer", "network", "mobile", "server", "router"].includes(key)).map(([key, component]) => (
                                    <button
                                        key={key}
                                        className={`w-8 h-8 rounded-full border-2 ${modalDevice?.icon === key ? 'border-white' : 'border-transparent'}`}
                                        onClick={() => setModalDevice((prev) => ({ ...prev, icon: key }))}
                                    >
                                        <div className="w-full h-full flex items-center justify-center text-white">
                                            {component}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
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