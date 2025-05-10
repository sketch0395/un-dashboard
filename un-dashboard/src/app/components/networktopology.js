import React, { useEffect, useRef, useState, useLayoutEffect, forwardRef, useImperativeHandle } from "react";
import * as d3 from "d3";
import { FaNetworkWired, FaTerminal, FaTimes, FaStickyNote, FaChevronDown, FaFilter, FaCheck, 
         FaSitemap, FaCircle, FaLayerGroup, FaDesktop, FaAddressCard } from "react-icons/fa";
import { FaLayerGroup as FaLayerIcon } from "react-icons/fa6"; 
import { GiEarthAmerica } from "react-icons/gi";
import { MdTimeline } from "react-icons/md";
import { createRoot } from "react-dom/client";
import { iconMap } from './icons/iconMapping'; // Import the iconMap directly
import { getMacInfo, getOSInfo } from "../utils/sshScanUtils"; // Import utility functions for MAC and OS info

// This is a utility function to process device data to ensure MAC and vendor info is available
const processDeviceData = (device) => {
    if (!device) return device;
    
    const processedDevice = { ...device };
    
    // If macInfo is not present but mac address is available, create a macInfo object
    if (!processedDevice.macInfo && processedDevice.mac) {
        processedDevice.macInfo = {
            available: true,
            address: processedDevice.mac,
            vendor: processedDevice.vendor || ''
        };
    }
    
    // If vendor is not available directly but is in macInfo, add it to the device directly
    if (!processedDevice.vendor && processedDevice.macInfo && processedDevice.macInfo.vendor) {
        processedDevice.vendor = processedDevice.macInfo.vendor;
    }
    
    // Ensure MAC address is available in direct property for backward compatibility
    if (!processedDevice.mac && processedDevice.macInfo && processedDevice.macInfo.address) {
        processedDevice.mac = processedDevice.macInfo.address;
    }
    
    return processedDevice;
};

