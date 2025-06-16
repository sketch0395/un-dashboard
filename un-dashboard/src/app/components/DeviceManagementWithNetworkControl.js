"use client";

import React, { useState, useEffect } from 'react';
import { FaNetworkWired, FaSearch, FaCog, FaTerminal, FaEdit } from 'react-icons/fa';
import { io } from 'socket.io-client';
import NetworkControlModal from '../components/NetworkControlModal';
import UnifiedDeviceModal from '../components/UnifiedDeviceModal';
import { useNetworkControlModal } from '../components/useNetworkControlModal';
import { getDeviceStatusFromStorage, createStatusUpdateListener } from '../utils/performanceDeviceStatusSync';

/**
 * Enhanced Device Management Page with Network Control Modal Integration
 * This shows how to add the NetworkControlModal to an existing page
 */
export default function DeviceManagementWithNetworkControl() {    // Original page state (simplified for example)
    const [devices, setDevices] = useState([]);
    const [filteredDevices, setFilteredDevices] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // State for real-time device status updates
    const [deviceStatuses, setDeviceStatuses] = useState({});    // Network Control Modal integration
    const networkModal = useNetworkControlModal();
    
    // UnifiedDeviceModal state
    const [selectedDevice, setSelectedDevice] = useState(null);
    
    // Add sample test data for immediate testing
    useEffect(() => {
        const sampleDevices = [
            {
                id: '192.168.1.1',
                name: 'Gateway Router',
                ip: '192.168.1.1',
                mac: '00:11:22:33:44:55',
                vendor: 'Cisco',
                status: 'online',
                category: 'Network Device',
                role: 'Gateway',
                lastSeen: new Date().toISOString(),
                hasSSH: true,
                sshPort: 22,
            },
            {
                id: '192.168.1.100',
                name: 'Desktop PC',
                ip: '192.168.1.100',
                mac: '00:AA:BB:CC:DD:EE',
                vendor: 'Intel',
                status: 'online',
                category: 'Computer',
                role: 'Workstation',
                lastSeen: new Date().toISOString(),
                hasSSH: false,
                sshPort: 22,
            },
            {
                id: '192.168.1.50',
                name: 'Network Printer',
                ip: '192.168.1.50',
                mac: '00:FF:EE:DD:CC:BB',
                vendor: 'HP',
                status: 'offline',
                category: 'Printer',
                role: 'Peripheral',
                lastSeen: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                hasSSH: false,
                sshPort: 22,
            }
        ];
        
        setDevices(sampleDevices);
        setFilteredDevices(sampleDevices);
    }, []);
    
    // Set up socket connection for real-time device status updates
    useEffect(() => {
        let socket = null;
        
        const connectSocket = () => {
            // Determine the server URL
            let serverUrl = "http://10.5.1.83:4000";
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            
            if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
                serverUrl = `${protocol}//${hostname}:4000`;
            }
            
            console.log(`[DEVICE MANAGEMENT] Connecting to ${serverUrl} for status updates`);
            
            socket = io(serverUrl, {
                transports: ['polling', 'websocket'],
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 10000
            });
            
            socket.on('connect', () => {
                console.log('[DEVICE MANAGEMENT] Connected to performance monitoring server');
            });
            
            socket.on('deviceStatusUpdate', (data) => {
                console.log('[DEVICE MANAGEMENT] Received device status update:', data);
                
                if (data.results && Array.isArray(data.results)) {
                    const statusUpdates = {};
                    data.results.forEach(result => {
                        if (result.ip) {
                            statusUpdates[result.ip] = {
                                status: result.alive ? 'online' : 'offline',
                                latency: result.latency,
                                packetLoss: result.packetLoss,
                                lastChecked: result.timestamp,
                                source: result.source
                            };
                        }
                    });
                    
                    setDeviceStatuses(prev => ({
                        ...prev,
                        ...statusUpdates
                    }));
                    
                    // Update device list with new statuses
                    setDevices(prevDevices => 
                        prevDevices.map(device => {
                            const statusUpdate = statusUpdates[device.ip];
                            if (statusUpdate) {
                                return {
                                    ...device,
                                    status: statusUpdate.status,
                                    lastChecked: statusUpdate.lastChecked,
                                    latency: statusUpdate.latency,
                                    packetLoss: statusUpdate.packetLoss
                                };
                            }
                            return device;
                        })
                    );
                }
            });
            
            socket.on('connect_error', (err) => {
                console.error('[DEVICE MANAGEMENT] Socket connection error:', err);
            });
        };
        
        connectSocket();
        
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);
    
    // Set up device status update listener
    useEffect(() => {
        const statusUpdateListener = createStatusUpdateListener((updates) => {
            console.log('[DEVICE MANAGEMENT] localStorage device status updates:', updates);
            
            const statusMap = {};
            updates.forEach(update => {
                statusMap[update.ip] = {
                    status: update.newStatus,
                    lastChecked: update.lastChecked,
                    performanceData: update.performanceData
                };
            });
            
            setDeviceStatuses(prev => ({
                ...prev,
                ...statusMap
            }));
            
            // Update device list
            setDevices(prevDevices => 
                prevDevices.map(device => {
                    const statusUpdate = statusMap[device.ip];
                    if (statusUpdate) {
                        return {
                            ...device,
                            status: statusUpdate.status,
                            lastChecked: statusUpdate.lastChecked
                        };
                    }
                    return device;
                })
            );
        });
        
        return statusUpdateListener;
    }, []);
    
    // Load device statuses from localStorage on mount
    useEffect(() => {
        if (devices.length > 0) {
            const statusMap = {};
            devices.forEach(device => {
                if (device.ip) {
                    const statusInfo = getDeviceStatusFromStorage(device.ip);
                    if (statusInfo.status !== 'unknown') {
                        statusMap[device.ip] = statusInfo;
                    }
                }
            });
            
            if (Object.keys(statusMap).length > 0) {
                setDeviceStatuses(statusMap);
                
                // Update device list with stored statuses
                setDevices(prevDevices => 
                    prevDevices.map(device => {
                        const statusInfo = statusMap[device.ip];
                        if (statusInfo) {
                            return {
                                ...device,
                                status: statusInfo.status,
                                lastChecked: statusInfo.lastChecked
                            };
                        }
                        return device;
                    })
                );
            }
        }
    }, [devices.length]);

    // Filter devices based on search query
    useEffect(() => {
        let filtered = devices;

        if (searchQuery) {
            filtered = devices.filter(device => 
                device.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                device.ip?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                device.mac?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                device.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredDevices(filtered);
    }, [devices, searchQuery]);

    // Handle scan completion - update the device list
    const handleNetworkScanComplete = (scanResults) => {
        console.log("Network scan completed, updating device list:", scanResults);
        
        // Convert scan results to device management format
        const formattedDevices = scanResults.map(device => ({
            id: device.ip || `${device.mac}_${Date.now()}`,
            name: device.hostname || `Device-${device.ip}`,
            ip: device.ip,
            mac: device.mac,
            vendor: device.vendor || 'Unknown',
            status: device.status || 'online',
            category: device.category || 'Network Device',
            role: device.role || 'Unknown',
            lastSeen: new Date().toISOString(),
            scanType: device.scanType,
            scanTime: device.scanTime,
            // SSH status if available
            hasSSH: device.services && device.services.includes('ssh'),
            sshPort: device.sshPort || 22,
        }));

        setDevices(formattedDevices);
        setFilteredDevices(formattedDevices);
    };

    // Handle devices update from modal
    const handleDevicesUpdate = (newDevices) => {
        networkModal.handleDevicesUpdate(newDevices);
          // Also update local device list if needed
        if (newDevices && Object.keys(newDevices).length > 0) {
            const flattenedDevices = [];
            Object.entries(newDevices).forEach(([vendor, deviceList]) => {                // Ensure deviceList is an array before iterating
                if (Array.isArray(deviceList)) {
                    deviceList.forEach(device => {
                        flattenedDevices.push({
                            id: device.ip || `${device.mac}_${Date.now()}`,
                            name: device.hostname || `Device-${device.ip}`,
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
            setFilteredDevices(flattenedDevices);
        }
    };

    const handleQuickNetworkScan = () => {
        networkModal.openModal();
    };    const handleAdvancedNetworkTools = () => {
        networkModal.openModal();
    };    // Handle device click to open edit modal
    const handleDeviceClick = (device) => {
        console.log('🔧 Device clicked for editing:', device);
        setSelectedDevice(device);
    };

    // Handle device modal close
    const handleDeviceModalClose = () => {
        setSelectedDevice(null);
    };

    // Handle device update from modal
    const handleDeviceUpdate = (updatedDevice) => {
        setDevices(prevDevices => 
            prevDevices.map(device => 
                device.id === updatedDevice.id ? updatedDevice : device
            )
        );
        setFilteredDevices(prevDevices => 
            prevDevices.map(device => 
                device.id === updatedDevice.id ? updatedDevice : device
            )
        );
        handleDeviceModalClose();
    };

    return (
        <div className="p-6 bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Enhanced Header with Network Tools */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Device Management</h1>
                        <p className="text-gray-400 mt-2">Manage and monitor your network devices</p>
                    </div>
                    
                    {/* Network Action Buttons */}
                    <div className="flex space-x-4">
                        <button
                            onClick={handleQuickNetworkScan}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center transition-colors"
                        >
                            <FaNetworkWired className="mr-2" />
                            Discover Devices
                        </button>
                        
                        <button
                            onClick={handleAdvancedNetworkTools}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center transition-colors"
                        >
                            <FaCog className="mr-2" />
                            Network Tools
                        </button>
                    </div>
                </div>

                {/* Device Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gray-800 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Total Devices</p>
                                <p className="text-2xl font-bold text-white">{devices.length}</p>
                            </div>
                            <FaNetworkWired className="text-blue-400 text-2xl" />
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Online Devices</p>
                                <p className="text-2xl font-bold text-green-400">
                                    {devices.filter(d => d.status === 'online').length}
                                </p>
                            </div>
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">SSH Enabled</p>
                                <p className="text-2xl font-bold text-purple-400">
                                    {devices.filter(d => d.hasSSH).length}
                                </p>
                            </div>
                            <FaTerminal className="text-purple-400 text-2xl" />
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Unique Vendors</p>
                                <p className="text-2xl font-bold text-yellow-400">
                                    {new Set(devices.map(d => d.vendor)).size}
                                </p>
                            </div>
                            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="bg-gray-800 rounded-lg p-6 mb-8">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-64">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search devices..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        
                        <button
                            onClick={handleQuickNetworkScan}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            <FaNetworkWired className="mr-2 inline" />
                            Scan Network
                        </button>
                    </div>
                </div>                {/* Device List */}
                <div className="bg-gray-800 rounded-lg p-6">
                    {/* Debug Banner */}
                    {selectedDevice && (
                        <div className="mb-4 p-3 bg-blue-600 text-white rounded-lg">
                            🔧 Modal Debug: Device "{selectedDevice.name}" is selected - Modal should be visible!
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-white">Network Devices</h2>
                        <button
                            onClick={handleAdvancedNetworkTools}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                            Advanced Network Tools →
                        </button>
                    </div>

                    {devices.length === 0 ? (
                        <div className="text-center py-12">
                            <FaNetworkWired className="mx-auto text-6xl text-gray-600 mb-4" />
                            <h3 className="text-xl font-medium text-gray-400 mb-2">No Devices Found</h3>
                            <p className="text-gray-500 mb-6">Start by scanning your network to discover devices</p>
                            <button
                                onClick={handleQuickNetworkScan}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                            >
                                <FaNetworkWired className="mr-2 inline" />
                                Scan Network Now
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="pb-3 text-gray-400 font-medium">Device</th>
                                        <th className="pb-3 text-gray-400 font-medium">IP Address</th>
                                        <th className="pb-3 text-gray-400 font-medium">Vendor</th>
                                        <th className="pb-3 text-gray-400 font-medium">Status</th>
                                        <th className="pb-3 text-gray-400 font-medium">Services</th>
                                        <th className="pb-3 text-gray-400 font-medium">Last Seen</th>
                                    </tr>
                                </thead>                                <tbody>
                                    {filteredDevices.map((device) => (                                        <tr 
                                            key={device.id} 
                                            className="border-b border-gray-700 hover:bg-blue-900 hover:border-blue-600 cursor-pointer transition-all duration-200 group"
                                            onClick={() => handleDeviceClick(device)}
                                            title="Click to edit device properties"
                                        >                                            <td className="py-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-white font-medium">{device.name}</p>
                                                        <p className="text-gray-400 text-sm">{device.mac}</p>
                                                    </div>
                                                    <FaEdit className="text-gray-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-200 ml-2" />
                                                </div>
                                            </td>
                                            <td className="py-4 text-gray-300">{device.ip}</td>
                                            <td className="py-4 text-gray-300">{device.vendor}</td>
                                            <td className="py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                    device.status === 'online' 
                                                        ? 'bg-green-900 text-green-300' 
                                                        : 'bg-red-900 text-red-300'
                                                }`}>
                                                    {device.status}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                {device.hasSSH && (
                                                    <span className="px-2 py-1 bg-purple-900 text-purple-300 rounded-full text-xs mr-2">
                                                        SSH
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 text-gray-400 text-sm">
                                                {new Date(device.lastSeen).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>                    )}
                </div>                {/* Unified Device Modal */}
                {selectedDevice && console.log('🎯 UnifiedDeviceModal should be visible with device:', selectedDevice)}
                <UnifiedDeviceModal
                    modalDevice={selectedDevice}
                    setModalDevice={(device) => {
                        if (device === null) {
                            handleDeviceModalClose();
                        }
                    }}
                    onSave={handleDeviceUpdate}
                />

                {/* Network Control Modal */}
                <NetworkControlModal
                    isVisible={networkModal.isModalVisible}
                    onClose={networkModal.closeModal}
                    onScanComplete={handleNetworkScanComplete}
                    onDevicesUpdate={handleDevicesUpdate}
                    onCustomNamesUpdate={networkModal.handleCustomNamesUpdate}
                    title="Network Device Discovery"
                    defaultIpRange="10.5.1.1-255"
                    allowFullscreen={true}
                    showExportImport={true}
                    showHistory={true}
                    showRawDataInspector={false} // Hide for simpler interface
                    currentState={{ devices: networkModal.devices }}
                />
            </div>
        </div>
    );
}
