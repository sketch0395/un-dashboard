"use client";

import { useState, lazy, Suspense, useEffect, useRef } from "react";
import TopologyMap from "./networktopology";
import SharedScansBrowser from "./SharedScansBrowser";
import UnifiedDeviceModal from "../../components/UnifiedDeviceModal";
import NetworkControlModal from "../../components/NetworkControlModal";
import { useNetworkControlModal } from "../../components/useNetworkControlModal";
import { useCollaboration } from "../../hooks/useCollaboration";
import { FaNetworkWired, FaCog, FaBug, FaExpand, FaCompress, FaShare, FaUsers, FaTimes, FaChevronDown } from "react-icons/fa";
import { format } from "date-fns";
import { debugNetworkRelationships, fixSwitchParentGateway } from "../../utils/networkRelationshipDebug";

// Lazy load the SSH terminal component
const SSHTerminal = lazy(() => import("../../components/sshterminal"));

export default function NetworkDashboard() {
    const contentRef = useRef(null);
    const [devices, setDevices] = useState({});
    const [vendorColors, setVendorColors] = useState({});
    const [customNames, setCustomNames] = useState({});
    const [modalDeviceState, setModalDeviceState] = useState(null);
    
    // Wrap setModalDevice with debugging
    const setModalDevice = (device) => {
        console.log('🎯 setModalDevice called with:', {
            device: device ? device.ip : null,
            deviceObject: device,
            stack: new Error().stack
        });
        setModalDeviceState(device);
    };
    
    // Use modalDeviceState as modalDevice everywhere
    const modalDevice = modalDeviceState;
    
    const [flattenedDevices, setFlattenedDevices] = useState([]);
    
    // Tab navigation state
    const [activeTab, setActiveTab] = useState('topology');
    
    // Add state for SSH modal and connection
    const [sshModalVisible, setSSHModalVisible] = useState(false);
    const [sshTarget, setSSHTarget] = useState(null);
    const [sshUsername, setSSHUsername] = useState("");
    const [sshPassword, setSSHPassword] = useState("");
    const [showTerminal, setShowTerminal] = useState(false);

    // Network Control Modal integration
    const networkModal = useNetworkControlModal();
    
    // Full screen topology state
    const [isTopologyFullscreen, setIsTopologyFullscreen] = useState(false);
    const [contentDimensions, setContentDimensions] = useState({ width: 0, height: 0 });
    
    // Add ref for the topology map component
    const topologyMapRef = useRef(null);    // Collaboration state for topology views
    const [collaborativeMode, setCollaborativeMode] = useState(false);
    const [scanId, setScanId] = useState(null);
      // Scan selection modal state
    const [showScanSelector, setShowScanSelector] = useState(false);
    const [availableScans, setAvailableScans] = useState([]);
    const [loadingScans, setLoadingScans] = useState(false);
    const [scanSelectorFilter, setScanSelectorFilter] = useState('');
    const [scanSourceFilter, setScanSourceFilter] = useState('all'); // 'all', 'shared', 'history'
    
    // Initialize collaboration hook when in collaborative mode
    const collaboration = useCollaboration(collaborativeMode ? scanId : null);
    const {
        isConnected,
        collaborators,
        deviceLocks,
        getDeviceLock,
        lockDevice,
        unlockDevice,
        updateDevice,
        isDeviceLockedByMe,
        isDeviceLockedByOther
    } = collaboration;

    // Add collaboration event handlers for real-time topology updates
    useEffect(() => {
        console.log('🔗 Setting up collaboration event listeners for topology updates');

        // Listen for device updates from other users
        const handleCollaborativeDeviceUpdate = (event) => {
            const { deviceId, changes, userId, username } = event.detail;
            
            console.log(`🔄 Topology received device update from ${username} for device ${deviceId}:`, changes);
            
            // Update devices state
            setDevices(prevDevices => {
                const updatedDevices = { ...prevDevices };
                
                // Find and update the device across all vendors
                Object.keys(updatedDevices).forEach(vendor => {
                    if (Array.isArray(updatedDevices[vendor])) {
                        updatedDevices[vendor] = updatedDevices[vendor].map(device => {
                            if (device.ip === deviceId || device.id === deviceId) {
                                console.log(`🔄 Updating device ${deviceId} in topology with changes:`, changes);
                                return { ...device, ...changes };
                            }
                            return device;
                        });
                    }
                });
                
                return updatedDevices;
            });

            // Update custom names if the changes include custom properties
            if (changes.name || changes.color || changes.icon || changes.category || changes.notes || 
                changes.networkRole || changes.portCount || changes.parentSwitch) {
                setCustomNames(prevCustomNames => {
                    const updatedCustomNames = { ...prevCustomNames };
                    if (!updatedCustomNames[deviceId]) {
                        updatedCustomNames[deviceId] = {};
                    }
                    
                    // Update custom properties
                    if (changes.name) updatedCustomNames[deviceId].name = changes.name;
                    if (changes.color) updatedCustomNames[deviceId].color = changes.color;
                    if (changes.icon) updatedCustomNames[deviceId].icon = changes.icon;
                    if (changes.category) updatedCustomNames[deviceId].category = changes.category;
                    if (changes.notes) updatedCustomNames[deviceId].notes = changes.notes;
                    if (changes.networkRole) updatedCustomNames[deviceId].networkRole = changes.networkRole;
                    if (changes.portCount) updatedCustomNames[deviceId].portCount = changes.portCount;
                    if (changes.parentSwitch) updatedCustomNames[deviceId].parentSwitch = changes.parentSwitch;
                    
                    // Update localStorage
                    localStorage.setItem("customDeviceProperties", JSON.stringify(updatedCustomNames));
                    
                    return updatedCustomNames;
                });
            }

            // Trigger topology refresh
            if (topologyMapRef.current) {
                console.log('🔄 Triggering topology refresh for collaborative device update');
                topologyMapRef.current.refresh();
            }
        };

        // Listen for scan updates from other users
        const handleCollaborativeScanUpdate = (event) => {
            const { changes, userId, username } = event.detail;
            
            console.log(`📊 Topology received scan update from ${username}:`, changes);
            
            // If the scan update affects devices, refresh the topology
            if (topologyMapRef.current) {
                console.log('🔄 Triggering topology refresh for collaborative scan update');
                topologyMapRef.current.refresh();
            }
        };

        // Add event listeners
        window.addEventListener('collaborationDeviceUpdate', handleCollaborativeDeviceUpdate);
        window.addEventListener('collaborationScanUpdate', handleCollaborativeScanUpdate);

        // Cleanup function
        return () => {
            console.log('🧹 Cleaning up collaboration event listeners for topology');
            window.removeEventListener('collaborationDeviceUpdate', handleCollaborativeDeviceUpdate);
            window.removeEventListener('collaborationScanUpdate', handleCollaborativeScanUpdate);
        };
    }, []);
    
    // Track content dimensions for responsive layout
    useEffect(() => {
        if (!contentRef.current) return;
        
        const updateDimensions = () => {
            if (contentRef.current) {
                const rect = contentRef.current.getBoundingClientRect();
                setContentDimensions({
                    width: rect.width,
                    height: rect.height
                });
            }
        };
        
        // Initial measurement
        updateDimensions();
        
        // Create ResizeObserver to track content container changes
        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(contentRef.current);
        
        // Also handle window resize events
        window.addEventListener('resize', updateDimensions);
        
        return () => {
            if (contentRef.current) {
                resizeObserver.unobserve(contentRef.current);
            }
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateDimensions);
        };
    }, []); // Remove contentRef.current from dependency array    // Flatten the devices object into an array for easier use with components
    useEffect(() => {
        if (devices && Object.keys(devices).length > 0) {
            const devicesList = Object.values(devices).flat();
            setFlattenedDevices(devicesList);
        }
    }, [devices]);

    // Add message listener for testing and debugging
    useEffect(() => {
        const handleMessage = (event) => {
            console.log('🎯 NetworkDashboard message received:', event.data);
            
            switch (event.data.type) {
                case 'SET_TEST_DEVICES':
                    console.log('🧪 Setting test devices:', event.data.payload.devices);
                    setDevices(event.data.payload.devices);
                    break;
                    
                case 'SET_CUSTOM_PROPERTIES':
                    console.log('🧪 Setting custom properties:', event.data.payload.customProperties);
                    setCustomNames(event.data.payload.customProperties);
                    break;
                    
                case 'TEST_MODAL_FIX':
                    console.log('🧪 Testing modal fix with device:', event.data.payload.testDevice);
                    setModalDevice(event.data.payload.testDevice);
                    break;
                    
                case 'SIMULATE_RIGHT_CLICK':
                    console.log('🧪 Simulating right-click on device:', event.data.payload.device);
                    setModalDevice(event.data.payload.device);
                    break;
                    
                case 'CHECK_MODAL_STATE':
                    console.log('🧪 Checking modal state...');
                    const isOpen = !!modalDevice;
                    console.log('🧪 Modal state:', { isOpen, device: modalDevice });
                    event.source?.postMessage({
                        type: 'MODAL_STATE_RESPONSE',
                        payload: {
                            isOpen,
                            device: modalDevice
                        }
                    }, event.origin);
                    break;
                    
                default:
                    console.log('❓ Unknown message type:', event.data.type);
            }
        };
        
        window.addEventListener('message', handleMessage);
        
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [modalDevice, setModalDevice]);

    // Handle scan completion from modal
    const handleNetworkScanComplete = (scanResults) => {
        console.log("Network scan completed from modal:", scanResults);
        // The modal will handle updating devices through onDevicesUpdate
    };

    // Handle devices update from modal
    const handleDevicesUpdate = (newDevices) => {
        console.log("Devices updated from modal:", newDevices);
        setDevices(newDevices);
        networkModal.handleDevicesUpdate(newDevices);
    };

    // Handle custom names update from modal
    const handleCustomNamesUpdate = (newCustomNames) => {
        console.log("Custom names updated from modal:", newCustomNames);
        setCustomNames(newCustomNames);
        networkModal.handleCustomNamesUpdate(newCustomNames);
    };// Helper function to identify what's changed in the device
    const getDeviceChanges = (oldDevice, newDevice) => {
        const changes = {};
        if (oldDevice.name !== newDevice.name) changes.name = newDevice.name;
        if (oldDevice.color !== newDevice.color) changes.color = newDevice.color;
        if (oldDevice.icon !== newDevice.icon) changes.icon = newDevice.icon;
        if (oldDevice.category !== newDevice.category) changes.category = newDevice.category;
        if (oldDevice.notes !== newDevice.notes) changes.notes = newDevice.notes;
        if (oldDevice.networkRole !== newDevice.networkRole) {
            changes.networkRole = newDevice.networkRole || 'Regular Device';
        }
        if (oldDevice.portCount !== newDevice.portCount) {
            changes.portCount = newDevice.portCount ? `${newDevice.portCount} ports` : 'Not specified';
        }
        if (oldDevice.parentSwitch !== newDevice.parentSwitch) {
            changes.parentSwitch = newDevice.parentSwitch || 'Not connected';
        }
        return changes;
    };    const handleSaveDevice = (updatedDevice) => {
        // Check if this is an SSH request from the device modal
        if (updatedDevice._requestSSH) {
            // Remove the special flag
            const { _requestSSH, ...deviceWithoutFlag } = updatedDevice;
            
            // Open the SSH modal for this device
            handleOpenSSH(deviceWithoutFlag);
            return;
        }
        
        // Debug output for troubleshooting
        console.log("Saving device with relationships:", {
            ip: updatedDevice.ip,
            networkRole: updatedDevice.networkRole,
            parentGateway: updatedDevice.parentGateway,
            parentSwitch: updatedDevice.parentSwitch
        });
          // Check if network role is changing or if this is a new device with network relationships
        let networkRoleChanged = false;
        let isNewDevice = !customNames[updatedDevice.ip];
        let hasNetworkRelationships = updatedDevice.networkRole || updatedDevice.parentGateway || updatedDevice.parentSwitch;
        
        if (customNames[updatedDevice.ip]) {
            networkRoleChanged = 
                customNames[updatedDevice.ip].networkRole !== updatedDevice.networkRole ||
                customNames[updatedDevice.ip].parentGateway !== updatedDevice.parentGateway ||
                customNames[updatedDevice.ip].parentSwitch !== updatedDevice.parentSwitch;
        }
        
        // Force refresh if it's a new device with network relationships or if relationships changed
        let shouldRefresh = networkRoleChanged || (isNewDevice && hasNetworkRelationships);
        console.log("NETWORK DASHBOARD - Refresh decision:", {
            networkRoleChanged,
            isNewDevice,
            hasNetworkRelationships,
            shouldRefresh
        });// We need to preserve the parent relationships exactly as they are in the updatedDevice
        // Do not modify or set to null unless specifically intended
        console.log("NETWORK DASHBOARD - Device being saved:", {
            ip: updatedDevice.ip,
            networkRole: updatedDevice.networkRole,
            parentGateway: updatedDevice.parentGateway,
            parentSwitch: updatedDevice.parentSwitch
        });
        
        // IMPORTANT: For switch devices, ensure parent gateway is preserved
        if (updatedDevice.networkRole === 'switch') {
            console.log(`Ensuring switch ${updatedDevice.ip} connection to gateway ${updatedDevice.parentGateway} is preserved`);
        }
          // Update the device in the local state WITHOUT overriding parent relationships
        const updatedCustomNames = {
            ...customNames,
            [updatedDevice.ip]: {
                ...customNames[updatedDevice.ip],
                ...updatedDevice
            }
        };
          console.log(`NETWORK DASHBOARD - Updated device ${updatedDevice.ip} relationships:`, {
            networkRole: updatedDevice.networkRole,
            parentGateway: updatedDevice.parentGateway,
            parentSwitch: updatedDevice.parentSwitch
        });        console.log('NETWORK DASHBOARD - Setting customNames state with:', updatedCustomNames);
        
        setCustomNames(updatedCustomNames);
        
        // Force an immediate refresh if we have network relationships that need to be displayed
        if (shouldRefresh && topologyMapRef.current) {
            console.log("NETWORK DASHBOARD - Triggering immediate refresh for network relationship changes");
            topologyMapRef.current.refresh();
        }// If network role changed or we need to refresh, reload from localStorage to ensure consistency
        if (shouldRefresh) {
            console.log("NETWORK DASHBOARD - Network role or parent relationship changed, reloading custom names from localStorage");
            setTimeout(() => {
                try {
                    const storedProps = localStorage.getItem("customDeviceProperties");
                    if (storedProps) {
                        const parsedProps = JSON.parse(storedProps);
                        console.log("NETWORK DASHBOARD - Reloading from localStorage:", parsedProps);
                        setCustomNames(parsedProps);
                        
                        // Also refresh the topology map
                        if (topologyMapRef.current) {
                            console.log("NETWORK DASHBOARD - Calling topologyMapRef.current.refresh()");
                            topologyMapRef.current.refresh();
                        } else {
                            console.log("NETWORK DASHBOARD - WARNING: topologyMapRef.current is null, cannot refresh");
                        }
                    }
                } catch (error) {
                    console.error("Error reloading custom names:", error);
                }
            }, 100); // Small delay to ensure localStorage has updated
        }
    };
    
    // Handle SSH connection request    // Function to manually fix gateway-switch connections
    const fixGatewaySwitchConnections = () => {
        try {
            const storedDevices = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
            let fixed = false;
            
            // Find all switches
            const switches = Object.entries(storedDevices)
                .filter(([_, props]) => props.networkRole === 'switch');
                
            console.log(`Found ${switches.length} switches to check for gateway connections`);
            
            // Find all gateways 
            const gateways = Object.entries(storedDevices)
                .filter(([_, props]) => props.networkRole === 'gateway')
                .map(([ip]) => ip);
                
            if (gateways.length === 0) {
                console.log("No gateways found. Please set a device as a gateway first.");
                return;
            }
            
            // Default to the first gateway if multiple exist
            const defaultGateway = gateways[0];
            
            // Fix switch-gateway connections
            switches.forEach(([ip, props]) => {
                if (!props.parentGateway) {
                    console.log(`Switch ${ip} has no parent gateway, setting to ${defaultGateway}`);
                    storedDevices[ip] = {
                        ...props,
                        parentGateway: defaultGateway
                    };
                    fixed = true;
                }
            });
            
            if (fixed) {
                localStorage.setItem("customDeviceProperties", JSON.stringify(storedDevices));
                setCustomNames(storedDevices);
                
                // Refresh the topology map
                if (topologyMapRef.current) {
                    topologyMapRef.current.refresh();
                }
                
                console.log("Fixed gateway-switch connections");
                return true;
            } else {
                console.log("No fixes needed for gateway-switch connections");
                return false;
            }
        } catch (error) {
            console.error("Error fixing gateway-switch connections:", error);
            return false;
        }
    };
    
    const handleOpenSSH = (device) => {
        setSSHTarget(device);
        setSSHUsername(""); // Reset username
        setSSHPassword(""); // Reset password
        setSSHModalVisible(true);
    };
    
    // Handle keypress for SSH credentials
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && sshTarget) {
            // Same action as the Connect button
            setSSHModalVisible(false);
            setShowTerminal(true);
        }
    };    // Get all devices from the devices object and flatten them into a single array
    const getAllDevices = () => {
        if (!devices) return [];
        const allDevices = [];
        
        // If devices is an object with arrays (grouped by vendor)
        if (typeof devices === "object" && !Array.isArray(devices)) {
            Object.values(devices).forEach(deviceGroup => {
                if (Array.isArray(deviceGroup)) {
                    deviceGroup.forEach(device => {
                        // Add custom name from customNames if available
                        if (device.ip && customNames[device.ip]?.name) {
                            device.name = customNames[device.ip].name;
                        }
                        allDevices.push(device);
                    });
                }
            });
        }
        // If devices is already an array
        else if (Array.isArray(devices)) {
            devices.forEach(device => {
                if (device.ip && customNames[device.ip]?.name) {
                    device.name = customNames[device.ip].name;
                }
                allDevices.push(device);
            });
        }
        
        return allDevices;
    };    // Fetch available scans for collaboration
    const fetchAvailableScans = async () => {
        setLoadingScans(true);
        try {
            // Fetch both shared scans and user's scan history
            const [sharedResponse, historyResponse] = await Promise.all([
                fetch('/api/scans/shared?limit=25', {
                    credentials: 'include'
                }),
                fetch('/api/scan-history?limit=25', {
                    credentials: 'include'
                })
            ]);
            
            const allScans = [];
            
            // Add shared scans
            if (sharedResponse.ok) {
                const sharedData = await sharedResponse.json();
                if (sharedData.success && sharedData.data) {
                    allScans.push(...sharedData.data.map(scan => ({
                        ...scan,
                        source: 'shared',
                        scanId: scan._id // Use MongoDB _id for shared scans
                    })));
                }
            }
            
            // Add scan history
            if (historyResponse.ok) {
                const historyData = await historyResponse.json();
                if (Array.isArray(historyData)) {
                    allScans.push(...historyData.map(scan => ({
                        ...scan,
                        _id: scan.scanId, // Use scanId as _id for consistency
                        source: 'history',
                        scanId: scan.scanId,
                        ownerId: { username: 'You' }, // Mark as user's own scan
                        metadata: {
                            deviceCount: scan.deviceCount,
                            ...scan.metadata
                        }
                    })));
                }
            }
            
            // Sort by creation date (newest first)
            allScans.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));
            
            setAvailableScans(allScans);
        } catch (error) {
            console.error('Error fetching scans:', error);
            setAvailableScans([]);
        } finally {
            setLoadingScans(false);
        }
    };// Collaborative device handling functions
    const handleCollaborativeDeviceClick = async (device) => {
        console.log('🔗 Collaborative device click for:', device.ip);
        
        if (!collaborativeMode || !scanId) {
            console.warn('Not in collaborative mode or no scan ID');
            return;
        }

        try {
            // Attempt to lock the device
            const lockSuccess = await lockDevice(device.ip);
            
            if (lockSuccess) {
                console.log(`🔒 Successfully locked device ${device.ip} for editing`);
                setModalDevice(device);
            } else {
                const lock = getDeviceLock(device.ip);
                if (lock) {
                    console.log(`❌ Device ${device.ip} is locked by ${lock.username}`);
                    alert(`Device ${device.ip} is currently being edited by ${lock.username}`);
                } else {
                    console.log(`❌ Failed to lock device ${device.ip}`);
                    alert('Unable to lock device for editing. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error handling collaborative device click:', error);
            alert('Error occurred while trying to edit device');
        }
    };

    const handleCollaborativeDeviceSave = async (updatedDevice) => {
        console.log('💾 Saving collaborative device:', updatedDevice.ip);
        
        if (!collaborativeMode || !scanId) {
            console.warn('Not in collaborative mode, falling back to regular save');
            handleSaveDevice(updatedDevice);
            return;
        }

        try {
            // Check if this is an SSH request
            if (updatedDevice._requestSSH) {
                const { _requestSSH, ...deviceWithoutFlag } = updatedDevice;
                handleOpenSSH(deviceWithoutFlag);
                
                // Still need to unlock the device
                await unlockDevice(updatedDevice.ip);
                return;
            }

            // Get the original device for comparison
            const originalDevice = getAllDevices().find(d => d.ip === updatedDevice.ip) || {};
            const mergedOriginal = {
                ...originalDevice,
                ...customNames[updatedDevice.ip]
            };

            // Calculate what changed
            const changes = getDeviceChanges(mergedOriginal, updatedDevice);
            
            if (Object.keys(changes).length > 0) {
                console.log('📤 Broadcasting device changes:', changes);
                
                // Update device through collaboration system
                await updateDevice(updatedDevice.ip, changes);
                
                // Also update local state
                handleSaveDevice(updatedDevice);
            } else {
                console.log('No changes detected, just unlocking device');
            }

            // Unlock the device
            await unlockDevice(updatedDevice.ip);
            console.log(`🔓 Unlocked device ${updatedDevice.ip}`);
            
        } catch (error) {
            console.error('Error saving collaborative device:', error);
            alert('Error occurred while saving device');
            
            // Try to unlock the device even if save failed
            try {
                await unlockDevice(updatedDevice.ip);
            } catch (unlockError) {
                console.error('Error unlocking device after failed save:', unlockError);
            }
        }
    };

    const handleCollaborativeModalClose = async (device) => {
        console.log('❌ Closing collaborative modal for device:', device?.ip);
        
        if (collaborativeMode && scanId && device?.ip) {
            try {
                await unlockDevice(device.ip);
                console.log(`🔓 Unlocked device ${device.ip} on modal close`);
            } catch (error) {
                console.error('Error unlocking device on modal close:', error);
            }
        }
    };    // Toggle collaboration mode
    const toggleCollaborationMode = async () => {
        if (collaborativeMode) {
            // Disable collaboration mode
            setCollaborativeMode(false);
            setScanId(null);
            console.log('❌ Collaboration mode disabled');
        } else {
            // Enable collaboration mode - show scan selector
            await fetchAvailableScans();
            setShowScanSelector(true);
        }
    };    // Handle scan selection for collaboration
    const handleScanSelect = async (selectedScan) => {
        const collaborationScanId = selectedScan.scanId || selectedScan._id;
        setScanId(collaborationScanId);
        setCollaborativeMode(true);
        setShowScanSelector(false);
        
        console.log(`✅ Collaboration mode enabled for scan: ${selectedScan.name} (${collaborationScanId}) from ${selectedScan.source}`);
        
        // Load scan data to topology if it has device data
        if (selectedScan.source === 'shared' && selectedScan._id) {
            try {
                console.log('🔄 Loading shared scan topology data...');
                
                // Fetch the full scan data from the shared scans API
                const response = await fetch(`/api/scans/shared/${selectedScan._id}`, {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const scanData = data.data;
                    
                    if (scanData && scanData.scanData && scanData.scanData.devices) {
                        console.log('📊 Loading scan devices to topology:', Object.keys(scanData.scanData.devices));
                        setDevices(scanData.scanData.devices);
                        setActiveTab('topology');
                    }
                } else {
                    console.warn('Failed to load shared scan data:', response.status);
                }
            } catch (error) {
                console.error('Error loading shared scan data:', error);
            }
        } else if (selectedScan.source === 'history' && selectedScan.scanData) {
            // For scan history items, load the devices directly
            console.log('📊 Loading scan history devices to topology:', Object.keys(selectedScan.scanData.devices || {}));
            if (selectedScan.scanData.devices) {
                setDevices(selectedScan.scanData.devices);
                setActiveTab('topology');
            }
        }
    };

    // Handle manual scan ID entry
    const handleManualScanId = () => {
        const newScanId = prompt('Enter Scan ID for collaboration:');
        if (newScanId && newScanId.trim()) {
            setScanId(newScanId.trim());
            setCollaborativeMode(true);
            setShowScanSelector(false);
            console.log(`✅ Collaboration mode enabled for scan: ${newScanId}`);
        }
    };

    return (        <div className="flex flex-col bg-gray-900 text-white h-screen w-screen overflow-hidden">
            {/* Tab Navigation */}
            <div className="bg-gray-800 border-b border-gray-700">
                <div className="flex space-x-0">
                    <button
                        onClick={() => setActiveTab('topology')}
                        className={`px-6 py-4 font-medium transition-colors border-b-2 ${
                            activeTab === 'topology'
                                ? 'border-blue-500 text-blue-400 bg-gray-700'
                                : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                    >
                        <FaNetworkWired className="inline mr-2" />
                        Network Topology
                    </button>
                    <button                        onClick={() => setActiveTab('sharedScans')}
                        className={`px-6 py-4 font-medium transition-colors border-b-2 ${
                            activeTab === 'sharedScans'
                                ? 'border-blue-500 text-blue-400 bg-gray-700'
                                : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                    >
                        <FaShare className="inline mr-2" />
                        Shared Scans
                    </button>
                </div>
            </div>

            {/* Top Control Bar - Only show for topology tab */}
            {activeTab === 'topology' && (
                <div className="bg-gray-800 p-4 border-b border-gray-700">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-xl font-semibold">Network Topology</h2>
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                                <span>{flattenedDevices.length} devices</span>
                                {Object.keys(devices).length > 0 && (
                                    <span>{Object.keys(devices).length} vendors</span>
                                )}
                                {Object.keys(customNames).length > 0 && (
                                    <span>{Object.keys(customNames).length} custom names</span>
                                )}
                            </div>
                        </div>
                          <div className="flex items-center space-x-3">
                            {/* Collaboration Toggle */}
                            <button
                                onClick={toggleCollaborationMode}
                                className={`px-4 py-2 rounded flex items-center transition-colors ${
                                    collaborativeMode 
                                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                                }`}
                                title={collaborativeMode ? 'Disable Collaboration Mode' : 'Enable Collaboration Mode'}
                            >
                                <FaUsers className="mr-2" />
                                {collaborativeMode ? 'Collaborative' : 'Solo'}
                            </button>

                            {/* Collaboration Status */}
                            {collaborativeMode && (
                                <div className="flex items-center space-x-2 text-sm">
                                    <span className="text-gray-400">Scan ID: {scanId}</span>
                                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="text-gray-400">
                                        {isConnected ? `${collaborators.length} users` : 'Disconnected'}
                                    </span>
                                </div>
                            )}
                            
                            {/* Network Control Button */}
                            <button
                                onClick={networkModal.openModal}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center transition-colors"
                            >
                                <FaNetworkWired className="mr-2" />
                                Network Control
                            </button>
                            
                            {/* Debug Tools */}
                            <button 
                                className="bg-gray-700 p-2 rounded hover:bg-gray-600"
                                title="Debug Network Relationships"
                                onClick={() => {
                                    debugNetworkRelationships();
                                    if (topologyMapRef.current) {
                                        topologyMapRef.current.refresh();
                                    }
                                }}
                            >
                                <FaBug />
                            </button>
                            
                            {/* Fix Switch Connections */}
                            <button 
                                className="bg-yellow-700 p-2 rounded hover:bg-yellow-600"
                                title="Fix Switch-Gateway Connections"
                                onClick={() => {
                                    if (fixGatewaySwitchConnections()) {
                                        alert("Fixed switch-gateway connections. Topology map will refresh.");
                                    } else {
                                        alert("No switch-gateway connection issues to fix or no gateways available.");
                                    }
                                }}
                            >
                                <FaCog />
                            </button>
                            
                            {/* Fullscreen Toggle */}
                            <button
                                onClick={() => setIsTopologyFullscreen(!isTopologyFullscreen)}
                                className="bg-gray-700 p-2 rounded hover:bg-gray-600"
                                title={isTopologyFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                            >
                                {isTopologyFullscreen ? <FaCompress /> : <FaExpand />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            {activeTab === 'topology' ? (
                <div className={`flex-1 p-4 overflow-hidden ${isTopologyFullscreen ? 'absolute inset-0 z-40 bg-gray-900' : ''}`}>
                    <div 
                        ref={contentRef}
                        className="w-full h-full bg-gray-800 rounded-lg overflow-hidden"
                    >                        <TopologyMap
                            ref={topologyMapRef}
                            devices={devices}
                            vendorColors={vendorColors}
                            customNames={customNames}
                            setCustomNames={setCustomNames}
                            openSSHModal={handleOpenSSH}
                            contentDimensions={contentDimensions}
                            setModalDevice={setModalDevice}
                            // Collaboration props
                            collaborativeMode={collaborativeMode}
                            scanId={scanId}
                            isConnected={isConnected}
                            collaborators={collaborators}
                            deviceLocks={deviceLocks}
                            onCollaborativeDeviceClick={handleCollaborativeDeviceClick}
                            isDeviceLockedByMe={isDeviceLockedByMe}
                            isDeviceLockedByOther={isDeviceLockedByOther}
                            getDeviceLock={getDeviceLock}
                        />
                    </div>
                </div>
            ) : (                <div className="flex-1 overflow-hidden">
                    <SharedScansBrowser 
                        onScanSelect={(scanData) => {
                            // Load scan directly to topology view
                            if (scanData && scanData.scanData && scanData.scanData.devices) {
                                // Set devices data from the shared scan
                                setDevices(scanData.scanData.devices);
                                // Switch to topology view to see loaded scan
                                setActiveTab('topology');
                                console.log('Scan loaded to topology:', scanData.name);
                            }
                        }}
                        onImportSuccess={(scanData) => {
                            // Import the shared scan data
                            if (scanData && scanData.scanData && scanData.scanData.devices) {
                                // Set devices data from the shared scan
                                setDevices(scanData.scanData.devices);
                                // Switch to topology view to see imported scan
                                setActiveTab('topology');
                            }
                        }}
                    />
                </div>
            )}            {/* Enhanced UnifiedDeviceModal now handles both solo and collaborative modes */}
            {console.log('🎯 Rendering UnifiedDeviceModal:', {
                modalDevice: modalDevice ? modalDevice.ip : null,
                modalDeviceExists: !!modalDevice,
                collaborativeMode,
                scanId
            })}
            <UnifiedDeviceModal
                modalDevice={modalDevice}
                setModalDevice={(device) => {
                    console.log('🎯 UnifiedDeviceModal setModalDevice called with:', device ? device.ip : null);
                    if (collaborativeMode && modalDevice) {
                        handleCollaborativeModalClose(modalDevice);
                    }
                    setModalDevice(null);
                }}
                onSave={collaborativeMode ? handleCollaborativeDeviceSave : handleSaveDevice}
                onStartSSH={(device) => {
                    setSSHTarget(device);
                    setSSHModalVisible(true);
                }}
                scanId={collaborativeMode ? scanId : null}
                isCollaborative={collaborativeMode}
            />
            
            {/* SSH Modal */}
            {sshModalVisible && sshTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-4 w-96">
                        <h2 className="text-white text-xl mb-4">SSH to {sshTarget.ip}</h2>
                        <div className="mb-4">
                            <label className="block text-sm text-gray-300 mb-1">Username</label>
                            <input
                                type="text"
                                value={sshUsername}
                                onChange={(e) => setSSHUsername(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm text-gray-300 mb-1">Password</label>
                            <input
                                type="password"
                                value={sshPassword}
                                onChange={(e) => setSSHPassword(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setSSHModalVisible(false)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    // Close the credentials modal
                                    setSSHModalVisible(false);
                                    // Open the terminal
                                    setShowTerminal(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                            >
                                Connect
                            </button>
                        </div>
                    </div>
                </div>
            )}
              {/* SSH Terminal */}
            {showTerminal && sshTarget && (
                <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">Loading SSH terminal...</div>}>
                    <SSHTerminal
                        ip={sshTarget.ip}
                        username={sshUsername}
                        password={sshPassword}
                        visible={showTerminal}
                        onClose={() => setShowTerminal(false)}
                    />
                </Suspense>
            )}            {/* Network Control Modal */}
            <NetworkControlModal
                isVisible={networkModal.isModalVisible}
                onClose={networkModal.closeModal}
                onScanComplete={handleNetworkScanComplete}
                onDevicesUpdate={handleDevicesUpdate}
                onCustomNamesUpdate={handleCustomNamesUpdate}
                title="Network Scan Control"
                defaultIpRange="10.5.1.1-255"
                allowFullscreen={true}
                showExportImport={true}
                showHistory={true}
                showRawDataInspector={true}
                currentState={{ devices }}
            />

            {/* Scan Selection Modal for Collaboration */}
            {showScanSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-white text-xl font-semibold">Select Scan for Collaboration</h2>
                            <button
                                onClick={() => setShowScanSelector(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Search Filter */}
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Search scans..."
                                value={scanSelectorFilter}
                                onChange={(e) => setScanSelectorFilter(e.target.value)}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Scan List */}
                        <div className="flex-1 overflow-y-auto mb-4">
                            {loadingScans ? (
                                <div className="text-center text-gray-400 py-4">
                                    Loading scans...
                                </div>
                            ) : availableScans.length === 0 ? (
                                <div className="text-center text-gray-400 py-4">
                                    No scans available for collaboration
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {availableScans
                                        .filter(scan => 
                                            scanSelectorFilter === '' || 
                                            scan.name.toLowerCase().includes(scanSelectorFilter.toLowerCase()) ||
                                            scan.description?.toLowerCase().includes(scanSelectorFilter.toLowerCase())
                                        )                                        .map(scan => (
                                            <div
                                                key={scan._id}
                                                className="bg-gray-700 hover:bg-gray-600 p-3 rounded cursor-pointer transition-colors"
                                                onClick={() => handleScanSelect(scan)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="text-white font-medium">{scan.name}</div>
                                                    <span className={`text-xs px-2 py-1 rounded ${
                                                        scan.source === 'shared' 
                                                            ? 'bg-blue-600 text-blue-100' 
                                                            : 'bg-green-600 text-green-100'
                                                    }`}>
                                                        {scan.source === 'shared' ? 'Shared' : 'My Scan'}
                                                    </span>
                                                </div>
                                                <div className="text-gray-400 text-sm">
                                                    {scan.description || 'No description'}
                                                </div>
                                                <div className="text-gray-500 text-xs mt-1">
                                                    Owner: {scan.ownerId?.username} • 
                                                    {scan.metadata?.deviceCount || 0} devices • 
                                                    {format(new Date(scan.createdAt || scan.timestamp), 'MMM dd, yyyy')}
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between">
                            <button
                                onClick={handleManualScanId}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                            >
                                Enter Scan ID Manually
                            </button>
                            <button
                                onClick={() => setShowScanSelector(false)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}