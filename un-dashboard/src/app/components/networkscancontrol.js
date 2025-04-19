"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { io } from "socket.io-client";
import { FaDesktop, FaServer, FaMobileAlt, FaWifi, FaNetworkWired, FaTabletAlt } from "react-icons/fa";
import { format } from "date-fns";
import NetworkScanHistory from "./networkscanhistory"; // Import the component

export default function NetworkScanControl({ devices, setDevices, vendorColors, setVendorColors, customNames = {}, setCustomNames }) {
    const socketRef = useRef(null);

    const [ipRange, setIpRange] = useState("10.5.1.130-255");
    const [status, setStatus] = useState("Idle");
    const [scanOutput, setScanOutput] = useState("");
    const [expandedIPs, setExpandedIPs] = useState({});
    const [errorMessage, setErrorMessage] = useState("");
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [newName, setNewName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState(null);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [scanHistory, setScanHistory] = useState([]);

    const colorPalette = [
        "#FF5733", "#33FF57", "#3357FF", "#FFC300", "#DAF7A6", "#C70039", "#900C3F", "#581845",
        "#FF33FF", "#33FFFF", "#FF9933", "#66FF66", "#FF6666", "#9966FF", "#66FFFF", "#FFCC66"
    ];

    const deviceIcons = [
        { name: "Desktop", icon: <FaDesktop /> },
        { name: "Server", icon: <FaServer /> },
        { name: "Mobile", icon: <FaMobileAlt /> },
        { name: "WiFi", icon: <FaWifi /> },
        { name: "Network", icon: <FaNetworkWired /> },
        { name: "Tablet", icon: <FaTabletAlt /> },
    ];

    useEffect(() => {
        const socket = io("http://10.5.1.83:4000");
        socketRef.current = socket;

        socket.on("networkScanStatus", (data) => {
            setStatus(data.status);
            if (data.error) {
                setErrorMessage(data.error);
            }
            if (data.output) {
                setScanOutput((prev) => prev + data.output);
            }
        });

        socket.on("networkData", (data) => {
            console.log("WebSocket networkData event received:", data);
            console.log("Current IP Range (state):", ipRange); // Log the current state of ipRange
            if (data && Object.keys(data).length > 0) {
                setDevices(data); // Update the parent component's devices state
                saveScanHistory(data, ipRange); // Pass the current IP range explicitly
            }
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
            setErrorMessage("Failed to connect to the server.");
        });

        return () => socket.disconnect();
    }, [setDevices]);

    useEffect(() => {
        const savedHistory = JSON.parse(localStorage.getItem("scanHistory")) || [];
        setScanHistory(savedHistory);
    }, []);

    useEffect(() => {
        localStorage.setItem("scanHistory", JSON.stringify(scanHistory));
    }, [scanHistory]);

    const saveScanHistory = (data, currentIpRange) => {
        console.log("Saving scan history...");
        console.log("Current IP Range (passed):", currentIpRange);
        console.log("IP Range State:", ipRange); // Log the current state of ipRange

        if (currentIpRange !== ipRange) {
            console.error("Mismatch between currentIpRange and ipRange state!");
        }

        if (!currentIpRange || !data || Object.keys(data).length === 0) {
            console.warn("Invalid scan data or IP range. Skipping history save.");
            return;
        }

        const allDevices = Object.values(data).flat();

        const newEntry = {
            timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            ipRange: currentIpRange, // Use the explicitly passed IP range
            devices: allDevices.length,
        };

        setScanHistory((prev) => [...prev, newEntry]);
        console.log("Scan history saved:", newEntry); // Debug log
    };

    const startScan = () => {
        console.log("Starting scan with IP range:", ipRange); // Log the current IP range
        setErrorMessage("");
        setStatus("Starting scan...");
        setScanOutput("");
        socketRef.current.emit("startNetworkScan", { range: ipRange });
    };

    const toggleExpand = (ip) => {
        setExpandedIPs((prev) => ({ ...prev, [ip]: !prev[ip] }));
    };

    const handleSaveName = () => {
        if (selectedDevice) {
            setCustomNames((prev) => ({
                ...prev,
                [selectedDevice.ip]: { name: newName, icon: selectedIcon },
            }));
            setSelectedDevice(null);
            setNewName("");
            setSelectedIcon(null);
        }
    };

    const handleColorChange = (color) => {
        if (selectedVendor) {
            setVendorColors((prev) => ({
                ...prev,
                [selectedVendor]: color,
            }));
            setSelectedVendor(null);
        }
    };

    const addZonesToTopology = (zones) => {
        console.log("Adding zones to topology:", zones);
        zones.forEach((zone, idx) => {
            setDevices((prevDevices) => ({
                ...prevDevices,
                [`Zone ${idx + 1}`]: zone.devices || [],
            }));
        });
    };

    return (
        <div className="p-4 bg-gray-800 text-white rounded-lg">
            <h2 className="text-xl font-bold mb-4">Network Scan Control</h2>
            <input
                type="text"
                value={ipRange}
                onChange={(e) => setIpRange(e.target.value)}
                placeholder="IP Range (e.g., 192.168.1.1-255)"
                className="px-3 py-2 mb-2 rounded bg-gray-700 text-white w-full"
            />
            <button
                onClick={startScan}
                className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mb-4"
            >
                Start Scan
            </button>
            {errorMessage && (
                <div className="bg-red-600 text-white p-3 rounded mb-4">
                    <strong>Error:</strong> {errorMessage}
                </div>
            )}
            <div className="text-sm text-gray-400 mb-4">{status}</div>
            <div>
                {Object.entries(devices).map(([vendor, vendorDevices]) => {
                    // Ensure vendorDevices is an array
                    if (!Array.isArray(vendorDevices)) {
                        console.warn(`Expected an array for vendor "${vendor}", but got:`, vendorDevices);
                        return null; // Skip this vendor if it's not an array
                    }

                    return (
                        <div key={vendor} className="mb-4">
                            <h3 className="text-lg font-bold mb-2">{vendor}</h3>
                            {vendorDevices.map((device, idx) => (
                                <div
                                    key={idx}
                                    className="mb-2 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded"
                                >
                                    <button
                                        onClick={() => setSelectedDevice(device)}
                                        className="w-full flex justify-between items-center"
                                    >
                                        <span className="flex items-center gap-2">
                                            {customNames?.[device.ip]?.icon || <FaNetworkWired />}
                                            {customNames?.[device.ip]?.name || device.ip}
                                        </span>
                                        {expandedIPs[device.ip] ? (
                                            <ChevronUp size={16} />
                                        ) : (
                                            <ChevronDown size={16} />
                                        )}
                                    </button>
                                    {expandedIPs[device.ip] && (
                                        <div className="bg-gray-800 px-3 py-2 text-sm whitespace-pre-wrap text-gray-300 rounded-b">
                                            {JSON.stringify(device, null, 2)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {selectedDevice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-96">
                        <h3 className="text-lg font-bold mb-4">Device Information</h3>
                        <div className="mb-4">
                            <p><strong>IP Address:</strong> {selectedDevice.ip}</p>
                            <p><strong>Vendor:</strong> {selectedDevice.vendor || "Unknown"}</p>
                            <p><strong>Details:</strong></p>
                            <pre className="bg-gray-700 p-2 rounded text-sm">
                                {JSON.stringify(selectedDevice, null, 2)}
                            </pre>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-bold mb-2">Custom Name:</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Enter a custom name"
                                className="w-full px-3 py-2 rounded bg-gray-700 text-white"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-bold mb-2">Select Icon:</label>
                            <div className="grid grid-cols-3 gap-2">
                                {deviceIcons.map((icon) => (
                                    <button
                                        key={icon.name}
                                        onClick={() => setSelectedIcon(icon.icon)}
                                        className={`p-2 rounded ${
                                            selectedIcon === icon.icon ? "bg-blue-600 border-2 border-white" : "bg-gray-700"
                                        }`}
                                    >
                                        <div className="flex flex-col items-center">
                                            {icon.icon}
                                            <span className="text-xs mt-1">{icon.name}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {selectedIcon && (
                                <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
                                    Selected Icon: <span className="text-lg">{selectedIcon}</span>
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setSelectedDevice(null)}
                                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveName}
                                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-6">
                <h3 className="text-lg font-bold mb-2">Change Vendor Color</h3>
                <select
                    value={selectedVendor || ""}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-gray-700 text-white mb-2"
                >
                    <option value="" disabled>
                        Select a Vendor
                    </option>
                    {Object.keys(devices).map((vendor) => (
                        <option key={vendor} value={vendor.toLowerCase()}>
                            {vendor}
                        </option>
                    ))}
                </select>
                <div className="flex flex-wrap gap-2">
                    {colorPalette.map((color) => (
                        <button
                            key={color}
                            onClick={() => handleColorChange(color)}
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
            </div>

            <NetworkScanHistory
                scanHistory={scanHistory}
                setScanHistory={setScanHistory}
                addZonesToTopology={addZonesToTopology}
            />
        </div>
    );
}
