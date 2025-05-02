"use client";

import React, { lazy, Suspense, useState, useEffect, memo } from "react";
import { FaChevronDown, FaChevronUp, FaTrash, FaEdit, FaEllipsisV, FaTerminal } from "react-icons/fa";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { createContext, useContext } from "react";
import { FixedSizeList as List } from "react-window";

const DeviceModal = lazy(() => import("./devicemodal"));
const SSHTerminal = lazy(() => import("./sshterminal"));
const MemoizedDeviceList = lazy(() => import("./MemoizedDeviceList"));

const ScanHistoryContext = createContext();

export const ScanHistoryProvider = ({ children }) => {
    const [scanHistory, setScanHistory] = useState([]);

    useEffect(() => {
        const savedHistory = JSON.parse(localStorage.getItem("scanHistory")) || [];
        setScanHistory(savedHistory);
    }, []);

    useEffect(() => {
        localStorage.setItem("scanHistory", JSON.stringify(scanHistory));
    }, [scanHistory]);

    const saveScanHistory = (data, ipRange) => {
        const newEntry = {
            id: uuidv4(),
            timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            ipRange,
            devices: Object.values(data).flat().length,
            data,
        };
        setScanHistory((prev) => [...prev, newEntry]);
    };

    const deleteScan = (index) => {
        setScanHistory((prev) => prev.filter((_, i) => i !== index));
    };

    const updateScanName = (index, newName) => {
        setScanHistory((prev) => {
            const updated = [...prev];
            updated[index].name = newName;
            return updated;
        });
    };
    
    // Add a function to clear all scan history
    const clearHistory = () => {
        setScanHistory([]);
        localStorage.removeItem("scanHistory");
    };

    // Add a function to update device data in scan history
    const updateDeviceInHistory = (deviceIP, updatedDeviceData) => {
        setScanHistory((prev) => {
            const updated = prev.map(entry => {
                // Skip entries without data
                if (!entry.data) return entry;
                
                // Create a new copy of the entry
                const newEntry = { ...entry };
                newEntry.data = { ...entry.data };
                
                // Update matching devices in all categories
                Object.keys(newEntry.data).forEach(key => {
                    if (Array.isArray(newEntry.data[key])) {
                        newEntry.data[key] = newEntry.data[key].map(device => {
                            if (device.ip === deviceIP) {
                                return {
                                    ...device,
                                    name: updatedDeviceData.name,
                                    color: updatedDeviceData.color,
                                    icon: updatedDeviceData.icon
                                };
                            }
                            return device;
                        });
                    }
                });
                
                return newEntry;
            });
            
            return updated;
        });
    };

    return (
        <ScanHistoryContext.Provider
            value={{ 
                scanHistory, 
                saveScanHistory, 
                deleteScan, 
                updateScanName, 
                clearHistory,
                updateDeviceInHistory 
            }}
        >
            {children}
        </ScanHistoryContext.Provider>
    );
};

export const useScanHistory = () => useContext(ScanHistoryContext);

