"use client";

import React, { lazy, Suspense, useState, useEffect, memo } from "react";
import { FaChevronDown, FaChevronUp, FaTrash, FaEdit, FaEllipsisV, FaTerminal } from "react-icons/fa";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { createContext, useContext } from "react";
import { FixedSizeList as List } from "react-window";

const DeviceModal = lazy(() => import("./devicemodal"));
const SSHTerminal = lazy(() => import("./sshterminal"));
const MemoizedDeviceList = lazy(() => import("./networkscanhistory").then(module => ({ default: module.MemoizedDeviceList })));

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

    return (
        <ScanHistoryContext.Provider
            value={{ scanHistory, saveScanHistory, deleteScan, updateScanName }}
        >
            {children}
        </ScanHistoryContext.Provider>
    );
};

export const useScanHistory = () => useContext(ScanHistoryContext);

export default function NetworkScanHistory({ addZonesToTopology, scanHistoryData }) {
    const { scanHistory, saveScanHistory, deleteScan, updateScanName } = useScanHistory();
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
        
        // Add scan source information to each device
        selectedZones.forEach((zone, zoneIndex) => {
            const devicesWithSource = Object.values(zone.data || {}).flat().map(device => ({
                ...device,
                scanSource: {
                    id: zone.id || `scan-${zoneIndex}`,
                    name: zone.name || `Scan ${zoneIndex + 1}`,
                    index: zoneIndex
                }
            }));
            combinedDevices = [...combinedDevices, ...devicesWithSource];
        });
        
        const combinedData = {
            devices: combinedDevices,
            vendorColors: {},
            customNames: {},
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

    const visualizeOnTopology = (entry) => {
        const combinedData = {
            devices: Object.values(entry.data || {}).flat(),
            vendorColors: {}, // Add vendor color mapping if needed
            customNames: {}, // Add custom names if needed
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

    const saveDeviceChanges = (updatedDevice) => {
        const updatedHistory = scanHistory.map((entry) => {
            if (entry.data) {
                Object.values(entry.data).flat().forEach((device) => {
                    if (device.ip === updatedDevice.ip) {
                        device.name = updatedDevice.name;
                        device.color = updatedDevice.color;
                        device.icon = updatedDevice.icon;
                    }
                });
            }
            return entry;
        });

        // Update the customNames object for the topology map
        const updatedCustomNames = {};
        updatedHistory.forEach((entry) => {
            Object.values(entry.data || {}).flat().forEach((device) => {
                updatedCustomNames[device.ip] = {
                    name: device.name,
                    color: device.color,
                    icon: device.icon,
                };
            });
        });

        addZonesToTopology({
            devices: Object.values(updatedHistory.map((entry) => entry.data || {})).flat(),
            vendorColors: {}, // Add vendor color mapping if needed
            customNames: updatedCustomNames, // Pass updated custom names
        });
    };

    const checkPortStatus = (ports, portNumber, status) => {
        if (Array.isArray(ports)) {
            return ports.some(port => 
                typeof port === 'string' && 
                port.includes(`${portNumber}/tcp ${status}`)
            );
        }
    
        if (typeof ports === 'object') {
            return Object.entries(ports).some(([key, value]) => 
                (key === portNumber.toString() || key === portNumber) && 
                typeof value === 'string' && 
                value.toLowerCase().includes(status)
            );
        }
    
        return false;
    };
    
    const isSSHAvailable = (device) => {
        if (!device || !device.ports) return false;
    
        // Check if port 22 is specifically marked as closed
        const hasClosedSSH = checkPortStatus(device.ports, 22, 'closed');
        if (hasClosedSSH) return false;
    
        // Otherwise check for open SSH
        return checkPortStatus(device.ports, 22, 'open') || checkPortStatus(device.ports, 22, 'ssh');
    };

    const openSSHModal = (device) => {
        setSSHTarget(device);
        setSSHUsername(""); // Reset username
        setSSHPassword(""); // Reset password
        setSSHModalVisible(true);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && sshTarget) {
            // Same action as the Connect button
            setSSHModalVisible(false);
            setShowTerminal(true);
        }
    };

    return (
        <div className="mt-6">
            <h3 className="text-lg font-bold mb-4">Scan History</h3>
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
                                            >
                                                <FaEllipsisV />
                                            </button>
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
        </div>
    );
}

