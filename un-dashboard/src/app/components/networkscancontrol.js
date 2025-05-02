"use client";

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import NetworkScanHistory from "./networkscanhistory";

export default function NetworkScanControl({ devices, setDevices, customNames, setCustomNames }) {
    const socketRef = useRef(null);

    const [ipRange, setIpRange] = useState("10.5.1.130-255");
    const [status, setStatus] = useState("Idle");
    const [scanOutput, setScanOutput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [scanHistoryData, setScanHistoryData] = useState(null);

    const addZonesToTopology = (data) => {
        console.log("addZonesToTopology called with:", data);
        console.log("Adding zones to topology:", data);
        setDevices(data.devices); // Update the devices state in NetworkDashboard
        
        // Also update the customNames state if provided
        if (data.customNames) {
            console.log("Updating custom names:", data.customNames);
            setCustomNames(data.customNames);
        }
    };

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
            console.log("Current IP Range (passed directly):", ipRange); // Log the current IP range
            if (data && Object.keys(data).length > 0) {
                setDevices(data); // Update the parent component's devices state
                setScanHistoryData({ data, ipRange }); // Pass data and ipRange to NetworkScanHistory
            }
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
            setErrorMessage("Failed to connect to the server.");
        });

        return () => socket.disconnect();
    }, [setDevices, ipRange]);

    const startScan = () => {
        console.log("Starting scan with IP range:", ipRange); // Log the current IP range
        setErrorMessage("");
        setStatus("Starting scan...");
        setScanOutput("");
        socketRef.current.emit("startNetworkScan", { range: ipRange });
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
            <NetworkScanHistory
                scanHistoryData={scanHistoryData}
                addZonesToTopology={addZonesToTopology} // Pass the function here
            />
        </div>
    );
}
