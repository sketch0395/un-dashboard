"use client";

import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { io } from "socket.io-client";
import { 
    FaNetworkWired, 
    FaDocker, 
    FaTerminal, 
    FaInfoCircle, 
    FaPlay, 
    FaPause, 
    FaSpinner, 
    FaCog, 
    FaExclamationTriangle, 
    FaCode, 
    FaChevronDown, 
    FaChevronUp, 
    FaDatabase,
    FaTimes,
    FaExpand,
    FaCompress,
    FaEdit,
    FaEye
} from "react-icons/fa";
import NetworkScanHistory, { useScanHistory } from "../networkscan/components/networkscanhistory.js";
import NetworkScanExportImport from "../networkscan/components/NetworkScanExportImport";

const UnifiedDeviceModal = lazy(() => import("./UnifiedDeviceModal"));

/**
 * NetworkControlModal - A reusable modal component for network scanning functionality
 * Can be used across multiple pages to provide consistent network scanning capabilities
 */
export default function NetworkControlModal({ 
    isVisible, 
    onClose, 
    onScanComplete, 
    onDevicesUpdate,
    onCustomNamesUpdate,
    title = "Network Control Center",
    allowFullscreen = true,
    showExportImport = true,
    showHistory = true,
    showRawDataInspector = true,
    defaultIpRange = "10.5.1.1-255",
    currentState = {} 
}) {
    const socketRef = useRef(null);
    const { saveScanHistory } = useScanHistory();

    // Modal state
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Network scanning state
    const [devices, setDevices] = useState({});
    const [customNames, setCustomNames] = useState({});
    const [ipRange, setIpRange] = useState(defaultIpRange);
    const [status, setStatus] = useState("Idle");
    const [scanOutput, setScanOutput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [scanHistoryData, setScanHistoryData] = useState(null);
    const [useDocker, setUseDocker] = useState(true);
    const [showSshInfo, setShowSshInfo] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanType, setScanType] = useState('ping');
    const [lastScanTime, setLastScanTime] = useState(null);
    const [error, setError] = useState(null);
      // UI state
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [showScanTypeInfo, setShowScanTypeInfo] = useState(false);
    const [showRawData, setShowRawData] = useState(false);
    const [rawNetworkData, setRawNetworkData] = useState(null);
    const [rawHistoryData, setRawHistoryData] = useState(null);
    const [showRawNetworkData, setShowRawNetworkData] = useState(false);
    const [showRawHistoryData, setShowRawHistoryData] = useState(false);
    const [showCurrentResults, setShowCurrentResults] = useState(false);
    
    // Device modal state
    const [modalDevice, setModalDevice] = useState(null);

    // Handle device updates
    const handleDevicesUpdate = useCallback((newDevices) => {
        setDevices(newDevices);
        if (onDevicesUpdate) {
            onDevicesUpdate(newDevices);
        }
    }, [onDevicesUpdate]);

    // Handle custom names updates
    const handleCustomNamesUpdate = useCallback((newCustomNames) => {
        setCustomNames(newCustomNames);
        if (onCustomNamesUpdate) {
            onCustomNamesUpdate(newCustomNames);
        }
    }, [onCustomNamesUpdate]);

    const addZonesToTopology = (data) => {
        console.log("NetworkControlModal: addZonesToTopology called with:", data);
        handleDevicesUpdate(data.devices);
        
        if (data.customNames) {
            console.log("NetworkControlModal: Updating custom names:", data.customNames);
            handleCustomNamesUpdate(data.customNames);
        }
    };
    
    // Socket.IO connection setup
    useEffect(() => {
        if (!isVisible) return;

        let serverUrl;
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            serverUrl = "http://10.5.1.83:4000";
        } else {
            serverUrl = `${protocol}//${hostname}:4000`;
        }

        console.log(`NetworkControlModal: Attempting Socket.IO connection to: ${serverUrl}`);
        
        const socket = io(serverUrl, {
            reconnectionAttempts: 5,
            timeout: 10000,
            reconnectionDelay: 1000,
            transports: ['polling', 'websocket'],
            upgrade: true,
            forceNew: true,
        });
        
        socketRef.current = socket;
        
        // Connection event handlers
        socket.on('connect', () => {
            console.log('NetworkControlModal: Socket.IO connected successfully');
            setError(null);
            console.log(`Connected using transport: ${socket.io.engine.transport.name}`);
        });
        
        socket.io.on('error', (err) => {
            console.warn('NetworkControlModal: Socket.IO engine error:', err);
        });
        
        socket.io.on('upgrade', (transport) => {
            console.log(`NetworkControlModal: Transport upgraded to: ${transport.name}`);
        });
          
        socket.on('connect_error', (err) => {
            console.error('NetworkControlModal: Socket.IO connection error:', err);
            
            let errorMessage = `Connection error: ${err.message}.`;
            
            if (err.message.includes('xhr poll error')) {
                errorMessage = `Server connection failed. Please ensure the network scanning server is running at ${serverUrl}.`;
            } else if (err.message.includes('timeout')) {
                errorMessage = `Connection timeout. The server at ${serverUrl} is not responding.`;
            } else if (err.message.includes('ECONNREFUSED')) {
                errorMessage = `Connection refused. The server at ${serverUrl} is not accepting connections.`;
            } else if (err.message.includes('websocket error')) {
                console.warn('WebSocket connection failed, falling back to polling');
                return;
            }
            
            setError(errorMessage);
        });

        socket.on('disconnect', (reason) => {
            console.warn('NetworkControlModal: Socket.IO disconnected:', reason);
            
            let disconnectMessage = '';
            
            if (reason === 'io server disconnect') {
                disconnectMessage = 'The server has disconnected. Attempting to reconnect...';
                socket.connect();
            } else if (reason === 'transport close') {
                disconnectMessage = 'Connection to server lost. Waiting for automatic reconnection...';
            } else if (reason === 'ping timeout') {
                disconnectMessage = 'Server did not respond. Trying to reconnect...';
                socket.connect();
            } else {
                disconnectMessage = `Disconnected from server (${reason}). Reconnecting...`;
            }
            
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
            
            if (data.status === "Scan complete") {
                setIsScanning(false);
                setLastScanTime(new Date());
            }
            
            if (data.status.includes("in progress") || data.status.includes("Starting")) {
                setIsScanning(true);
            }
            
            if (data.status === "SSH devices found") {
                setShowSshInfo(true);
            }
        });

        socket.on("networkData", (data) => {
            console.log("NetworkControlModal: WebSocket networkData event received:", data);
            console.log("Current IP Range:", ipRange);
            
            if (data && Object.keys(data).length > 0) {
                setRawNetworkData(JSON.parse(JSON.stringify(data)));
                
                handleDevicesUpdate(data);
                
                const historyData = { data, ipRange };
                setScanHistoryData(historyData); 
                setRawHistoryData(JSON.parse(JSON.stringify(historyData)));
                  if (onScanComplete) {
                    const flattenedDevices = [];
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
        
        socket.on("saveToScanHistory", (data) => {
            if (data && data.devices) {
                try {
                    console.log("NetworkControlModal: Received saveToScanHistory event:", data);
                    const ipRange = data.ipRange || "API Import";
                    saveScanHistory(data.devices, ipRange);
                } catch (error) {
                    console.error("Error saving to scan history:", error);
                }
            }
        });

        return () => {
            console.log('NetworkControlModal: Cleaning up Socket.IO connection');
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
    }, [isVisible, ipRange, scanType, onScanComplete, handleDevicesUpdate]);

    const startNetworkScan = useCallback(() => {
        setErrorMessage("");
        setError(null);
        setStatus("Starting scan...");
        setScanOutput("");
        setShowSshInfo(false);
        setIsScanning(true);
        
        console.log(`NetworkControlModal: Starting ${scanType} scan with IP range: ${ipRange}`);
        console.log(`Using Docker: ${useDocker}, Scan Type: ${scanType}`);
        
        const currentTime = new Date();
        setLastScanTime(currentTime);
        
        socketRef.current.emit("startNetworkScan", { 
            range: ipRange, 
            useDocker: useDocker,
            scanType: scanType
        });
    }, [ipRange, useDocker, scanType]);

    const toggleAdvancedOptions = () => {
        setShowAdvancedOptions(!showAdvancedOptions);
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const handleClose = () => {
        setIsFullscreen(false);
        onClose();
    };    const handleImport = (data) => {
        console.log("NetworkControlModal: Importing scan data:", data);
        if (data.devices) {
            handleDevicesUpdate(data.devices);
        }
        if (data.customNames) {
            handleCustomNamesUpdate(data.customNames);
        }
        if (onScanComplete) {
            onScanComplete(data);
        }
    };

    // Device modal functions
    const openDeviceModal = (device) => {
        setModalDevice(device);
    };

    const closeDeviceModal = () => {
        setModalDevice(null);
    };

    const saveDeviceChanges = (updatedDevice) => {
        console.log("NetworkControlModal: Saving device changes:", updatedDevice);
        
        // Update devices state
        setDevices(prevDevices => {
            const newDevices = { ...prevDevices };
            Object.keys(newDevices).forEach(vendor => {
                if (Array.isArray(newDevices[vendor])) {
                    newDevices[vendor] = newDevices[vendor].map(device => 
                        device.ip === updatedDevice.ip ? { ...device, ...updatedDevice } : device
                    );
                }
            });
            return newDevices;
        });

        // Save to localStorage for persistence
        const existingProperties = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
        existingProperties[updatedDevice.ip] = {
            name: updatedDevice.name,
            color: updatedDevice.color,
            icon: updatedDevice.icon,
            category: updatedDevice.category,
            notes: updatedDevice.notes,
            networkRole: updatedDevice.networkRole,
            portCount: updatedDevice.portCount,
            parentSwitch: updatedDevice.parentSwitch,
            history: existingProperties[updatedDevice.ip]?.history || []
        };
        localStorage.setItem("customDeviceProperties", JSON.stringify(existingProperties));

        closeDeviceModal();
    };

    // Don't render if not visible
    if (!isVisible) return null;

    const modalClasses = isFullscreen 
        ? "fixed inset-0 bg-gray-900 z-50 overflow-y-auto"
        : "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50";

    const contentClasses = isFullscreen
        ? "w-full h-full p-6"
        : "bg-gray-800 rounded-lg p-6 w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto relative";

    return (
        <div className={modalClasses}>
            <div className={contentClasses}>
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <FaNetworkWired className="mr-3 text-blue-400" />
                        {title}
                    </h2>
                    <div className="flex items-center space-x-2">
                        {allowFullscreen && (
                            <button
                                onClick={toggleFullscreen}
                                className="text-gray-400 hover:text-white p-2 rounded"
                                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                            >
                                {isFullscreen ? <FaCompress size={20} /> : <FaExpand size={20} />}
                            </button>
                        )}
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-white p-2 rounded"
                            title="Close"
                        >
                            <FaTimes size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="text-white">
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
                    <div className="flex flex-wrap gap-2 mb-4">
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
                    
                    {/* Advanced Options Panel */}
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
                    <div className="text-xs text-gray-400 flex justify-between mb-4">
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
                        <div className="mb-4 bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-3">
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
                    )}                    {/* Export and Import functionality */}
                    {showExportImport && (
                        <div className="mb-4 p-3 border border-gray-700 rounded bg-gray-800">
                            <h3 className="text-sm font-medium text-gray-300 mb-2">Export/Import Network Scan Data</h3>
                            <NetworkScanExportImport 
                                devices={devices}
                                customNames={customNames}
                                onImport={handleImport}
                            />
                        </div>
                    )}

                    {/* Current Scan Results */}
                    {devices && Object.keys(devices).length > 0 && (
                        <div className="mb-4">
                            <button 
                                onClick={() => setShowCurrentResults(!showCurrentResults)} 
                                className="flex items-center w-full justify-between bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm mb-2"
                            >
                                <span className="flex items-center">
                                    <FaNetworkWired className="mr-2 text-green-400" />
                                    Current Scan Results ({Object.values(devices).flat().length} devices)
                                </span>
                                {showCurrentResults ? <FaChevronUp /> : <FaChevronDown />}
                            </button>
                            
                            {showCurrentResults && (
                                <div className="bg-gray-800 p-3 rounded border border-gray-700">
                                    <div className="space-y-2">
                                        {Object.entries(devices).map(([vendor, deviceList]) => (
                                            <div key={vendor} className="bg-gray-900 p-2 rounded">
                                                <h4 className="text-sm font-medium text-blue-300 mb-2">
                                                    {vendor} ({Array.isArray(deviceList) ? deviceList.length : 0} devices)
                                                </h4>
                                                {Array.isArray(deviceList) && deviceList.map((device, index) => (
                                                    <div key={`${device.ip}-${index}`} className="flex items-center justify-between bg-gray-800 p-2 rounded mb-1">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-white font-medium">
                                                                    {device.name || device.hostname || device.ip}
                                                                </span>
                                                                {device.networkRole && (
                                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                        device.networkRole === 'gateway' ? 'bg-blue-600 text-blue-100' :
                                                                        device.networkRole === 'switch' ? 'bg-green-600 text-green-100' :
                                                                        'bg-gray-600 text-gray-100'
                                                                    }`}>
                                                                        {device.networkRole === 'gateway' ? 'Gateway' :
                                                                         device.networkRole === 'switch' ? 'Switch' : 
                                                                         device.networkRole}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                IP: {device.ip}
                                                                {device.mac && ` • MAC: ${device.mac}`}
                                                                {device.vendor && ` • ${device.vendor}`}
                                                            </div>
                                                        </div>
                                                        <div className="flex space-x-1">
                                                            <button
                                                                onClick={() => openDeviceModal(device)}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-xs"
                                                                title="Edit device properties and network role"
                                                            >
                                                                <FaEdit />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 text-xs text-gray-400">
                                        <p>Click the edit button to modify device properties including network role (Gateway/Switch).</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Network scan history display */}
                    {showHistory && (
                        <NetworkScanHistory
                            scanHistoryData={scanHistoryData}
                            addZonesToTopology={addZonesToTopology}
                        />
                    )}

                    {/* Raw Data Inspector Panel */}
                    {showRawDataInspector && (
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
                                        
                                        {/* Raw History Data */}
                                        <div className="bg-gray-800 p-3 rounded">
                                            <button 
                                                onClick={() => setShowRawHistoryData(!showRawHistoryData)}
                                                className="flex items-center justify-between w-full mb-2"
                                            >
                                                <span className="text-green-300 font-medium flex items-center">
                                                    <FaCode className="mr-2" /> History Data
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
                                        <p>This panel shows the raw scan data before and after processing.</p>
                                        <p>Use this for debugging or understanding the data structure.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* UnifiedDeviceModal for editing device properties */}
            {modalDevice && (
                <Suspense fallback={<div>Loading device editor...</div>}>
                    <UnifiedDeviceModal
                        modalDevice={modalDevice}
                        setModalDevice={setModalDevice}
                        onSave={saveDeviceChanges}
                        onStartSSH={(device) => {
                            console.log("SSH requested for device:", device);
                            // SSH functionality can be added here if needed
                        }}
                    />
                </Suspense>
            )}
        </div>
    );
}
