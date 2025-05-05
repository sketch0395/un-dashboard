"use client";

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Line } from "react-chartjs-2";
import { 
    FaWifi, FaServer, FaChartLine, FaExclamationTriangle, FaCheck, 
    FaTimes, FaInfoCircle, FaSignal, FaRoute, FaLocationArrow 
} from "react-icons/fa";
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

export default function NetworkPerformance({ devices, activeTab, setActiveTab, performanceData }) {
    const [historicalData, setHistoricalData] = useState({});
    const [activeDevice, setActiveDevice] = useState(null);
    const [deviceNameMap, setDeviceNameMap] = useState({});
    const [recentlyUpdated, setRecentlyUpdated] = useState({});
    const [displayTab, setDisplayTab] = useState('latency'); // 'latency', 'bandwidth', 'uptime', 'quality', 'path'
    const socketRef = useRef(null);
    
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
    
    // Connect to socket server for historical data only
    useEffect(() => {
        const socket = io("http://10.5.1.83:4000");
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Socket connected for network performance history");
        });

        socket.on("historicalPerformanceData", (data) => {
            setHistoricalData(prev => ({
                ...prev,
                [data.ip]: data
            }));
            setRecentlyUpdated(prev => ({
                ...prev,
                [data.ip]: true
            }));
            setTimeout(() => {
                setRecentlyUpdated(prev => ({
                    ...prev,
                    [data.ip]: false
                }));
            }, 3000);
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // When a device is selected, load its historical data
    useEffect(() => {
        if (activeDevice && socketRef.current) {
            // Request historical data for the active device
            socketRef.current.emit("getHistoricalPerformance", { ip: activeDevice });
        }
    }, [activeDevice]);

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
        
        if (activeTab === 'quality') {
            return {
                ...baseOptions,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Packet Loss (%)'
                        },
                        min: 0,
                        max: 100,
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Jitter (ms)'
                        },
                        min: 0,
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
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
            performanceData.uptime.length > 0 ||
            (performanceData.quality && performanceData.quality.length > 0) ||
            (performanceData.pathAnalysis && performanceData.pathAnalysis.length > 0)
        );
    };
    
    // Generate chart data for connection quality
    const getQualityChartData = () => {
        if (!activeDevice || !historicalData[activeDevice] || !historicalData[activeDevice].quality) {
            return {
                labels: [],
                datasets: []
            };
        }

        const data = historicalData[activeDevice].quality;
        const deviceName = getDeviceName(activeDevice);
        
        return {
            labels: data.map(point => formatTime(point.timestamp)),
            datasets: [
                {
                    label: `Packet Loss (%) - ${deviceName}`,
                    data: data.map(point => point.packetLoss),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    tension: 0.1,
                    yAxisID: 'y'
                },
                {
                    label: `Jitter (ms) - ${deviceName}`,
                    data: data.map(point => point.jitter),
                    borderColor: 'rgb(53, 162, 235)',
                    backgroundColor: 'rgba(53, 162, 235, 0.5)',
                    tension: 0.1,
                    yAxisID: 'y1'
                }
            ]
        };
    };
    
    // Get quality score badge color
    const getQualityScoreColor = (quality) => {
        switch(quality) {
            case 'excellent': return 'bg-green-600';
            case 'good': return 'bg-blue-600';
            case 'fair': return 'bg-yellow-600';
            case 'poor': return 'bg-red-600';
            default: return 'bg-gray-600';
        }
    };

    return (
        <div className="relative bg-gray-800 rounded-lg p-4 text-white">
            <h2 className="text-xl font-bold mb-4">Network Performance Dashboard</h2>
            
            {!hasPerformanceData() && (
                <div className="bg-gray-700 text-white p-3 rounded mb-4 flex items-center">
                    <FaInfoCircle className="mr-2 text-blue-400" /> 
                    <span>
                        No performance data available. Use the control panel to select devices and run performance checks.
                    </span>
                </div>
            )}
            
            {/* Performance Data Display */}
            <div className="mb-4">
                <div className="flex gap-2 mb-4">
                    <button 
                        className={`px-3 py-1 rounded text-sm ${displayTab === 'latency' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                        onClick={() => setDisplayTab('latency')}
                    >
                        Latency
                    </button>
                    <button 
                        className={`px-3 py-1 rounded text-sm ${displayTab === 'bandwidth' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                        onClick={() => setDisplayTab('bandwidth')}
                    >
                        Bandwidth
                    </button>
                    <button 
                        className={`px-3 py-1 rounded text-sm ${displayTab === 'uptime' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                        onClick={() => setDisplayTab('uptime')}
                    >
                        Uptime
                    </button>
                    <button 
                        className={`px-3 py-1 rounded text-sm ${displayTab === 'quality' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                        onClick={() => setDisplayTab('quality')}
                    >
                        Quality
                    </button>
                    <button 
                        className={`px-3 py-1 rounded text-sm ${displayTab === 'path' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                        onClick={() => setDisplayTab('path')}
                    >
                        Path Analysis
                    </button>
                </div>

                {displayTab === 'latency' && (
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
                                        } ${recentlyUpdated[item.ip] ? "border-2 border-green-500" : ""}`}
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
                )}

                {displayTab === 'bandwidth' && (
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
                                        } ${recentlyUpdated[item.ip] ? "border-2 border-green-500" : ""}`}
                                        onClick={() => setActiveDevice(item.ip)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">
                                                {getDeviceName(item.ip)} <span className="text-xs text-gray-400">({item.ip})</span>
                                            </span>
                                            {(item.download !== null || item.upload !== null) && (
                                                <span className="text-xs bg-blue-800 text-blue-200 px-1.5 rounded">
                                                    {item.source === 'enhanced-iperf3' ? 'Enhanced' : 'Data'}
                                                </span>
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
                                                            item.source === 'enhanced-iperf3' ? 'bg-purple-800 text-purple-200' :
                                                            item.source === 'iperf3' ? 'bg-green-800 text-green-200' :
                                                            item.source === 'enhanced-curl-fallback' ? 'bg-blue-800 text-blue-200' :
                                                            item.source === 'curl-fallback' ? 'bg-yellow-800 text-yellow-200' :
                                                            'bg-gray-800 text-gray-200'
                                                        }`}>
                                                            {item.source === 'enhanced-iperf3' ? 'enhanced iperf3' :
                                                             item.source === 'iperf3' ? 'iperf3 measurement' :
                                                             item.source === 'enhanced-curl-fallback' ? 'enhanced HTTP test' :
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
                )}

                {displayTab === 'uptime' && (
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
                                        } ${recentlyUpdated[item.ip] ? "border-2 border-green-500" : ""}`}
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
                )}

                {displayTab === 'quality' && (
                    <div className="bg-gray-700 p-4 rounded">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold flex items-center">
                                <FaSignal className="mr-2" /> Connection Quality
                            </h3>
                        </div>
                        
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {performanceData.quality.map((item, index) => (
                                <div 
                                    key={index} 
                                    className={`p-2 rounded cursor-pointer ${
                                        activeDevice === item.ip ? "bg-blue-900" : "bg-gray-800 hover:bg-gray-600"
                                    } ${recentlyUpdated[item.ip] ? "border-2 border-green-500" : ""}`}
                                    onClick={() => setActiveDevice(item.ip)}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">
                                            {getDeviceName(item.ip)} <span className="text-xs text-gray-400">({item.ip})</span>
                                        </span>
                                        {item.quality && (
                                            <span className={`text-xs ${getQualityScoreColor(item.quality)} text-white px-2 py-0.5 rounded`}>
                                                {item.quality.charAt(0).toUpperCase() + item.quality.slice(1)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className="bg-gray-900 p-1 rounded text-center">
                                            <div className="text-xs text-gray-400">Packet Loss</div>
                                            <div className="font-medium">
                                                {item.packetLoss !== null ? `${item.packetLoss}%` : 'N/A'}
                                            </div>
                                        </div>
                                        <div className="bg-gray-900 p-1 rounded text-center">
                                            <div className="text-xs text-gray-400">Jitter</div>
                                            <div className="font-medium">
                                                {item.jitter ? `${item.jitter.toFixed(1)} ms` : 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {displayTab === 'path' && (
                    <div className="bg-gray-700 p-4 rounded">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold flex items-center">
                                <FaRoute className="mr-2" /> Network Path Analysis
                            </h3>
                        </div>
                        
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {performanceData.pathAnalysis.map((item, index) => (
                                <div 
                                    key={index} 
                                    className={`p-2 rounded cursor-pointer ${
                                        activeDevice === item.ip ? "bg-blue-900" : "bg-gray-800 hover:bg-gray-600"
                                    } ${recentlyUpdated[item.ip] ? "border-2 border-green-500" : ""}`}
                                    onClick={() => setActiveDevice(item.ip)}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">
                                            {getDeviceName(item.ip)} <span className="text-xs text-gray-400">({item.ip})</span>
                                        </span>
                                        {item.hasIssues ? (
                                            <span className="flex items-center text-xs bg-red-800 text-red-200 px-1.5 rounded">
                                                <FaExclamationTriangle className="mr-1" size={10} /> Issues Detected
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-xs bg-green-800 text-green-200 px-1.5 rounded">
                                                <FaCheck className="mr-1" size={10} /> Path OK
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs">
                                        <div>
                                            <span className="text-gray-400">Total hops:</span> {item.hopCount || 'N/A'}
                                        </div>
                                        {item.bottlenecks && item.bottlenecks.length > 0 && (
                                            <div className="mt-1">
                                                <span className="text-yellow-400">Bottlenecks detected:</span> {item.bottlenecks.length}
                                                <div className="mt-1 ml-2">
                                                    {item.bottlenecks.slice(0, 2).map((bottleneck, idx) => (
                                                        <div key={idx} className="text-red-300">
                                                            Hop {bottleneck.hopNumber}: {bottleneck.ip} ({bottleneck.avg.toFixed(1)}ms, {bottleneck.packetLoss}% loss)
                                                        </div>
                                                    ))}
                                                    {item.bottlenecks.length > 2 && (
                                                        <div className="text-gray-400">
                                                            ...and {item.bottlenecks.length - 2} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
                            <button 
                                className={`px-3 py-1 rounded text-sm ${activeTab === 'quality' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                                onClick={() => setActiveTab('quality')}
                            >
                                Quality
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
                        {activeTab === 'quality' && (
                            <Line data={getQualityChartData()} options={getChartOptions()} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}