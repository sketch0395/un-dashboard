import React, { memo, useEffect, useState } from "react";
import { FaStickyNote, FaTag, FaNetworkWired } from "react-icons/fa";
import SSHBadge from "./SSHBadge";
import { countSSHDevices } from "../utils/sshScanUtils";

const DeviceList = ({ devices, openModal, isSSHAvailable, openSSHModal }) => {
    // Create a map of colors for categories and vendors
    const [colorMap, setColorMap] = useState({
        category: {},
        vendor: {}
    });

    useEffect(() => {
        // Generate colors for categories and vendors
        const categorySet = new Set();
        const vendorSet = new Set();
        
        // Collect all unique categories and vendors
        devices.forEach(device => {
            if (device.category) categorySet.add(device.category);
            if (device.vendor) vendorSet.add(device.vendor.toLowerCase());
        });
        
        // Generate colors using a simple hash function
        const generateColor = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            // Convert to hex color
            let color = '#';
            for (let i = 0; i < 3; i++) {
                const value = (hash >> (i * 8)) & 0xFF;
                color += ('00' + value.toString(16)).substr(-2);
            }
            return color;
        };
        
        // Create color maps
        const newCategoryColors = {};
        const newVendorColors = {};
        
        categorySet.forEach(category => {
            newCategoryColors[category] = generateColor(category);
        });
        
        vendorSet.forEach(vendor => {
            newVendorColors[vendor] = generateColor(vendor);
        });
        
        setColorMap({
            category: newCategoryColors,
            vendor: newVendorColors
        });
    }, [devices]);

    // Count SSH-enabled devices for summary
    const sshEnabledCount = countSSHDevices(devices);

    return (
        <div className="device-list">
            {/* Display summary information */}
            <div className="mb-3 text-sm text-gray-300">
                <p>Total devices: {devices.length}</p>
                <p>SSH-enabled devices: {sshEnabledCount} ({Math.round(sshEnabledCount/devices.length*100) || 0}%)</p>
            </div>
            
            {/* Device list with SSHBadge component */}
            {devices.map((device, index) => (
                <div key={index} className="device-item flex flex-col p-2 border-b border-gray-700 hover:bg-gray-750">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white">
                                {device.name ? (
                                    <span>
                                        {device.name} <span className="text-gray-400">({device.ip})</span>
                                    </span>
                                ) : (
                                    device.ip
                                )}
                            </p>
                            
                            {/* Use our new SSHBadge component */}
                            <SSHBadge 
                                device={device} 
                                onClick={openSSHModal} 
                                size="md"
                            />
                            
                            {/* Notes indicator */}
                            {device.notes && device.notes.trim() !== "" && (
                                <span className="text-amber-400 bg-gray-700 p-1 rounded" title={device.notes}>
                                    <FaStickyNote size={12} />
                                </span>
                            )}
                        </div>
                        
                        <div className="flex gap-2">
                            {/* Edit button - removed duplicative Connect button */}
                            <button
                                onClick={() => openModal(device)}
                                className="text-gray-300 hover:text-white bg-gray-700 px-2 py-1 rounded text-xs"
                                title="Edit Device"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                    
                    {/* Category, vendor and additional information */}
                    <div className="mt-1 flex flex-wrap gap-2">
                        {/* Display latency if available */}
                        {device.latency && (
                            <div className="inline-flex items-center text-xs bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded">
                                <FaNetworkWired size={8} className="mr-1" /> 
                                <span>{device.latency}ms</span>
                            </div>
                        )}
                        
                        {/* Display category */}
                        {device.category && (
                            <div className="inline-flex items-center text-xs bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded"
                                style={{ 
                                    borderLeft: `3px solid ${colorMap.category[device.category] || '#9CA3AF'}` 
                                }}
                            >
                                <FaTag size={8} className="mr-1" style={{ color: colorMap.category[device.category] }} /> 
                                <span style={{ color: colorMap.category[device.category] || 'inherit' }}>
                                    {device.category}
                                </span>
                            </div>
                        )}
                        
                        {/* Display vendor info */}
                        {device.vendor && (
                            <div className="inline-flex items-center text-xs bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded"
                                style={{ 
                                    borderLeft: `3px solid ${colorMap.vendor[device.vendor.toLowerCase()] || '#9CA3AF'}` 
                                }}
                            >
                                <span style={{ color: colorMap.vendor[device.vendor.toLowerCase()] || 'inherit' }}>
                                    {device.vendor}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const MemoizedDeviceList = memo(DeviceList);

export default MemoizedDeviceList;