export default function NetworkScanHistory({ addZonesToTopology, scanHistoryData }) {
    const { scanHistory, saveScanHistory, deleteScan, updateScanName, clearHistory, updateDeviceInHistory } = useScanHistory();
    const [selectedScans, setSelectedScans] = useState([]);
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [modalDevice, setModalDevice] = useState(null);
    const [editingIndex, setEditingIndex] = useState(null);
    const [newName, setNewName] = useState("");
    const [menuOpenIndex, setMenuOpenIndex] = useState(null);
    const [sshModalVisible, setSSHModalVisible] = useState(false);
    const [sshTarget, setSSHTarget] = useState(null);
    const [sshUsername, setSSHUsername] = useState("");
    const [sshPassword, setSSHPassword] = useState("");
    const [showTerminal, setShowTerminal] = useState(false);
    // Add a state variable to persist custom device properties
    const [persistentCustomNames, setPersistentCustomNames] = useState({});
    // Add state for confirmation modal
    const [showConfirmClear, setShowConfirmClear] = useState(false);
    
    // Load any previously saved custom device properties from localStorage
    useEffect(() => {
        const savedCustomNames = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
        setPersistentCustomNames(savedCustomNames);
    }, []);
    
    // Update localStorage whenever custom device properties change
    useEffect(() => {
        if (Object.keys(persistentCustomNames).length > 0) {
            localStorage.setItem("customDeviceProperties", JSON.stringify(persistentCustomNames));
        }
    }, [persistentCustomNames]);

    useEffect(() => {
        if (scanHistoryData) {
            const { data, ipRange } = scanHistoryData;
            saveScanHistory(data, ipRange);
        }
    }, [scanHistoryData]);

    const handleCheckboxChange = (index) => {
        setSelectedScans((prev) =>
            prev.includes(index)
                ? prev.filter((i) => i !== index)
                : [...prev, index]
        );
    };

    const handleAddZones = () => {
        const selectedZones = selectedScans.map((index) => scanHistory[index]);
        let combinedDevices = [];
        
        // Build a customNames object that properly combines:
        // 1. Our persistent custom names from localStorage
        // 2. Any custom properties from all scan history
        const customNames = { ...persistentCustomNames };
        
        // First, gather all custom properties from scan history
        scanHistory.forEach(entry => {
            if (entry.data) {
                Object.values(entry.data).flat().forEach(device => {
                    if (device.ip && (device.name || device.color || device.icon)) {
                        // If this IP already exists in customNames, merge the properties
                        if (customNames[device.ip]) {
                            customNames[device.ip] = {
                                ...customNames[device.ip],
                                ...(device.name && { name: device.name }),
                                ...(device.color && { color: device.color }),
                                ...(device.icon && { icon: device.icon })
                            };
                        } else {
                            customNames[device.ip] = {
                                name: device.name,
                                color: device.color,
                                icon: device.icon
                            };
                        }
                    }
                });
            }
        });
        
        // Add scan source information to each device
        selectedZones.forEach((zone, zoneIndex) => {
            const devicesWithSource = Object.values(zone.data || {}).flat().map(device => {
                // Apply any saved custom properties to this device from our customNames object
                const customDevice = customNames[device.ip];
                
                return {
                    ...device,
                    // Apply saved custom properties if they exist
                    name: customDevice?.name || device.name,
                    color: customDevice?.color || device.color,
                    icon: customDevice?.icon || device.icon,
                    // Add scan source information
                    scanSource: {
                        id: zone.id || `scan-${zoneIndex}`,
                        name: zone.name || `Scan ${zoneIndex + 1}`,
                        index: zoneIndex
                    }
                };
            });
            combinedDevices = [...combinedDevices, ...devicesWithSource];
        });
        
        // Log count of devices with custom names for debugging
        const namedDevices = combinedDevices.filter(d => d.name).length;
        console.log(`Combined ${combinedDevices.length} devices, including ${namedDevices} with custom names`);
        
        const combinedData = {
            devices: combinedDevices,
            vendorColors: {},
            customNames: customNames,
        };
        addZonesToTopology(combinedData);
        setSelectedScans([]);
    };

    const toggleAccordion = (index) => {
        setExpandedIndex((prev) => (prev === index ? null : index));
    };

    const openModal = (device) => {
        setModalDevice(device);
    };

    const closeModal = () => {
        setModalDevice(null);
    };
    
    const openSSHModal = (device) => {
        setSSHTarget(device);
        setSSHUsername(""); // Reset username
        setSSHPassword(""); // Reset password
        setSSHModalVisible(true);
    };

    const visualizeOnTopology = (entry) => {
        // Build a customNames object that combines:
        // 1. Our persistent custom names from localStorage
        // 2. Any custom properties in the current entry
        const customNames = { ...persistentCustomNames };
        
        Object.values(entry.data || {}).flat().forEach((device) => {
            // Only add to customNames if the device has custom properties
            if (device.name || device.color || device.icon) {
                customNames[device.ip] = {
                    ...customNames[device.ip], // Keep any existing properties
                    ...(device.name && { name: device.name }),
                    ...(device.color && { color: device.color }),
                    ...(device.icon && { icon: device.icon }),
                };
            }
        });

        const combinedData = {
            devices: Object.values(entry.data || {}).flat(),
            vendorColors: {}, // Add vendor color mapping if needed
            customNames: customNames,
        };
        addZonesToTopology(combinedData);
    };

    const startRenaming = (index) => {
        setEditingIndex(index);
        setNewName(scanHistory[index].name || `Scan ${index + 1}`);
        setMenuOpenIndex(null); // Close the menu
    };

    const saveRename = (index) => {
        updateScanName(index, newName);
        setEditingIndex(null);
        setNewName("");
    };

    const toggleMenu = (index) => {
        setMenuOpenIndex((prev) => (prev === index ? null : index));
    };

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

    // Add clearDeviceHistory function to handle clearing all scan history and device customizations
    const clearDeviceHistory = () => {
        // Clear scan history through context
        clearHistory();
        
        // Clear custom device properties
        setPersistentCustomNames({});
        localStorage.removeItem("customDeviceProperties");
        
        // Clear the topology map
        addZonesToTopology({
            devices: [],
            vendorColors: {},
            customNames: {}
        });
        
        // Close the confirmation modal
        setShowConfirmClear(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && sshTarget) {
            // Same action as the Connect button
            setSSHModalVisible(false);
            setShowTerminal(true);
        }
    };

    const saveDeviceChanges = (updatedDevice) => {
        console.log("Saving device changes:", updatedDevice);
        
        // Check if this is an SSH request
        if (updatedDevice._requestSSH) {
            // Remove the special flag
            const { _requestSSH, ...deviceWithoutFlag } = updatedDevice;
            
            // Open the SSH modal for this device
            setSSHTarget(deviceWithoutFlag);
            setSSHUsername(""); // Reset username
            setSSHPassword(""); // Reset password
            setSSHModalVisible(true);
            return; // Exit early, no need to save other changes
        }
        
        // First, update our persistent custom names in localStorage
        const updatedCustomNames = {
            ...persistentCustomNames,
            [updatedDevice.ip]: {
                name: updatedDevice.name,
                color: updatedDevice.color,
                icon: updatedDevice.icon
            }
        };
        
        // Update the state
        setPersistentCustomNames(updatedCustomNames);
        
        // Update localStorage directly to ensure it persists
        localStorage.setItem("customDeviceProperties", JSON.stringify(updatedCustomNames));
        
        // Update the device in scan history using the context function
        updateDeviceInHistory(updatedDevice.ip, {
            name: updatedDevice.name,
            color: updatedDevice.color,
            icon: updatedDevice.icon
        });
        
        // Re-visualize current topology with updated device info
        
        // If we have an active entry, visualize just that one
        if (expandedIndex !== null) {
            const activeEntry = scanHistory[expandedIndex];
            console.log("Visualizing updated active entry");
            visualizeOnTopology(activeEntry);
        } 
        // Otherwise, if we have selected scans, visualize those
        else if (selectedScans.length > 0) {
            console.log("Visualizing selected scans with updated device");
            handleAddZones();
        }
        // Otherwise refresh the current view
        else if (scanHistory.length > 0) {
            console.log("Refreshing topology with all scans and updated device");
            // Combine all devices from all scans
            const allDevices = scanHistory.flatMap(entry => 
                Object.values(entry.data || {}).flat().map(device => {
                    // Apply custom properties
                    const customDevice = updatedCustomNames[device.ip];
                    if (customDevice && device.ip === updatedDevice.ip) {
                        return {
                            ...device,
                            name: customDevice.name,
                            color: customDevice.color,
                            icon: customDevice.icon
                        };
                    }
                    return device;
                })
            );
            
            addZonesToTopology({
                devices: allDevices,
                vendorColors: {},
                customNames: updatedCustomNames
            });
        }
    };

    return (
        <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Scan History</h3>
                {scanHistory.length > 0 && (
                    <button
                        onClick={() => setShowConfirmClear(true)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    >
                        Clear All History
                    </button>
                )}
            </div>
            
            {scanHistory.length === 0 ? (
                <p className="text-sm text-gray-400">No scans completed yet.</p>
            ) : (
                <div className="flex flex-col gap-4">
                    {scanHistory
                        .slice()
                        .reverse()
                        .map((entry, idx) => {
                            const originalIndex = scanHistory.length - idx - 1;
                            const isExpanded = expandedIndex === originalIndex;

                            return (
                                <div
                                    key={originalIndex}
                                    className="bg-gray-700 text-white p-4 rounded-lg shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedScans.includes(originalIndex)}
                                                onChange={() => handleCheckboxChange(originalIndex)}
                                                className="form-checkbox h-5 w-5 text-blue-600"
                                            />
                                            {editingIndex === originalIndex ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={newName}
                                                        onChange={(e) => setNewName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                saveRename(originalIndex);
                                                            }
                                                        }}
                                                        className="bg-gray-600 text-white px-2 py-1 rounded"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => saveRename(originalIndex)}
                                                        className="bg-green-600 hover:bg-green-700 text-white p-1 rounded text-xs"
                                                        title="Save name"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingIndex(null)}
                                                        className="bg-gray-600 hover:bg-gray-700 text-white p-1 rounded text-xs"
                                                        title="Cancel"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <h4 className="text-md font-bold">
                                                    {entry.name || `Scan ${originalIndex + 1}`}
                                                </h4>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => toggleMenu(originalIndex)}
                                                className="text-gray-400 hover:text-white"
                                            ></button>
                                            {menuOpenIndex === originalIndex && (
                                                <div className="absolute right-0 mt-2 bg-gray-800 text-white rounded shadow-lg z-10">
                                                    <button
                                                        onClick={() => startRenaming(originalIndex)}
                                                        className="block px-4 py-2 text-sm hover:bg-gray-700 w-full text-left"
                                                    >
                                                        <FaEdit className="inline mr-2" />
                                                        Rename
                                                    </button>
                                                    <button
                                                        onClick={() => deleteScan(originalIndex)}
                                                        className="block px-4 py-2 text-sm hover:bg-gray-700 w-full text-left text-red-500"
                                                    >
                                                        <FaTrash className="inline mr-2" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm">
                                        <strong>Timestamp:</strong> {entry.timestamp}
                                    </p>
                                    <p className="text-sm">
                                        <strong>IP Range:</strong> {entry.ipRange || "N/A"}
                                    </p>
                                    <p className="text-sm">
                                        <strong>Devices Found:</strong> {entry.devices}
                                    </p>

                                    {isExpanded && (
                                        <div className="mt-4 bg-gray-800 p-3 rounded">
                                            <h5 className="text-sm font-bold mb-2">Devices:</h5>
                                            <Suspense fallback={<div>Loading devices...</div>}>
                                                <MemoizedDeviceList
                                                    devices={Object.values(entry.data || {}).flat()}
                                                    openModal={openModal}
                                                    isSSHAvailable={isSSHAvailable}
                                                    openSSHModal={openSSHModal}
                                                />
                                            </Suspense>
                                            <button
                                                onClick={() => visualizeOnTopology(entry)}
                                                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                                            >
                                                Visualize on Topology
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => toggleAccordion(originalIndex)}
                                        className="mt-2 text-blue-400 hover:underline"
                                    >
                                        {isExpanded ? "Hide Devices" : "View Devices"}
                                    </button>
                                </div>
                            );
                        })}
                </div>
            )}
            {selectedScans.length >= 2 && (
                <button
                    onClick={handleAddZones}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                    Add Selected to Topology as Zones
                </button>
            )}

            <Suspense fallback={<div>Loading modal...</div>}>
                <DeviceModal
                    modalDevice={modalDevice}
                    setModalDevice={setModalDevice}
                    onSave={saveDeviceChanges}
                />
            </Suspense>

            {sshModalVisible && sshTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-4 w-96">
                        <h2 className="text-white text-xl mb-4">SSH to {sshTarget.ip}</h2>
                        <div className="mb-4">
                            <label className="block text-sm text-gray-300 mb-1">Username</label>
                            <input
                                type="text"
                                value={sshUsername}
                                onChange={(e) => setSSHUsername(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm text-gray-300 mb-1">Password</label>
                            <input
                                type="password"
                                value={sshPassword}
                                onChange={(e) => setSSHPassword(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setSSHModalVisible(false)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    // Close the credentials modal
                                    setSSHModalVisible(false);
                                    // Open the terminal
                                    setShowTerminal(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                            >
                                Connect
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTerminal && sshTarget && (
                <Suspense fallback={<div>Loading SSH terminal...</div>}>
                    <SSHTerminal
                        ip={sshTarget.ip}
                        username={sshUsername}
                        password={sshPassword}
                        visible={showTerminal}
                        onClose={() => setShowTerminal(false)}
                    />
                </Suspense>
            )}
            
            {/* Confirmation Modal for Clearing All History */}
            {showConfirmClear && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-96">
                        <h2 className="text-white text-xl mb-4">Confirm Clear History</h2>
                        <p className="text-gray-300 mb-6">
                            Are you sure you want to clear all scan history and custom device names? 
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmClear(false)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={clearDeviceHistory}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                            >
                                Clear All History
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

