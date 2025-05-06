"use client";

import React, { memo } from "react";
import { FaServer, FaDesktop, FaDatabase, FaWifi, FaNetworkWired, FaTerminal, FaInfoCircle } from "react-icons/fa";

const DeviceList = ({ devices, openModal, isSSHAvailable, openSSHModal, onHeaderScan }) => {
    // Sort devices alphabetically by IP address
    const sortedDevices = [...devices].sort((a, b) => {
        const ipA = a.ip.split('.').map(num => parseInt(num, 10));
        const ipB = b.ip.split('.').map(num => parseInt(num, 10));
        
        for (let i = 0; i < 4; i++) {
            if (ipA[i] !== ipB[i]) {
                return ipA[i] - ipB[i];
            }
        }
        return 0;
    });

    const getDeviceIcon = (device) => {
        if (device.icon) {
            switch (device.icon.toLowerCase()) {
                case 'server': return <FaServer className="text-blue-400" />;
                case 'computer': return <FaDesktop className="text-green-400" />;
                case 'database': return <FaDatabase className="text-purple-400" />;
                case 'network': return <FaNetworkWired className="text-yellow-400" />;
                default: return <FaWifi className="text-gray-400" />;
            }
        }
        
        // Default icon based on vendor or MAC address patterns
        if (device.vendor) {
            const vendorLower = device.vendor.toLowerCase();
            if (vendorLower.includes('vmware')) {
                return <FaServer className="text-blue-400" />;
            }
            if (vendorLower.includes('raspberry')) {
                return <FaServer className="text-red-400" />;
            }
            if (vendorLower.includes('intel') || vendorLower.includes('realtek')) {
                return <FaDesktop className="text-green-400" />;
            }
        }
        
        return <FaWifi className="text-gray-400" />;
    };

    return (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {sortedDevices.length === 0 ? (
                <p className="text-gray-400 text-sm">No devices found.</p>
            ) : (
                sortedDevices.map((device, index) => (
                    <div 
                        key={device.ip || index}
                        className="bg-gray-700 p-2 rounded flex items-center justify-between hover:bg-gray-600 transition-colors"
                    >
                        <div className="flex items-center">
                            <div className="mr-2">
                                {getDeviceIcon(device)}
                            </div>
                            <div>
                                <div className="flex items-center">
                                    <p className="text-sm font-medium">
                                        {device.name || device.ip || 'Unknown device'}
                                    </p>
                                    {device.category && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-gray-600 text-xs rounded">
                                            {device.category}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400">
                                    {device.ip} {device.vendor ? `(${device.vendor})` : ''}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {isSSHAvailable && isSSHAvailable(device) && (
                                <button
                                    onClick={() => openSSHModal(device)}
                                    className="text-green-400 hover:text-green-300 p-1"
                                    title="SSH to device"
                                >
                                    <FaTerminal size={14} />
                                </button>
                            )}
                            {onHeaderScan && (
                                <button
                                    onClick={() => onHeaderScan(device)}
                                    className="text-blue-400 hover:text-blue-300 p-1"
                                    title="Scan device headers"
                                >
                                    <FaInfoCircle size={14} />
                                </button>
                            )}
                            <button
                                onClick={() => openModal(device)}
                                className="bg-blue-600 text-xs text-white px-2 py-1 rounded hover:bg-blue-700"
                            >
                                Details
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedDeviceList = memo(DeviceList);

export default MemoizedDeviceList;