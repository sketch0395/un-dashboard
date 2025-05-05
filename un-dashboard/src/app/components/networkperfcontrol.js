"use client";

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { FaServer, FaChartLine, FaDocker, FaInfoCircle, FaExclamationTriangle, FaChevronDown, FaCheck, FaHistory } from "react-icons/fa";

export default function NetworkPerfControl({ setPerformanceData, devices }) {
    const socketRef = useRef(null);
    const [selectedDevices, setSelectedDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [monitoringInterval, setMonitoringInterval] = useState(60000);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const intervalRef = useRef(null);
    const [useDockerTools, setUseDockerTools] = useState(false);
    const [dockerHost, setDockerHost] = useState("10.5.1.212");
    const [showDockerConfig, setShowDockerConfig] = useState(false);
    const [ipStatus, setIpStatus] = useState({});
    const [overallProgress, setOverallProgress] = useState(0);
    
    // Device selection dropdown state
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Network scan history state
    const [scanHistory, setScanHistory] = useState([]);
    const [scanHistoryDropdownOpen, setScanHistoryDropdownOpen] = useState(false);
    const [selectedScan, setSelectedScan] = useState(null);
    const [scanDevices, setScanDevices] = useState([]);

    useEffect(() => {
        const socket = io("http://10.5.1.83:4000");
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Socket connected for network performance monitoring");
        });

        socket.on("networkPerformanceStatus", (data) => {
            if (data.error) {
                setError(data.error);
                setIsLoading(false);
                
                // Update status for specific IP if provided
                if (data.ip) {
                    setIpStatus(prev => ({
                        ...prev,
                        [data.ip]: {
                            status: 'error',
                            message: data.error,
                            progress: data.progress || 0
                        }
                    }));
                }
            } else {
                // Update overall progress if provided
                if (data.progress !== undefined) {
                    setOverallProgress(data.progress);
                }
                
                // Update status for specific IP if provided
                if (data.ip) {
                    setIpStatus(prev => ({
                        ...prev,
                        [data.ip]: {
                            status: data.complete ? 'complete' : 'checking',
                            message: data.status,
                            progress: data.progress || 0
                        }
                    }));
                }
            }
        });

        // Handle partial updates for each IP as they are scanned
        socket.on("networkPerformancePartialUpdate", (data) => {
            const { ip, data: ipData } = data;
            console.log(`Received partial update for ${ip}`, ipData);
            
            // Update the performance data with the partial update
            setPerformanceData(prevData => {
                // Create new arrays with the updated data for this IP
                const updateDataCategory = (category) => {
                    // Remove any previous data for this IP
                    const filtered = prevData[category]?.filter(item => item.ip !== ip) || [];
                    // Add new data for this IP if available
                    return ipData[category]?.length > 0 
                        ? [...filtered, ...ipData[category]]
                        : filtered;
                };
                
                return {
                    latency: updateDataCategory('latency'),
                    bandwidth: updateDataCategory('bandwidth'),
                    uptime: updateDataCategory('uptime'),
                    quality: updateDataCategory('quality'),
                    pathAnalysis: updateDataCategory('pathAnalysis'),
                };
            });
            
            // Update status for this IP to show it's been processed
            setIpStatus(prev => ({
                ...prev,
                [ip]: {
                    ...prev[ip],
                    status: 'complete',
                    message: `Scan completed for ${ip}`,
                    hasData: true
                }
            }));
        });

        socket.on("networkPerformanceData", (data) => {
            // This is called at the end with complete data
            setPerformanceData({
                latency: data.latency || [],
                bandwidth: data.bandwidth || [],
                uptime: data.uptime || [],
                quality: data.quality || [],
                pathAnalysis: data.pathAnalysis || []
            });
            setIsLoading(false);
        });
        
        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
            setError("Failed to connect to the server.");
            setIsLoading(false);
        });

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            socket.disconnect();
        };
    }, []);

    // Load scan history from localStorage
    useEffect(() => {
        const savedHistory = JSON.parse(localStorage.getItem("scanHistory")) || [];
        setScanHistory(savedHistory);
    }, []);

    // Update selected devices when devices prop changes
    useEffect(() => {
        if (devices && devices.length > 0 && selectedDevices.length === 0 && !selectedScan) {
            // Initially select the first 5 devices, or all if fewer than 5
            const initialSelected = devices.slice(0, 5).map(device => device.ip);
            setSelectedDevices(initialSelected);
        }
    }, [devices]);
    
    // Update available devices when a scan is selected
    useEffect(() => {
        if (selectedScan) {
            const scanData = selectedScan.data;
            if (scanData) {
                // Flatten devices from all categories in scan data
                const allDevices = Object.values(scanData).flat();
                setScanDevices(allDevices);
                
                // Clear previous selections when scan changes
                setSelectedDevices([]);
            }
        } else {
            // When no scan is selected, use the devices prop
            setScanDevices(devices || []);
        }
    }, [selectedScan]);
    
    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownOpen && !event.target.closest('.device-dropdown')) {
                setDropdownOpen(false);
            }
            
            if (scanHistoryDropdownOpen && !event.target.closest('.scan-history-dropdown')) {
                setScanHistoryDropdownOpen(false);
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [dropdownOpen, scanHistoryDropdownOpen]);

    const startPerformanceCheck = () => {
        if (selectedDevices.length === 0) {
            setError("Please select at least one device to monitor.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setOverallProgress(0);
        
        // Reset IP status for all selected devices
        const initialStatus = {};
        selectedDevices.forEach(ip => {
            initialStatus[ip] = { status: 'pending', message: 'Waiting to start...', progress: 0 };
        });
        setIpStatus(initialStatus);
        
        // Emit event to server to start performance check
        socketRef.current.emit("startNetworkPerformanceCheck", {
            ips: selectedDevices,
            useDockerTools,
            dockerHost: dockerHost
        });
    };

    const toggleDeviceSelection = (ip) => {
        if (selectedDevices.includes(ip)) {
            setSelectedDevices(prev => prev.filter(device => device !== ip));
        } else {
            setSelectedDevices(prev => [...prev, ip]);
        }
    };

    const toggleMonitoring = () => {
        if (isMonitoring) {
            // Stop monitoring
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsMonitoring(false);
        } else {
            // Start monitoring
            startPerformanceCheck(); // Run immediately
            
            // Then set up interval
            const interval = setInterval(() => {
                if (selectedDevices.length > 0) {
                    startPerformanceCheck();
                }
            }, monitoringInterval || 60000); // Default to 1 minute if not set
            
            intervalRef.current = interval;
            setIsMonitoring(true);
        }
    };
    
    // Helper function to get device name from IP
    const getDeviceName = (ip) => {
        // First check in scan devices if a scan is selected
        if (scanDevices && scanDevices.length > 0) {
            const device = scanDevices.find(d => d.ip === ip);
            if (device) return device.name || device.hostname || ip;
        }
        
        // Fall back to devices prop if not found in scan
        if (devices) {
            const device = devices.find(d => d.ip === ip);
            return device?.name || device?.hostname || ip;
        }
        
        return ip;
    };
    
    // Helper function to select a scan and load its devices
    const selectScan = (scan) => {
        setSelectedScan(scan);
        setScanHistoryDropdownOpen(false);
    };
    
    // Get status indicator for a specific IP
    const getStatusIndicator = (ip) => {
        const status = ipStatus[ip];
        if (!status) return null;
        
        let color, icon;
        switch(status.status) {
            case 'complete':
                color = 'bg-green-500';
                icon = <FaInfoCircle className="text-white" />;
                break;
            case 'error':
                color = 'bg-red-500';
                icon = <FaExclamationTriangle className="text-white" />;
                break;
            case 'checking':
                color = 'bg-blue-500';
                icon = <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>;
                break;
            default:
                color = 'bg-gray-500';
                icon = <FaInfoCircle className="text-white" />;
        }
        
        return (
            <div className="flex items-center space-x-1">
                <div className={`flex items-center justify-center w-5 h-5 rounded-full ${color}`}>
                    {icon}
                </div>
                <div className="text-xs truncate max-w-[120px]">{status.message}</div>
            </div>
        );
    };
    
    // Filter devices based on search query
    const filteredDevices = scanDevices?.filter(device => {
        const deviceName = device.name || device.hostname || device.ip;
        return (
            deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            device.ip.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }) || [];

    return (
        <div className="p-4 bg-gray-800 text-white rounded-lg">
            <h2 className="text-xl font-bold mb-4">Performance Monitoring</h2>
            
            {/* Network Scan Selection Dropdown */}
            <div className="mb-4">
                <h3 className="text-md font-semibold mb-2">Select Network Scan</h3>
                
                <div className="scan-history-dropdown relative">
                    <button
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded flex justify-between items-center"
                        onClick={() => setScanHistoryDropdownOpen(!scanHistoryDropdownOpen)}
                    >
                        <span className="flex items-center">
                            <FaHistory className="mr-2 text-blue-400" />
                            {selectedScan 
                                ? (selectedScan.name || `Scan from ${new Date(selectedScan.timestamp).toLocaleString()}`) 
                                : "Current devices (No scan selected)"}
                        </span>
                        <FaChevronDown className={`transition-transform ${scanHistoryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {scanHistoryDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-gray-700 rounded shadow-lg z-30 max-h-[200px] overflow-y-auto">
                            <div className="p-2">
                                <button 
                                    className="w-full text-left p-2 rounded hover:bg-gray-600 flex items-center"
                                    onClick={() => {
                                        setSelectedScan(null);
                                        setScanHistoryDropdownOpen(false);
                                    }}
                                >
                                    {!selectedScan && <FaCheck className="mr-2 text-blue-400" />}
                                    <span>Current devices</span>
                                </button>
                                
                                {scanHistory.length === 0 ? (
                                    <p className="text-sm text-gray-400 py-2 text-center">No scan history available</p>
                                ) : (
                                    scanHistory.slice().reverse().map((scan, index) => (
                                        <button 
                                            key={index}
                                            className="w-full text-left p-2 rounded hover:bg-gray-600 flex items-center justify-between"
                                            onClick={() => selectScan(scan)}
                                        >
                                            <div className="flex items-center">
                                                {selectedScan && selectedScan.id === scan.id && <FaCheck className="mr-2 text-blue-400" />}
                                                <div>
                                                    <div>{scan.name || `Scan ${scanHistory.length - index}`}</div>
                                                    <div className="text-xs text-gray-400">
                                                        {new Date(scan.timestamp).toLocaleString()} • {scan.devices} devices
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-xs bg-blue-900 px-2 py-1 rounded">{scan.ipRange}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Device Selection Dropdown */}
            <div className="mb-4">
                <h3 className="text-md font-semibold mb-2">Select Devices to Monitor</h3>
                
                {/* Device dropdown */}
                <div className="device-dropdown relative">
                    <button
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded flex justify-between items-center"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                        <span>
                            {selectedDevices.length === 0 
                                ? "Select devices..." 
                                : `${selectedDevices.length} device${selectedDevices.length > 1 ? 's' : ''} selected`}
                        </span>
                        <FaChevronDown className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {dropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-gray-700 rounded shadow-lg z-20 max-h-[300px] overflow-y-auto">
                            <div className="p-2 sticky top-0 bg-gray-700 border-b border-gray-600">
                                <input 
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search devices..."
                                    className="w-full px-3 py-1.5 bg-gray-600 text-white rounded text-sm"
                                />
                            </div>
                            
                            <div className="p-2">
                                {filteredDevices.length === 0 ? (
                                    <p className="text-sm text-gray-400 py-2 text-center">No devices found</p>
                                ) : (
                                    filteredDevices.map((device, index) => (
                                        <div 
                                            key={index}
                                            className={`p-2 rounded cursor-pointer mb-1 flex items-center ${
                                                selectedDevices.includes(device.ip) 
                                                    ? "bg-blue-600" 
                                                    : "bg-gray-600 hover:bg-gray-500"
                                            }`}
                                            onClick={() => toggleDeviceSelection(device.ip)}
                                        >
                                            <div className={`w-4 h-4 mr-3 rounded flex items-center justify-center ${
                                                selectedDevices.includes(device.ip) ? "bg-blue-300" : "bg-gray-500"
                                            }`}>
                                                {selectedDevices.includes(device.ip) && (
                                                    <FaCheck className="text-xs text-blue-800" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <span className="text-sm font-medium">
                                                        {device.name || device.hostname || device.ip}
                                                    </span>
                                                    <span className="text-xs text-gray-400">{device.ip}</span>
                                                </div>
                                                
                                                {/* Show status for selected devices */}
                                                {selectedDevices.includes(device.ip) && ipStatus[device.ip] && (
                                                    <div className="mt-1">
                                                        {getStatusIndicator(device.ip)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                
                                {filteredDevices.length > 0 && (
                                    <div className="pt-2 mt-2 border-t border-gray-600 flex gap-2">
                                        <button
                                            className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs w-full"
                                            onClick={() => {
                                                setSelectedDevices(filteredDevices.map(d => d.ip));
                                            }}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs w-full"
                                            onClick={() => {
                                                setSelectedDevices([]);
                                            }}
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Selected devices chips */}
                {selectedDevices.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {selectedDevices.map(ip => (
                            <div key={ip} className="bg-gray-700 px-2 py-1 rounded flex items-center text-sm">
                                <span>{getDeviceName(ip)}</span>
                                <button 
                                    className="ml-2 text-gray-400 hover:text-white"
                                    onClick={() => toggleDeviceSelection(ip)}
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Monitoring Controls */}
            <div className="flex flex-col gap-4 mb-4">
                <div>
                    <label className="block text-sm text-gray-300 mb-1">Monitoring Interval</label>
                    <select
                        value={monitoringInterval || 60000}
                        onChange={(e) => setMonitoringInterval(parseInt(e.target.value))}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                        disabled={isMonitoring}
                    >
                        <option value={10000}>10 seconds</option>
                        <option value={30000}>30 seconds</option>
                        <option value={60000}>1 minute</option>
                        <option value={300000}>5 minutes</option>
                        <option value={600000}>10 minutes</option>
                    </select>
                </div>
                
                <div className="flex gap-2">
                    <button
                        onClick={toggleMonitoring}
                        className={`px-4 py-2 rounded flex-1 ${
                            isMonitoring 
                                ? "bg-red-600 hover:bg-red-700" 
                                : "bg-green-600 hover:bg-green-700"
                        }`}
                        disabled={selectedDevices.length === 0}
                    >
                        {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
                    </button>
                    
                    <button
                        onClick={startPerformanceCheck}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex-1"
                        disabled={selectedDevices.length === 0 || isLoading}
                    >
                        {isLoading ? "Checking..." : "Check Now"}
                    </button>
                </div>
            </div>
            
            {/* Overall progress bar */}
            {isLoading && (
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(overallProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div 
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                            style={{width: `${overallProgress}%`}}
                        ></div>
                    </div>
                </div>
            )}
            
            {error && (
                <div className="bg-red-800/50 text-white p-3 rounded mb-4 flex items-center">
                    <FaExclamationTriangle className="mr-2 text-red-400" /> 
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}