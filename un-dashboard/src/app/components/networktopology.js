import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import * as d3 from "d3";
import { FaNetworkWired, FaTerminal, FaTimes, FaStickyNote, FaChevronDown, FaFilter, FaCheck } from "react-icons/fa";
import { createRoot } from "react-dom/client";
import { iconMap } from './icons/iconMapping'; // Import the iconMap directly

export default function TopologyMap({ devices, vendorColors, customNames, openSSHModal, setModalDevice }) {
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

    // Handle container resize
    useLayoutEffect(() => {
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

    // Close context menu when clicking outside
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
        
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [contextMenu, dropdownOpen]);
    
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
                const vendor = device.vendor || "Unknown";
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
    }, [groupBy, JSON.stringify(devices), customNames]);
    
    useEffect(() => {
        if (!devices || Object.keys(devices).length === 0) return;
        if (!dimensions.width || !dimensions.height) return;

        const flattenedDevices = Array.isArray(devices) ? devices : Object.values(devices).flat();
        
        // Apply filtering if a group is selected
        let filteredDevices = flattenedDevices;
        if (selectedGroup) {
            filteredDevices = flattenedDevices.filter(device => {
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
        }

        // Use the container dimensions
        const width = dimensions.width;
        const height = dimensions.height;
        
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const zoomLayer = svg.append("g");

        // Enhanced zoom behavior with better interactivity
        const zoomBehavior = d3.zoom()
            .scaleExtent([0.2, 5]) // Allow more zoom levels (0.2x to 5x)
            .on("zoom", (event) => {
                zoomLayer.attr("transform", event.transform);
            });

        // Initialize with a slight zoom to show interactivity
        svg.call(zoomBehavior)
           // Make sure to enable pointer events on the SVG
           .style("pointer-events", "all")
           // Set up a double-click to reset zoom
           .on("dblclick.zoom", () => {
               svg.transition()
                  .duration(750)
                  .call(zoomBehavior.transform, d3.zoomIdentity);
           });
           
        // When filtering by a specific category or vendor, we want to show them as a single group
        // instead of maintaining the scan groups
        const useOverrideGrouping = selectedGroup && (groupBy === "category" || groupBy === "vendor");
        
        // Group devices based on groupBy setting
        const deviceGroups = {};
        
        filteredDevices.forEach(device => {
            let groupKey;
            let groupName;
            
            // When filtering is active for category or vendor, just place everything in a single group
            if (useOverrideGrouping) {
                groupKey = 'filtered';
                groupName = selectedGroup; // The name of category or vendor
            }
            else if (groupBy === "category") {
                // Get category from customNames or default to "Uncategorized"
                const category = customNames?.[device.ip]?.category || "Uncategorized";
                groupKey = category;
                groupName = category;
            } else if (groupBy === "vendor") {
                // Group by vendor, default to "Unknown"
                groupKey = device.vendor?.toLowerCase() || "unknown";
                groupName = device.vendor || "Unknown Vendor";
            } else {
                // Default grouping by scan source
                groupKey = device.scanSource?.id || 'default';
                groupName = device.scanSource?.name || `Scan Group`;
            }
            
            if (!deviceGroups[groupKey]) {
                deviceGroups[groupKey] = {
                    devices: [],
                    name: groupName
                };
            }
            
            deviceGroups[groupKey].devices.push(device);
        });

        const groupKeys = Object.keys(deviceGroups);
        const hasScanGroups = groupKeys.length > 1 && !useOverrideGrouping; // Don't use scan groups when filtering

        // Generate colors for each scan group
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(groupKeys);
        
        // Store the colors for use elsewhere in the component
        const newGroupColors = {};
        groupKeys.forEach(key => {
            newGroupColors[key] = colorScale(key);
        });
        setGroupColors(newGroupColors);

        // Create nodes with positioning based on groups
        let nodes = [];

        // Calculate optimal node size based on device counts with clear ranges
        const calculateNodeSize = (count) => {
            // Implement sizing ranges as requested in requirements
            if (count <= 48) return 22; // Small (1-48 devices)
            if (count <= 96) return 18; // Medium (49-96 devices)
            if (count <= 128) return 14; // Large (97-128 devices)
            if (count <= 256) return 10; // Extra large (129-256 devices)
            return 8; // Fallback for extremely large networks (>256)
        };
        
        // Determine minimum distance between nodes based on total count
        const calculateMinDistance = (count) => {
            if (count <= 48) return 60;
            if (count <= 96) return 45;
            if (count <= 128) return 35; 
            if (count <= 256) return 25;
            return 20;
        };

        if (hasScanGroups) {
            // Multiple scan groups - organize in clusters
            const numGroups = groupKeys.length;
            const centerX = width / 2;
            const centerY = height / 2;
            
            // Get the device counts for all groups to find proportions
            const deviceCounts = groupKeys.map(key => deviceGroups[key].devices.length);
            const totalDevices = deviceCounts.reduce((sum, count) => sum + count, 0);
            const maxDeviceCount = Math.max(...deviceCounts);
            
            // Calculate a better base radius based on total device count
            // Ensure groups have enough room between them
            const scaleFactor = totalDevices > 128 ? 0.8 : (totalDevices > 64 ? 0.7 : 0.6);
            const baseGroupRadius = Math.min(width, height) * scaleFactor; 
            
            groupKeys.forEach((groupKey, groupIndex) => {
                const group = deviceGroups[groupKey];
                const devices = group.devices;
                const deviceCount = devices.length;
                
                // Calculate position for this group
                const angle = (2 * Math.PI * groupIndex) / numGroups;
                
                // Adjust group distance based on relative size and total device count
                const groupDistanceMultiplier = 0.7 + (deviceCount / maxDeviceCount) * 0.3; 
                
                // Calculate group center position with better spacing
                const groupCenterX = centerX + baseGroupRadius * groupDistanceMultiplier * Math.cos(angle);
                const groupCenterY = centerY + baseGroupRadius * groupDistanceMultiplier * Math.sin(angle);
                
                // Calculate size for nodes in this group based on count ranges
                const nodeSize = calculateNodeSize(deviceCount);
                
                // Determine minimum radius for the group based on device count
                const minDistance = calculateMinDistance(deviceCount);
                const circumference = deviceCount * minDistance * 0.8; // Allow some overlap in groups
                const calculatedRadius = circumference / (2 * Math.PI);
                
                // Use at least this minimum radius for spacing, scaled by device count
                const groupInnerRadius = Math.max(
                    calculatedRadius,
                    Math.max(40, deviceCount * 3) // Baseline minimum
                );
                
                // Add label for group
                zoomLayer.append("text")
                    .attr("x", groupCenterX)
                    .attr("y", groupCenterY - groupInnerRadius - 15)
                    .attr("text-anchor", "middle")
                    .attr("fill", newGroupColors[groupKey])
                    .attr("font-size", "16px")
                    .attr("font-weight", "bold")
                    .text(`${group.name} (${deviceCount})`);
                
                // Position devices in a circle around the group center
                devices.forEach((device, deviceIndex) => {
                    const deviceAngle = (2 * Math.PI * deviceIndex) / devices.length;
                    const x = groupCenterX + groupInnerRadius * Math.cos(deviceAngle);
                    const y = groupCenterY + groupInnerRadius * Math.sin(deviceAngle);
                    
                    // Add node to the list
                    nodes.push({
                        ...device,
                        id: device.ip || `device-${groupIndex}-${deviceIndex}`,
                        x,
                        y,
                        group: groupKey,
                        groupColor: newGroupColors[groupKey],
                        size: nodeSize
                    });
                });
                
                // Add a subtle background circle for the group with sizing based on device count
                zoomLayer.append("circle")
                    .attr("cx", groupCenterX)
                    .attr("cy", groupCenterY)
                    .attr("r", groupInnerRadius + nodeSize + 10) // Scale the group background based on node size
                    .attr("fill", newGroupColors[groupKey])
                    .attr("opacity", 0.1)
                    .attr("stroke", newGroupColors[groupKey])
                    .attr("stroke-width", 1)
                    .attr("stroke-opacity", 0.3);
            });
        } else {
            // Single scan or no scan source info - use the original circular layout
            // In filtered mode, this will show only the filtered devices in a simple layout
            const allDevices = Object.values(deviceGroups).flatMap(group => group.devices);
            const deviceCount = allDevices.length;
            
            // Determine optimal spacing and sizing based on device count
            const nodeSize = calculateNodeSize(deviceCount);
            const minDistance = calculateMinDistance(deviceCount);
            
            // Calculate optimal radius based on device count and minimum distance
            // This ensures nodes don't overlap even with many devices
            const circumference = deviceCount * minDistance;
            const calculatedRadius = circumference / (2 * Math.PI);
            
            // Use the larger of calculated radius or default radius to ensure proper spacing
            const radius = Math.max(
                calculatedRadius,
                Math.min(width, height) / 2.5
            );
            
            nodes = allDevices.map((device, index) => {
                const angle = (2 * Math.PI * index) / allDevices.length;
                
                // If filtering by category/vendor, use that color for consistency
                let groupKey = 'default';
                let groupColor = '#6b7280';
                
                if (useOverrideGrouping) {
                    // If we're filtering by a specific category or vendor, use that as the group
                    groupKey = 'filtered';
                    groupColor = newGroupColors['filtered'];
                } else if (groupBy === "category" && customNames?.[device.ip]?.category) {
                    groupKey = customNames[device.ip].category;
                    groupColor = newGroupColors[groupKey];
                } else if (groupBy === "vendor" && device.vendor) {
                    groupKey = device.vendor.toLowerCase();
                    groupColor = newGroupColors[groupKey];
                }
                
                return {
                    ...device,
                    id: device.ip || `device-${index}`,
                    x: width / 2 + radius * Math.cos(angle),
                    y: height / 2 + radius * Math.sin(angle),
                    group: groupKey,
                    groupColor: groupColor,
                    size: nodeSize
                };
            });
            
            // If we're filtering, add a title to show what we're filtering by
            if (selectedGroup) {
                const groupColor = useOverrideGrouping ? newGroupColors['filtered'] : '#ffffff';
                
                // Add title for the filtered view
                zoomLayer.append("text")
                    .attr("x", width / 2)
                    .attr("y", 40)
                    .attr("text-anchor", "middle")
                    .attr("fill", groupColor)
                    .attr("font-size", "18px")
                    .attr("font-weight", "bold")
                    .text(`${selectedGroup} (${nodes.length} ${nodes.length === 1 ? 'device' : 'devices'})`);
            }
        }
        
        // Add nodes (circles) to the SVG
        const nodeGroup = zoomLayer
            .selectAll(".node-group")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "node-group")
            .attr("transform", d => `translate(${d.x}, ${d.y})`)
            .on("click", (event, d) => {
                event.stopPropagation();
                // Show context menu with device information
                setContextMenu({
                    visible: true,
                    device: d,
                    x: event.clientX,
                    y: event.clientY
                });
            })
            .on("contextmenu", (event, d) => {
                // Prevent the default context menu
                event.preventDefault();
                event.stopPropagation();
                
                // Open the device modal with this device data
                if (setModalDevice && typeof setModalDevice === 'function') {
                    // Merge any existing custom properties from customNames
                    const customProps = customNames?.[d.ip] || {};
                    
                    // Set the modal device with merged data
                    setModalDevice({
                        ...d,
                        ...customProps
                    });
                }
            });

        // Add background circles
        nodeGroup.append("circle")
            .attr("r", d => (d.size || 12) * 1.1)
            .attr("fill", "#000")
            .attr("opacity", 0.2);

        // Add main circles
        nodeGroup.append("circle")
            .attr("r", d => d.size || 12)
            .attr("fill", d => {
                // Use custom color from customNames if available
                if (customNames?.[d.ip]?.color) {
                    return customNames[d.ip].color;
                }
                // Otherwise use group color
                return d.groupColor || "#6b7280";
            })
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .attr("cursor", "pointer");

        // Add device IP as text
        nodeGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", d => (d.size || 12) + 12)
            .attr("fill", "white")
            .attr("font-size", "10px")
            .text(d => {
                // Use custom name from customNames if available
                if (customNames?.[d.ip]?.name) {
                    return customNames[d.ip].name;
                }
                // Otherwise show the IP
                return d.ip;
            })
            .attr("pointer-events", "none"); // Make text non-interactive to avoid capturing clicks

        // Add icons to devices
        nodeGroup.each(function(d) {
            const group = d3.select(this);
            const iconSize = ((d.size || 12) * 0.7);
            
            try {
                // Get icon from customNames or use default based on device vendor
                let iconComponent;
                
                if (customNames?.[d.ip]?.icon) {
                    // Use custom icon if specified
                    const iconName = customNames[d.ip].icon;
                    iconComponent = iconMap[iconName];
                } else {
                    // Use default icon based on vendor
                    const vendor = d.vendor?.toLowerCase() || '';
                    
                    if (vendor.includes('cisco')) {
                        iconComponent = iconMap.cisco;
                    } else if (vendor.includes('raspberry')) {
                        iconComponent = iconMap.raspberry;
                    } else if (vendor.includes('apple')) {
                        iconComponent = iconMap.apple;
                    } else if (vendor.includes('intel')) {
                        iconComponent = iconMap.intel;
                    } else if (vendor.includes('nvidia')) {
                        iconComponent = iconMap.nvidia;
                    } else if (vendor.includes('samsung')) {
                        iconComponent = iconMap.samsung;
                    } else {
                        // Default to network icon
                        iconComponent = iconMap.network;
                    }
                }
                
                if (iconComponent) {
                    const iconContainer = document.createElement('div');
                    iconContainer.style.position = 'absolute';
                    iconContainer.style.top = '0px';
                    iconContainer.style.left = '0px';
                    iconContainer.style.width = `${iconSize * 2}px`;
                    iconContainer.style.height = `${iconSize * 2}px`;
                    iconContainer.style.transform = `translate(-${iconSize}px, -${iconSize}px)`;
                    iconContainer.style.display = 'flex';
                    iconContainer.style.justifyContent = 'center';
                    iconContainer.style.alignItems = 'center';
                    iconContainer.style.pointerEvents = 'none'; // Make icon non-interactive
                    iconContainer.style.color = 'white';
                    
                    // Use React's createRoot to render the icon into the div
                    const root = createRoot(iconContainer);
                    root.render(React.createElement(iconComponent, { size: iconSize }));
                    
                    // Use D3's append function for foreign objects
                    group.append('foreignObject')
                        .attr('width', iconSize * 2)
                        .attr('height', iconSize * 2)
                        .attr('x', -iconSize)
                        .attr('y', -iconSize)
                        .node().appendChild(iconContainer);
                }
            } catch (error) {
                console.error('Error rendering icon:', error);
                // Fallback: add a simple text label
                group.append("text")
                    .attr("text-anchor", "middle")
                    .attr("dy", "0.3em")
                    .attr("fill", "white")
                    .attr("font-size", "10px")
                    .attr("pointer-events", "none")
                    .text("?");
            }
        });

    }, [JSON.stringify(devices), vendorColors, customNames, groupBy, selectedGroup, dimensions]);

    // Helper functions
    const isSSHAvailable = (device) => {
        if (!device || !device.ports) return false;
        
        // Check if there's any port entry that contains port 22 (SSH)
        const ports = Array.isArray(device.ports) ? device.ports : [];
        return ports.some(port => port.includes('22/tcp') && port.includes('open'));
    };

    const formatPorts = (ports) => {
        if (!ports || !Array.isArray(ports) || ports.length === 0) return 'No ports';
        
        // Format port information for display
        return ports.map(port => {
            // Clean up port format (e.g., "22/tcp open ssh" -> "22 (SSH)")
            const match = port.match(/(\d+)\/tcp\s+(open|closed|filtered)\s*(.*)?/i);
            if (match) {
                const [_, portNumber, state, service] = match;
                return `${portNumber}${service ? ` (${service})` : ''} - ${state}`;
            }
            return port; // Return original if no match
        }).join(', ');
    };

    return (
        <div className="relative w-full h-full overflow-hidden" ref={containerRef}>
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
                    
                    {/* Dropdown for filtering by specific group */}
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
                </div>
            </div>
            
            {/* Selected filter indicator */}
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
            
            <svg 
                ref={svgRef} 
                width={dimensions.width} 
                height={dimensions.height} 
                className="select-none cursor-move"
                style={{ display: 'block' }}  /* Ensures no extra spacing */
            />
            
            {/* Context Menu - Fixed in the top-right corner */}
            {contextMenu.visible && contextMenu.device && (
                <div 
                    className="context-menu absolute bg-gray-800 text-white p-4 rounded-lg shadow-lg border-blue-500 border-2 z-50"
                    style={{ 
                        top: '80px',  // Fixed distance from top
                        right: '20px', // Fixed distance from right
                        maxWidth: '300px'
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
                    
                    <div className="space-y-2 text-sm hide-scrollbar">
                        <div>
                            <span className="font-semibold">IP:</span> {contextMenu.device.ip}
                        </div>
                        {customNames?.[contextMenu.device.ip]?.name && (
                            <div>
                                <span className="font-semibold">Name:</span> {customNames[contextMenu.device.ip].name}
                            </div>
                        )}
                        {contextMenu.device.vendor && (
                            <div>
                                <span className="font-semibold">Vendor:</span> {contextMenu.device.vendor}
                            </div>
                        )}
                        {contextMenu.device.mac && (
                            <div>
                                <span className="font-semibold">MAC:</span> {contextMenu.device.mac}
                            </div>
                        )}
                        {contextMenu.device.status && (
                            <div>
                                <span className="font-semibold">Status:</span> {contextMenu.device.status}
                            </div>
                        )}
                        {contextMenu.device.ports && contextMenu.device.ports.length > 0 && (
                            <div>
                                <span className="font-semibold">Ports:</span> 
                                <div className="mt-1 ml-2 text-xs max-h-28 overflow-y-auto">
                                    {formatPorts(contextMenu.device.ports)}
                                </div>
                            </div>
                        )}
                        {customNames?.[contextMenu.device.ip]?.category && (
                            <div>
                                <span className="font-semibold">Category:</span> {customNames[contextMenu.device.ip].category}
                            </div>
                        )}
                        {customNames?.[contextMenu.device.ip]?.notes && (
                            <div>
                                <span className="font-semibold">Notes:</span>
                                <div className="mt-1 ml-2 text-xs max-h-24 overflow-y-auto">
                                    {customNames[contextMenu.device.ip].notes}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 flex justify-end gap-2">
                        {isSSHAvailable(contextMenu.device) && (
                            <button
                                className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm flex items-center gap-1"
                                onClick={() => {
                                    // Pass the device to the parent's openSSHModal function
                                    if (openSSHModal && typeof openSSHModal === 'function') {
                                        openSSHModal(contextMenu.device);
                                        // Close the context menu after clicking
                                        setContextMenu({...contextMenu, visible: false});
                                    } else {
                                        console.warn("SSH functionality not available");
                                    }
                                }}
                            >
                                <FaTerminal /> SSH Connect
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}