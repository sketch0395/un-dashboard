"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { io } from "socket.io-client";
import { Line } from "react-chartjs-2";
import { FaWifi, FaServer, FaChartLine, FaExclamationTriangle, FaCheck, FaTimes, FaInfoCircle, FaNetworkWired, FaDocker } from "react-icons/fa";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

// Convert to forwardRef to expose methods to parent component
const NetworkPerformance = forwardRef(({ 
    devices, 
    activeTab, 
    monitoringEnabled, 
    useDockerTools = true, 
    dockerHost = "10.5.1.212",
    refreshInterval = 60000 
}, ref) => {
    const socketRef = useRef(null);
    const [selectedDevices, setSelectedDevices] = useState([]);
    const [performanceData, setPerformanceData] = useState({
        latency: [],
        bandwidth: [],
        uptime: [],
    });
    const [historicalData, setHistoricalData] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeDevice, setActiveDevice] = useState(null);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const intervalRef = useRef(null);
    const [deviceNameMap, setDeviceNameMap] = useState({});
    const [ipStatus, setIpStatus] = useState({});
    const [overallProgress, setOverallProgress] = useState(0);

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
        startMonitoring: (interval) => {
            // Clear any existing interval
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            
            // Start immediately
            startPerformanceCheck();
            
            // Then set up interval
            const intervalId = setInterval(() => {
                if (selectedDevices.length > 0) {
                    startPerformanceCheck();
                }
            }, interval || refreshInterval);
            
            intervalRef.current = intervalId;
            setIsMonitoring(true);
            
            return Promise.resolve();
        },
        stopMonitoring: () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setIsMonitoring(false);
            return Promise.resolve();
        },
        checkNow: () => {
            // Return a promise that resolves when the check is complete
            return new Promise((resolve, reject) => {
                if (selectedDevices.length === 0) {
                    setError("Please select at least one device to monitor.");
                    reject(new Error("No devices selected"));
                    return;
                }
                
                const checkCompleteListener = (data) => {
                    if (data.complete) {
                        socketRef.current.off("networkPerformanceStatus", checkCompleteListener);
                        resolve();
                    }
                };
                
                // Listen for completion
                socketRef.current.on("networkPerformanceStatus", checkCompleteListener);
                
                // Start the check
                startPerformanceCheck();
                
                // Safety timeout to resolve the promise if no completion event is received
                setTimeout(() => {
                    socketRef.current.off("networkPerformanceStatus", checkCompleteListener);
                    resolve();
                }, 30000); // 30 second timeout
            });
        }
    }));

    // Create map of IP to device name
    useEffect(() => {
        if (devices && devices.length > 0) {
            const nameMap = {};
            devices.forEach(device => {
                nameMap[device.ip] = device.name || device.hostname || 'Unknown Device';
            });
            setDeviceNameMap(nameMap);
        }
    }, [devices]);

    // Connect to socket server on component mount
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

        socket.on("networkPerformanceData", (data) => {
            setPerformanceData({
                latency: data.latency || [],
                bandwidth: data.bandwidth || [],
                uptime: data.uptime || [],
            });
            setIsLoading(false);
        });
        
        // Handle partial updates for individual IPs
        socket.on("networkPerformancePartialUpdate", (data) => {
            if (!data.ip || !data.data) return;
            
            setPerformanceData(prev => {
                // Function to merge arrays without duplicates
                const mergeArrays = (existingArr, newArr) => {
                    if (!newArr || newArr.length === 0) return existingArr;
                    
                    // Remove any existing data for this IP
                    const filtered = existingArr.filter(item => item.ip !== data.ip);
                    
                    // Add the new data
                    return [...filtered, ...newArr];
                };
                
                return {
                    latency: mergeArrays(prev.latency, data.data.latency),
                    bandwidth: mergeArrays(prev.bandwidth, data.data.bandwidth),
                    uptime: mergeArrays(prev.uptime, data.data.uptime)
                };
            });
        });

        socket.on("historicalPerformanceData", (data) => {
            setHistoricalData(prev => ({
                ...prev,
                [data.ip]: data
            }));
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

    // Update selected devices when devices prop changes
    useEffect(() => {
        if (devices && devices.length > 0 && selectedDevices.length === 0) {
            // Initially select the first 5 devices, or all if fewer than 5
            const initialSelected = devices.slice(0, Math.min(5, devices.length)).map(device => device.ip);
            setSelectedDevices(initialSelected);
        }
    }, [devices]);

    // When a device is selected, load its historical data
    useEffect(() => {
        if (activeDevice && socketRef.current) {
            // Request historical data for the active device
            socketRef.current.emit("getHistoricalPerformance", { ip: activeDevice });
        }
    }, [activeDevice]);

    // Handle external monitoring state from parent
    useEffect(() => {
        // Skip if we're already in the correct state
        if (isMonitoring === monitoringEnabled) return;
        
        // Sync with parent state
        setIsMonitoring(monitoringEnabled);
        
        // Clean up any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        
        // If monitoring is now enabled, start it
        if (monitoringEnabled && selectedDevices.length > 0) {
            startPerformanceCheck();
            
            // Set up the interval
            const intervalId = setInterval(() => {
                if (selectedDevices.length > 0) {
                    startPerformanceCheck();
                }
            }, refreshInterval);
            
            intervalRef.current = intervalId;
        }
    }, [monitoringEnabled, refreshInterval]);

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

    // Format timestamp for display
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };

    // Get device name from IP
    const getDeviceName = (ip) => {
        return deviceNameMap[ip] || ip;
    };

    // Generate chart data for latency
    const getLatencyChartData = () => {
        if (!activeDevice || !historicalData[activeDevice] || !historicalData[activeDevice].latency) {
            return {
                labels: [],
                datasets: [{
                    label: 'Latency (ms)',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            };
        }

        const data = historicalData[activeDevice].latency;
        return {
            labels: data.map(point => formatTime(point.timestamp)),
            datasets: [{
                label: `Latency (ms) - ${getDeviceName(activeDevice)}`,
                data: data.map(point => point.value),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        };
    };

    // Generate chart data for bandwidth
    const getBandwidthChartData = () => {
        if (!activeDevice || !historicalData[activeDevice] || !historicalData[activeDevice].bandwidth) {
            return {
                labels: [],
                datasets: []
            };
        }

        const data = historicalData[activeDevice].bandwidth;
        const deviceName = getDeviceName(activeDevice);
        
        return {
            labels: data.map(point => formatTime(point.timestamp)),
            datasets: [
                {
                    label: `Download (Mbps) - ${deviceName}`,
                    data: data.map(point => point.download),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                },
                {
                    label: `Upload (Mbps) - ${deviceName}`,
                    data: data.map(point => point.upload),
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                }
            ]
        };
    };

    // Generate chart data for uptime
    const getUptimeChartData = () => {
        if (!activeDevice || !historicalData[activeDevice] || !historicalData[activeDevice].uptime) {
            return {
                labels: [],
                datasets: [{
                    label: 'Uptime Status',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    stepped: true
                }]
            };
        }

        const data = historicalData[activeDevice].uptime;
        return {
            labels: data.map(point => formatTime(point.timestamp)),
            datasets: [{
                label: `Uptime Status - ${getDeviceName(activeDevice)}`,
                data: data.map(point => point.status === 'up' ? 1 : 0),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.1,
                stepped: true
            }]
        };
    };

    // Get chart options based on active tab
    const getChartOptions = () => {
        const deviceName = activeDevice ? getDeviceName(activeDevice) : 'Device';
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} for ${deviceName}`
                }
            }
        };

        if (activeTab === 'uptime') {
            return {
                ...baseOptions,
                scales: {
                    y: {
                        min: 0,
                        max: 1,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                return value === 1 ? 'Up' : 'Down';
                            }
                        }
                    }
                }
            };
        }

        return baseOptions;
    };

    // Helper function to determine if we have performance data
    const hasPerformanceData = () => {
        return (
            performanceData.latency.length > 0 || 
            performanceData.bandwidth.length > 0 || 
            performanceData.uptime.length > 0
        );
    };

    // Get device status indicator
    const getStatusIndicator = (ip) => {
        const status = ipStatus[ip];
        if (!status) return null;
        
        let color, icon;
        switch(status.status) {
            case 'complete':
                color = 'bg-green-500';
                icon = <FaCheck className="text-white" />;
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

    return (
        <div className="relative bg-gray-800 rounded-lg p-4 text-white">
            {/* Removed topology/performance tabs that were here */}

            <h2 className="text-xl font-bold mb-4">Network Performance Monitoring</h2>
            
            {/* Device Selection */}
            <div className="mb-4">
                <h3 className="text-md font-semibold mb-2">Select Devices to Monitor</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {devices && devices.map((device, index) => (
                        <div 
                            key={index}
                            className={`cursor-pointer p-2 rounded ${
                                selectedDevices.includes(device.ip) 
                                    ? "bg-blue-600" 
                                    : "bg-gray-700 hover:bg-gray-600"
                            }`}
                            onClick={() => toggleDeviceSelection(device.ip)}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <div className={`w-4 h-4 mr-2 rounded-full flex items-center justify-center ${
                                    selectedDevices.includes(device.ip) ? "bg-blue-300" : "bg-gray-500"
                                }`}>
                                    {selectedDevices.includes(device.ip) && <FaCheck className="text-xs text-blue-800" />}
                                </div>
                                <span className="text-sm truncate flex-1">
                                    {device.name || device.hostname || device.ip}
                                </span>
                            </div>
                            
                            {/* Show status indicator for this IP when selected */}
                            {selectedDevices.includes(device.ip) && ipStatus[device.ip] && (
                                <div className="mt-1">
                                    {getStatusIndicator(device.ip)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Overall progress bar - maintain this in the main panel */}
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
            
            {error && !hasPerformanceData() && (
                <div className="bg-gray-700 text-white p-3 rounded mb-4 flex items-center">
                    <FaInfoCircle className="mr-2 text-blue-400" /> 
                    <span>
                        No performance data available. Select devices and click "Check Now" to start monitoring.
                    </span>
                </div>
            )}

            {error && hasPerformanceData() && (
                <div className="bg-yellow-700 text-white p-3 rounded mb-4 flex items-center">
                    <FaExclamationTriangle className="mr-2 text-yellow-400" /> 
                    <span>
                        {error}
                    </span>
                </div>
            )}
            
            {/* Performance Data Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Latency Card */}
                <div className="bg-gray-700 p-4 rounded">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold flex items-center">
                            <FaWifi className="mr-2" /> Latency
                        </h3>
                    </div>
                    
                    {performanceData.latency.length === 0 ? (
                        <div className="text-center text-gray-400 py-6">
                            <p>No latency data available</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {performanceData.latency.map((item, index) => (
                                <div 
                                    key={index} 
                                    className={`p-2 rounded cursor-pointer ${
                                        activeDevice === item.ip ? "bg-blue-900" : "bg-gray-800 hover:bg-gray-600"
                                    }`}
                                    onClick={() => setActiveDevice(item.ip)}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">
                                            {getDeviceName(item.ip)} <span className="text-xs text-gray-400">({item.ip})</span>
                                        </span>
                                        {item.alive ? (
                                            <span className="text-xs bg-green-800 text-green-200 px-1.5 rounded">Online</span>
                                        ) : (
                                            <span className="text-xs bg-red-800 text-red-200 px-1.5 rounded">Offline</span>
                                        )}
                                    </div>
                                    {item.alive ? (
                                        <div className="text-sm mt-1">
                                            <span>{item.latency !== null ? `${item.latency.toFixed(2)} ms` : 'N/A'}</span>
                                            {item.packetLoss > 0 && (
                                                <span className="ml-2 text-yellow-400 text-xs">
                                                    {item.packetLoss}% loss
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-red-400 mt-1">
                                            Device unreachable
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Bandwidth Card */}
                <div className="bg-gray-700 p-4 rounded">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold flex items-center">
                            <FaChartLine className="mr-2" /> Bandwidth
                        </h3>
                    </div>
                    
                    {performanceData.bandwidth.length === 0 ? (
                        <div className="text-center text-gray-400 py-6">
                            <p>No bandwidth data available</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {performanceData.bandwidth.map((item, index) => (
                                <div 
                                    key={index} 
                                    className={`p-2 rounded cursor-pointer ${
                                        activeDevice === item.ip ? "bg-blue-900" : "bg-gray-800 hover:bg-gray-600"
                                    }`}
                                    onClick={() => setActiveDevice(item.ip)}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">
                                            {getDeviceName(item.ip)} <span className="text-xs text-gray-400">({item.ip})</span>
                                        </span>
                                        {(item.download !== null || item.upload !== null) && (
                                            <span className="text-xs bg-blue-800 text-blue-200 px-1.5 rounded">Data</span>
                                        )}
                                    </div>
                                    {item.download !== null && item.upload !== null ? (
                                        <div className="text-xs mt-1">
                                            <div className="grid grid-cols-2">
                                                <span>↓ {item.download.toFixed(2)} Mbps</span>
                                                <span>↑ {item.upload.toFixed(2)} Mbps</span>
                                            </div>
                                            {item.source && (
                                                <div className="mt-1">
                                                    <span className={`text-xs px-1 rounded ${
                                                        item.source === 'iperf3' ? 'bg-green-800 text-green-200' :
                                                        item.source === 'curl-fallback' ? 'bg-yellow-800 text-yellow-200' :
                                                        'bg-gray-800 text-gray-200'
                                                    }`}>
                                                        {item.source === 'iperf3' ? 'iperf3 measurement' :
                                                         item.source === 'curl-fallback' ? 'HTTP fallback' :
                                                         'simulated data'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-400 mt-1">
                                            No bandwidth data
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Uptime Card */}
                <div className="bg-gray-700 p-4 rounded">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold flex items-center">
                            <FaServer className="mr-2" /> Uptime
                        </h3>
                    </div>
                    
                    {performanceData.uptime.length === 0 ? (
                        <div className="text-center text-gray-400 py-6">
                            <p>No uptime data available</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {performanceData.uptime.map((item, index) => (
                                <div 
                                    key={index} 
                                    className={`p-2 rounded cursor-pointer ${
                                        activeDevice === item.ip ? "bg-blue-900" : "bg-gray-800 hover:bg-gray-600"
                                    }`}
                                    onClick={() => setActiveDevice(item.ip)}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">
                                            {getDeviceName(item.ip)} <span className="text-xs text-gray-400">({item.ip})</span>
                                        </span>
                                        {item.status === 'up' ? (
                                            <span className="flex items-center text-xs bg-green-800 text-green-200 px-1.5 rounded">
                                                <FaCheck className="mr-1" size={10} /> Up
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-xs bg-red-800 text-red-200 px-1.5 rounded">
                                                <FaTimes className="mr-1" size={10} /> Down
                                            </span>
                                        )}
                                    </div>
                                    {item.uptimePercentage !== null ? (
                                        <div className="text-xs mt-1">
                                            Uptime: {item.uptimePercentage.toFixed(1)}%
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-400 mt-1">
                                            No uptime data
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Historical Data Visualization */}
            {activeDevice && (
                <div className="bg-gray-700 p-4 rounded">
                    <div className="mb-4">
                        <h3 className="text-md font-semibold mb-2">
                            Historical Data for {getDeviceName(activeDevice)} <span className="text-sm text-gray-400">({activeDevice})</span>
                        </h3>
                        <div className="flex gap-2">
                            <button 
                                className={`px-3 py-1 rounded text-sm ${activeTab === 'latency' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                                onClick={() => setActiveTab('latency')}
                            >
                                Latency
                            </button>
                            <button 
                                className={`px-3 py-1 rounded text-sm ${activeTab === 'bandwidth' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                                onClick={() => setActiveTab('bandwidth')}
                            >
                                Bandwidth
                            </button>
                            <button 
                                className={`px-3 py-1 rounded text-sm ${activeTab === 'uptime' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                                onClick={() => setActiveTab('uptime')}
                            >
                                Uptime
                            </button>
                        </div>
                    </div>
                    
                    <div className="h-64">
                        {activeTab === 'latency' && (
                            <Line data={getLatencyChartData()} options={getChartOptions()} />
                        )}
                        {activeTab === 'bandwidth' && (
                            <Line data={getBandwidthChartData()} options={getChartOptions()} />
                        )}
                        {activeTab === 'uptime' && (
                            <Line data={getUptimeChartData()} options={getChartOptions()} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

// Add display name for better debugging
NetworkPerformance.displayName = 'NetworkPerformance';

export default NetworkPerformance;