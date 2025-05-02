"use client";

import { useState, lazy, Suspense } from "react";
import NetworkScanControl from "./networkscancontrol";
import TopologyMap from "./networktopology";
import DeviceModal from "./devicemodal";

// Lazy load the SSH terminal component
const SSHTerminal = lazy(() => import("./sshterminal"));

export default function NetworkDashboard() {
    const [devices, setDevices] = useState({});
    const [vendorColors, setVendorColors] = useState({});
    const [customNames, setCustomNames] = useState({});
    const [modalDevice, setModalDevice] = useState(null);
    
    // Add state for SSH modal and connection
    const [sshModalVisible, setSSHModalVisible] = useState(false);
    const [sshTarget, setSSHTarget] = useState(null);
    const [sshUsername, setSSHUsername] = useState("");
    const [sshPassword, setSSHPassword] = useState("");
    const [showTerminal, setShowTerminal] = useState(false);

    const handleSaveDevice = (updatedDevice) => {
        // Check if this is an SSH request from the device modal
        if (updatedDevice._requestSSH) {
            // Remove the special flag
            const { _requestSSH, ...deviceWithoutFlag } = updatedDevice;
            
            // Open the SSH modal for this device
            handleOpenSSH(deviceWithoutFlag);
            return; // Exit early, no need to save other changes
        }
        
        setDevices((prevDevices) => {
            const newDevices = { ...prevDevices };
            if (updatedDevice.ip) {
                newDevices[updatedDevice.ip] = {
                    ...prevDevices[updatedDevice.ip],
                    ...updatedDevice
                };
            }
            console.log("Updated devices after save:", newDevices);
            return newDevices;
        });
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

    return (
        <div className="flex bg-gray-900 text-white h-screen w-screen">
            {/* Left Panel */}
            <div className="w-[350px] bg-gray-800 p-4 overflow-y-auto">
                <NetworkScanControl
                    devices={devices}
                    setDevices={setDevices}
                    vendorColors={vendorColors}
                    setVendorColors={setVendorColors}
                    customNames={customNames}
                    setCustomNames={setCustomNames}
                />
            </div>

            {/* Right Panel */}
            <div className="flex-1 p-4">
                <div className="h-full w-full bg-gray-800 rounded-lg overflow-hidden">
                    <TopologyMap
                        devices={devices}
                        vendorColors={vendorColors}
                        customNames={customNames}
                        openSSHModal={handleOpenSSH}
                    />
                </div>
            </div>

            {/* Device Modal */}
            <DeviceModal
                modalDevice={modalDevice}
                setModalDevice={setModalDevice}
                onSave={handleSaveDevice}
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