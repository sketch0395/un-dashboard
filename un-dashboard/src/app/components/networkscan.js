"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import * as d3 from "d3";
import {
    Laptop,
    Smartphone,
    Server,
    Monitor,
    HelpCircle,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import NetworkMap from "./networkmap";

export default function NetworkScanner() {
    const [devices, setDevices] = useState([]); // Grouped by vendor
    const [status, setStatus] = useState("Idle");
    const [currentScanIP, setCurrentScanIP] = useState(null);
    const [scanOutput, setScanOutput] = useState("");
    const [ipRange, setIpRange] = useState("10.5.1.130-255");
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [deviceHistory, setDeviceHistory] = useState([]);
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [expandedIPs, setExpandedIPs] = useState({});
    const [searchQuery, setSearchQuery] = useState(""); // New state for search query
    const socketRef = useRef(null);

    const filteredDevices = Object.entries(devices).reduce((acc, [vendor, vendorDevices]) => {
        const matchingDevices = vendorDevices.filter((device) => {
            const query = searchQuery.toLowerCase();
            return (
                device.ip.toLowerCase().includes(query) ||
                (device.vendor && device.vendor.toLowerCase().includes(query)) ||
                (device.mac && device.mac.toLowerCase().includes(query))
            );
        });

        if (matchingDevices.length > 0) {
            acc[vendor] = matchingDevices;
        }

        return acc;
    }, {});

    useEffect(() => {
        const socket = io("http://localhost:4000");
        socketRef.current = socket;

        socket.on("networkScanStatus", (data) => {
            setStatus(data.status);
            if (data.output) {
                setScanOutput((prev) => prev + data.output);
                const match = data.output.match(/Nmap scan report for ([\d.]+)/);
                if (match) setCurrentScanIP(match[1]);
            }
        });

        socket.on("networkData", (data) => {
            setDevices(data); // Grouped by vendor
            setStatus("Scan complete");
            setCurrentScanIP(null);
            updateDeviceHistory(data);
        });

        return () => socket.disconnect();
    }, []);

    const updateDeviceHistory = (newDevices) => {
        const updated = [...deviceHistory];
        const newDeviceIPs = [];

        Object.values(newDevices).flat().forEach((device) => {
            if (!updated.find((d) => d.ip === device.ip)) {
                updated.push(device);
                newDeviceIPs.push(device.ip);
            }
        });

        if (newDeviceIPs.length > 0) {
            alert(`New devices detected: ${newDeviceIPs.join(", ")}`);
        }

        setDeviceHistory(updated);
    };

    const startScan = () => {
        setDevices([]);
        setStatus("Starting scan...");
        setScanOutput("");
        socketRef.current.emit("startNetworkScan", { range: ipRange });
    };

    const toggleExpand = (ip) => {
        setExpandedIPs((prev) => ({ ...prev, [ip]: !prev[ip] }));
    };

    return (
        <div className="flex bg-gray-900 text-white h-screen w-screen">
            {/* Left Panel - Accordion IP List */}
            <div className="w-[350px] bg-gray-800 p-4 overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Network Devices</h2>
                <input
                    type="text"
                    value={ipRange}
                    onChange={(e) => setIpRange(e.target.value)}
                    placeholder="IP Range (e.g., 192.168.1.1-255)"
                    className="px-3 py-2 mb-2 rounded bg-gray-700 text-white w-full"
                />
                <button onClick={startScan} className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mb-4">
                    Start Scan
                </button>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by IP, Vendor, or MAC"
                    className="px-3 py-2 mb-2 rounded bg-gray-700 text-white w-full"
                />
                <div className="text-sm text-gray-400 mb-4">
                    {status} {currentScanIP && `: ${currentScanIP}`}
                </div>

                {/* Current Devices */}
                <div>
                    {Object.entries(filteredDevices).map(([vendor, vendorDevices]) => (
                        <div key={vendor} className="mb-4">
                            <h3 className="text-lg font-bold mb-2">{vendor}</h3>
                            {vendorDevices.map((device, idx) => (
                                <div key={idx} className="mb-2">
                                    <button
                                        onClick={() => toggleExpand(device.ip)}
                                        className="w-full flex justify-between items-center bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded"
                                    >
                                        <span>{device.ip}</span>
                                        {expandedIPs[device.ip] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                    {expandedIPs[device.ip] && (
                                        <div className="bg-gray-800 px-3 py-2 text-sm whitespace-pre-wrap text-gray-300 rounded-b">
                                            {JSON.stringify(device, null, 2)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel - Topology SVG */}
            <div className="flex-1 p-4">
                <div className="h-full w-full bg-gray-800 rounded-lg overflow-hidden">
                    <NetworkMap devices={devices} />
                </div>
            </div>
        </div>
    );
}
