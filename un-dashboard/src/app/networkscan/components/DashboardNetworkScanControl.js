"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { FaNetworkWired, FaDocker, FaTerminal, FaInfoCircle, FaPlay, FaPause, FaSpinner, FaCog, FaExclamationTriangle, FaCode, FaChevronDown, FaChevronUp, FaDatabase } from "react-icons/fa";
import NetworkScanHistory, { useScanHistory } from "./networkscanhistory.js";
import NetworkScanExportImport from "./NetworkScanExportImport";

// This component is used inside the Network Dashboard for advanced network scanning functionality

export default function DashboardNetworkScanControl({ devices, setDevices, customNames, setCustomNames, onScanComplete, currentState = {} }) {
    const socketRef = useRef(null);
    const { saveScanHistory } = useScanHistory();

    const [ipRange, setIpRange] = useState("10.5.1.1-255");
    const [status, setStatus] = useState("Idle");
    const [scanOutput, setScanOutput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [scanHistoryData, setScanHistoryData] = useState(null);
    const [useDocker, setUseDocker] = useState(true); // Default to true for Docker-based scanning
    const [showSshInfo, setShowSshInfo] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanType, setScanType] = useState('ping');
    const [lastScanTime, setLastScanTime] = useState(null);
    const [error, setError] = useState(null);
    
    // New state to control advanced options visibility
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [showScanTypeInfo, setShowScanTypeInfo] = useState(false);
    
    // New state for raw data inspection
    const [showRawData, setShowRawData] = useState(false);
    const [rawNetworkData, setRawNetworkData] = useState(null);
    const [rawHistoryData, setRawHistoryData] = useState(null);
    const [showRawNetworkData, setShowRawNetworkData] = useState(false);
    const [showRawHistoryData, setShowRawHistoryData] = useState(false);

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
        // Try to use a relative URL that adapts to where the app is hosted
        let serverUrl;
        
        // Get the current protocol, hostname, and port from the browser
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        // If we're running in development on localhost, use the fixed address
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Try to connect to the specified address or fallback to local server
            serverUrl = "http://10.5.1.83:4000";
        } else {
            // For production, use the same domain but different port (or Path if using a reverse proxy)
            serverUrl = `${protocol}//${hostname}:4000`;
        }
          console.log(`Attempting Socket.IO connection to: ${serverUrl}`);
          // Set up the Socket.IO connection with better error handling
        const socket = io(serverUrl, {
            reconnectionAttempts: 5,
            timeout: 10000,
            reconnectionDelay: 1000,
            transports: ['polling', 'websocket'], // Start with polling, then try to upgrade to websocket if possible
            upgrade: true, // Allow transport upgrade
            forceNew: true, // Create a new connection every time
        });
        
        socketRef.current = socket;
        
        // Connection event handlers
        socket.on('connect', () => {
            console.log('Socket.IO connected successfully');
            setError(null); // Clear any previous errors
            
            // Log the transport being used
            console.log(`Connected using transport: ${socket.io.engine.transport.name}`);
        });
        
        // Add specific handler for websocket errors
        socket.io.on('error', (err) => {
            console.warn('Socket.IO engine error:', err);
            // This is expected if websocket fails - no need to show error to user
            // The socket will automatically try to use polling instead
        });
        
        // Track transport upgrades for debugging
        socket.io.on('upgrade', (transport) => {
            console.log(`Transport upgraded to: ${transport.name}`);
        });
          
        socket.on('connect_error', (err) => {
            console.error('Socket.IO connection error:', err);
            
            // Provide more specific error messages based on the error
            let errorMessage = `Connection error: ${err.message}.`;
            
            if (err.message.includes('xhr poll error')) {
                errorMessage = `Server connection failed. Please ensure the network scanning server is running at ${serverUrl}.`;
            } else if (err.message.includes('timeout')) {
                errorMessage = `Connection timeout. The server at ${serverUrl} is not responding.`;
            } else if (err.message.includes('ECONNREFUSED')) {
                errorMessage = `Connection refused. The server at ${serverUrl} is not accepting connections.`;
            } else if (err.message.includes('websocket error')) {
                // Just log but don't show error to user since it will fall back to polling
                console.warn('WebSocket connection failed, falling back to polling');
                return; // Don't set error for websocket failures
            }
            
            setError(errorMessage);
        });
          socket.on('disconnect', (reason) => {
            console.warn('Socket.IO disconnected:', reason);
            
            // Create a more user-friendly message
            let disconnectMessage = '';
            
            if (reason === 'io server disconnect') {
                disconnectMessage = 'The server has disconnected. Attempting to reconnect...';
                // Server disconnected us, try to reconnect
                socket.connect();
            } else if (reason === 'transport close') {
                disconnectMessage = 'Connection to server lost. Waiting for automatic reconnection...';
            } else if (reason === 'ping timeout') {
                disconnectMessage = 'Server did not respond. Trying to reconnect...';
                socket.connect();
            } else {
                disconnectMessage = `Disconnected from server (${reason}). Reconnecting...`;
            }
            
            // Only show message if this isn't part of a normal page navigation
            if (document.visibilityState !== 'hidden') {
                setError(disconnectMessage);
            }
        });

        socket.on("networkScanStatus", (data) => {
            setStatus(data.status);
            if (data.error) {
                setErrorMessage(data.error);
                setError(data.error);
            }
            if (data.output) {
                setScanOutput((prev) => prev + data.output + "\n");
            }
            
            // If scan is complete, update state
            if (data.status === "Scan complete") {
                setIsScanning(false);
                setLastScanTime(new Date());
            }
            
            // If scanning is in progress
            if (data.status.includes("in progress") || data.status.includes("Starting")) {
                setIsScanning(true);
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
                // Save raw network data for inspection
                setRawNetworkData(JSON.parse(JSON.stringify(data)));
                
                setDevices(data); // Update the parent component's devices state
                
                // Save the transformed data that goes to history
                const historyData = { data, ipRange };
                setScanHistoryData(historyData); 
                setRawHistoryData(JSON.parse(JSON.stringify(historyData)));
                  // Convert the data format for onScanComplete if provided
                if (onScanComplete) {
                    const flattenedDevices = [];
                    // Flatten the grouped devices structure
                    Object.entries(data).forEach(([vendor, deviceList]) => {
                        // Ensure deviceList is an array before iterating
                        if (Array.isArray(deviceList)) {
                            deviceList.forEach(device => {
                                flattenedDevices.push({
                                    ...device,
                                    vendor: vendor !== "Unknown" ? vendor : device.vendor || "",
                                    status: device.status || "online",
                                    scanType: scanType,
                                    scanTime: new Date().toISOString()
                                });
                            });
                        } else {
                            console.warn(`Expected array for vendor "${vendor}" but got:`, typeof deviceList, deviceList);
                        }
                    });
                    onScanComplete(flattenedDevices);
                }
            }
        });
          // Listen for saveToScanHistory events from the server
        socket.on("saveToScanHistory", (data) => {
            if (data && data.devices) {
                try {
                    console.log("Received saveToScanHistory event:", data);
                    const ipRange = data.ipRange || "API Import";
                    
                    // Enhanced debugging
                    console.log(`About to save scan history with ${Object.keys(data.devices).length} vendor groups`);
                    let deviceCount = 0;
                    Object.values(data.devices).forEach(group => {
                        if (Array.isArray(group)) {
                            deviceCount += group.length;
                        }
                    });
                    console.log(`Total devices to save: ${deviceCount}`);
                    
                    // Ensure we're using the correct function from context
                    if (typeof saveScanHistory !== 'function') {
                        console.error("saveScanHistory is not a function!", { 
                            type: typeof saveScanHistory, 
                            value: saveScanHistory 
                        });
                        return;
                    }
                    
                    // Call the function from context
                    saveScanHistory(data.devices, ipRange);
                    console.log("Scan history saved successfully");
                } catch (error) {
                    console.error("Error saving to scan history:", error);
                }
            } else {
                console.warn("Received saveToScanHistory event without device data:", data);
            }
        });// Remove duplicate connect_error handler that was causing issues

        return () => {
            console.log('Cleaning up Socket.IO connection');
            if (socket) {
                socket.off('connect');
                socket.off('connect_error'); 
                socket.off('disconnect');
                socket.off('networkScanStatus');
                socket.off('networkData');
                socket.off('saveToScanHistory');
                socket.disconnect();
            }
        };
    }, [setDevices, ipRange, scanType, onScanComplete]);

    const startNetworkScan = useCallback(() => {
        // Clear previous state
        setErrorMessage("");
        setError(null);
        setStatus("Starting scan...");
        setScanOutput("");
        setShowSshInfo(false);
        setIsScanning(true);
        
        console.log(`Starting ${scanType} scan with IP range: ${ipRange}`);
        console.log(`Using Docker: ${useDocker}, Scan Type: ${scanType}`);
        
        // Set last scan time
        const currentTime = new Date();
        setLastScanTime(currentTime);
        
        // Emit the socket event to start the scan
        socketRef.current.emit("startNetworkScan", { 
            range: ipRange, 
            useDocker: useDocker,
            scanType: scanType
        });
    }, [ipRange, useDocker, scanType]);

    // Toggle advanced options visibility
    const toggleAdvancedOptions = () => {
        setShowAdvancedOptions(!showAdvancedOptions);
    };

    return (
        <div className="p-4 bg-gray-800 text-white rounded-lg">
            <h2 className="text-xl font-bold mb-4">Network Scan</h2>
            
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
            
            {/* Scan control panel */}
            <div className="flex flex-wrap gap-2">
                {/* IP Range Input */}
                <input
                    type="text"
                    value={ipRange}
                    onChange={(e) => setIpRange(e.target.value)}
                    className="bg-gray-700 text-white p-2 rounded text-sm flex-grow"
                    placeholder="IP Range (e.g., 192.168.1.1-255)"
                    disabled={isScanning}
                />
                
                {/* Scan Type Selector with Info Icon */}
                <div className="flex items-center">
                    <select
                        value={scanType}
                        onChange={(e) => setScanType(e.target.value)}
                        className="bg-gray-700 text-white p-2 rounded text-sm"
                        disabled={isScanning}
                    >
                        <option value="ping">Ping Scan (Fast)</option>
                        <option value="os">OS Detection (Slow)</option>
                    </select>
                    <div className="relative ml-2">
                        <button 
                            className="text-gray-400 hover:text-white"
                            onClick={() => setShowScanTypeInfo(!showScanTypeInfo)}
                        >
                            <FaInfoCircle size={16} />
                        </button>
                        {showScanTypeInfo && (
                            <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 p-3 rounded shadow-lg z-10 text-xs">
                                <h4 className="font-bold mb-2 text-blue-300">Scan Types</h4>
                                <div className="mb-2">
                                    <p className="font-semibold text-green-300">Ping Scan</p>
                                    <p className="text-gray-300">Fast scan that discovers active devices on the network. Minimal impact on network traffic.</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-yellow-300">OS Detection</p>
                                    <p className="text-gray-300">Performs deeper analysis to identify operating systems. Takes longer and generates more network traffic.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Advanced Options Toggle */}
                <button
                    onClick={toggleAdvancedOptions}
                    className="bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm"
                    disabled={isScanning}
                >
                    <FaCog className="text-gray-300" />
                </button>
                
                {/* Scan Button */}
                <button
                    onClick={startNetworkScan}
                    disabled={isScanning}
                    className={`flex items-center justify-center px-4 py-2 rounded text-sm ${
                        isScanning
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                    } text-white transition-colors`}
                >
                    {isScanning ? (
                        <>
                            <FaSpinner className="animate-spin mr-2" />
                            Scanning...
                        </>
                    ) : (
                        <>
                            <FaPlay className="mr-2" />
                            Start Scan
                        </>
                    )}
                </button>
            </div>
            
            {/* Advanced Options Panel - only shown when advanced options are enabled */}
            {showAdvancedOptions && (
                <div className="mb-4 bg-gray-700 p-3 rounded">
                    <div className="flex items-center mb-2">
                        <FaTerminal className="text-green-500 mr-2" />
                        <span className="font-bold">Advanced Scan Options</span>
                    </div>
                    
                    <div className="flex items-center mt-2">
                        <input
                            type="checkbox"
                            checked={useDocker}
                            onChange={(e) => setUseDocker(e.target.checked)}
                            className="mr-2"
                            id="use-docker"
                            disabled={isScanning}
                        />
                        <label htmlFor="use-docker" className="flex items-center cursor-pointer">
                            <FaDocker className="text-blue-500 mr-2" />
                            <span>Use Docker for network scanning</span>
                        </label>
                        <div className="ml-2 text-xs text-gray-400">(Recommended)</div>
                    </div>
                    
                    <p className="text-xs text-gray-300 mt-2">
                        Docker-based scanning provides more reliable MAC address detection and SSH service identification.
                    </p>
                </div>
            )}
            
            {/* Error display */}
            {(error || errorMessage) && (
                <div className="bg-red-900 text-red-100 p-2 rounded flex items-center mb-2">
                    <FaExclamationTriangle className="mr-2" />
                    <span>{error || errorMessage}</span>
                </div>
            )}
            
            {/* Status information */}
            <div className="text-xs text-gray-400 flex justify-between">
                <div>
                    <span className="font-medium">Status:</span> {status}
                </div>
                {lastScanTime && (
                    <div>
                        <span className="font-medium">Last Scan:</span> {lastScanTime.toLocaleTimeString()}
                    </div>
                )}
                {currentState && currentState.devices && (
                    <div>
                        <span className="font-medium">Active Devices:</span> {currentState.devices.length}
                    </div>
                )}
            </div>
            
            {/* Active scan status indicator */}
            {isScanning && (
                <div className="mt-3 bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-3">
                    <div className="flex items-center">
                        <div className="mr-3 relative">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-blue-300 rounded-full animate-spin"></div>
                        </div>
                        <div>
                            <h4 className="font-medium text-blue-300">
                                {scanType === 'ping' ? 'Fast Ping Scan' : 'OS Detection Scan'} in Progress
                            </h4>
                            <p className="text-sm text-gray-300">
                                {scanType === 'ping' 
                                    ? 'Identifying active devices on the network...' 
                                    : 'Performing deep OS fingerprinting on network devices...'}
                            </p>
                        </div>
                    </div>
                    {/* Show estimated time remaining for OS scan */}
                    {scanType === 'os' && (
                        <p className="mt-2 text-xs text-gray-400">
                            OS detection may take several minutes depending on network size and response times.
                        </p>
                    )}
                </div>
            )}
            
            {/* Scan output console */}
            {scanOutput && (
                <div className="mb-4">
                    <div className="bg-gray-900 p-2 rounded text-xs text-gray-300 max-h-40 overflow-y-auto font-mono whitespace-pre-wrap">
                        {scanOutput}
                    </div>
                </div>
            )}
              {/* Export and Import functionality */}
            <div className="mb-4 p-3 border border-gray-700 rounded bg-gray-800">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Export/Import Network Scan Data</h3>
                <NetworkScanExportImport 
                    devices={devices}
                    customNames={customNames}
                    onImport={(data) => {
                        console.log("Importing scan data:", data);
                        if (data.devices) {
                            setDevices(data.devices);
                        }
                        if (data.customNames) {
                            setCustomNames(data.customNames);
                        }
                        // Notify parent component
                        if (onScanComplete) {
                            onScanComplete(data);
                        }
                    }}
                />
            </div>

            {/* Network scan history display */}
            <NetworkScanHistory
                scanHistoryData={scanHistoryData}
                addZonesToTopology={addZonesToTopology}
            />

            {/* Raw Data Inspector Panel */}
            <div className="mt-4">
                <button 
                    onClick={() => setShowRawData(!showRawData)} 
                    className="flex items-center w-full justify-between bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm mb-2"
                >
                    <span className="flex items-center">
                        <FaDatabase className="mr-2 text-blue-400" />
                        Raw Data Inspector
                    </span>
                    {showRawData ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                
                {showRawData && (
                    <div className="bg-gray-900 p-4 rounded border border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Raw Network Scan Data */}
                            <div className="bg-gray-800 p-3 rounded">
                                <button 
                                    onClick={() => setShowRawNetworkData(!showRawNetworkData)}
                                    className="flex items-center justify-between w-full mb-2"
                                >
                                    <span className="text-blue-300 font-medium flex items-center">
                                        <FaCode className="mr-2" /> Raw Network Scan Data
                                    </span>
                                    {showRawNetworkData ? <FaChevronUp /> : <FaChevronDown />}
                                </button>
                                
                                {showRawNetworkData && (
                                    <div className="bg-gray-900 p-2 rounded text-xs text-gray-300 max-h-80 overflow-y-auto font-mono">
                                        {rawNetworkData ? (
                                            <pre>{JSON.stringify(rawNetworkData, null, 2)}</pre>
                                        ) : (
                                            <p className="text-gray-500">No raw network data available yet. Run a scan first.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Raw History Data (MemoizedDeviceList data) */}
                            <div className="bg-gray-800 p-3 rounded">
                                <button 
                                    onClick={() => setShowRawHistoryData(!showRawHistoryData)}
                                    className="flex items-center justify-between w-full mb-2"
                                >
                                    <span className="text-green-300 font-medium flex items-center">
                                        <FaCode className="mr-2" /> MemoizedDeviceList History Data
                                    </span>
                                    {showRawHistoryData ? <FaChevronUp /> : <FaChevronDown />}
                                </button>
                                
                                {showRawHistoryData && (
                                    <div className="bg-gray-900 p-2 rounded text-xs text-gray-300 max-h-80 overflow-y-auto font-mono">
                                        {rawHistoryData ? (
                                            <pre>{JSON.stringify(rawHistoryData, null, 2)}</pre>
                                        ) : (
                                            <p className="text-gray-500">No history data available yet. Run a scan first.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-3 text-xs text-gray-400">
                            <p>This panel shows the raw scan data before and after processing for the MemoizedDeviceList component.</p>
                            <p>Use this for debugging or understanding the data structure.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
