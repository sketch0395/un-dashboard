"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { 
    FaChevronDown, 
    FaPlay, 
    FaStop, 
    FaSync, 
    FaDocker, 
    FaFilter,
    FaNetworkWired,
    FaEdit,
    FaTrash,
    FaSearch,
    FaCog,
    FaEye,
    FaTerminal,
    FaExclamationTriangle
} from "react-icons/fa";
import PerformanceControls from "./components/PerformanceControls";
import NetworkControlModal from "../components/NetworkControlModal";
import { useNetworkControlModal } from "../components/useNetworkControlModal";
import UnifiedDeviceModal from "../components/UnifiedDeviceModal";
import { useScanHistory } from '../contexts/ScanHistoryContext';

// Use dynamic import with no SSR to avoid the "Component is not a function" error
const NetworkPerformance = dynamic(
  () => import("../networkscan/components/networkperformance"),
  { ssr: false }
);

export default function PerformanceDeviceManagementPage() {
    const [devices, setDevices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    
    // Use scan history context instead of local state
    const { scanHistory } = useScanHistory();
    
    // Device Management States
    const [filteredDevices, setFilteredDevices] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterVendor, setFilterVendor] = useState('all');
    const [selectedDevices, setSelectedDevices] = useState([]);
    const [modalDevice, setModalDevice] = useState(null);
    const [customNames, setCustomNames] = useState({});
    
    // Scan selection and history
    const [scans, setScans] = useState([]);
    const [selectedScan, setSelectedScan] = useState('all');
    
    // Monitoring control states
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(60);
    const [useDockerTools, setUseDockerTools] = useState(true);
    const [dockerHost, setDockerHost] = useState("10.5.1.212");
    const [showDockerConfig, setShowDockerConfig] = useState(false);
    const [isCheckingNow, setIsCheckingNow] = useState(false);
    
    // Chart visualization state
    const [activeChartTab, setActiveChartTab] = useState('latency');
    const [currentView, setCurrentView] = useState('performance'); // 'performance' or 'devices'
    
    // Reference to NetworkPerformance component
    const networkPerformanceRef = useRef(null);

    // Network Control Modal integration
    const networkModal = useNetworkControlModal();    useEffect(() => {
        loadDevicesAndScans();
    }, [scanHistory]); // Add scanHistory as dependency

    // Filter devices based on search and filters
    useEffect(() => {
        let filtered = devices;

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(device => 
                device.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                device.ip?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                device.mac?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                device.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(device => device.status === filterStatus);
        }

        // Vendor filter
        if (filterVendor !== 'all') {
            filtered = filtered.filter(device => device.vendor === filterVendor);
        }

        // Scan filter
        if (selectedScan !== 'all') {
            const selectedHistoryEntry = scanHistory.find(entry => entry.id === selectedScan);
            if (selectedHistoryEntry && selectedHistoryEntry.data) {
                const selectedScanDeviceIPs = Object.values(selectedHistoryEntry.data)
                    .flat()
                    .map(device => device.ip);
                filtered = filtered.filter(device => selectedScanDeviceIPs.includes(device.ip));
            }
        }

        setFilteredDevices(filtered);
    }, [devices, searchQuery, filterStatus, filterVendor, selectedScan, scanHistory]);    const loadDevicesAndScans = () => {
        // Use scan history from context instead of localStorage
        console.log('[PERFORMANCE PAGE-ENHANCED] Loading devices from scan history context:', scanHistory.length, 'entries');
        
        // Extract scans from history
        const scansFromHistory = scanHistory.map(entry => ({
            id: entry.id || `scan-${Math.random().toString(36).substring(2, 9)}`,
            name: entry.name || `Scan ${scanHistory.indexOf(entry) + 1}`,
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
                                _scanId: scanId,
                                id: device.ip || `${device.mac}_${Date.now()}`
                            }));
                            parsedDevices.push(...devicesWithScanId);
                        }
                    });
                } else if (Array.isArray(deviceData)) {
                    parsedDevices = deviceData.map(device => ({
                        ...device,
                        id: device.ip || `${device.mac}_${Date.now()}`
                    }));
                }
            } catch (error) {
                console.error("Error parsing saved devices:", error);
            }
        }        
        // Also process devices from scan history entries
        scanHistory.forEach(entry => {
            if (entry.data) {
                const entryDevices = Object.values(entry.data).flat();
                const devicesWithScanId = entryDevices.map(device => ({
                    ...device,
                    _scanId: entry.id || `scan-${Math.random().toString(36).substring(2, 9)}`,
                    id: device.ip || `${device.mac}_${Date.now()}`
                }));
                parsedDevices.push(...devicesWithScanId);
            }
        });
        
        // Remove duplicates based on IP
        const uniqueDevices = Array.from(
            new Map(parsedDevices.map(device => [device.ip, device])).values()
        );
        
        // Load custom device names
        const savedCustomProperties = localStorage.getItem("customDeviceProperties");
        if (savedCustomProperties) {
            try {
                const customProps = JSON.parse(savedCustomProperties);
                setCustomNames(customProps);
                  const enhancedDevices = uniqueDevices.map(device => {
                    if (device.ip && customProps[device.ip]) {
                        return {
                            ...device,
                            name: customProps[device.ip].name || device.name || device.hostname || `Device-${device.ip}`,
                            category: customProps[device.ip].category || device.category,
                            role: customProps[device.ip].networkRole || device.role,
                            notes: customProps[device.ip].notes || device.notes,
                            history: customProps[device.ip].history || []
                        };
                    }
                    return {
                        ...device,
                        name: device.name || device.hostname || `Device-${device.ip}`,
                        history: []
                    };
                });
                
                setDevices(enhancedDevices);
            } catch (error) {
                console.error("Error parsing custom properties:", error);
                setDevices(uniqueDevices);
            }
        } else {
            setDevices(uniqueDevices);
        }
        
        setIsLoading(false);
    };

    // Handle scan completion from modal
    const handleNetworkScanComplete = (scanResults) => {
        console.log("Network scan completed:", scanResults);
        
        // Convert scan results to device format
        const formattedDevices = scanResults.map(device => ({
            id: device.ip || `${device.mac}_${Date.now()}`,
            name: device.hostname || device.name || `Device-${device.ip}`,
            ip: device.ip,
            mac: device.mac,
            vendor: device.vendor || 'Unknown',
            status: device.status || 'online',
            category: device.category || 'Network Device',
            role: device.role || 'Unknown',
            lastSeen: new Date().toISOString(),
            scanType: device.scanType,
            scanTime: device.scanTime,
            hasSSH: device.services && device.services.includes('ssh'),
            sshPort: device.sshPort || 22,
        }));

        // Merge with existing devices (avoid duplicates)
        const updatedDevices = [...devices];
        formattedDevices.forEach(newDevice => {
            const existingIndex = updatedDevices.findIndex(d => d.ip === newDevice.ip);
            if (existingIndex >= 0) {
                // Update existing device
                updatedDevices[existingIndex] = { ...updatedDevices[existingIndex], ...newDevice };
            } else {
                // Add new device
                updatedDevices.push(newDevice);
            }
        });

        setDevices(updatedDevices);
        
        // Reload scans to include the new scan
        setTimeout(() => {
            loadDevicesAndScans();
        }, 1000);
    };

    // Handle devices update from modal
    const handleDevicesUpdate = (newDevices) => {
        console.log("Devices updated from modal:", newDevices);
        networkModal.handleDevicesUpdate(newDevices);
          if (newDevices && Object.keys(newDevices).length > 0) {
            const flattenedDevices = [];
            Object.entries(newDevices).forEach(([vendor, deviceList]) => {
                // Ensure deviceList is an array before iterating
                if (Array.isArray(deviceList)) {
                    deviceList.forEach(device => {
                        flattenedDevices.push({
                            id: device.ip || `${device.mac}_${Date.now()}`,
                            name: device.hostname || device.name || `Device-${device.ip}`,
                            ip: device.ip,
                            mac: device.mac,
                            vendor: vendor !== "Unknown" ? vendor : device.vendor || 'Unknown',
                            status: device.status || 'online',
                            category: device.category || 'Network Device',
                            role: device.role || 'Unknown',
                            lastSeen: new Date().toISOString(),
                            hasSSH: device.services && device.services.includes('ssh'),
                            sshPort: device.sshPort || 22,
                        });
                    });
                } else {
                    console.warn(`Expected array for vendor "${vendor}" but got:`, typeof deviceList, deviceList);
                }
            });
            
            setDevices(flattenedDevices);
        }
    };

    // Handle custom names update from modal
    const handleCustomNamesUpdate = (newCustomNames) => {
        console.log("Custom names updated from modal:", newCustomNames);
        setCustomNames(newCustomNames);
        networkModal.handleCustomNamesUpdate(newCustomNames);
        
        // Update devices with new custom names
        setDevices(prev => prev.map(device => {
            if (device.ip && newCustomNames[device.ip]) {
                return {
                    ...device,
                    name: newCustomNames[device.ip].name || device.name,
                    category: newCustomNames[device.ip].category || device.category,
                    role: newCustomNames[device.ip].networkRole || device.role,
                    notes: newCustomNames[device.ip].notes || device.notes
                };
            }
            return device;
        }));
    };

    // Device management functions
    const handleSelectDevice = (device) => {
        setSelectedDevices(prev => 
            prev.find(d => d.id === device.id)
                ? prev.filter(d => d.id !== device.id)
                : [...prev, device]
        );
    };

    const handleSelectAllDevices = () => {
        if (selectedDevices.length === filteredDevices.length) {
            setSelectedDevices([]);
        } else {
            setSelectedDevices([...filteredDevices]);
        }
    };

    const handleEditDevice = (device) => {
        setModalDevice(device);
    };

    const handleSaveDevice = (updatedDevice) => {
        // Update the device in the local state
        setDevices(prev => prev.map(device => 
            device.id === updatedDevice.id ? { ...device, ...updatedDevice } : device
        ));
        
        // Update custom names
        const updatedCustomNames = {
            ...customNames,
            [updatedDevice.ip]: {
                ...customNames[updatedDevice.ip],
                name: updatedDevice.name,
                category: updatedDevice.category,
                networkRole: updatedDevice.role,
                notes: updatedDevice.notes
            }
        };
        
        setCustomNames(updatedCustomNames);
        
        // Save to localStorage
        localStorage.setItem("customDeviceProperties", JSON.stringify(updatedCustomNames));
        
        setModalDevice(null);
    };

    const handleDeleteDevice = (device) => {
        if (confirm(`Are you sure you want to remove ${device.name} from the device list?`)) {
            setDevices(prev => prev.filter(d => d.id !== device.id));
            setSelectedDevices(prev => prev.filter(d => d.id !== device.id));
        }
    };

    // Performance monitoring functions
    const handleStartMonitoring = () => {
        if (isMonitoring) {
            setIsMonitoring(false);
            if (networkPerformanceRef.current?.stopMonitoring) {
                networkPerformanceRef.current.stopMonitoring();
            }
        } else {
            setIsMonitoring(true);
            if (networkPerformanceRef.current?.startMonitoring) {
                networkPerformanceRef.current.startMonitoring();
            }
        }
    };

    const handleCheckNow = () => {
        setIsCheckingNow(true);
        if (networkPerformanceRef.current?.checkNow) {
            networkPerformanceRef.current.checkNow();
        }
        setTimeout(() => setIsCheckingNow(false), 2000);
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    const sortedScans = scans.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const uniqueVendors = [...new Set(devices.map(d => d.vendor).filter(Boolean))];

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Performance & Device Management</h1>
                <div className="flex space-x-4">
                    <button
                        onClick={() => setCurrentView('performance')}
                        className={`px-4 py-2 rounded ${currentView === 'performance' ? 'bg-blue-600' : 'bg-gray-600'}`}
                    >
                        Performance View
                    </button>
                    <button
                        onClick={() => setCurrentView('devices')}
                        className={`px-4 py-2 rounded ${currentView === 'devices' ? 'bg-blue-600' : 'bg-gray-600'}`}
                    >
                        Device Management
                    </button>
                    <button
                        onClick={networkModal.openModal}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center"
                    >
                        <FaNetworkWired className="mr-2" />
                        Network Control
                    </button>
                </div>
            </div>
            
            <PerformanceControls />
            
            {/* Scan Selection */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
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
                    </div>

                    {currentView === 'devices' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Search Devices</label>
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, IP, MAC, or vendor..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Status</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full bg-gray-700 text-white px-4 py-2 rounded"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Vendor</label>
                                <select
                                    value={filterVendor}
                                    onChange={(e) => setFilterVendor(e.target.value)}
                                    className="w-full bg-gray-700 text-white px-4 py-2 rounded"
                                >
                                    <option value="all">All Vendors</option>
                                    {uniqueVendors.map(vendor => (
                                        <option key={vendor} value={vendor}>{vendor}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                {selectedScan !== 'all' && (
                    <div className="mb-4 text-sm text-gray-400">
                        <span>Scan Time: {formatTimestamp(sortedScans.find(scan => scan.id === selectedScan)?.timestamp)}</span>
                    </div>
                )}
            </div>

            {/* Device Management View */}
            {currentView === 'devices' && (
                <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Device Management</h2>
                        <div className="flex space-x-2">
                            {selectedDevices.length > 0 && (
                                <span className="bg-blue-600 px-3 py-1 rounded text-sm">
                                    {selectedDevices.length} selected
                                </span>
                            )}
                            <button
                                onClick={networkModal.openModal}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center"
                            >
                                <FaNetworkWired className="mr-2" />
                                Scan Network
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                            <p className="mt-4">Loading devices...</p>
                        </div>
                    ) : filteredDevices.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="pb-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedDevices.length === filteredDevices.length && filteredDevices.length > 0}
                                                onChange={handleSelectAllDevices}
                                                className="rounded"
                                            />
                                        </th>
                                        <th className="pb-3 text-gray-400 font-medium">Device</th>
                                        <th className="pb-3 text-gray-400 font-medium">IP Address</th>
                                        <th className="pb-3 text-gray-400 font-medium">Vendor</th>
                                        <th className="pb-3 text-gray-400 font-medium">Status</th>
                                        <th className="pb-3 text-gray-400 font-medium">Role</th>
                                        <th className="pb-3 text-gray-400 font-medium">Services</th>
                                        <th className="pb-3 text-gray-400 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDevices.map((device) => (
                                        <tr key={device.id} className="border-b border-gray-700 hover:bg-gray-700">
                                            <td className="py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDevices.find(d => d.id === device.id) !== undefined}
                                                    onChange={() => handleSelectDevice(device)}
                                                    className="rounded"
                                                />
                                            </td>
                                            <td className="py-4">
                                                <div>
                                                    <p className="text-white font-medium">{device.name}</p>
                                                    <p className="text-gray-400 text-sm">{device.mac}</p>
                                                </div>
                                            </td>
                                            <td className="py-4 text-gray-300">{device.ip}</td>
                                            <td className="py-4 text-gray-300">{device.vendor || 'Unknown'}</td>
                                            <td className="py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                    device.status === 'online' 
                                                        ? 'bg-green-900 text-green-300' 
                                                        : 'bg-red-900 text-red-300'
                                                }`}>
                                                    {device.status || 'unknown'}
                                                </span>
                                            </td>
                                            <td className="py-4 text-gray-300">{device.role || 'Unknown'}</td>
                                            <td className="py-4">
                                                {device.hasSSH && (
                                                    <span className="px-2 py-1 bg-purple-900 text-purple-300 rounded-full text-xs mr-2">
                                                        SSH
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleEditDevice(device)}
                                                        className="text-blue-400 hover:text-blue-300"
                                                        title="Edit device"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteDevice(device)}
                                                        className="text-red-400 hover:text-red-300"
                                                        title="Delete device"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <FaNetworkWired className="mx-auto text-6xl text-gray-600 mb-4" />
                            <h3 className="text-xl font-medium text-gray-400 mb-2">No Devices Found</h3>
                            <p className="text-gray-500 mb-6">
                                {searchQuery || filterStatus !== 'all' || filterVendor !== 'all' 
                                    ? 'No devices match your current filters.'
                                    : 'Start by scanning your network to discover devices.'
                                }
                            </p>
                            <button
                                onClick={networkModal.openModal}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded"
                            >
                                <FaNetworkWired className="mr-2 inline" />
                                Scan Network Now
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Performance Monitoring View */}
            {currentView === 'performance' && (
                <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
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
                            <p className="mb-4">No network scan data available for performance monitoring.</p>
                            <button
                                onClick={networkModal.openModal}
                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                            >
                                <FaNetworkWired className="mr-2 inline" />
                                Scan Network
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Device Modal */}
            <UnifiedDeviceModal
                modalDevice={modalDevice}
                setModalDevice={setModalDevice}
                onSave={handleSaveDevice}
            />

            {/* Network Control Modal */}
            <NetworkControlModal
                isVisible={networkModal.isModalVisible}
                onClose={networkModal.closeModal}
                onScanComplete={handleNetworkScanComplete}
                onDevicesUpdate={handleDevicesUpdate}
                onCustomNamesUpdate={handleCustomNamesUpdate}
                title="Network Scan & Device Discovery"
                defaultIpRange="10.5.1.1-255"
                allowFullscreen={true}
                showExportImport={true}
                showHistory={true}
                showRawDataInspector={false}
                currentState={{ devices: networkModal.devices }}
            />
        </>
    );
}
