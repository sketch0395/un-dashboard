"use client";

import { useState, useEffect } from 'react';
import Modal from './Modal';
import SSHBadge from './SSHBadge';
import { FaEdit, FaSave, FaTerminal, FaTimes, FaTrash, FaPlus, FaClock } from 'react-icons/fa';

const DeviceDetailsModal = ({ 
    isVisible, 
    onClose, 
    device, 
    onSaveDeviceName, 
    onStartSSH, 
    systemUptime 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [deviceName, setDeviceName] = useState('');
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [customProperties, setCustomProperties] = useState({});

    // Load device details whenever the modal opens with a device
    useEffect(() => {
        if (device && isVisible) {
            // Try to get custom properties from localStorage
            try {
                const storedCustomProperties = localStorage.getItem("customDeviceProperties") || "{}";
                const parsedCustomProps = JSON.parse(storedCustomProperties);
                
                // Set device name from custom properties or fallback to device properties
                const deviceData = parsedCustomProps[device.ip] || {};
                setCustomProperties(deviceData);
                
                // Set the device name
                setDeviceName(deviceData.name || device.hostname || device.ip || 'Unknown Device');
                
                // Set the device notes
                setNotes(deviceData.notes || []);
            } catch (error) {
                console.error("Error loading device properties:", error);
                setDeviceName(device.hostname || device.ip || 'Unknown Device');
                setNotes([]);
            }
            
            // Reset editing state
            setIsEditing(false);
            setNewNote('');
        }
    }, [device, isVisible]);

    const handleSave = () => {
        if (!device) return;
        
        try {
            // Read existing custom properties
            const storedCustomProperties = localStorage.getItem("customDeviceProperties") || "{}";
            const parsedCustomProps = JSON.parse(storedCustomProperties);
            
            // Update the custom properties with the new name and notes
            const updatedProps = {
                ...parsedCustomProps,
                [device.ip]: {
                    ...parsedCustomProps[device.ip],
                    name: deviceName,
                    notes: notes
                }
            };
            
            // Save back to localStorage
            localStorage.setItem("customDeviceProperties", JSON.stringify(updatedProps));
            
            // Call parent callback to update name
            if (onSaveDeviceName) {
                onSaveDeviceName(device.ip, deviceName);
            }
            
            // Exit editing mode
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving device properties:", error);
        }
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        
        const newNoteObj = {
            id: Date.now(), // Simple unique ID
            text: newNote.trim(),
            timestamp: new Date().toISOString()
        };
        
        setNotes(prev => [...prev, newNoteObj]);
        setNewNote('');
    };

    const handleDeleteNote = (noteId) => {
        setNotes(prev => prev.filter(note => note.id !== noteId));
    };

    const formatDate = (isoString) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleString();
        } catch (error) {
            return 'Invalid date';
        }
    };
    
    // Format system uptime string in a human-readable way
    const formatSystemUptime = (uptimeData) => {
        if (!uptimeData || !uptimeData.available) return 'Not available';
        return uptimeData.uptimeString || 'Unknown';
    };

    if (!isVisible || !device) return null;

    return (
        <Modal isVisible={isVisible} onClose={onClose}>
            {/* Title is moved inside the children content instead of being a prop */}
            <div className="space-y-4">
                {/* Device Name Section */}
                <div className="bg-gray-800 p-3 rounded">
                    <div className="flex items-center justify-between">
                        {isEditing ? (
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={deviceName}
                                    onChange={(e) => setDeviceName(e.target.value)}
                                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-2 py-1"
                                    placeholder="Enter device name"
                                />
                            </div>
                        ) : (
                            <h3 className="text-lg font-medium">{deviceName}</h3>
                        )}
                        
                        <div className="ml-2 flex items-center">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleSave}
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
                    <div className="text-gray-400 text-sm mt-1">{device.ip}</div>
                </div>
                
                {/* Device Info Section */}
                <div className="bg-gray-800 p-3 rounded">
                    <h4 className="font-medium mb-2">Device Information</h4>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="col-span-2 flex items-center justify-between">
                            <div className="flex-1">Status</div>
                            <div>
                                {device.alive || device.status === 'up' ? (
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
                        
                        {device.mac && (
                            <div className="col-span-2 flex items-center justify-between">
                                <div className="flex-1">MAC Address</div>
                                <div className="text-gray-300">{device.mac}</div>
                            </div>
                        )}
                        
                        {device.vendor && (
                            <div className="col-span-2 flex items-center justify-between">
                                <div className="flex-1">Vendor</div>
                                <div className="text-gray-300">{device.vendor}</div>
                            </div>
                        )}
                        
                        {device.hostname && device.hostname !== device.ip && (
                            <div className="col-span-2 flex items-center justify-between">
                                <div className="flex-1">Hostname</div>
                                <div className="text-gray-300">{device.hostname}</div>
                            </div>
                        )}
                        
                        {device.os && (
                            <div className="col-span-2 flex items-center justify-between">
                                <div className="flex-1">Operating System</div>
                                <div className="text-gray-300">{device.os}</div>
                            </div>
                        )}
                        
                        {systemUptime && systemUptime.available && (
                            <div className="col-span-2 flex items-center justify-between">
                                <div className="flex-1 flex items-center">
                                    <FaClock className="mr-2 text-blue-400" size={12} />
                                    System Uptime
                                </div>
                                <div className="text-gray-300">{formatSystemUptime(systemUptime)}</div>
                            </div>
                        )}
                        
                        {device.sshAvailable !== undefined && (
                            <div className="col-span-2 flex items-center justify-between">
                                <div className="flex-1">SSH Availability</div>
                                <div>
                                    <SSHBadge 
                                        status={device.sshAvailable ? "available" : "unavailable"} 
                                        onClick={device.sshAvailable ? () => onStartSSH && onStartSSH(device) : undefined}
                                        className="cursor-pointer"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {device.latency !== undefined && (
                            <div className="col-span-2 flex items-center justify-between">
                                <div className="flex-1">Latency</div>
                                <div className="text-gray-300">
                                    {device.latency !== null ? `${device.latency.toFixed(2)} ms` : 'N/A'}
                                </div>
                            </div>
                        )}
                        
                        {device.packetLoss !== undefined && device.packetLoss > 0 && (
                            <div className="col-span-2 flex items-center justify-between">
                                <div className="flex-1">Packet Loss</div>
                                <div className="text-yellow-400">
                                    {device.packetLoss}%
                                </div>
                            </div>
                        )}
                        
                        {device.download !== undefined && (
                            <div className="col-span-1 flex items-center justify-between">
                                <div className="flex-1">Download</div>
                                <div className="text-gray-300">
                                    {device.download !== null ? `${device.download.toFixed(2)} Mbps` : 'N/A'}
                                </div>
                            </div>
                        )}
                        
                        {device.upload !== undefined && (
                            <div className="col-span-1 flex items-center justify-between">
                                <div className="flex-1">Upload</div>
                                <div className="text-gray-300">
                                    {device.upload !== null ? `${device.upload.toFixed(2)} Mbps` : 'N/A'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* SSH Connection Section */}
                {device.sshAvailable && (
                    <div className="bg-gray-800 p-3 rounded">
                        <h4 className="font-medium mb-2">SSH Connection</h4>
                        <button
                            onClick={() => onStartSSH && onStartSSH(device)}
                            className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded py-2 px-4"
                        >
                            <FaTerminal className="mr-2" />
                            Connect via SSH
                        </button>
                    </div>
                )}
                
                {/* Notes Section */}
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
                    {notes.length === 0 ? (
                        <div className="text-center text-gray-500 py-3">
                            No notes yet. Add notes to track important information about this device.
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                            {notes.map(note => (
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
        </Modal>
    );
};

export default DeviceDetailsModal;