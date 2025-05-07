"use client";

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { FaNetworkWired, FaDocker, FaTerminal, FaInfoCircle } from "react-icons/fa";
import NetworkScanHistory from "./networkscanhistory";

export default function NetworkScanControl({ devices, setDevices, customNames, setCustomNames }) {
    const socketRef = useRef(null);

    const [ipRange, setIpRange] = useState("10.5.1.1-100");
    const [status, setStatus] = useState("Idle");
    const [scanOutput, setScanOutput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [scanHistoryData, setScanHistoryData] = useState(null);
    const [useDocker, setUseDocker] = useState(true); // Default to true for Docker-based scanning
    const [showSshInfo, setShowSshInfo] = useState(false);

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
                setScanOutput((prev) => prev + data.output + "\n");
            }
            
            // If SSH devices were found, show the info box
            if (data.status === "SSH devices found") {
                setShowSshInfo(true);
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
        setShowSshInfo(false);
        
        // Force Docker for SSH detection - it's more reliable
        const shouldUseDocker = useDocker || true;
        socketRef.current.emit("startNetworkScan", { range: ipRange, useDocker: shouldUseDocker });
    };

    return (
        <div className="p-4 bg-gray-800 text-white rounded-lg">
            <h2 className="text-xl font-bold mb-4">Network Scan Control</h2>
            
            {/* SSH information box */}
            {showSshInfo && (
                <div className="bg-green-900 bg-opacity-30 text-green-300 p-3 rounded mb-4 flex items-start">
                    <FaInfoCircle className="mr-2 mt-1 flex-shrink-0" />
                    <div>
                        <p className="font-bold">SSH Devices Detected</p>
                        <p className="text-sm">SSH-enabled devices have been found on your network. Click the green SSH terminal icons to connect.</p>
                    </div>
                </div>
            )}
            
            <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-1">IP Range to Scan</label>
                <input
                    type="text"
                    value={ipRange}
                    onChange={(e) => setIpRange(e.target.value)}
                    placeholder="IP Range (e.g., 10.5.1.1-100)"
                    className="px-3 py-2 rounded bg-gray-700 text-white w-full"
                />
            </div>
            
            <div className="mb-4 bg-gray-700 p-3 rounded">
                <div className="flex items-center mb-2">
                    <FaTerminal className="text-green-500 mr-2" />
                    <span className="font-bold">SSH Detection</span>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                    SSH detection requires Docker to work reliably. The Docker-based scan uses specialized parameters to accurately identify SSH services.
                </p>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        checked={useDocker}
                        onChange={(e) => setUseDocker(e.target.checked)}
                        className="mr-2"
                        id="use-docker"
                    />
                    <label htmlFor="use-docker" className="flex items-center cursor-pointer">
                        <FaDocker className="text-blue-500 mr-2" />
                        <span>Use Docker for network scanning</span>
                    </label>
                </div>
            </div>
            
            <button
                onClick={startScan}
                className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mb-4 flex items-center justify-center"
            >
                <FaNetworkWired className="mr-2" />
                Start Network Scan
            </button>
            
            {errorMessage && (
                <div className="bg-red-600 text-white p-3 rounded mb-4">
                    <strong>Error:</strong> {errorMessage}
                </div>
            )}
            
            <div className="text-sm mb-2 font-bold">Status: <span className="font-normal">{status}</span></div>
            
            {scanOutput && (
                <div className="mb-4">
                    <div className="bg-gray-900 p-2 rounded text-xs text-gray-300 max-h-40 overflow-y-auto font-mono whitespace-pre-wrap">
                        {scanOutput}
                    </div>
                </div>
            )}
            
            <NetworkScanHistory
                scanHistoryData={scanHistoryData}
                addZonesToTopology={addZonesToTopology} // Pass the function here
            />
        </div>
    );
}
