import React, { useEffect, useState, forwardRef, useImperativeHandle, useRef } from "react";
import * as d3 from "d3";
import CircularNetworkView from './CircularNetworkView';
import HierarchicalNetworkView from './HierarchicalNetworkView';
import NetworkLegend from '../components/NetworkLegend';
import { processDeviceData, groupDevicesBySubnet, isSSHAvailable, validateNetworkRelationships } from './NetworkViewUtils';
import { FaCircle, FaSitemap } from 'react-icons/fa';
import { FaTimes, FaFilter, FaChevronDown, FaCheck } from 'react-icons/fa';
import { FaLayerGroup as FaLayerIcon } from "react-icons/fa6";

// NetworkViewManager manages the different visualization types and controls
const NetworkViewManager = forwardRef(({ 
    devices, 
    vendorColors, 
    customNames, 
    setCustomNames, // Add setCustomNames prop
    openSSHModal, 
    setModalDevice 
}, ref) => {
    const svgRef = useRef();
    const containerRef = useRef();
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        device: null,
        x: 0,
        y: 0
    });
    
    // Add state for grouping option
    const [groupBy, setGroupBy] = useState("scan"); // Possible values: "scan", "category", "vendor" 
    
    // Store group colors for consistent coloring
    const [groupColors, setGroupColors] = useState({});
    
    // Add state for filtered groups
    const [availableGroups, setAvailableGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
    // Track container dimensions
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Add state for advanced visualization options
    const [visualizationType, setVisualizationType] = useState("circular"); // Options: circular, hierarchical, timeline
    const [visualizationMenuOpen, setVisualizationMenuOpen] = useState(false);
    const [timelineData, setTimelineData] = useState([]); // For time-based visualization
    const [subnetGroups, setSubnetGroups] = useState({}); // For subnet grouping
    
    // Add state to trigger refreshes
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    // Tooltip state
    const [tooltip, setTooltip] = useState({
        visible: false,
        x: 0,
        y: 0,
        content: ''
    });    // Expose the refresh method via ref
    useImperativeHandle(ref, () => ({
        refresh: () => {
            console.log("NETWORK VIEW MANAGER - Topology refresh triggered by parent", {
                currentRefreshTrigger: refreshTrigger,
                timestamp: new Date().toISOString()
            });
            // Increment the refreshTrigger to force re-render
            setRefreshTrigger(prev => {
                const newValue = prev + 1;
                console.log("NETWORK VIEW MANAGER - RefreshTrigger updated:", prev, "->", newValue);
                return newValue;
            });
        }
    }));

    // Handle container resize
    useEffect(() => {
        if (!containerRef.current) return;

        const updateSize = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        // Set initial size
        updateSize();

        // Create ResizeObserver to detect container size changes
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(containerRef.current);

        return () => {
            if (containerRef.current) {
                resizeObserver.unobserve(containerRef.current);
            }
            resizeObserver.disconnect();
        };
    }, [containerRef]);
      // Validate network relationships when devices or customNames change
    useEffect(() => {
        // Only run validation when we have devices and customNames
        if (!devices || !customNames) return;
        
        console.log("NetworkViewManager: Running relationship validation check");
        
        // Check for invalid relationships
        const validatedCustomNames = validateNetworkRelationships(devices, customNames);
        
        // If there were issues, update localStorage
        if (validatedCustomNames) {
            console.log("Updating customNames with validated relationships");
            localStorage.setItem("customDeviceProperties", JSON.stringify(validatedCustomNames));
        }
    }, [devices, customNames, refreshTrigger]);    // Close context menu when clicking outside and prevent default context menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (contextMenu.visible && !event.target.closest('.context-menu')) {
                setContextMenu({...contextMenu, visible: false});
            }
            
            // Also close dropdown if clicking outside of it
            if (dropdownOpen && !event.target.closest('.group-dropdown')) {
                setDropdownOpen(false);
            }
        };
        
        // Prevent default context menu in the visualization area
        const handleContextMenu = (event) => {
            // Allow default context menu on inputs, textareas, etc.
            const isFormElement = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(event.target.tagName);
            const isInContextMenu = event.target.closest('.context-menu');
            
            if (!isFormElement && !isInContextMenu && containerRef.current?.contains(event.target)) {
                event.preventDefault();
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('contextmenu', handleContextMenu);
        
        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [contextMenu, dropdownOpen]);
    
    // Add collaboration event handlers for real-time visualization updates
    useEffect(() => {
        console.log('🔗 NetworkViewManager: Setting up collaboration event listeners');

        // Listen for device updates from other users
        const handleCollaborativeDeviceUpdate = (event) => {
            const { deviceId, changes, userId, username } = event.detail;
            
            console.log(`🔄 NetworkViewManager received device update from ${username} for device ${deviceId}:`, changes);
            
            // Trigger a refresh to update the visualization
            setRefreshTrigger(prev => {
                const newValue = prev + 1;
                console.log(`🔄 NetworkViewManager: Triggering refresh for collaborative update (${prev} -> ${newValue})`);
                return newValue;
            });
        };

        // Listen for scan updates from other users  
        const handleCollaborativeScanUpdate = (event) => {
            const { changes, userId, username } = event.detail;
            
            console.log(`📊 NetworkViewManager received scan update from ${username}:`, changes);
            
            // Trigger a refresh to update the visualization
            setRefreshTrigger(prev => {
                const newValue = prev + 1;
                console.log(`🔄 NetworkViewManager: Triggering refresh for collaborative scan update (${prev} -> ${newValue})`);
                return newValue;
            });
        };

        // Add event listeners
        window.addEventListener('collaborationDeviceUpdate', handleCollaborativeDeviceUpdate);
        window.addEventListener('collaborationScanUpdate', handleCollaborativeScanUpdate);

        // Cleanup function
        return () => {
            console.log('🧹 NetworkViewManager: Cleaning up collaboration event listeners');
            window.removeEventListener('collaborationDeviceUpdate', handleCollaborativeDeviceUpdate);
            window.removeEventListener('collaborationScanUpdate', handleCollaborativeScanUpdate);
        };
    }, []);
    
    // Extract available categories or vendors when grouping changes
    useEffect(() => {
        if (!devices || Object.keys(devices).length === 0) return;
        
        const flattenedDevices = Array.isArray(devices) ? devices : Object.values(devices).flat();
        
        let groups = new Set();
        
        if (groupBy === "category") {
            flattenedDevices.forEach(device => {
                const category = customNames?.[device.ip]?.category || "Uncategorized";
                groups.add(category);
            });
        } else if (groupBy === "vendor") {
            flattenedDevices.forEach(device => {
                // Use enhanced vendor information if available
                const macInfo = device.macInfo || (device.mac ? { vendor: device.vendor } : null);
                const vendor = macInfo?.vendor || device.vendor || "Unknown";
                groups.add(vendor);
            });
        } else {
            flattenedDevices.forEach(device => {
                const scanName = device.scanSource?.name || "Default Scan";
                groups.add(scanName);
            });
        }
        
        // Convert to array and sort
        const sortedGroups = Array.from(groups).sort();
        setAvailableGroups(sortedGroups);
        // Reset selected group when grouping changes
        setSelectedGroup(null);
    }, [groupBy, devices, customNames]);

    // Function to show tooltip
    const showTooltip = (event, content) => {
        setTooltip({
            visible: true,
            x: event.pageX + 10,
            y: event.pageY - 10,
            content
        });
    };

    // Function to hide tooltip
    const hideTooltip = () => {
        setTooltip({ ...tooltip, visible: false });
    };

    // Filter devices based on selected group
    const getFilteredDevices = () => {
        if (!devices) return [];
        
        const flattenedDevices = Array.isArray(devices) ? devices : Object.values(devices).flat();
        
        if (!selectedGroup) return flattenedDevices;
        
        return flattenedDevices.filter(device => {
            if (groupBy === "category") {
                const category = customNames?.[device.ip]?.category || "Uncategorized";
                return category === selectedGroup;
            } else if (groupBy === "vendor") {
                const vendor = device.vendor || "Unknown";
                return vendor === selectedGroup;
            } else {
                const scanName = device.scanSource?.name || "Default Scan";
                return scanName === selectedGroup;
            }
        });
    };

    // Toggle subnet grouping
    const toggleSubnetGrouping = () => {
        if (Object.keys(subnetGroups).length > 0) {
            // Disable subnet grouping
            setSubnetGroups({});
        } else {
            // Enable subnet grouping
            const flattenedDevices = Array.isArray(devices) ? devices : Object.values(devices).flat();
            const subnets = groupDevicesBySubnet(flattenedDevices, customNames);
            setSubnetGroups(subnets);
        }
    };

    // Create Tooltip component
    const Tooltip = ({ visible, x, y, content }) => {
        if (!visible) return null;
        
        return (
            <div
                style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    background: 'rgba(55, 65, 81, 0.9)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    zIndex: 1000,
                    pointerEvents: 'none',
                    maxWidth: '300px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
            >
                {content}
            </div>
        );
    };    // Handle device click
    const handleDeviceClick = (device, event) => {
        // Check if this is a right-click (context menu)
        if (event && (event.button === 2 || event.ctrlKey)) {
            // Show context menu on right-click or ctrl+click
            // Ensure we have clientX and clientY values
            const clientX = event.clientX || 0;
            const clientY = event.clientY || 0;
            
            setContextMenu({
                visible: true,
                device,
                x: clientX,
                y: clientY
            });
        } else {
            // Direct open modal on regular click
            if (setModalDevice) {
                setModalDevice(device);
            }
        }
    };

    // Prepare filtered devices
    const filteredDevices = getFilteredDevices();    // Render appropriate view component based on visualization type
    const renderVisualization = () => {
        const viewProps = {
            devices: filteredDevices,
            vendorColors,
            customNames,
            setCustomNames, // Add setCustomNames to the props
            dimensions,
            groupBy,
            selectedGroup,
            groupColors,
            subnetGroups,
            onDeviceClick: handleDeviceClick,
            showTooltip,
            hideTooltip,
            refreshTrigger
        };

        switch (visualizationType) {
            case "hierarchical":
                return <HierarchicalNetworkView {...viewProps} />;
            case "circular":
            default:
                return <CircularNetworkView {...viewProps} />;
        }
    };

    return (
        <div className="relative w-full h-full overflow-hidden" 
             ref={containerRef}
             style={{ height: "100%" }}
        >
            {/* Grouping controls with dropdown */}
            <div className="absolute top-4 left-4 z-10 bg-gray-800 bg-opacity-80 p-2 rounded shadow-lg">
                <div className="flex flex-col gap-2">
                    <label className="mb-1 text-xs text-gray-300">Group By:</label>
                    <div className="flex gap-2">
                        <button
                            className={`px-2 py-1 text-xs rounded ${groupBy === "scan" ? "bg-blue-600 text-white" : "bg-gray-600 hover:bg-gray-500"}`}
                            onClick={() => setGroupBy("scan")}
                        >
                            Scan
                        </button>
                        <button
                            className={`px-2 py-1 text-xs rounded ${groupBy === "category" ? "bg-blue-600 text-white" : "bg-gray-600 hover:bg-gray-500"}`}
                            onClick={() => setGroupBy("category")}
                        >
                            Category
                        </button>
                        <button
                            className={`px-2 py-1 text-xs rounded ${groupBy === "vendor" ? "bg-blue-600 text-white" : "bg-gray-600 hover:bg-gray-500"}`}
                            onClick={() => setGroupBy("vendor")}
                        >
                            Vendor
                        </button>
                    </div>
                    
                    {(groupBy === "category" || groupBy === "vendor") && availableGroups.length > 0 && (
                        <div className="group-dropdown relative">
                            <div 
                                className="flex items-center justify-between bg-gray-700 rounded px-2 py-1 cursor-pointer hover:bg-gray-600 text-xs"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                            >
                                <div className="flex items-center">
                                    <FaFilter className="mr-1 text-gray-400" />
                                    <span>
                                        {selectedGroup ? 
                                            `Filter: ${selectedGroup}` : 
                                            `Filter by ${groupBy === "category" ? "category" : "vendor"}`}
                                    </span>
                                </div>
                                <FaChevronDown className={`transition-transform ml-1 ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            
                            {dropdownOpen && (
                                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto overflow-x-hidden bg-gray-700 rounded shadow-lg z-20 hide-scrollbar">
                                    <div 
                                        className="px-2 py-1 text-xs border-b border-gray-600 hover:bg-gray-600 cursor-pointer flex items-center"
                                        onClick={() => {
                                            setSelectedGroup(null);
                                            setDropdownOpen(false);
                                        }}
                                    >
                                        <span className="w-4 inline-block">
                                            {selectedGroup === null && <FaCheck size={10} />}
                                        </span>
                                        Show All
                                    </div>
                                    {availableGroups.map((group, index) => (
                                        <div 
                                            key={index} 
                                            className="px-2 py-1 text-xs hover:bg-gray-600 cursor-pointer flex items-center"
                                            onClick={() => {
                                                setSelectedGroup(group);
                                                setDropdownOpen(false);
                                            }}
                                            style={{
                                                color: groupColors[group.toLowerCase()] || 'inherit'
                                            }}
                                        >
                                            <span className="w-4 inline-block">
                                                {selectedGroup === group && <FaCheck size={10} />}
                                            </span>
                                            {group}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="mt-3 border-t border-gray-600 pt-3">
                        <label className="mb-1 text-xs text-gray-300">Visualization:</label>
                        <div className="flex gap-2">
                            <button
                                className={`flex-1 px-2 py-1 text-xs rounded flex items-center justify-center ${visualizationType === "circular" ? "bg-blue-600 text-white" : "bg-gray-600 hover:bg-gray-500"}`}
                                onClick={() => setVisualizationType("circular")}
                                title="Standard circular layout"
                            >
                                <FaCircle size={8} className="mr-1" /> Circular
                            </button>
                            <button
                                className={`flex-1 px-2 py-1 text-xs rounded flex items-center justify-center ${visualizationType === "hierarchical" ? "bg-blue-600 text-white" : "bg-gray-600 hover:bg-gray-500"}`}
                                onClick={() => setVisualizationType("hierarchical")}
                                title="Hierarchical tree layout"
                            >
                                <FaSitemap size={8} className="mr-1" /> Hierarchical
                            </button>
                        </div>
                    </div>
                    
                    {(visualizationType === "circular" || visualizationType === "hierarchical") && (
                        <div className="mt-3">
                            <button
                                className="w-full px-2 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500 flex items-center justify-center"
                                onClick={toggleSubnetGrouping}
                            >
                                <FaLayerIcon size={10} className="mr-1" /> 
                                {Object.keys(subnetGroups).length ? "Disable" : "Enable"} Subnet Grouping
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {selectedGroup && (
                <div 
                    className="absolute top-4 right-4 z-10 bg-gray-800 bg-opacity-80 px-3 py-1 rounded shadow-lg text-sm flex items-center"
                    style={{
                        borderLeft: `3px solid ${groupColors[selectedGroup.toLowerCase()] || '#9CA3AF'}`
                    }}
                >
                    <span>Filtering: </span>
                    <span 
                        className="ml-1 font-medium"
                        style={{
                            color: groupColors[selectedGroup.toLowerCase()] || 'inherit'
                        }}
                    >
                        {selectedGroup}
                    </span>
                    <button 
                        className="ml-2 text-gray-400 hover:text-white"
                        onClick={() => setSelectedGroup(null)}
                    >
                        <FaTimes size={12} />
                    </button>
                </div>
            )}
              {/* Main visualization container */}
            <div className="w-full h-full">
                {renderVisualization()}
            </div>
            
            {/* Network Legend - Collapsible component at the bottom left */}
            <NetworkLegend isVisible={true} />
            
            {/* Tooltip */}
            <Tooltip {...tooltip} />
            
            {/* Context Menu */}
            {contextMenu.visible && contextMenu.device && (
                <div 
                    className="context-menu absolute bg-gray-800 text-white p-4 rounded-lg shadow-lg border-blue-500 border-2 z-50"
                    style={{ 
                        top: '80px',
                        right: '20px',
                        maxWidth: '350px'
                    }}
                >
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold">Device Information</h3>
                        <button 
                            onClick={() => setContextMenu({...contextMenu, visible: false})}
                            className="text-gray-400 hover:text-white"
                        >
                            <FaTimes />
                        </button>
                    </div>
                    
                    <div className="space-y-2 text-sm hide-scrollbar max-h-[400px] overflow-y-auto">
                        <div>
                            <span className="font-semibold">IP:</span> {contextMenu.device.ip}
                        </div>
                        
                        {customNames?.[contextMenu.device.ip]?.name && (
                            <div>
                                <span className="font-semibold">Name:</span> {customNames[contextMenu.device.ip].name}
                            </div>
                        )}
                        
                        {contextMenu.device.macInfo?.available && (
                            <div>
                                <div className="flex items-center">
                                    <span className="font-semibold">MAC Address:</span>
                                </div>
                                <div className="ml-5 mt-1">
                                    <div>{contextMenu.device.macInfo.address}</div>
                                    {contextMenu.device.macInfo.vendor && (
                                        <div><span className="font-semibold">Vendor:</span> {contextMenu.device.macInfo.vendor}</div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {(!contextMenu.device.macInfo?.available && contextMenu.device.vendor) && (
                            <div>
                                <span className="font-semibold">Vendor:</span> {contextMenu.device.vendor}
                            </div>
                        )}
                        
                        {customNames?.[contextMenu.device.ip]?.category && (
                            <div>
                                <span className="font-semibold">Category:</span> {customNames[contextMenu.device.ip].category}
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 flex justify-end gap-2">
                        {isSSHAvailable(contextMenu.device) && (
                            <button
                                className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm flex items-center gap-1"
                                onClick={() => openSSHModal && openSSHModal(contextMenu.device)}
                            >
                                SSH Connect
                            </button>
                        )}
                        
                        <button
                            className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm"
                            onClick={() => {
                                if (setModalDevice) {
                                    setModalDevice(contextMenu.device);
                                }
                                setContextMenu({...contextMenu, visible: false});
                            }}
                        >
                            Edit
                        </button>
                    </div>
                </div>
            )}
        </div>    );
});

NetworkViewManager.displayName = 'NetworkViewManager';

export default NetworkViewManager;
