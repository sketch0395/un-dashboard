"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import DeviceManagerControls from './components/DeviceManagerControls';
import DeviceList from './components/DeviceList';
import DeviceStatistics from './components/DeviceStatistics';
import BulkOperations from './components/BulkOperations';
import UnifiedDeviceModal from '../components/UnifiedDeviceModal';
import { getSSHStatus } from '../utils/sshScanUtils';
import * as PollingService from '../services/devicePollingService';

// Dynamically import SSH terminal to avoid SSR issues
const SSHTerminal = React.lazy(() => import('../components/sshterminal'));

export default function DeviceManagement() {
    const [devices, setDevices] = useState([]);
    const [filteredDevices, setFilteredDevices] = useState([]);
    const [selectedDevices, setSelectedDevices] = useState([]);
    const [modalDevice, setModalDevice] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');    const [filterCategory, setFilterCategory] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterSSH, setFilterSSH] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [loading, setLoading] = useState(true);
    
    // SSH Terminal State
    const [showSSHModal, setShowSSHModal] = useState(false);
    const [showSSHTerminal, setShowSSHTerminal] = useState(false);    const [sshTarget, setSSHTarget] = useState(null);
    const [sshUsername, setSSHUsername] = useState('');
    const [sshPassword, setSSHPassword] = useState('');

    // Polling and Socket State
    const socketRef = useRef(null);
    const [isPollingActive, setIsPollingActive] = useState(false);
    const [lastPollingUpdate, setLastPollingUpdate] = useState(null);

    // Load devices on component mount
    useEffect(() => {
        loadDevices();
    }, []);    // Apply filters and search
    useEffect(() => {
        applyFiltersAndSearch();
    }, [devices, searchQuery, filterCategory, filterRole, filterStatus, filterSSH, sortBy, sortOrder]);

    // Initialize Socket.IO connection and polling service
    useEffect(() => {
        const initializeSocket = async () => {
            try {
                // Dynamic import to avoid SSR issues
                const { io } = await import('socket.io-client');
                
                // Get server URL
                const getServerUrl = () => {
                    let serverUrl = "http://10.5.1.83:4000";
                    
                    if (typeof window !== 'undefined') {
                        const protocol = window.location.protocol;
                        const hostname = window.location.hostname;
                        
                        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
                            serverUrl = `${protocol}//${hostname}:4000`;
                        }
                    }
                    
                    return serverUrl;
                };

                const serverUrl = getServerUrl();
                console.log('[DEVICE-MGMT] Connecting to server:', serverUrl);

                const socket = io(serverUrl, {
                    transports: ['polling', 'websocket'],
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                    timeout: 10000,
                    autoConnect: true
                });

                socketRef.current = socket;

                // Initialize polling service
                PollingService.initializePolling(socket);

                // Socket event handlers
                socket.on('connect', () => {
                    console.log('[DEVICE-MGMT] Connected to server');
                    // Start polling when connected and we have devices
                    if (devices.length > 0) {
                        PollingService.startPolling(devices);
                        setIsPollingActive(true);
                    }
                });

                socket.on('disconnect', () => {
                    console.log('[DEVICE-MGMT] Disconnected from server');
                    setIsPollingActive(false);
                });

                // Handle device status updates from polling
                socket.on('deviceStatusUpdate', (data) => {
                    console.log('[DEVICE-MGMT] Received device status update:', data);
                    handleDeviceStatusUpdate(data);
                    setLastPollingUpdate(new Date().toISOString());
                });

                socket.on('deviceStatusError', (error) => {
                    console.error('[DEVICE-MGMT] Device status polling error:', error);
                });

                // Cleanup on unmount
                return () => {
                    PollingService.cleanupPolling();
                    socket.disconnect();
                };

            } catch (error) {
                console.error('[DEVICE-MGMT] Error initializing socket:', error);
            }
        };

        initializeSocket();

        // Cleanup function
        return () => {
            if (socketRef.current) {
                PollingService.cleanupPolling();
                socketRef.current.disconnect();
            }
        };
    }, []);

    // Update polling devices when device list changes
    useEffect(() => {
        if (devices.length > 0 && socketRef.current?.connected) {
            PollingService.updatePollingDevices(devices);
            if (!isPollingActive) {
                PollingService.startPolling(devices);
                setIsPollingActive(true);
            }
        }
    }, [devices, isPollingActive]);

    const loadDevices = async () => {
        setLoading(true);
        try {
            // Get saved device properties from localStorage
            const savedProps = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
            
            // Get recent network scan data if available
            const scanHistory = JSON.parse(localStorage.getItem("scanHistory") || "[]");            const latestScan = scanHistory.length > 0 ? scanHistory[0] : null;
            
            // Get all devices from latest scan using the correct data structure
            const latestScanDevices = latestScan ? Object.values(latestScan.data || {}).flat() : [];
            
            const deviceList = [];
            
            // Combine saved devices with latest scan data
            Object.entries(savedProps).forEach(([ip, props]) => {
                let scanData = null;
                if (latestScanDevices.length > 0) {
                    scanData = latestScanDevices.find(d => d.ip === ip);
                }
                
                const device = {
                    ip,
                    name: props.name || ip,
                    category: props.category || 'Other',
                    networkRole: props.networkRole || null,
                    parentGateway: props.parentGateway,
                    parentSwitch: props.parentSwitch,
                    connectedGateways: props.connectedGateways || [],
                    connectedSwitches: props.connectedSwitches || [],
                    notes: props.notes || [],
                    isMainGateway: props.isMainGateway || false,
                    history: props.history || [],
                    // Add scan data if available
                    alive: scanData?.alive || false,
                    hostname: scanData?.hostname,
                    vendor: scanData?.vendor || scanData?.macInfo?.vendor,
                    macAddress: scanData?.macInfo?.address,
                    osInfo: scanData?.osInfo,
                    ports: scanData?.ports || [],
                    latency: scanData?.latency,
                    lastSeen: scanData ? latestScan.timestamp : props.lastSeen
                };
                
                deviceList.push(device);
            });
              // Add devices from latest scan that aren't in saved props
            if (latestScanDevices.length > 0) {
                latestScanDevices.forEach(scanDevice => {
                    if (!savedProps[scanDevice.ip]) {
                        deviceList.push({
                            ip: scanDevice.ip,
                            name: scanDevice.hostname || scanDevice.ip,
                            category: 'Other',
                            networkRole: null,
                            parentGateway: null,
                            parentSwitch: null,
                            connectedGateways: [],
                            connectedSwitches: [],
                            notes: [],
                            isMainGateway: false,
                            history: [],
                            alive: scanDevice.alive || false,
                            hostname: scanDevice.hostname,
                            vendor: scanDevice.vendor || scanDevice.macInfo?.vendor,
                            macAddress: scanDevice.macInfo?.address,
                            osInfo: scanDevice.osInfo,
                            ports: scanDevice.ports || [],
                            latency: scanDevice.latency,
                            lastSeen: latestScan.timestamp
                        });
                    }
                });
            }
            
            setDevices(deviceList);
        } catch (error) {
            console.error('Error loading devices:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFiltersAndSearch = () => {
        let filtered = [...devices];

        // Apply search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(device => 
                device.name.toLowerCase().includes(query) ||
                device.ip.includes(query) ||
                (device.hostname && device.hostname.toLowerCase().includes(query)) ||
                (device.vendor && device.vendor.toLowerCase().includes(query))
            );
        }

        // Apply category filter
        if (filterCategory) {
            filtered = filtered.filter(device => device.category === filterCategory);
        }

        // Apply role filter
        if (filterRole) {
            if (filterRole === 'none') {
                filtered = filtered.filter(device => !device.networkRole);
            } else {
                filtered = filtered.filter(device => device.networkRole === filterRole);
            }
        }        // Apply status filter
        if (filterStatus) {
            if (filterStatus === 'online') {
                filtered = filtered.filter(device => device.alive);
            } else if (filterStatus === 'offline') {
                filtered = filtered.filter(device => !device.alive);
            }
        }

        // Apply SSH filter
        if (filterSSH) {
            if (filterSSH === 'available') {
                filtered = filtered.filter(device => getSSHStatus(device.ports));
            } else if (filterSSH === 'unavailable') {
                filtered = filtered.filter(device => !getSSHStatus(device.ports));
            }
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'ip':
                    aValue = a.ip.split('.').map(num => parseInt(num).toString().padStart(3, '0')).join('.');
                    bValue = b.ip.split('.').map(num => parseInt(num).toString().padStart(3, '0')).join('.');
                    break;
                case 'category':
                    aValue = a.category.toLowerCase();
                    bValue = b.category.toLowerCase();
                    break;
                case 'role':
                    aValue = a.networkRole || 'zzz';
                    bValue = b.networkRole || 'zzz';
                    break;
                case 'status':
                    aValue = a.alive ? 'online' : 'offline';
                    bValue = b.alive ? 'online' : 'offline';
                    break;
                case 'lastSeen':
                    aValue = new Date(a.lastSeen || 0);
                    bValue = new Date(b.lastSeen || 0);
                    break;
                default:
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredDevices(filtered);
    };

    const handleDeviceSelect = (deviceIp, selected) => {
        if (selected) {
            setSelectedDevices(prev => [...prev, deviceIp]);
        } else {
            setSelectedDevices(prev => prev.filter(ip => ip !== deviceIp));
        }
    };

    const handleSelectAll = () => {
        if (selectedDevices.length === filteredDevices.length) {
            setSelectedDevices([]);
        } else {
            setSelectedDevices(filteredDevices.map(device => device.ip));
        }
    };    const handleDeviceSave = (updatedDevice) => {
        // Update the device in the devices array
        setDevices(prev => 
            prev.map(device => 
                device.ip === updatedDevice.ip 
                    ? { ...device, ...updatedDevice }
                    : device
            )
        );
        
        // If device wasn't in the list, add it
        if (!devices.find(d => d.ip === updatedDevice.ip)) {
            setDevices(prev => [...prev, updatedDevice]);
        }
        
        setModalDevice(null);
    };

    // SSH Handler Functions
    const handleSSHConnect = (device) => {
        const sshStatus = getSSHStatus(device);
        if (!sshStatus.available) {
            alert('SSH is not available on this device');
            return;
        }
        
        setSSHTarget(device);
        setSSHUsername(''); // Reset credentials
        setSSHPassword('');
        setShowSSHModal(true);
    };

    const handleSSHCredentialsSubmit = () => {
        if (!sshTarget || !sshUsername) {
            alert('Please enter a username');
            return;
        }
        
        setShowSSHModal(false);
        setShowSSHTerminal(true);
    };

    const handleSSHModalKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSSHCredentialsSubmit();
        }
    };

    const handleCloseSSHTerminal = () => {
        setShowSSHTerminal(false);
        setSSHTarget(null);
        setSSHUsername('');
        setSSHPassword('');
    };

    const handleBulkOperation = (operation, data) => {
        const updatedDevices = devices.map(device => {
            if (selectedDevices.includes(device.ip)) {
                switch (operation) {
                    case 'category':
                        return { ...device, category: data.category };
                    case 'role':
                        return { ...device, networkRole: data.role };
                    case 'delete':
                        return null;
                    default:
                        return device;
                }
            }
            return device;
        }).filter(Boolean);

        setDevices(updatedDevices);
        setSelectedDevices([]);
        
        // Update localStorage
        const savedProps = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
        selectedDevices.forEach(ip => {
            if (operation === 'delete') {
                delete savedProps[ip];
            } else {
                const device = updatedDevices.find(d => d.ip === ip);
                if (device) {
                    savedProps[ip] = {
                        ...savedProps[ip],
                        name: device.name,
                        category: device.category,
                        networkRole: device.networkRole,
                        parentGateway: device.parentGateway,
                        parentSwitch: device.parentSwitch,
                        connectedGateways: device.connectedGateways,
                        connectedSwitches: device.connectedSwitches,
                        notes: device.notes,
                        isMainGateway: device.isMainGateway,
                        history: device.history
                    };
                }
            }
        });
        localStorage.setItem("customDeviceProperties", JSON.stringify(savedProps));
    };

    // Handle device status updates from polling
    const handleDeviceStatusUpdate = (data) => {
        const { results } = data;
        
        if (!results || !Array.isArray(results)) {
            return;
        }

        // Update device status based on polling results
        setDevices(prevDevices => {
            return prevDevices.map(device => {
                const statusResult = results.find(result => result.ip === device.ip);
                if (statusResult) {
                    return {
                        ...device,
                        alive: statusResult.alive,
                        latency: statusResult.latency,
                        packetLoss: statusResult.packetLoss,
                        lastSeen: statusResult.alive ? statusResult.timestamp : device.lastSeen
                    };
                }
                return device;
            });
        });
    };

    return (
        <>
            <h1 className="text-3xl font-bold mb-6">Device Management</h1>
              {/* Statistics Overview */}
            <DeviceStatistics devices={devices} />
            
            {/* Polling Status */}
            <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${isPollingActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-sm text-gray-300">
                            Real-time Status Monitoring: {isPollingActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    {lastPollingUpdate && (
                        <span className="text-xs text-gray-400">
                            Last update: {new Date(lastPollingUpdate).toLocaleTimeString()}
                        </span>
                    )}
                </div>
                {isPollingActive && (
                    <div className="mt-2 text-xs text-gray-400">
                        Automatically checking device status every minute
                    </div>
                )}
            </div>
              {/* Controls */}
            <DeviceManagerControls
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterCategory={filterCategory}
                setFilterCategory={setFilterCategory}
                filterRole={filterRole}
                setFilterRole={setFilterRole}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                filterSSH={filterSSH}
                setFilterSSH={setFilterSSH}
                sortBy={sortBy}
                setSortBy={setSortBy}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                onRefresh={loadDevices}
                devices={devices}
            />
            
            {/* Bulk Operations */}
            {selectedDevices.length > 0 && (
                <BulkOperations
                    selectedCount={selectedDevices.length}
                    onBulkOperation={handleBulkOperation}
                />
            )}
              {/* Device List */}
            <DeviceList
                devices={filteredDevices}
                selectedDevices={selectedDevices}
                onDeviceSelect={handleDeviceSelect}
                onSelectAll={handleSelectAll}
                onDeviceEdit={setModalDevice}
                onSSHConnect={handleSSHConnect}
                loading={loading}
            />
            
            {/* Device Modal */}
            <UnifiedDeviceModal
                modalDevice={modalDevice}
                setModalDevice={setModalDevice}
                onSave={handleDeviceSave}
            />

            {/* SSH Credentials Modal */}
            {showSSHModal && sshTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md">
                        <h2 className="text-xl font-bold text-white mb-4">
                            SSH Connection to {sshTarget.name || sshTarget.ip}
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={sshUsername}
                                    onChange={(e) => setSSHUsername(e.target.value)}
                                    onKeyPress={handleSSHModalKeyPress}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                    placeholder="Enter username"
                                    autoFocus
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={sshPassword}
                                    onChange={(e) => setSSHPassword(e.target.value)}
                                    onKeyPress={handleSSHModalKeyPress}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                    placeholder="Enter password"
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowSSHModal(false)}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSSHCredentialsSubmit}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
                            >
                                Connect
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SSH Terminal */}
            {showSSHTerminal && sshTarget && (
                <Suspense fallback={
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div className="text-white">Loading SSH terminal...</div>
                    </div>
                }>
                    <SSHTerminal
                        ip={sshTarget.ip}
                        username={sshUsername}
                        password={sshPassword}
                        visible={showSSHTerminal}
                        onClose={handleCloseSSHTerminal}
                    />
                </Suspense>
            )}
        </>
    );
}