// Wrap component with forwardRef to expose refresh method
const TopologyMap = forwardRef(({ devices, vendorColors, customNames, openSSHModal, setModalDevice }, ref) => {
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
    
    // Expose the refresh method via ref
    useImperativeHandle(ref, () => ({
        refresh: () => {
            console.log("Topology refresh triggered by save");
            // Increment the refreshTrigger to force re-render
            setRefreshTrigger(prev => prev + 1);
        }
    }));

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
                // Use enhanced vendor information if available
                const macInfo = getMacInfo(device);
                const vendor = macInfo?.available && macInfo?.vendor ? macInfo.vendor : (device.vendor || "Unknown");
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
    
    useEffect(() => {
        if (!devices || Object.keys(devices).length === 0) return;
        if (!dimensions.width || !dimensions.height) return;

        console.log("Re-rendering topology with visualizationType:", visualizationType);
        
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
           
        // Choose the appropriate visualization type
        switch (visualizationType) {
            case "hierarchical":
                renderHierarchicalView(svg, zoomLayer, filteredDevices, width, height);
                break;
            case "timeline":
                renderTimelineView(svg, zoomLayer, filteredDevices, width, height);
                break;
            case "circular":
            default:
                renderCircularView(svg, zoomLayer, filteredDevices, width, height);
                break;
        }

    }, [devices, vendorColors, customNames, groupBy, selectedGroup, dimensions, refreshTrigger, visualizationType, subnetGroups]);

    // Helper functions
    const isSSHAvailable = (device) => {
        if (!device || !device.ports) return false;
        
        // Check if there's any port entry that contains port 22 (SSH)
        const ports = Array.isArray(device.ports) ? device.ports : [];
        return ports.some(port => port.includes('22/tcp') && port.includes('open'));
    };

    // Group devices by subnet (extract subnet from IP)
    const groupDevicesBySubnet = (devices) => {
        const subnets = {};
        
        // Helper to extract subnet from IP
        const getSubnet = (ip) => {
            if (!ip) return "Unknown";
            // Extract the first three octets to get the /24 subnet
            const match = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
            return match ? `${match[1]}.0/24` : "Unknown";
        };
        
        // Group devices by subnet
        devices.forEach(device => {
            const subnet = getSubnet(device.ip);
            
            if (!subnets[subnet]) {
                subnets[subnet] = {
                    name: subnet,
                    devices: []
                };
            }
            
            subnets[subnet].devices.push(device);
        });
        
        return subnets;
    };

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

    // Render the default circular view
    const renderCircularView = (svg, zoomLayer, filteredDevices, width, height) => {
        // When filtering by a specific category or vendor, we want to show them as a single group
        // instead of maintaining the scan groups
        const useOverrideGrouping = selectedGroup && (groupBy === "category" || groupBy === "vendor");
        
        // Group devices based on groupBy setting
        const deviceGroups = {};
        
        // If subnet grouping is enabled, use that instead of the regular grouping
        if (Object.keys(subnetGroups).length > 0) {
            // Use subnet-based groups
            Object.entries(subnetGroups).forEach(([subnet, group]) => {
                // Filter devices to only include those in the filtered set
                const subnetDevices = group.devices.filter(device => 
                    filteredDevices.some(fd => fd.ip === device.ip)
                );
                
                if (subnetDevices.length > 0) {
                    deviceGroups[subnet] = {
                        devices: subnetDevices,
                        name: group.name
                    };
                }
            });
        } else {
            // Use regular grouping (by scan, category or vendor)
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
        }

        const groupKeys = Object.keys(deviceGroups);
        const hasScanGroups = groupKeys.length > 1 && !useOverrideGrouping; // Don't use scan groups when filtering

        // Generate colors for each scan group
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(groupKeys);
        
        // Create a new local colors object rather than updating state in render function
        const newGroupColors = {};
        groupKeys.forEach(key => {
            newGroupColors[key] = colorScale(key);
        });
        // Remove setGroupColors call that causes re-renders
        // setGroupColors(newGroupColors);

        // Create nodes with positioning based on groups
        let nodes = [];

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
        
        // Draw device nodes
        renderDeviceNodes(zoomLayer, nodes);
    };

    // Render hierarchical tree visualization
    const renderHierarchicalView = (svg, zoomLayer, filteredDevices, width, height) => {
        // Title at the top
        zoomLayer.append("text")
            .attr("x", width / 2)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .attr("fill", "#FFFFFF")
            .attr("font-size", "20px")
            .attr("font-weight", "bold")
            .text("Hierarchical Network Topology");
        
        // When using subnet grouping, we create a different hierarchical structure
        const useSubnetGrouping = Object.keys(subnetGroups).length > 0;
        
        // Create hierarchical data structure for D3 tree layout
        const createHierarchy = () => {
            // Root node of the hierarchy
            const root = {
                name: "Network",
                children: []
            };
            
            if (useSubnetGrouping) {
                // Group by subnets first
                Object.entries(subnetGroups).forEach(([subnet, group]) => {
                    // Filter to include only devices that are in the filtered set
                    const subnetDevices = group.devices.filter(device => 
                        filteredDevices.some(fd => fd.ip === device.ip)
                    );
                    
                    if (subnetDevices.length > 0) {
                        const subnetNode = {
                            name: subnet,
                            type: "subnet",
                            children: []
                        };
                        
                        // Further group by category if available
                        const devicesByCategory = {};
                        subnetDevices.forEach(device => {
                            const category = customNames?.[device.ip]?.category || "Uncategorized";
                            if (!devicesByCategory[category]) {
                                devicesByCategory[category] = [];
                            }
                            devicesByCategory[category].push(device);
                        });
                        
                        // Add category nodes
                        Object.entries(devicesByCategory).forEach(([category, devices]) => {
                            const categoryNode = {
                                name: category,
                                type: "category",
                                children: devices.map(device => ({
                                    ...device,
                                    name: customNames?.[device.ip]?.name || device.ip,
                                    type: "device",
                                }))
                            };
                            subnetNode.children.push(categoryNode);
                        });
                        
                        root.children.push(subnetNode);
                    }
                });
            } else {
                // Create hierarchy based on categories or vendors
                const groupKey = groupBy === "vendor" ? "vendor" : "category";
                const deviceGroups = {};
                
                filteredDevices.forEach(device => {
                    let groupValue;
                    
                    if (groupKey === "category") {
                        groupValue = customNames?.[device.ip]?.category || "Uncategorized";
                    } else {
                        groupValue = device.vendor || "Unknown";
                    }
                    
                    if (!deviceGroups[groupValue]) {
                        deviceGroups[groupValue] = [];
                    }
                    
                    deviceGroups[groupValue].push(device);
                });
                
                // Add groups to the hierarchy
                Object.entries(deviceGroups).forEach(([groupValue, devices]) => {
                    const groupNode = {
                        name: groupValue,
                        type: groupKey,
                        children: devices.map(device => ({
                            ...device,
                            name: customNames?.[device.ip]?.name || device.ip,
                            type: "device",
                        }))
                    };
                    
                    root.children.push(groupNode);
                });
            }
            
            return d3.hierarchy(root);
        };
        
        const hierarchyRoot = createHierarchy();
        
        // Calculate the tree layout - HORIZONTAL layout
        // Swap width and height for horizontal layout
        const treeLayout = d3.tree()
            .size([height - 100, width - 200]); // Swap dimensions for horizontal layout
        
        // Apply the layout to the hierarchy
        const treeData = treeLayout(hierarchyRoot);
        
        // Add connecting links - use vertical link for horizontal tree
        zoomLayer.append("g")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", 1.5)
            .selectAll("path")
            .data(treeData.links())
            .join("path")
            .attr("d", d3.linkHorizontal()
                .x(d => d.y) // No offset needed
                .y(d => d.x)  // Swap x and y for horizontal layout
            );
        
        // Create node groups - Position for horizontal layout
        const nodeGroups = zoomLayer.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(treeData.descendants())
            .join("g")
            .attr("transform", d => `translate(${d.y},${d.x})`); // Swap x and y for horizontal layout
        
        // Add different styling based on node type
        nodeGroups.each(function(d) {
            const node = d3.select(this);
            
            // Different styling based on node depth and type
            if (d.depth === 0) {
                // Root node (Network) - position at left side for horizontal layout
                node.append("circle")
                    .attr("r", 25)
                    .attr("fill", "#1d4ed8")
                    .attr("stroke", "white")
                    .attr("stroke-width", 2);
                    
                // Add network icon
                const iconContainer = document.createElement('div');
                iconContainer.style.position = 'absolute';
                iconContainer.style.top = '50%';
                iconContainer.style.left = '50%';
                iconContainer.style.width = '40px';
                iconContainer.style.height = '40px';
                iconContainer.style.transform = 'translate(-50%, -50%)';
                iconContainer.style.display = 'flex';
                iconContainer.style.justifyContent = 'center';
                iconContainer.style.alignItems = 'center';
                iconContainer.style.pointerEvents = 'none';
                iconContainer.style.color = 'white';
                
                const root = createRoot(iconContainer);
                root.render(React.createElement(iconMap.network, { size: 20 }));
                
                // Use D3's append function for foreign objects
                node.append('foreignObject')
                    .attr('width', 40)
                    .attr('height', 40)
                    .attr('x', -20)
                    .attr('y', -20)
                    .node().appendChild(iconContainer);
            } 
            else if (d.data.type === "device") {
                // Device nodes
                const nodeSize = 18;
                
                // Add circle for devices with higher z-index
                const deviceCircle = node.append("circle")
                    .attr("r", nodeSize)
                    .attr("fill", d => {
                        // Use custom color if available
                        if (customNames?.[d.data.ip]?.color) {
                            return customNames[d.data.ip].color;
                        }
                        // Default colors based on vendor or category
                        if (d.data.vendor?.toLowerCase().includes('cisco')) return "#00BCEB"; 
                        if (d.data.vendor?.toLowerCase().includes('apple')) return "#A2AAAD"; 
                        return "#6366f1"; // Default purple
                    })
                    .attr("stroke", "white")
                    .attr("stroke-width", 1.5)
                    .attr("cursor", "pointer");
                
                // Add event handlers to the circle (both left and right click)
                deviceCircle
                    .on("click", (event, d) => {
                        event.stopPropagation();
                        setContextMenu({
                            visible: true,
                            device: d.data,
                            x: event.clientX,
                            y: event.clientY
                        });
                    })
                    .on("contextmenu", (event, d) => {
                        // Prevent default context menu
                        event.preventDefault();
                        event.stopPropagation();
                          console.log("Right click on device:", d.data.ip || d.data.name);
                        
                        // Open the device modal with this device data
                        if (setModalDevice && typeof setModalDevice === 'function') {
                            // Merge any existing custom properties from customNames
                            const customProps = customNames?.[d.data.ip] || {};
                            
                            // Process the device to ensure MAC and vendor info is available
                            const deviceWithMacInfo = processDeviceData(d.data);
                            
                            // Set the modal device with merged data
                            setModalDevice({
                                ...deviceWithMacInfo,
                                ...customProps
                            });
                        }
                    });
                
                // Add icon for the device
                try {
                    // Determine which icon to use
                    let iconComponent;
                    
                    if (customNames?.[d.data.ip]?.icon) {
                        // Use custom icon if specified
                        const iconName = customNames[d.data.ip].icon;
                        iconComponent = iconMap[iconName];
                    } else {
                        // Use default icon based on vendor
                        const vendor = d.data.vendor?.toLowerCase() || '';
                        
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
                        iconContainer.style.top = '50%';
                        iconContainer.style.left = '50%';
                        iconContainer.style.width = `${nodeSize * 2}px`;
                        iconContainer.style.height = `${nodeSize * 2}px`;
                        iconContainer.style.transform = 'translate(-50%, -50%)';
                        iconContainer.style.display = 'flex';
                        iconContainer.style.justifyContent = 'center';
                        iconContainer.style.alignItems = 'center';
                        iconContainer.style.pointerEvents = 'none'; // Make icon absolutely non-interactive
                        
                        const root = createRoot(iconContainer);
                        root.render(React.createElement(iconComponent, { size: nodeSize }));
                        
                        // Use D3's append function for foreign objects with pointer-events disabled
                        const foreignObject = node.append('foreignObject')
                            .attr('width', nodeSize * 2)
                            .attr('height', nodeSize * 2)
                            .attr('x', -nodeSize)
                            .attr('y', -nodeSize)
                            .style('pointer-events', 'none'); // Critical: disable pointer events on the foreignObject too
                            
                        foreignObject.node().appendChild(iconContainer);
                    }
                } catch (error) {
                    console.error("Error rendering device icon:", error);
                }
            } 
            else if (d.data.type === "subnet") {
                // Subnet group nodes
                node.append("rect")
                    .attr("width", 50)
                    .attr("height", 30)
                    .attr("x", -25)
                    .attr("y", -15)
                    .attr("rx", 5)
                    .attr("ry", 5)
                    .attr("fill", "#2563eb")
                    .attr("stroke", "white")
                    .attr("stroke-width", 1);
            } 
            else if (d.data.type === "category") {
                // Category group nodes
                node.append("rect")
                    .attr("width", 50)
                    .attr("height", 30)
                    .attr("x", -25)
                    .attr("y", -15)
                    .attr("rx", 5)
                    .attr("ry", 5)
                    .attr("fill", "#059669")
                    .attr("stroke", "white")
                    .attr("stroke-width", 1);
            } 
            else {
                // Other group nodes (vendor, etc.)
                node.append("rect")
                    .attr("width", 50)
                    .attr("height", 30)
                    .attr("x", -25)
                    .attr("y", -15)
                    .attr("rx", 5)
                    .attr("ry", 5)
                    .attr("fill", "#7c3aed")
                    .attr("stroke", "white")
                    .attr("stroke-width", 1);
            }
            
            // Add labels - adjust for horizontal layout
            node.append("text")
                .attr("dy", 30) // Position labels below nodes for horizontal layout
                .attr("text-anchor", "middle")
                .attr("fill", "white")
                .attr("font-size", d => d.depth === 0 ? "16px" : "12px")
                .text(d => {
                    if (d.data.type === "device") {
                        // For devices, show name or IP
                        return d.data.name;
                    } else {
                        // For other nodes, show the node name
                        return d.data.name;
                    }
                });
            
            // Add child count for non-device nodes that have children
            if (d.data.type !== "device" && d.children) {
                node.append("text")
                    .attr("dy", -20) // Position count above nodes for horizontal layout
                    .attr("text-anchor", "middle")
                    .attr("fill", "white")
                    .attr("font-size", "10px")
                    .text(`${d.children.length} ${d.children.length === 1 ? 'item' : 'items'}`);
            }
        });
        
        // Position the entire tree with some padding
        zoomLayer.attr("transform", "translate(100, 60)");
    };

    // Render Geographic Map View
    const renderGeographicView = (svg, zoomLayer, filteredDevices, width, height) => {
        // Title at the top
        zoomLayer.append("text")
            .attr("x", width / 2)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .attr("fill", "#FFFFFF")
            .attr("font-size", "20px")
            .attr("font-weight", "bold")
            .text("Geographic Network Topology");
        
        // World map features - simplified world map outline
        const projection = d3.geoMercator()
            .scale((width + 1) / 2 / Math.PI)
            .translate([width / 2, height / 2])
            .center([0, 20]);
            
        // Create a path generator
        const pathGenerator = d3.geoPath().projection(projection);

        // Add world map outline
        zoomLayer.append("path")
            .attr("d", "M53.4,109.4c-0.8-0.9-1.8-1.6-2.8-2.2c-0.2-0.1-0.4,0-0.6,0.1c-0.5,0.3-1.1,0.6-1.6,0.9 c-0.3,0.2-0.7,0.1-1-0.1c-1-0.9-2-1.8-3-2.7c-0.3-0.3-0.7-0.3-1-0.1c-0.6,0.3-1.1,0.7-1.7,1c-0.3,0.2-0.7,0.1-1-0.1 c-0.4-0.4-0.8-0.8-1.2-1.2c-0.3-0.3-0.6-0.4-1-0.3c-0.6,0.2-1.1,0.4-1.7,0.6c-0.4,0.1-0.8,0-1.1-0.3c-0.5-0.6-1.1-1.2-1.6-1.8 c-0.3-0.3-0.6-0.4-1-0.3c-0.6,0.2-1.2,0.4-1.8,0.6c-0.3,0.1-0.7,0-1-0.2c-0.6-0.6-1.3-1.1-1.9-1.7c-0.3-0.3-0.6-0.3-1-0.1 c-0.5,0.2-1,0.5-1.5,0.7c-0.3,0.2-0.7,0.1-1-0.1c-0.6-0.6-1.3-1.1-1.9-1.7c-0.3-0.2-0.6-0.3-0.9-0.1c-0.6,0.3-1.2,0.5-1.9,0.8 c-0.3,0.1-0.7,0-1-0.2c-0.6-0.6-1.2-1.2-1.9-1.8c-0.3-0.3-0.6-0.3-1-0.1c-0.5,0.2-1,0.4-1.5,0.7c-0.3,0.2-0.7,0.1-1-0.1 c-0.9-0.8-1.8-1.6-2.6-2.4c-0.3-0.2-0.6-0.3-0.9-0.1c-0.6,0.3-1.1,0.5-1.7,0.8c-0.3,0.1-0.7,0.1-1-0.1c-0.7-0.6-1.4-1.3-2.1-1.9 c-0.3-0.3-0.6-0.3-1-0.1c-0.5,0.2-1,0.4-1.5,0.6c-0.3,0.1-0.7,0.1-1-0.2c-0.6-0.6-1.3-1.2-1.9-1.8c-0.3-0.3-0.6-0.3-0.9-0.1 c-0.6,0.2-1.1,0.5-1.7,0.7c-0.4,0.1-0.7,0-1-0.2c-0.5-0.6-1.1-1.1-1.6-1.6c-0.3-0.3-0.7-0.3-1-0.1c-0.4,0.3-0.9,0.5-1.3,0.8 c-0.3,0.2-0.6,0.1-0.9-0.1c-0.2-0.2-0.4-0.5-0.6-0.7c-0.5-0.5-1-0.9-1.5-1.4c-0.3-0.2-0.6-0.3-0.9-0.1c-0.3,0.2-0.6,0.3-0.9,0.5")
            .attr("fill", "none")
            .attr("stroke", "#3b82f6")
            .attr("stroke-opacity", 0.3)
            .attr("stroke-width", 0.5);

        // Add a simplified world map outline for visual context
        zoomLayer.append("rect")
            .attr("x", width * 0.1)
            .attr("y", height * 0.15)
            .attr("width", width * 0.8)
            .attr("height", height * 0.7)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", "transparent")
            .attr("stroke", "#3b82f6")
            .attr("stroke-opacity", 0.3)
            .attr("stroke-width", 1);
            
        // Draw continents as simplified shapes
        const continents = [
            { name: "North America", path: "M150,120 L250,120 L290,200 L200,250 L120,210 Z", color: "#3b82f6" },
            { name: "South America", path: "M220,250 L250,350 L200,400 L170,320 Z", color: "#8b5cf6" },
            { name: "Europe", path: "M350,120 L420,120 L430,170 L380,190 L350,150 Z", color: "#ec4899" },
            { name: "Africa", path: "M350,200 L450,200 L430,350 L350,320 L320,250 Z", color: "#f59e0b" },
            { name: "Asia", path: "M430,120 L600,150 L580,300 L430,250 L420,170 Z", color: "#10b981" },
            { name: "Oceania", path: "M550,320 L650,320 L630,380 L550,380 Z", color: "#6366f1" }
        ];
        
        // Draw continents
        continents.forEach(continent => {
            zoomLayer.append("path")
                .attr("d", continent.path)
                .attr("fill", continent.color)
                .attr("fill-opacity", 0.15)
                .attr("stroke", continent.color)
                .attr("stroke-opacity", 0.5)
                .attr("stroke-width", 1);
                
            // Add continent labels
            const centroid = getBoundingBoxCenter(continent.path);
            zoomLayer.append("text")
                .attr("x", centroid.x)
                .attr("y", centroid.y)
                .attr("text-anchor", "middle")
                .attr("fill", "white")
                .attr("font-size", "12px")
                .attr("opacity", 0.8)
                .text(continent.name);
        });
        
        // Group devices by region - using some simple logic to assign regions
        const devicesByRegion = {};
        
        // Assign mock geo locations based on IP ranges or set locations
        filteredDevices.forEach(device => {
            let region = "Unknown";
            // In a real implementation, this would use actual geo-location data
            // Here we're just doing a simple simulation based on the first octet of IP
            
            const ip = device.ip || "";
            const firstOctet = parseInt(ip.split('.')[0]);
            
            // Simple mock geo-assignment
            if (firstOctet < 100) region = "North America";
            else if (firstOctet < 130) region = "South America";
            else if (firstOctet < 160) region = "Europe";
            else if (firstOctet < 190) region = "Africa";
            else if (firstOctet < 220) region = "Asia";
            else region = "Oceania";
            
            // Use custom location if available
            if (customNames?.[device.ip]?.location) {
                region = customNames[device.ip].location;
            }
            
            if (!devicesByRegion[region]) {
                devicesByRegion[region] = [];
            }
            
            devicesByRegion[region].push(device);
        });
        
        // Coordinates for each region (center points)
        const regionCoordinates = {
            "North America": { x: 200, y: 180 },
            "South America": { x: 210, y: 320 },
            "Europe": { x: 380, y: 150 },
            "Africa": { x: 380, y: 270 },
            "Asia": { x: 500, y: 200 },
            "Oceania": { x: 600, y: 350 },
            "Unknown": { x: width / 2, y: height / 2 }
        };
        
        // Create nodes for each region
        const nodes = [];
        Object.entries(devicesByRegion).forEach(([region, devices]) => {
            const baseCoords = regionCoordinates[region];
            
            if (devices.length === 1) {
                // Single device, place at region center
                const device = devices[0];
                nodes.push({
                    ...device,
                    id: device.ip || `device-${region}-0`,
                    x: baseCoords.x,
                    y: baseCoords.y,
                    size: 18,
                    groupColor: getRegionColor(region)
                });
            } else {
                // Multiple devices, arrange in a circle
                const radius = Math.min(30 + devices.length * 5, 80);
                const nodeSize = calculateNodeSize(devices.length);
                
                devices.forEach((device, index) => {
                    const angle = (2 * Math.PI * index) / devices.length;
                    const x = baseCoords.x + radius * Math.cos(angle);
                    const y = baseCoords.y + radius * Math.sin(angle);
                    
                    nodes.push({
                        ...device,
                        id: device.ip || `device-${region}-${index}`,
                        x,
                        y,
                        size: nodeSize,
                        groupColor: getRegionColor(region)
                    });
                });
                
                // Add a label for the region
                zoomLayer.append("text")
                    .attr("x", baseCoords.x)
                    .attr("y", baseCoords.y - radius - 15)
                    .attr("text-anchor", "middle")
                    .attr("fill", "white")
                    .attr("font-size", "14px")
                    .attr("font-weight", "bold")
                    .text(`${region} (${devices.length})`);
                
                // Add a subtle background circle
                zoomLayer.append("circle")
                    .attr("cx", baseCoords.x)
                    .attr("cy", baseCoords.y)
                    .attr("r", radius + nodeSize)
                    .attr("fill", getRegionColor(region))
                    .attr("opacity", 0.1)
                    .attr("stroke", getRegionColor(region))
                    .attr("stroke-width", 1)
                    .attr("stroke-opacity", 0.3);
            }
        });
        
        // Draw device nodes
        renderDeviceNodes(zoomLayer, nodes);
    };
    
    // Helper function to get region color
    const getRegionColor = (region) => {
        const regionColors = {
            "North America": "#3b82f6",
            "South America": "#8b5cf6",
            "Europe": "#ec4899",
            "Africa": "#f59e0b",
            "Asia": "#10b981",
            "Oceania": "#6366f1",
            "Unknown": "#6b7280"
        };
        return regionColors[region] || "#6b7280";
    };
    
    // Helper function to estimate the center of an SVG path
    const getBoundingBoxCenter = (path) => {
        // This is a simplified approach - in a real app, you would compute the actual centroid
        const matches = path.match(/\d+/g);
        if (!matches) return { x: 0, y: 0 };
        
        // Extract all numbers and compute an average
        const numbers = matches.map(Number);
        let sumX = 0, sumY = 0, count = 0;
        
        for (let i = 0; i < numbers.length; i += 2) {
            if (i + 1 < numbers.length) {
                sumX += numbers[i];
                sumY += numbers[i + 1];
                count++;
            }
        }
        
        return {
            x: sumX / count,
            y: sumY / count
        };
    };

    // Render device nodes - shared between all visualization types
    const renderDeviceNodes = (zoomLayer, nodes) => {
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
                // Enhance device with MAC and OS information before showing context menu
                const enhancedDevice = enhanceDeviceInfo(d);
                // Show context menu with enhanced device information
                setContextMenu({
                    visible: true,
                    device: enhancedDevice,
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
                    // Enhance device with MAC and OS information
                    const enhancedDevice = enhanceDeviceInfo(d);
                    // Merge any existing custom properties from customNames
                    const customProps = customNames?.[d.ip] || {};
                    
                    // Set the modal device with merged data
                    setModalDevice({
                        ...enhancedDevice,
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

        // Add device IP/name as text below node
        nodeGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", d => (d.size || 12) + 12)
            .attr("fill", "white")
            .attr("font-size", "10px")
            .text(d => {
                // Use custom name from customNames if available, otherwise show IP
                if (customNames?.[d.ip]?.name) {
                    return customNames[d.ip].name;
                }
                // If no custom name, show the IP
                return d.ip;
            })
            .attr("pointer-events", "none"); // Make text non-interactive to avoid capturing clicks

        // Add icons to devices
        nodeGroup.each(function(d) {
            const group = d3.select(this);
            // Increase icon size - using 1.2x the previous size
            const iconSize = ((d.size || 12) * 1.2);
            
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
                    // Create a centered container for the icon
                    const iconContainer = document.createElement('div');
                    iconContainer.style.position = 'absolute';
                    iconContainer.style.top = '50%';
                    iconContainer.style.left = '50%';
                    iconContainer.style.width = `${iconSize * 2}px`;
                    iconContainer.style.height = `${iconSize * 2}px`;
                    iconContainer.style.transform = 'translate(-50%, -50%)';
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
    };

    // Render Timeline View to show network changes over time
    const renderTimelineView = (svg, zoomLayer, filteredDevices, width, height) => {
        // Title at the top
        zoomLayer.append("text")
            .attr("x", width / 2)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .attr("fill", "#FFFFFF")
            .attr("font-size", "20px")
            .attr("font-weight", "bold")
            .text("Network Timeline Visualization");
        
        // Group devices by their scan source (timestamp)
        const devicesByTime = {};
        const timePoints = new Set();
        
        // Extract time data from devices
        filteredDevices.forEach(device => {
            let timeKey = "Unknown";
            let timestamp = null;
            
            if (device.scanSource?.timestamp) {
                timestamp = new Date(device.scanSource.timestamp);
                timeKey = timestamp.toISOString();
                timePoints.add(timeKey);
            }
            
            if (!devicesByTime[timeKey]) {
                devicesByTime[timeKey] = {
                    devices: [],
                    timestamp: timestamp,
                    name: device.scanSource?.name || "Unknown Scan"
                };
            }
            
            devicesByTime[timeKey].devices.push(device);
        });
        
        // If we don't have enough time data, show a message
        const sortedTimePoints = Array.from(timePoints).sort();
        if (sortedTimePoints.length < 2) {
            zoomLayer.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .attr("fill", "#FFFFFF")
                .attr("font-size", "16px")
                .text("Not enough time data available for timeline visualization");
                
            zoomLayer.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2 + 30)
                .attr("text-anchor", "middle")
                .attr("fill", "#FFFFFF")
                .attr("font-size", "14px")
                .text("Run multiple scans or add scan zones to visualize changes over time");
                
            return;
        }
        
        // Calculate the range of timestamps
        const minTime = new Date(sortedTimePoints[0]).getTime();
        const maxTime = new Date(sortedTimePoints[sortedTimePoints.length - 1]).getTime();
        const timeRange = maxTime - minTime;
        
        // Keep track of which devices are new or changed at each time point
        const deviceStatus = {};
        
        // First scan is the baseline - all devices are "new"
        const baselineDevices = devicesByTime[sortedTimePoints[0]].devices;
        baselineDevices.forEach(device => {
            const deviceId = device.ip || device.mac;
            if (!deviceId) return;
            
            deviceStatus[deviceId] = {
                firstSeen: minTime,
                lastSeen: minTime,
                status: "new",
                changes: []
            };
        });
        
        // Analyze subsequent scans to detect changes
        for (let i = 1; i < sortedTimePoints.length; i++) {
            const timePoint = sortedTimePoints[i];
            const scanTime = new Date(timePoint).getTime();
            const scanDevices = devicesByTime[timePoint].devices;
            
            scanDevices.forEach(device => {
                const deviceId = device.ip || device.mac;
                if (!deviceId) return;
                
                if (!deviceStatus[deviceId]) {
                    // New device that wasn't in previous scans
                    deviceStatus[deviceId] = {
                        firstSeen: scanTime,
                        lastSeen: scanTime,
                        status: "new",
                        changes: []
                    };
                } else {
                    // Existing device - check for changes
                    const status = deviceStatus[deviceId];
                    status.lastSeen = scanTime;
                    
                    // Check for property changes from previous scans
                    // This is a simplified change detection - in a real app you would do more detailed comparison
                    const hasChanges = checkDeviceChanges(device, deviceId, scanTime);
                    
                    if (hasChanges) {
                        status.status = "changed";
                        status.changes.push({
                            time: scanTime,
                            type: "property_change"
                        });
                    } else {
                        status.status = "stable";
                    }
                }
            });
            
            // Identify devices that disappeared in this scan
            Object.keys(deviceStatus).forEach(deviceId => {
                const status = deviceStatus[deviceId];
                const deviceExists = scanDevices.some(d => (d.ip === deviceId || d.mac === deviceId));
                
                if (!deviceExists && status.lastSeen < scanTime) {
                    status.status = "missing";
                    status.changes.push({
                        time: scanTime,
                        type: "missing"
                    });
                }
            });
        }
        
        // Create a timeline visualization
        const margin = { top: 80, right: 40, bottom: 50, left: 200 };
        const timelineWidth = width - margin.left - margin.right;
        const timelineHeight = height - margin.top - margin.bottom;
        
        // Create the timeline scale
        const timeScale = d3.scaleTime()
            .domain([new Date(minTime), new Date(maxTime)])
            .range([0, timelineWidth]);
            
        // Create an axis for the timeline
        const timeAxis = d3.axisBottom(timeScale)
            .ticks(Math.min(10, sortedTimePoints.length))
            .tickFormat(d3.timeFormat("%b %d, %H:%M"));
            
        // Add the timeline axis
        const timelineG = zoomLayer.append("g")
            .attr("transform", `translate(${margin.left}, ${height - margin.bottom})`)
            .call(timeAxis);
            
        // Style the axis
        timelineG.select(".domain")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-opacity", 0.5);
            
        timelineG.selectAll(".tick line")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-opacity", 0.2);
            
        timelineG.selectAll(".tick text")
            .attr("fill", "#FFFFFF");
            
        // Add a timeline label
        zoomLayer.append("text")
            .attr("x", width / 2)
            .attr("y", height - 10)
            .attr("text-anchor", "middle")
            .attr("fill", "#FFFFFF")
            .attr("font-size", "14px")
            .text("Time");
            
        // Create a list of all devices for the device axis
        const allDeviceIds = Object.keys(deviceStatus).sort();
        const deviceScale = d3.scaleBand()
            .domain(allDeviceIds)
            .range([0, timelineHeight])
            .padding(0.1);
            
        // Calculate the height of each device row
        const rowHeight = deviceScale.bandwidth();
            
        // Add the device axis
        const deviceAxis = d3.axisLeft(deviceScale)
            .tickFormat(d => {
                // Use custom name if available, otherwise show IP
                if (customNames?.[d]?.name) {
                    return customNames[d].name;
                }
                return d;
            });
            
        const deviceAxisG = zoomLayer.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`)
            .call(deviceAxis);
            
        // Style the device axis
        deviceAxisG.select(".domain").remove();
            
        deviceAxisG.selectAll(".tick line")
            .attr("stroke", "#FFFFFF")
            .attr("stroke-opacity", 0.1)
            .attr("x2", timelineWidth);
            
        deviceAxisG.selectAll(".tick text")
            .attr("fill", "#FFFFFF");
            
        // Add horizontal lines for each device row
        allDeviceIds.forEach((deviceId, index) => {
            const y = margin.top + deviceScale(deviceId) + rowHeight / 2;
            
            // Add a horizontal line
            zoomLayer.append("line")
                .attr("x1", margin.left)
                .attr("x2", margin.left + timelineWidth)
                .attr("y1", y)
                .attr("y2", y)
                .attr("stroke", "#FFFFFF")
                .attr("stroke-opacity", 0.1)
                .attr("stroke-width", 1);
        });
        
        // Add vertical lines for each time point
        sortedTimePoints.forEach(timePoint => {
            const scanTime = new Date(timePoint).getTime();
            const x = margin.left + timeScale(new Date(scanTime));
            
            // Add a vertical line
            zoomLayer.append("line")
                .attr("x1", x)
                .attr("x2", x)
                .attr("y1", margin.top)
                .attr("y2", margin.top + timelineHeight)
                .attr("stroke", "#FFFFFF")
                .attr("stroke-opacity", 0.2)
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "4,4");
        });
        
        // Add markers for device events
        allDeviceIds.forEach(deviceId => {
            const status = deviceStatus[deviceId];
            const y = margin.top + deviceScale(deviceId) + rowHeight / 2;
            
            // First seen - green circle
            const firstSeen = margin.left + timeScale(new Date(status.firstSeen));
            zoomLayer.append("circle")
                .attr("cx", firstSeen)
                .attr("cy", y)
                .attr("r", 6)
                .attr("fill", "#10b981")
                .attr("stroke", "#FFFFFF")
                .attr("stroke-width", 1)
                .attr("opacity", 0.8)
                .on("mouseover", (event) => {
                    showTooltip(event, `Device first seen: ${new Date(status.firstSeen).toLocaleString()}`);
                })
                .on("mouseout", hideTooltip);
                
            // Last seen - if different from first seen
            if (status.lastSeen > status.firstSeen) {
                const lastSeen = margin.left + timeScale(new Date(status.lastSeen));
                
                // Draw a line between first and last seen
                zoomLayer.append("line")
                    .attr("x1", firstSeen)
                    .attr("x2", lastSeen)
                    .attr("y1", y)
                    .attr("y2", y)
                    .attr("stroke", getStatusColor(status.status))
                    .attr("stroke-width", 3)
                    .attr("opacity", 0.7);
                
                // Add marker for last seen
                zoomLayer.append("circle")
                    .attr("cx", lastSeen)
                    .attr("cy", y)
                    .attr("r", 5)
                    .attr("fill", getStatusColor(status.status))
                    .attr("stroke", "#FFFFFF")
                    .attr("stroke-width", 1)
                    .attr("opacity", 0.8)
                    .on("mouseover", (event) => {
                        let message = `Device last seen: ${new Date(status.lastSeen).toLocaleString()}`;
                        if (status.status === "missing") {
                            message += " (Device disappeared)";
                        }
                        showTooltip(event, message);
                    })
                    .on("mouseout", hideTooltip);
            }
            
            // Add change markers
            status.changes.forEach(change => {
                const changeTime = margin.left + timeScale(new Date(change.time));
                const markerColor = change.type === "missing" ? "#ef4444" : "#f59e0b";
                
                zoomLayer.append("path")
                    .attr("d", d3.symbol().type(d3.symbolDiamond).size(80))
                    .attr("transform", `translate(${changeTime}, ${y})`)
                    .attr("fill", markerColor)
                    .attr("stroke", "#FFFFFF")
                    .attr("stroke-width", 1)
                    .attr("opacity", 0.9)
                    .on("mouseover", (event) => {
                        const message = change.type === "missing" 
                            ? `Device missing at: ${new Date(change.time).toLocaleString()}`
                            : `Device changed at: ${new Date(change.time).toLocaleString()}`;
                        showTooltip(event, message);
                    })
                    .on("mouseout", hideTooltip);
            });
        });
        
        // Add a tooltip element
        const tooltip = zoomLayer.append("g")
            .attr("class", "tooltip")
            .style("display", "none");
            
        tooltip.append("rect")
            .attr("width", 200)
            .attr("height", 30)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("fill", "#374151")
            .attr("stroke", "#6B7280")
            .attr("stroke-width", 1)
            .attr("opacity", 0.9);
            
        tooltip.append("text")
            .attr("x", 10)
            .attr("y", 20)
            .attr("fill", "#FFFFFF")
            .attr("font-size", "12px");
            
        // Tooltip functions
        function showTooltip(event, text) {
            tooltip.select("text").text(text);
            
            // Adjust tooltip width based on text length
            const textWidth = tooltip.select("text").node().getComputedTextLength();
            tooltip.select("rect").attr("width", textWidth + 20);
            
            tooltip.attr("transform", `translate(${event.offsetX + 10}, ${event.offsetY - 40})`);
            tooltip.style("display", null);
        }
        
        function hideTooltip() {
            tooltip.style("display", "none");
        }
        
        // Add legend
        const legendData = [
            { color: "#10b981", label: "First Seen" },
            { color: "#3b82f6", label: "Stable" },
            { color: "#f59e0b", label: "Changed" },
            { color: "#ef4444", label: "Missing" }
        ];
        
        const legend = zoomLayer.append("g")
            .attr("transform", `translate(${width - 180}, ${margin.top})`);
            
        legendData.forEach((item, i) => {
            const legendRow = legend.append("g")
                .attr("transform", `translate(0, ${i * 25})`);
                
            legendRow.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", item.color)
                .attr("rx", 2)
                .attr("ry", 2);
                
            legendRow.append("text")
                .attr("x", 25)
                .attr("y", 12.5)
                .attr("text-anchor", "start")
                .attr("dominant-baseline", "middle")
                .attr("fill", "#FFFFFF")
                .text(item.label);
        });
    };
    
    // Helper for timeline view - check for device changes
    // In a real app, this would do more detailed comparison
    const checkDeviceChanges = (device, deviceId, scanTime) => {
        // Simple implementation - assume 10% chance of a change
        // In a real app, this would compare with previous scans
        return Math.random() < 0.1;
    };
    
    // Helper function for timeline view - get color based on status
    const getStatusColor = (status) => {
        switch (status) {
            case "new": return "#10b981"; // green
            case "changed": return "#f59e0b"; // amber
            case "missing": return "#ef4444"; // red
            case "stable":
            default: return "#3b82f6"; // blue
        }
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
    };    // Function to enhance device with additional information for context menu and display
    const enhanceDeviceInfo = (device) => {
        if (!device) return device;
        
        // Make a copy of the device to avoid modifying the original
        const enhancedDevice = { ...device };
        
        // Add MAC address information
        if (!enhancedDevice.macInfo) {
            enhancedDevice.macInfo = getMacInfo(enhancedDevice);
        }
        
        // Ensure vendor information is preserved
        if (!enhancedDevice.vendor && enhancedDevice.macInfo && enhancedDevice.macInfo.vendor) {
            enhancedDevice.vendor = enhancedDevice.macInfo.vendor;
        }
        
        // Ensure MAC address is available in direct property for backward compatibility
        if (!enhancedDevice.mac && enhancedDevice.macInfo && enhancedDevice.macInfo.address) {
            enhancedDevice.mac = enhancedDevice.macInfo.address;
        }
        
        // If we have mac but no macInfo, create it
        if (enhancedDevice.mac && !enhancedDevice.macInfo) {
            enhancedDevice.macInfo = {
                available: true,
                address: enhancedDevice.mac,
                vendor: enhancedDevice.vendor || ''
            };
        }
        
        // Add OS information
        if (!enhancedDevice.osInfo) {
            enhancedDevice.osInfo = getOSInfo(enhancedDevice);
        }
        
        return enhancedDevice;
    };

    return (
        <div className="relative w-full h-full overflow-hidden" 
             ref={containerRef}
             style={{ height: "100%" }} // Changed from calc(100vh - 8rem) to 100% to fit container perfectly
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
                    
                    {/* Visualization Type Selection */}
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
                    
                    {/* Subnet Grouping Toggle - Only show for circular and hierarchical views */}
                    {(visualizationType === "circular" || visualizationType === "hierarchical") && (
                        <div className="mt-3">
                            <button
                                className="w-full px-2 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500 flex items-center justify-center"
                                onClick={() => {
                                    // Toggle subnet grouping
                                    const newSubnetGroups = Object.keys(subnetGroups).length ? {} : groupDevicesBySubnet(
                                        Array.isArray(devices) ? devices : Object.values(devices).flat()
                                    );
                                    setSubnetGroups(newSubnetGroups);
                                    setRefreshTrigger(prev => prev + 1);
                                }}
                            >
                                <FaLayerIcon size={10} className="mr-1" /> 
                                {Object.keys(subnetGroups).length ? "Disable" : "Enable"} Subnet Grouping
                            </button>
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
                        maxWidth: '350px' // Slightly increased to accommodate more info
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
                        {/* Basic Information */}
                        <div>
                            <span className="font-semibold">IP:</span> {contextMenu.device.ip}
                        </div>
                        
                        {customNames?.[contextMenu.device.ip]?.name && (
                            <div>
                                <span className="font-semibold">Name:</span> {customNames[contextMenu.device.ip].name}
                            </div>
                        )}
                        
                        {/* MAC Address Information */}
                        {contextMenu.device.macInfo?.available && (
                            <div>
                                <div className="flex items-center">
                                    <FaAddressCard className="mr-1 text-blue-400" />
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
                        
                        {/* OS Information */}
                        {contextMenu.device.osInfo?.available && (
                            <div>
                                <div className="flex items-center">
                                    <FaDesktop className="mr-1 text-blue-400" />
                                    <span className="font-semibold">Operating System:</span>
                                </div>
                                <div className="ml-5 mt-1">
                                    <div>{contextMenu.device.osInfo.name}</div>
                                    {contextMenu.device.osInfo.accuracy && (
                                        <div><span className="font-semibold">Accuracy:</span> {contextMenu.device.osInfo.accuracy}%</div>
                                    )}
                                    {contextMenu.device.osInfo.type && (
                                        <div><span className="font-semibold">Type:</span> {contextMenu.device.osInfo.type}</div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Fallback for traditional vendor field if MAC info not available */}
                        {(!contextMenu.device.macInfo?.available && contextMenu.device.vendor) && (
                            <div>
                                <span className="font-semibold">Vendor:</span> {contextMenu.device.vendor}
                            </div>
                        )}
                        
                        {/* Status */}
                        {contextMenu.device.status && (
                            <div>
                                <span className="font-semibold">Status:</span> {contextMenu.device.status}
                            </div>
                        )}
                        
                        {/* Ports */}
                        {contextMenu.device.ports && contextMenu.device.ports.length > 0 && (
                            <div>
                                <span className="font-semibold">Ports:</span> 
                                <div className="mt-1 ml-2 text-xs max-h-28 overflow-y-auto">
                                    {formatPorts(contextMenu.device.ports)}
                                </div>
                            </div>
                        )}
                        
                        {/* Category */}
                        {customNames?.[contextMenu.device.ip]?.category && (
                            <div>
                                <span className="font-semibold">Category:</span> {customNames[contextMenu.device.ip].category}
                            </div>
                        )}
                        
                        {/* Notes */}
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
                        
                        {/* Add Save button to open the device modal */}
                        <button
                            className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm"
                            onClick={() => {
                                // Close the context menu
                                setContextMenu({...contextMenu, visible: false});
                                
                                // Open the device modal with this device data
                                if (setModalDevice && typeof setModalDevice === 'function') {
                                    // Merge any existing custom properties from customNames
                                    const customProps = customNames?.[contextMenu.device.ip] || {};
                                    
                                    // Set the modal device with merged data
                                    setModalDevice({
                                        ...contextMenu.device,
                                        ...customProps
                                    });
                                }
                            }}
                        >
                            Edit
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default TopologyMap;