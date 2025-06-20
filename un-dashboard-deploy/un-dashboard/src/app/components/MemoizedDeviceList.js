import React, { memo, useEffect, useState, useMemo } from "react";
import { FaStickyNote, FaTag, FaNetworkWired, FaDesktop, FaAddressCard } from "react-icons/fa";
import SSHBadge from "./SSHBadge";
import { countSSHDevices, getSSHStatus, getMacInfo, getOSInfo } from "../utils/sshScanUtils";
import { getDeviceHierarchy } from "../utils/deviceManagementUtils";

const getHierarchyInfo = (device) => {
    const hierarchy = getDeviceHierarchy(device.ip);
    return hierarchy;
};

const HierarchyDisplay = ({ device }) => {
    const hierarchy = getHierarchyInfo(device);
    if (!hierarchy.parents.length && !hierarchy.children.length) return null;

    return (
        <div className="mt-2 text-xs text-gray-400">
            {hierarchy.parents.length > 0 && (
                <div className="flex items-center gap-1">
                    <span>Connected to:</span>
                    {hierarchy.parents.map((parent, i) => (
                        <React.Fragment key={parent.ip}>
                            {i > 0 && <span>→</span>}
                            <span className="bg-gray-700 px-1.5 py-0.5 rounded">
                                {parent.name} ({parent.role})
                            </span>
                        </React.Fragment>
                    ))}
                </div>
            )}
            {hierarchy.children.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                    <span>{hierarchy.children.length > 1 ? 'Devices:' : 'Device:'}</span>
                    <span className="bg-gray-700 px-1.5 py-0.5 rounded">
                        {hierarchy.children.length} connected
                    </span>
                </div>
            )}
        </div>
    );
};

const DeviceList = ({ devices, openModal, isSSHAvailable, openSSHModal }) => {
    // Debug logging for device data
    console.log('🎨 MemoizedDeviceList received devices:', {
        count: devices?.length || 0,
        isArray: Array.isArray(devices),
        type: typeof devices,
        devices: devices
    });
    
    // Create a map of colors for categories and vendors
    const [colorMap, setColorMap] = useState({
        category: {},
        vendor: {}
    });

    // Use useMemo to process devices only when the devices array changes
    const processedDevices = useMemo(() => {
        return devices.map(device => {
            const hierarchy = getDeviceHierarchy(device.ip);
            return {
                ...device,
                // Add SSH status info if not present
                ssh: device.ssh || getSSHStatus(device),
                // Add MAC info if not present
                macInfo: device.macInfo || getMacInfo(device),
                // Add OS info if not present
                osInfo: device.osInfo || getOSInfo(device),
                // Add hierarchy information
                hierarchy
            };
        });
    }, [devices]); // Only recompute when devices change

    useEffect(() => {
        // Generate colors for categories and vendors
        const categorySet = new Set();
        const vendorSet = new Set();
        
        // Collect all unique categories and vendors
        processedDevices.forEach(device => {
            if (device.category) categorySet.add(device.category);
            // Use vendor from macInfo if available, otherwise fallback to device.vendor
            const vendorName = device.macInfo?.vendor || device.vendor;
            if (vendorName) vendorSet.add(vendorName.toLowerCase());
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
    }, [processedDevices]);

    // Count SSH-enabled devices for summary - use useMemo to avoid recalculation on every render
    const sshEnabledCount = useMemo(() => {
        return countSSHDevices(processedDevices);
    }, [processedDevices]);

    return (
        <div className="device-list">
            {/* Display summary information */}
            <div className="mb-3 text-sm text-gray-300">
                <p>Total devices: {processedDevices.length}</p>
                <p>SSH-enabled devices: {sshEnabledCount} ({Math.round(sshEnabledCount/processedDevices.length*100) || 0}%)</p>
            </div>
            
            {/* Device list with SSHBadge component */}
            {processedDevices.map((device, index) => (
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
                            {device.notes && Array.isArray(device.notes) && device.notes.length > 0 && (
                                <span className="text-amber-400 bg-gray-700 p-1 rounded" title={device.notes.map(note => note.text).join('\n')}>
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
                        {/* Display MAC Address if available */}
                        {(device.macInfo?.available && device.macInfo?.address) && (
                            <div className="inline-flex items-center text-xs bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded">
                                <FaAddressCard size={8} className="mr-1" /> 
                                <span>{device.macInfo.address}</span>
                            </div>
                        )}
                        
                        {/* Display OS information if available */}
                        {(device.osInfo?.available && device.osInfo?.name) && (
                            <div className="inline-flex items-center text-xs bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded">
                                <FaDesktop size={8} className="mr-1" /> 
                                <span>{device.osInfo.name} {device.osInfo.accuracy && `(${device.osInfo.accuracy}%)`}</span>
                            </div>
                        )}
                        
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
                        
                        {/* Display vendor info - prefer macInfo.vendor if available */}
                        {(device.macInfo?.vendor || device.vendor) && (
                            <div className="inline-flex items-center text-xs bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded"
                                style={{ 
                                    borderLeft: `3px solid ${
                                        colorMap.vendor[(device.macInfo?.vendor || device.vendor).toLowerCase()] || '#9CA3AF'
                                    }` 
                                }}
                            >
                                <span style={{ 
                                    color: colorMap.vendor[(device.macInfo?.vendor || device.vendor).toLowerCase()] || 'inherit' 
                                }}>
                                    {device.macInfo?.vendor || device.vendor}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Display hierarchy information */}
                    <HierarchyDisplay device={device} />

                    {/* Hierarchy Display */}
                    {(device.hierarchy.parents.length > 0 || device.hierarchy.children.length > 0) && (
                        <div className="mt-2 text-xs text-gray-400">
                            {device.hierarchy.parents.length > 0 && (
                                <div className="flex items-center gap-1">
                                    <span>Connected to:</span>
                                    {device.hierarchy.parents.map((parent, i) => (
                                        <React.Fragment key={parent.ip}>
                                            {i > 0 && <span>→</span>}
                                            <span className="bg-gray-700 px-1.5 py-0.5 rounded">
                                                {parent.name} ({parent.role})
                                            </span>
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}                            {device.hierarchy.children.length > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                    <span>{device.hierarchy.children.length > 1 ? 'Devices:' : 'Device:'}</span>
                                    <span className="bg-gray-700 px-1.5 py-0.5 rounded">
                                        {device.hierarchy.children.length} connected
                                    </span>
                                </div>
                            )}
                            {device.hierarchy.adjacentGateways?.length > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                    <span>Adjacent Gateways:</span>
                                    <div className="flex gap-1 flex-wrap">
                                        {device.hierarchy.adjacentGateways.map((gateway) => (
                                            <span key={gateway.ip} className="bg-blue-800 text-blue-200 px-1.5 py-0.5 rounded">
                                                {gateway.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const MemoizedDeviceList = memo(DeviceList);

export default MemoizedDeviceList;