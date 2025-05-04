import React, { memo, useEffect, useState } from "react";
import { FaTerminal, FaStickyNote, FaTag } from "react-icons/fa";

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

    return (
        <div className="device-list">
            {devices.map((device, index) => (
                <div key={index} className="device-item flex flex-col p-2 border-b border-gray-700">
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
                            {isSSHAvailable(device) && (
                                <button
                                    onClick={() => openSSHModal(device)}
                                    className="text-green-500 hover:text-green-400"
                                    title="SSH Available"
                                >
                                    <FaTerminal />
                                </button>
                            )}
                            {device.notes && device.notes.trim() !== "" && (
                                <span className="text-amber-400" title="Has notes">
                                    <FaStickyNote size={12} />
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => openModal(device)}
                            className="text-blue-500 hover:text-blue-400"
                            title="Edit Device"
                        >
                            Edit
                        </button>
                    </div>
                    
                    {/* Category and additional information row */}
                    <div className="mt-1 flex flex-wrap gap-2">
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