import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { createRoot } from 'react-dom/client';
import { iconMap } from '../icons/iconMapping';
import { 
    processDeviceData, 
    calculateNodeSize, 
    calculateMinDistance, 
    getDeviceStatus
} from './NetworkViewUtils';
import { determineDeviceRoles } from "../../utils/deviceManagementUtils";

const CircularNetworkView = ({ 
    devices, 
    customNames, 
    dimensions, 
    groupBy, 
    selectedGroup, 
    subnetGroups,
    onDeviceClick,
    showTooltip,
    hideTooltip,
    refreshTrigger
}) => {
    const svgRef = useRef();
    
    useEffect(() => {
        if (!devices || devices.length === 0) return;
        if (!dimensions.width || !dimensions.height) return;
        
        const { width, height } = dimensions;
        
        // Clear the SVG
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        
        // Create a zoom layer
        const zoomLayer = svg.append("g");
        
        // Set up zoom behavior
        const zoomBehavior = d3.zoom()
            .scaleExtent([0.2, 5])
            .on("zoom", (event) => {
                zoomLayer.attr("transform", event.transform);
            });
            
        svg.call(zoomBehavior)
           .style("pointer-events", "all")
           .on("dblclick.zoom", () => {
               svg.transition()
                  .duration(750)
                  .call(zoomBehavior.transform, d3.zoomIdentity);
           });
           
        // Render the circular view
        renderCircularView(svg, zoomLayer, devices, width, height);
        
    }, [devices, customNames, dimensions, groupBy, selectedGroup, subnetGroups, refreshTrigger]);
    
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
        
        // Create a new local colors object 
        const groupColors = {};
        groupKeys.forEach(key => {
            groupColors[key] = colorScale(key);
        });

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
                    .attr("fill", groupColors[groupKey])
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
                        name: (device.ip && customNames?.[device.ip]?.name) || device.name || device.ip,
                        x,
                        y,
                        group: groupKey,
                        groupColor: groupColors[groupKey],
                        size: nodeSize
                    });
                });
                
                // Add a subtle background circle for the group with sizing based on device count
                zoomLayer.append("circle")
                    .attr("cx", groupCenterX)
                    .attr("cy", groupCenterY)
                    .attr("r", groupInnerRadius + nodeSize + 10) // Scale the group background based on node size
                    .attr("fill", groupColors[groupKey])
                    .attr("opacity", 0.1)
                    .attr("stroke", groupColors[groupKey])
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
                    groupColor = groupColors['filtered'];
                } else if (groupBy === "category" && customNames?.[device.ip]?.category) {
                    groupKey = customNames[device.ip].category;
                    groupColor = groupColors[groupKey];
                } else if (groupBy === "vendor" && device.vendor) {
                    groupKey = device.vendor.toLowerCase();
                    groupColor = groupColors[groupKey];
                }
                
                return {
                    ...device,
                    id: device.ip || `device-${index}`,
                    name: (device.ip && customNames?.[device.ip]?.name) || device.name || device.ip,
                    x: width / 2 + radius * Math.cos(angle),
                    y: height / 2 + radius * Math.sin(angle),
                    group: groupKey,
                    groupColor: groupColor,
                    size: nodeSize
                };
            });
            
            // If we're filtering, add a title to show what we're filtering by
            if (selectedGroup) {
                const groupColor = useOverrideGrouping ? groupColors['filtered'] : '#ffffff';
                
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
    
    // Render device nodes - shared between all visualization types
    const renderDeviceNodes = (zoomLayer, nodes) => {
        const nodeGroups = zoomLayer.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("transform", d => `translate(${d.x},${d.y})`);

        nodeGroups.each(function(d) {
            const node = d3.select(this);
            
            // Get device roles using helper function
            const { isGateway, isSwitch } = determineDeviceRoles(d);

            // Choose color based on type
            const deviceColor = () => {
                if (d.ip && customNames?.[d.ip]?.color) {
                    return customNames[d.ip].color;
                }
                if (isGateway) return "#10b981";
                if (isSwitch) return "#6366f1";
                return d.groupColor || "#6b7280";
            };

            const nodeShape = node.append(isSwitch ? "rect" : "circle")
                .attr("fill", deviceColor())
                .attr("stroke", "white")
                .attr("stroke-width", 1.5)
                .attr("cursor", "pointer");
                
            if (isSwitch) {
                const nodeSize = d.size || 20;
                nodeShape
                    .attr("width", nodeSize * 2)
                    .attr("height", nodeSize * 1.6)
                    .attr("x", -nodeSize)
                    .attr("y", -nodeSize * 0.8)
                    .attr("rx", 4)
                    .attr("ry", 4);

                // Add port count if available
                const portCount = d.portCount || customNames?.[d.ip]?.portCount;
                if (portCount) {
                    node.append("text")
                        .attr("x", 0)
                        .attr("y", d.size + 5)
                        .attr("text-anchor", "middle")
                        .attr("font-size", "9px")
                        .attr("fill", "white")
                        .text(`${portCount} ports`);
                }
            } else {
                const nodeSize = d.size || 20;
                nodeShape.attr("r", nodeSize);

                // Add parent switch indicator
                const parentSwitchIp = d.ip && customNames?.[d.ip]?.parentSwitch;
                if (parentSwitchIp) {
                    const nodeName = customNames?.[parentSwitchIp]?.name || parentSwitchIp;
                    node.append("text")
                        .attr("x", -nodeSize * 1.5)
                        .attr("y", 0)
                        .attr("font-size", "8px")
                        .attr("fill", "#6366f1")
                        .text("↪")
                        .append("title")
                        .text(`Connected to ${nodeName}`);
                }
            }

            // Add device label below node
            node.append("text")
                .attr("text-anchor", "middle")
                .attr("dy", d => (d.size || 12) + 12)
                .attr("fill", "white")
                .attr("font-size", "10px")
                .attr("pointer-events", "none")
                .text(d => {
                    // First try the name field that we explicitly set when creating nodes
                    if (d.name) return d.name;
                    // Then try customNames
                    if (d.ip && customNames?.[d.ip]?.name) return customNames[d.ip].name;
                    // Then try device's own name field
                    if (d.name) return d.name;
                    // Then fall back to IP
                    if (d.ip) return d.ip;
                    return "Unknown Device";
                });

            // Add icon
            try {
                const iconSize = ((d.size || 12) * 1.2);
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
                iconContainer.style.pointerEvents = 'none';
                iconContainer.style.color = 'white';

                // Determine icon component
                let iconComponent;
                if (customNames?.[d.ip]?.networkRole === 'switch') {
                    iconComponent = iconMap.switch || iconMap.network;
                } else if (customNames?.[d.ip]?.icon) {
                    iconComponent = iconMap[customNames[d.ip].icon];
                } else if (d.vendor) {
                    const vendor = d.vendor.toLowerCase();
                    iconComponent = 
                        vendor.includes('cisco') ? iconMap.cisco :
                        vendor.includes('raspberry') ? iconMap.raspberry :
                        vendor.includes('apple') ? iconMap.apple :
                        vendor.includes('intel') ? iconMap.intel :
                        vendor.includes('nvidia') ? iconMap.nvidia :
                        vendor.includes('samsung') ? iconMap.samsung :
                        iconMap.network;
                } else {
                    iconComponent = iconMap.network;
                }

                if (iconComponent) {
                    const root = createRoot(iconContainer);
                    root.render(React.createElement(iconComponent, { size: iconSize }));

                    const foreignObject = node.append('foreignObject')
                        .attr('width', iconSize * 2)
                        .attr('height', iconSize * 2)
                        .attr('x', -iconSize)
                        .attr('y', -iconSize)
                        .style('pointer-events', 'none');
                        
                    foreignObject.node().appendChild(iconContainer);
                }
            } catch (error) {
                console.error("Error rendering device icon:", error);
            }

            // Add mouse events for tooltips
            node
                .on("mouseover", (event) => {
                    const deviceInfo = getDeviceInfo(d, customNames);
                    showTooltip(event, deviceInfo);
                })
                .on("mouseout", () => {
                    hideTooltip();
                })
                .on("click", (event) => {
                    if (onDeviceClick) {
                        onDeviceClick(d, event);
                    }
                });
        });
    };
    
    // Helper function to get device information
    const getDeviceInfo = (device, customNames) => {
        if (!device) return '';
        
        const enhancedDevice = processDeviceData(device);
        const status = getDeviceStatus(device);
        
        let info = `
            Device: ${customNames?.[device.ip]?.name || device.ip}
            Status: ${status.charAt(0).toUpperCase() + status.slice(1)}
            IP: ${device.ip || 'Unknown'}
        `;
        
        if (device.mac || (device.macInfo && device.macInfo.address)) {
            info += `
            MAC: ${device.macInfo?.address || device.mac || 'Unknown'}
            Vendor: ${enhancedDevice.vendor || 'Unknown'}
            `;
        }
        
        return info;
    };

    return (
        <svg 
            ref={svgRef} 
            width="100%" 
            height="100%" 
            style={{ background: 'transparent' }}
        />
    );
};

export default CircularNetworkView;
