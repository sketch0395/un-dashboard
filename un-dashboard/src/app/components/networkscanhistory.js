" use client";

import React, { useState } from "react";
import { FaEdit } from "react-icons/fa";

export default function NetworkScanHistory({ scanHistory, setScanHistory, addZonesToTopology }) {
    const [editingIndex, setEditingIndex] = useState(null);
    const [newName, setNewName] = useState("");
    const [selectedScans, setSelectedScans] = useState([]);

    const handleDelete = (index) => {
        const updatedHistory = scanHistory.filter((_, idx) => idx !== index);
        setScanHistory(updatedHistory);
    };

    const handleEdit = (index) => {
        setEditingIndex(index);
        setNewName(scanHistory[index].name || `Scan ${index + 1}`);
    };

    const handleSaveName = (index) => {
        const updatedHistory = scanHistory.map((entry, idx) =>
            idx === index ? { ...entry, name: newName } : entry
        );
        setScanHistory(updatedHistory);
        setEditingIndex(null);
        setNewName("");
    };

    const handleCheckboxChange = (index) => {
        setSelectedScans((prev) =>
            prev.includes(index)
                ? prev.filter((i) => i !== index) // Remove if already selected
                : [...prev, index] // Add if not selected
        );
    };

    const handleAddZones = () => {
        const selectedZones = selectedScans.map((index) => scanHistory[index]);
        addZonesToTopology(selectedZones); // Pass selected scans to the topology map
        setSelectedScans([]); // Clear selection after adding
    };

    console.log("Scan History:", scanHistory);

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
                            return (
                                <div
                                    key={originalIndex}
                                    className="bg-gray-700 text-white p-4 rounded-lg shadow-md flex flex-col justify-between"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedScans.includes(originalIndex)}
                                            onChange={() => handleCheckboxChange(originalIndex)}
                                            className="form-checkbox h-5 w-5 text-blue-600"
                                        />
                                        {editingIndex === originalIndex ? (
                                            <div className="flex items-center gap-2 w-full">
                                                <input
                                                    type="text"
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    className="px-2 py-1 rounded bg-gray-600 text-white w-full"
                                                />
                                                <button
                                                    onClick={() => handleSaveName(originalIndex)}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between w-full">
                                                <h4 className="text-md font-bold">
                                                    {entry.name || `Scan ${originalIndex + 1}`}
                                                </h4>
                                                <button
                                                    onClick={() => handleEdit(originalIndex)}
                                                    className="text-gray-400 hover:text-white"
                                                >
                                                    <FaEdit />
                                                </button>
                                            </div>
                                        )}
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
                                    <button
                                        onClick={() => handleDelete(originalIndex)}
                                        className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                                    >
                                        Delete
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
        </div>
    );
}

