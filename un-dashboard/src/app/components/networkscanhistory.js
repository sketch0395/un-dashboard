"use client";

import React, { useState, useEffect } from "react";
import { FaChevronDown, FaChevronUp, FaTrash, FaEdit, FaEllipsisV, FaTerminal } from "react-icons/fa";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import DeviceModal from "./devicemodal"; // Import the new modal component
import SSHTerminal from "./sshterminal";

export default function NetworkScanHistory({ addZonesToTopology, scanHistoryData }) {
    const [scanHistory, setScanHistory] = useState([]);
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
        const savedHistory = JSON.parse(localStorage.getItem("scanHistory")) || [];
        setScanHistory(savedHistory);
    }, []);

    useEffect(() => {
        localStorage.setItem("scanHistory", JSON.stringify(scanHistory));
    }, [scanHistory]);

    useEffect(() => {
        if (scanHistoryData) {
            const { data, ipRange } = scanHistoryData;
            saveScanHistory(data, ipRange);
        }
    }, [scanHistoryData]);

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

    const handleCheckboxChange = (index) => {
        setSelectedScans((prev) =>
            prev.includes(index)
                ? prev.filter((i) => i !== index)
                : [...prev, index]
        );
    };

    const handleAddZones = () => {
        const selectedZones = selectedScans.map((index) => scanHistory[index]);
        const combinedDevices = selectedZones.reduce((acc, zone) => {
            return [...acc, ...Object.values(zone.data || {}).flat()];
        }, []);
        const combinedData = {
            devices: combinedDevices,
            vendorColors: {}, // Add vendor color mapping if needed
            customNames: {}, // Add custom names if needed
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

    const deleteScan = (index) => {
        const updatedHistory = scanHistory.filter((_, i) => i !== index);
        setScanHistory(updatedHistory);
    };

    const startRenaming = (index) => {
        setEditingIndex(index);
        setNewName(scanHistory[index].name || `Scan ${index + 1}`);
        setMenuOpenIndex(null); // Close the menu
    };

    const saveRename = (index) => {
        const updatedHistory = [...scanHistory];
        updatedHistory[index].name = newName;
        setScanHistory(updatedHistory);
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

        setScanHistory(updatedHistory);
        addZonesToTopology({
            devices: Object.values(updatedHistory.map((entry) => entry.data || {})).flat(),
            vendorColors: {}, // Add vendor color mapping if needed
            customNames: updatedCustomNames, // Pass updated custom names
        });
    };

    const openSSHModal = (device) => {
        setSSHTarget(device);
        setSSHUsername(""); // Reset username
        setSSHPassword(""); // Reset password
        setSSHModalVisible(true);
    };

    const isSSHAvailable = (device) => {
        if (!device || !device.ports) return false;
        
        // Check various possible formats for SSH port
        if (Array.isArray(device.ports)) {
            return device.ports.some(port => 
                (typeof port === 'string' && 
                 (port.includes('22/tcp') || 
                  port.includes('ssh') || 
                  port === '22')
                ) ||
                port === 22
            );
        }
        
        // If ports is an object
        if (typeof device.ports === 'object') {
            return Object.keys(device.ports).some(key => 
                key === '22' || key === 22 || 
                (device.ports[key] && device.ports[key].toLowerCase().includes('ssh'))
            );
        }
        
        return false;
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
                                                <input
                                                    type="text"
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    className="bg-gray-600 text-white px-2 py-1 rounded"
                                                />
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
                                            <ul className="text-sm text-gray-300">
                                                {Object.values(entry.data || {}).flat().map((device, i) => (
                                                    <li key={i} className="mb-1 flex items-center justify-between">
                                                        <button
                                                            onClick={() => openModal(device)}
                                                            className="text-blue-400 hover:underline"
                                                        >
                                                            {device.ip}
                                                        </button>
                                                        {/* <button
                                                            onClick={() => console.log("Device data:", device)}
                                                            className="ml-2 text-xs text-gray-400"
                                                            title="Debug device data"
                                                        >
                                                            [debug]
                                                        </button> */}
                                                        <div className="flex gap-3 items-center ml-2">
                                                            {isSSHAvailable(device) && (
                                                                <button
                                                                    onClick={() => openSSHModal(device)}
                                                                    className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs flex items-center"
                                                                    title="SSH into device"
                                                                >
                                                                    <FaTerminal />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
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

            {/* Use the new DeviceModal component */}
            <DeviceModal
                modalDevice={modalDevice}
                setModalDevice={setModalDevice}
                onSave={saveDeviceChanges}
            />

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

            {/* If using the embedded terminal approach: */}
            {showTerminal && sshTarget && (
                <SSHTerminal
                    ip={sshTarget.ip}
                    username={sshUsername}
                    password={sshPassword}
                    visible={showTerminal}
                    onClose={() => setShowTerminal(false)}
                />
            )}
        </div>
    );
}

