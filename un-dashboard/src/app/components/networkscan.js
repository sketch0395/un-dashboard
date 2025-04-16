"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function NetworkScanner() {
    const [devices, setDevices] = useState([]);
    const [status, setStatus] = useState("Idle");
    const [ipRange, setIpRange] = useState("10.5.1.1-255");
    const [expandedIPs, setExpandedIPs] = useState({});
    const socketRef = useRef(null);

    useEffect(() => {
        const socket = io("http://localhost:4002");
        socketRef.current = socket;

        socket.on("networkData", (data) => {
            console.log("Network Data:", data);
            setDevices(data);
            setStatus("Scan complete");
        });

        socket.on("error", (message) => {
            console.error("Error:", message);
            setStatus("Error during scan");
        });

        return () => socket.disconnect();
    }, []);

    const startScan = () => {
        setDevices([]);
        setStatus("Starting scan...");
        socketRef.current.emit("startNetworkScan", { range: ipRange });
    };

    const toggleExpand = (ip) => {
        setExpandedIPs((prev) => ({ ...prev, [ip]: !prev[ip] }));
    };

    return (
        <div className="flex bg-gray-900 text-white h-screen w-screen">
            {/* Left Panel - Device List */}
            <div className="w-[350px] bg-gray-800 p-4 overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Network Devices</h2>
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
                <div className="text-sm text-gray-400 mb-4">{status}</div>
                <div>
                    {devices.map((device, idx) => (
                        <div key={idx} className="mb-2">
                            <button
                                onClick={() => toggleExpand(device.ip)}
                                className="w-full flex justify-between items-center bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded"
                            >
                                <span>{device.name || device.ip}</span>
                                {expandedIPs[device.ip] ? (
                                    <ChevronUp size={16} />
                                ) : (
                                    <ChevronDown size={16} />
                                )}
                            </button>
                            {expandedIPs[device.ip] && (
                                <div className="bg-gray-800 px-3 py-2 text-sm whitespace-pre-wrap text-gray-300 rounded-b">
                                    <p>IP: {device.ip}</p>
                                    <p>Status: {device.status}</p>
                                    <p>Ports:</p>
                                    <ul>
                                        {device.ports.map((port, i) => (
                                            <li key={i}>
                                                {port.privatePort} → {port.publicPort} ({port.type})
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel - Placeholder for Network Map */}
            <div className="flex-1 p-4">
                <div className="h-full w-full bg-gray-800 rounded-lg overflow-hidden">
                    <p className="text-center text-gray-400">Network Map Placeholder</p>
                </div>
            </div>
        </div>
    );
}
