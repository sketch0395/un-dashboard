"use client";

import React, { useState, useEffect } from "react";
import { FaChevronDown, FaChevronUp, FaTrash, FaEdit, FaEllipsisV } from "react-icons/fa";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";

export default function NetworkScanHistory({ addZonesToTopology, scanHistoryData }) {
    const [scanHistory, setScanHistory] = useState([]);
    const [selectedScans, setSelectedScans] = useState([]);
    const [expandedIndex, setExpandedIndex] = useState(null); // Track which accordion is expanded
    const [modalDevice, setModalDevice] = useState(null); // Track the device to show in the modal
    const [editingIndex, setEditingIndex] = useState(null); // Track which scan is being renamed
    const [newName, setNewName] = useState(""); // Track the new name for renaming
    const [menuOpenIndex, setMenuOpenIndex] = useState(null); // Track which menu is open

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
            data, // Save the actual devices data
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
                                                    <li key={i} className="mb-1">
                                                        <button
                                                            onClick={() => openModal(device)}
                                                            className="text-blue-400 hover:underline"
                                                        >
                                                            {device.ip}
                                                        </button>
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

            {/* Modal */}
            {modalDevice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-96">
                        <h4 className="text-lg font-bold mb-4">Device Details</h4>
                        <p>
                            <strong>IP:</strong> {modalDevice.ip}
                        </p>
                        <p>
                            <strong>OS:</strong> {modalDevice.os || "Unknown"}
                        </p>
                        <p>
                            <strong>Vendor:</strong> {modalDevice.vendor || "Unknown"}
                        </p>
                        <p>
                            <strong>Other Info:</strong> {modalDevice.otherInfo || "N/A"}
                        </p>
                        <button
                            onClick={closeModal}
                            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

