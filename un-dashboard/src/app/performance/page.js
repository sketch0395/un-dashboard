"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { FaChevronDown, FaPlay, FaStop, FaSync, FaDocker, FaFilter } from "react-icons/fa";
import PerformanceControls from "./components/PerformanceControls";

// Use dynamic import with no SSR to avoid the "Component is not a function" error
const NetworkPerformance = dynamic(
  () => import("../networkscan/components/networkperformance"),
  { ssr: false }
);

export default function PerformancePage() {
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    
    // Added state for scan selection
    const [scans, setScans] = useState([]);
    const [selectedScan, setSelectedScan] = useState('all');
    const [filteredDevices, setFilteredDevices] = useState([]);
    const [scanHistory, setScanHistory] = useState([]);
    
    // Monitoring control states
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(60);
    const [useDockerTools, setUseDockerTools] = useState(true);
    const [dockerHost, setDockerHost] = useState("10.5.1.212");
    const [showDockerConfig, setShowDockerConfig] = useState(false);
    const [isCheckingNow, setIsCheckingNow] = useState(false);
    
    // Chart visualization state
    const [activeChartTab, setActiveChartTab] = useState('latency');
    
    // Reference to NetworkPerformance component
    const networkPerformanceRef = useRef(null);

    useEffect(() => {
        // Load scan history from localStorage
        const savedHistory = JSON.parse(localStorage.getItem("scanHistory")) || [];
        setScanHistory(savedHistory);
        
        // Extract scans from history
        const scansFromHistory = savedHistory.map(entry => ({
            id: entry.id || `scan-${Math.random().toString(36).substring(2, 9)}`,
            name: entry.name || `Scan ${savedHistory.indexOf(entry) + 1}`,
            timestamp: entry.timestamp || new Date().toISOString(),
            deviceCount: entry.devices || 0
        }));
        
        setScans(scansFromHistory);
        
        // Load devices from scan results in localStorage
        const savedDevices = localStorage.getItem("scanResults");
        let parsedDevices = [];
        
        if (savedDevices) {
            try {
                const deviceData = JSON.parse(savedDevices);
                if (typeof deviceData === "object" && !Array.isArray(deviceData)) {
                    // Convert to array if it's an object with scan groups
                    Object.entries(deviceData).forEach(([scanId, scanDevices]) => {
                        if (Array.isArray(scanDevices)) {
                            // Tag each device with its scan ID for filtering
                            const devicesWithScanId = scanDevices.map(device => ({
                                ...device,
                                _scanId: scanId
                            }));
                            parsedDevices.push(...devicesWithScanId);
                        }
                    });
                } else if (Array.isArray(deviceData)) {
                    parsedDevices = deviceData;
                }
            } catch (error) {
                console.error("Error parsing saved devices:", error);
            }
        }
        
        // Also process devices from scan history entries
        savedHistory.forEach(entry => {
            if (entry.data) {
                const entryDevices = Object.values(entry.data).flat();
                const devicesWithScanId = entryDevices.map(device => ({
                    ...device,
                    _scanId: entry.id || `scan-${Math.random().toString(36).substring(2, 9)}`
                }));
                parsedDevices.push(...devicesWithScanId);
            }
        });
        
        // Remove duplicates based on IP
        const uniqueDevices = Array.from(
            new Map(parsedDevices.map(device => [device.ip, device])).values()
        );
        
        setDevices(uniqueDevices);
        setFilteredDevices(uniqueDevices);
        
        // Load custom device names
        const savedCustomProperties = localStorage.getItem("customDeviceProperties");
        if (savedCustomProperties) {
            try {
                const customProps = JSON.parse(savedCustomProperties);
                setDevices(prev => prev.map(device => {
                    if (device.ip && customProps[device.ip]) {
                        return {
                            ...device,
                            name: customProps[device.ip].name || device.name
                        };
                    }
                    return device;
                }));
                
                setFilteredDevices(prev => prev.map(device => {
                    if (device.ip && customProps[device.ip]) {
                        return {
                            ...device,
                            name: customProps[device.ip].name || device.name
                        };
                    }
                    return device;
                }));
            } catch (error) {
                console.error("Error parsing custom properties:", error);
            }
        }
        
        setIsLoading(false);
    }, []);
    
    // Filter devices when selected scan changes
    useEffect(() => {
        if (selectedScan === 'all') {
            setFilteredDevices(devices);
        } else {
            // Use scan history data to get devices
            const selectedHistoryEntry = scanHistory.find(entry => entry.id === selectedScan);
            
            if (selectedHistoryEntry && selectedHistoryEntry.data) {
                // Get devices from the scan history entry
                const selectedScanDevices = Object.values(selectedHistoryEntry.data).flat();
                
                // Apply any custom names from the devices state
                const enhancedDevices = selectedScanDevices.map(histDevice => {
                    const matchingDevice = devices.find(d => d.ip === histDevice.ip);
                    return matchingDevice || histDevice;
                });
                
                setFilteredDevices(enhancedDevices);
            } else {
                // Fall back to filtering by _scanId if scan history entry not found
                setFilteredDevices(devices.filter(device => device._scanId === selectedScan));
            }
        }
    }, [selectedScan, devices, scanHistory]);
    
    // Sort scans by timestamp (newest first)
    const sortedScans = [...scans].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Format scan timestamp for display
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleString();
    };
    
    // Handle start monitoring
    const handleStartMonitoring = () => {
        if (!networkPerformanceRef.current) return;
        
        if (isMonitoring) {
            // Stop monitoring
            networkPerformanceRef.current.stopMonitoring();
            setIsMonitoring(false);
        } else {
            // Start monitoring
            networkPerformanceRef.current.startMonitoring(refreshInterval * 1000);
            setIsMonitoring(true);
        }
    };
    
    // Handle check now button
    const handleCheckNow = () => {
        if (!networkPerformanceRef.current) return;
        
        setIsCheckingNow(true);
        networkPerformanceRef.current.checkNow().then(() => {
            setIsCheckingNow(false);
        }).catch(() => {
            setIsCheckingNow(false);
        });
    };

    return (
        <>
            <h1 className="text-3xl font-bold mb-6">Performance Monitoring</h1>
            
            <PerformanceControls />
            
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Select Scan Data</label>
                    <div className="relative">
                        <select
                            value={selectedScan}
                            onChange={(e) => setSelectedScan(e.target.value)}
                            className="w-full bg-gray-700 text-white px-4 py-2 rounded appearance-none"
                        >
                            <option value="all">All Scans ({devices.length} devices)</option>
                            {sortedScans.map((scan) => (
                                <option key={scan.id} value={scan.id}>
                                    {scan.name} ({scan.deviceCount} devices)
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                            <FaChevronDown size={14} />
                        </div>
                    </div>
                    {selectedScan !== 'all' && (
                        <div className="mt-2 text-sm text-gray-400">
                            <span>Scan Time: {formatTimestamp(sortedScans.find(scan => scan.id === selectedScan)?.timestamp)}</span>
                        </div>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-3 mb-6">
                    <button
                        onClick={handleStartMonitoring}
                        className={`flex items-center gap-2 px-4 py-2 rounded ${
                            isMonitoring 
                                ? "bg-red-600 hover:bg-red-700" 
                                : "bg-green-600 hover:bg-green-700"
                        }`}
                    >
                        {isMonitoring ? <FaStop /> : <FaPlay />}
                        {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
                    </button>
                    
                    <button
                        onClick={handleCheckNow}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                        disabled={isCheckingNow}
                    >
                        <FaSync className={isCheckingNow ? 'animate-spin' : ''} />
                        {isCheckingNow ? "Checking..." : "Check Now"}
                    </button>
                </div>
                
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Chart Type</label>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: 'latency', name: 'Ping Latency' },
                            { id: 'packetLoss', name: 'Packet Loss' },
                            { id: 'jitter', name: 'Jitter' },
                            { id: 'dockerStats', name: 'Docker Stats', disabled: !useDockerTools }
                        ].map((chart) => (
                            <button
                                key={chart.id}
                                onClick={() => setActiveChartTab(chart.id)}
                                disabled={chart.disabled}
                                className={`
                                    py-2 px-4 rounded
                                    ${activeChartTab === chart.id
                                        ? 'bg-blue-600 text-white'
                                        : chart.disabled
                                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                                    }
                                `}
                            >
                                {chart.name}
                            </button>
                        ))}
                    </div>
                </div>
                
                {isLoading ? (
                    <div className="bg-gray-900 p-8 rounded-lg text-white text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                        <p className="mt-4">Loading network data...</p>
                    </div>
                ) : filteredDevices.length > 0 ? (
                    <NetworkPerformance 
                        ref={networkPerformanceRef}
                        devices={filteredDevices}
                        activeTab={activeChartTab}
                        setActiveTab={setActiveChartTab}
                        monitoringEnabled={isMonitoring}
                        useDockerTools={useDockerTools}
                        dockerHost={dockerHost}
                        refreshInterval={refreshInterval * 1000}
                    />
                ) : (
                    <div className="bg-gray-900 p-8 rounded-lg text-white text-center">
                        <p className="mb-4">No network scan data available for the selected filter.</p>
                        {selectedScan !== 'all' && (
                            <button 
                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                                onClick={() => setSelectedScan('all')}
                            >
                                Show All Scans
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}