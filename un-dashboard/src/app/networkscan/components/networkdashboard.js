"use client";

import { useState, lazy, Suspense, useEffect, useRef } from "react";
import TopologyMap from "./networktopology";
import UnifiedDeviceModal from "../../components/UnifiedDeviceModal";
import NetworkControlModal from "../../components/NetworkControlModal";
import { useNetworkControlModal } from "../../components/useNetworkControlModal";
import { FaNetworkWired, FaCog, FaBug, FaExpand, FaCompress } from "react-icons/fa";
import { format } from "date-fns";
import { debugNetworkRelationships, fixSwitchParentGateway } from "../../utils/networkRelationshipDebug";

// Lazy load the SSH terminal component
const SSHTerminal = lazy(() => import("../../components/sshterminal"));

export default function NetworkDashboard() {
    const contentRef = useRef(null);
    const [devices, setDevices] = useState({});
    const [vendorColors, setVendorColors] = useState({});
    const [customNames, setCustomNames] = useState({});
    const [modalDevice, setModalDevice] = useState(null);
    const [flattenedDevices, setFlattenedDevices] = useState([]);
    
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
    const topologyMapRef = useRef(null);
    
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
        
        // Check if network role is changing
        let networkRoleChanged = false;
        if (customNames[updatedDevice.ip]) {
            networkRoleChanged = 
                customNames[updatedDevice.ip].networkRole !== updatedDevice.networkRole ||
                customNames[updatedDevice.ip].parentGateway !== updatedDevice.parentGateway ||
                customNames[updatedDevice.ip].parentSwitch !== updatedDevice.parentSwitch;
        }        // We need to preserve the parent relationships exactly as they are in the updatedDevice
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
          console.log(`Updated device ${updatedDevice.ip} relationships:`, {
            networkRole: updatedDevice.networkRole,
            parentGateway: updatedDevice.parentGateway,
            parentSwitch: updatedDevice.parentSwitch
        });
        
        setCustomNames(updatedCustomNames);
        
        // If network role changed, reload from localStorage to ensure consistency
        if (networkRoleChanged) {
            console.log("Network role or parent relationship changed, reloading custom names from localStorage");
            setTimeout(() => {
                try {
                    const storedProps = localStorage.getItem("customDeviceProperties");
                    if (storedProps) {
                        setCustomNames(JSON.parse(storedProps));
                        
                        // Also refresh the topology map
                        if (topologyMapRef.current) {
                            topologyMapRef.current.refresh();
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
    };

    // Get all devices from the devices object and flatten them into a single array
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
    };    return (
        <div className="flex flex-col bg-gray-900 text-white h-screen w-screen overflow-hidden">
            {/* Top Control Bar */}
            <div className="bg-gray-800 p-4 border-b border-gray-700">
                <div className="flex justify-between items-center">                    <div className="flex items-center space-x-4">
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

            {/* Main Content - Topology Map */}
            <div className={`flex-1 p-4 overflow-hidden ${isTopologyFullscreen ? 'absolute inset-0 z-40 bg-gray-900' : ''}`}>
                <div 
                    ref={contentRef}
                    className="w-full h-full bg-gray-800 rounded-lg overflow-hidden"
                >
                    <TopologyMap
                        ref={topologyMapRef}
                        devices={devices}
                        vendorColors={vendorColors}
                        customNames={customNames}
                        setCustomNames={setCustomNames}
                        openSSHModal={handleOpenSSH}
                        contentDimensions={contentDimensions}
                        setModalDevice={setModalDevice}
                    />
                </div>
            </div>{/* Device Modal */}
            <UnifiedDeviceModal
                modalDevice={modalDevice}
                setModalDevice={setModalDevice}
                onSave={handleSaveDevice}
                onStartSSH={(device) => {
                    setSSHTarget(device);
                    setSSHModalVisible(true);
                }}
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
            )}

            {/* Network Control Modal */}
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
        </div>
    );
}