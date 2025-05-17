"use client";

import { useState, lazy, Suspense, useEffect, useRef } from "react";
import NetworkScanControl from "./networkscancontrol";
import TopologyMap from "./networktopology";
import UnifiedDeviceModal from "./UnifiedDeviceModal";
import { FaChevronLeft, FaChevronRight, FaCog } from "react-icons/fa";
import { format } from "date-fns";

// Lazy load the SSH terminal component
const SSHTerminal = lazy(() => import("./sshterminal"));

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

    // Control panel minimization state
    const [controlsMinimized, setControlsMinimized] = useState(false);
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
    }, []); // Remove contentRef.current from dependency array

    // Flatten the devices object into an array for easier use with components
    useEffect(() => {
        if (devices && Object.keys(devices).length > 0) {
            const devicesList = Object.values(devices).flat();
            setFlattenedDevices(devicesList);
        }
    }, [devices]);    // Helper function to identify what's changed in the device
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
    };

    const handleSaveDevice = (updatedDevice) => {
        // Check if this is an SSH request from the device modal
        if (updatedDevice._requestSSH) {
            // Remove the special flag
            const { _requestSSH, ...deviceWithoutFlag } = updatedDevice;
            
            // Open the SSH modal for this device
            handleOpenSSH(deviceWithoutFlag);
            return;
        }
        
        // Check if network role is changing
        let networkRoleChanged = false;
        if (customNames[updatedDevice.ip]) {
            networkRoleChanged = 
                customNames[updatedDevice.ip].networkRole !== updatedDevice.networkRole ||
                customNames[updatedDevice.ip].parentGateway !== updatedDevice.parentGateway ||
                customNames[updatedDevice.ip].parentSwitch !== updatedDevice.parentSwitch;
        }
        
        // Update the device in the local state
        const updatedCustomNames = {
            ...customNames,
            [updatedDevice.ip]: {
                ...customNames[updatedDevice.ip],
                ...updatedDevice
            }
        };
        
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
    
    // Handle SSH connection request
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
    };

    return (
        <div className="flex bg-gray-900 text-white h-screen w-screen overflow-hidden">
            {/* Left Panel - Collapsible */}
            <div 
                className={`bg-gray-800 p-4 panel-transition flex flex-col ${controlsMinimized ? 'w-12' : 'w-[350px]'}`}
            >
                <div className="flex justify-between items-center mb-4">
                    {!controlsMinimized && <h2 className="text-lg font-semibold">Network Controls</h2>}
                    <button 
                        className={`bg-gray-700 p-2 rounded-full hover:bg-gray-600 ${controlsMinimized ? 'mx-auto' : ''}`}
                        onClick={() => setControlsMinimized(!controlsMinimized)}
                        title={controlsMinimized ? "Expand controls" : "Minimize controls"}
                    >
                        {controlsMinimized ? <FaChevronRight /> : <FaChevronLeft />}
                    </button>
                </div>
                
                <div className={`overflow-y-auto max-h-[calc(100vh-120px)] flex-grow ${controlsMinimized ? 'hidden' : ''}`}>
                    <NetworkScanControl
                        devices={devices}
                        setDevices={setDevices}
                        vendorColors={vendorColors}
                        setVendorColors={setVendorColors}
                        customNames={customNames}
                        setCustomNames={setCustomNames}
                    />
                </div>
                
                {/* Minimized state shows only icons */}
                {controlsMinimized && (
                    <div className="flex flex-col items-center gap-3 mt-4">
                        <button 
                            className="bg-gray-700 p-2 rounded-full hover:bg-gray-600"
                            title="Network settings"
                        >
                            <FaCog />
                        </button>
                    </div>
                )}
            </div>

            {/* Right Panel - Expanded to fill available space */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                {/* Content - Now only showing topology */}
                <div 
                    ref={contentRef}
                    className="flex-1 bg-gray-800 rounded-lg overflow-hidden"
                >
                    <div className="w-full h-full overflow-hidden">
                        <TopologyMap
                            ref={topologyMapRef}
                            devices={devices}
                            vendorColors={vendorColors}
                            customNames={customNames}
                            openSSHModal={handleOpenSSH}
                            contentDimensions={contentDimensions}
                            setModalDevice={setModalDevice}
                        />
                    </div>
                </div>
            </div>            {/* Device Modal */}
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
        </div>
    );
}