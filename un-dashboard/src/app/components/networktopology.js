import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { FaNetworkWired, FaTerminal, FaTimes } from "react-icons/fa";
import { createRoot } from "react-dom/client";

export default function TopologyMap({ devices, vendorColors, customNames }) {
    const svgRef = useRef();
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        device: null
    });

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (contextMenu.visible && !event.target.closest('.context-menu')) {
                setContextMenu({...contextMenu, visible: false});
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [contextMenu]);
    
    useEffect(() => {
        if (!devices || Object.keys(devices).length === 0) return;

        const flattenedDevices = Array.isArray(devices) ? devices : Object.values(devices).flat();
        const width = svgRef.current.clientWidth || 1000;
        const height = svgRef.current.clientHeight || 600;
        
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const zoomLayer = svg.append("g");

        const zoomBehavior = d3.zoom()
            .scaleExtent([0.2, 2])
            .on("zoom", (event) => {
                zoomLayer.attr("transform", event.transform);
            });

        svg.call(zoomBehavior);

        // Group devices by scan source
        const deviceGroups = {};
        flattenedDevices.forEach(device => {
            // Use both id and name for more reliable grouping
            const sourceId = device.scanSource?.id || 'default';
            if (!deviceGroups[sourceId]) {
                deviceGroups[sourceId] = {
                    devices: [],
                    name: device.scanSource?.name || `Scan Group`
                };
            }
            deviceGroups[sourceId].devices.push(device);
        });

        const groupKeys = Object.keys(deviceGroups);
        const hasScanGroups = groupKeys.length > 1;

        // Generate colors for each scan group
        const groupColors = d3.scaleOrdinal(d3.schemeCategory10).domain(groupKeys);

        // Create nodes with positioning based on groups
        let nodes = [];

        // Calculate optimal node size based on device counts
        const calculateNodeSize = (count) => {
            // Start with a reasonable default size
            const baseSize = 25;
            
            // Reduce size as count increases, with a reasonable minimum
            if (count <= 5) return baseSize; // Small groups keep the default size
            if (count <= 15) return Math.max(18, baseSize - (count - 5)); // Medium groups gradually get smaller
            if (count <= 30) return Math.max(14, baseSize - 10 - (count - 15) / 3); // Large groups get even smaller
            return Math.max(10, baseSize - 15); // Very large groups have the minimum size
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
            
            // Base radius calculation - increased even more to move groups further apart
            const baseGroupRadius = Math.min(width, height) / 2.2; // Further reduced to spread groups more
            
            groupKeys.forEach((groupKey, groupIndex) => {
                const groupData = deviceGroups[groupKey];
                const groupDevices = groupData.devices;
                const deviceCount = groupDevices.length;
                const scanName = groupData.name;
                
                // More aggressive position scaling for larger groups
                const sizeFactor = Math.pow(deviceCount / maxDeviceCount, 0.3); // Less aggressive power
                const positionFactor = 0.6 + (sizeFactor * 0.5); // Increased base factor and scaling
                
                const groupAngle = (2 * Math.PI * groupIndex) / numGroups;
                const groupCenterX = centerX + (baseGroupRadius * positionFactor) * Math.cos(groupAngle);
                const groupCenterY = centerY + (baseGroupRadius * positionFactor) * Math.sin(groupAngle);
                
                // More aggressive cluster radius for large device counts
                const minRadius = 80; // Increased minimum radius
                
                // More aggressive scaling for large differences between groups
                const deviceScaleFactor = 70; // Increased from 60 for even more space
                const calculatedRadius = minRadius + deviceScaleFactor * Math.sqrt(deviceCount);
                
                // Dynamic max radius based on proportion of total devices - more generous
                const proportion = deviceCount / totalDevices;
                const maxAllowedRadius = baseGroupRadius * (0.35 + proportion * 0.7); // More space for larger groups
                const clusterRadius = Math.min(calculatedRadius, maxAllowedRadius);
                
                // Add cluster label - moved above the scan groups
                const labelAngle = Math.PI * 1.5; // Position at top (270 degrees)
                const labelDistance = clusterRadius + 80; // Increased distance from center
                const labelX = groupCenterX;
                const labelY = groupCenterY - labelDistance;
                
                // Add label with device count for clarity and the proper scan name
                zoomLayer.append("text")
                    .attr("x", labelX)
                    .attr("y", labelY)
                    .attr("text-anchor", "middle")
                    .attr("fill", "white")
                    .attr("font-size", "14px")
                    .attr("font-weight", "bold")
                    .text(`${scanName} (${deviceCount})`);
                
                // More adaptive boundary padding that scales better with device count
                const boundaryPadding = () => {
                    if (deviceCount <= 5) return 60; // Small groups
                    if (deviceCount <= 12) return 70 + Math.sqrt(deviceCount) * 10; // Medium groups
                    if (deviceCount <= 30) return 80 + Math.sqrt(deviceCount) * 12; // Large groups
                    return 100 + Math.sqrt(deviceCount) * 15; // Very large groups
                };

                // Apply the dynamic boundary padding
                zoomLayer.append("circle")
                    .attr("cx", groupCenterX)
                    .attr("cy", groupCenterY)
                    .attr("r", clusterRadius + boundaryPadding())
                    .attr("fill", "none")
                    .attr("stroke", groupColors(groupKey))
                    .attr("stroke-width", 2)
                    .attr("stroke-dasharray", "5,5")
                    .attr("opacity", 0.7);
                
                // Position devices with different layouts based on group size
                groupDevices.forEach((device, deviceIndex) => {
                    let x, y;
                    
                    if (deviceCount <= 5) {
                        // Small groups - simple circle with good spacing
                        const deviceAngle = (2 * Math.PI * deviceIndex) / groupDevices.length;
                        const ringRadius = clusterRadius * 0.5; // 50% of cluster radius
                        x = groupCenterX + ringRadius * Math.cos(deviceAngle);
                        y = groupCenterY + ringRadius * Math.sin(deviceAngle);
                        
                    // For medium groups, adjust spacing based on device count
                    } else if (deviceCount <= 12) {
                        const deviceAngle = (2 * Math.PI * deviceIndex) / groupDevices.length;
                        
                        // Dynamic radius scaling - more aggressive spread for medium groups
                        // Increase the base radius factor from 0.65 to 0.75
                        // Increase the scaling factor from 0.02 to 0.03 per additional device
                        const radiusFactor = 0.75 + (deviceCount - 6) * 0.03; 
                        
                        // Allow radius to go up to 85% of cluster radius (was 75%)
                        const ringRadius = clusterRadius * Math.min(0.85, radiusFactor);
                        
                        x = groupCenterX + ringRadius * Math.cos(deviceAngle);
                        y = groupCenterY + ringRadius * Math.sin(deviceAngle);
                        
                    } else {
                        // Large groups - use improved circular layout with more spacing
                        // Calculate optimal number of concentric circles with fewer devices per ring
                        // Reduced density factor increases the number of rings for better spacing
                        const densityFactor = 0.7; // Lower value = fewer devices per ring (was effectively 1.0)
                        const totalRings = Math.ceil(Math.sqrt(deviceCount / (Math.PI * densityFactor)));
                        
                        // Distribute devices evenly across rings
                        let devicesLeft = deviceCount;
                        let currentRing = 0;
                        let deviceInRingIndex = 0;
                        let devicesInCurrentRing = 0;
                        
                        // Find which ring this device belongs to
                        for (let i = 0; i <= deviceIndex; i++) {
                            if (deviceInRingIndex >= devicesInCurrentRing) {
                                // Move to next ring
                                currentRing++;
                                // Calculate devices for this ring with reduced density
                                // Formula modified to create more spacing between nodes
                                devicesInCurrentRing = Math.floor(2 * Math.PI * currentRing * densityFactor);
                                deviceInRingIndex = 0;
                            }
                            deviceInRingIndex++;
                        }
                        
                        // Calculate position within the ring
                        // Increased from 0.8 to 0.9 to use more of the available space
                        const ringRadius = (clusterRadius * 0.9) * (currentRing / totalRings);
                        const deviceAngle = (2 * Math.PI * deviceInRingIndex) / devicesInCurrentRing;
                        
                        x = groupCenterX + ringRadius * Math.cos(deviceAngle);
                        y = groupCenterY + ringRadius * Math.sin(deviceAngle);
                    }
                    
                    nodes.push({
                        ...device,
                        id: device.ip || `device-${groupIndex}-${deviceIndex}`,
                        x,
                        y,
                        group: groupKey,
                        groupColor: groupColors(groupKey)
                    });
                });
            });
        } else {
            // Single scan or no scan source info - use the original circular layout
            const radius = Math.min(width, height) / 2 - 100;
            nodes = flattenedDevices.map((device, index) => {
                const angle = (2 * Math.PI * index) / flattenedDevices.length;
                return {
                    ...device,
                    id: device.ip || `device-${index}`,
                    x: width / 2 + radius * Math.cos(angle),
                    y: height / 2 + radius * Math.sin(angle),
                    group: 'default'
                };
            });
        }

        // Add nodes (circles) to the SVG
        const nodeGroup = zoomLayer
            .selectAll(".node-group")
            .data(nodes)
            .enter()
            .append("g");

        nodeGroup
            .append("circle")
            .attr("r", d => {
                // Get all nodes with the same group to determine size
                const groupCount = nodes.filter(node => node.group === d.group).length;
                return calculateNodeSize(groupCount);
            })
            .attr("fill", d => {
                // Use custom color, or scan group color, or vendor color
                return customNames?.[d.id]?.color || 
                       (hasScanGroups ? d.groupColor : vendorColors[d.vendor?.toLowerCase()]) || 
                       "#6b7280";
            })
            .attr("stroke", d => hasScanGroups ? d.groupColor : "#1e3a8a")
            .attr("stroke-width", 2)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        // Adjust the foreign object dimensions based on node size
        nodeGroup
            .append("foreignObject")
            .attr("width", d => {
                const groupCount = nodes.filter(node => node.group === d.group).length;
                const nodeSize = calculateNodeSize(groupCount);
                return nodeSize * 4; // Increased width from 3.2 to 4 for longer IPs
            })
            .attr("height", d => {
                const groupCount = nodes.filter(node => node.group === d.group).length;
                const nodeSize = calculateNodeSize(groupCount);
                return nodeSize * 4; // Increased height from 3.2 to 4 for more spacing
            })
            .attr("x", d => {
                const groupCount = nodes.filter(node => node.group === d.group).length;
                const nodeSize = calculateNodeSize(groupCount);
                return d.x - nodeSize * 2; // Adjusted to center the wider object
            })
            .attr("y", d => {
                const groupCount = nodes.filter(node => node.group === d.group).length;
                const nodeSize = calculateNodeSize(groupCount);
                return d.y - nodeSize * 2; // Adjusted to center the taller object
            })
            .each(function (d) {
                const groupCount = nodes.filter(node => node.group === d.group).length;
                const nodeSize = calculateNodeSize(groupCount);
                
                // Define the base fontSize first (this was missing)
                const fontSize = Math.max(9, 12 - (groupCount > 15 ? 2 : 0)); 
                
                // Calculate IP font size based on node size and group count
                // More aggressive scaling for larger groups
                let ipFontSize;
                if (groupCount <= 5) {
                    ipFontSize = Math.max(10, fontSize);
                } else if (groupCount <= 15) {
                    ipFontSize = Math.max(9, fontSize - 1);
                } else {
                    ipFontSize = Math.max(8, fontSize - 2);
                }
                
                const customIcon = customNames?.[d.id]?.icon || <FaNetworkWired />;
                const customName = customNames?.[d.id]?.name;

                const container = document.createElement("div");
                createRoot(container).render(
                    <div style={{ 
                        textAlign: "center", 
                        color: "white", 
                        fontSize: `${fontSize}px`, 
                        overflow: "visible",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        height: "100%"
                    }}>
                        {/* IP address above the icon with more space */}
                        <div style={{ 
                            whiteSpace: "nowrap",
                            overflow: "hidden", 
                            textOverflow: "ellipsis",
                            maxWidth: `${nodeSize * 3.8}px`,  // Wider to fit IPs
                            marginBottom: "6px", // Increased from 2px
                            fontFamily: "monospace",
                            fontSize: `${ipFontSize}px`,
                            padding: "1px 2px",
                            backgroundColor: "rgba(0,0,0,0.3)", // Semi-transparent background for better readability
                            borderRadius: "3px"
                        }}>{d.ip}</div>
                        
                        {/* Icon in the middle */}
                        <div style={{ 
                            fontSize: `${nodeSize * 0.8}px`, 
                            margin: "4px 0",
                            lineHeight: 1
                        }}>{customIcon}</div>
                        
                        {/* Custom name (if any) below the icon */}
                        {customName && <div style={{ 
                            whiteSpace: "nowrap",
                            overflow: "hidden", 
                            textOverflow: "ellipsis",
                            maxWidth: `${nodeSize * 3.8}px`,
                            fontSize: `${Math.max(7, fontSize - 1)}px`,
                            opacity: 0.9,
                            marginTop: "4px" // Increased space
                        }}>{customName}</div>}
                    </div>
                );
                this.appendChild(container);
            });

        // Add this before returning from the useEffect
        nodeGroup
            .on("contextmenu", (event, d) => {
                event.preventDefault();
                setContextMenu({
                    visible: true,
                    device: d
                });
            });

    }, [devices, vendorColors, customNames]);

    // Helper function to check if SSH is available
    const isSSHAvailable = (device) => {
        if (!device || !device.ports) return false;
        
        // Check if port 22 is specifically marked as closed
        if (Array.isArray(device.ports)) {
            // Check for "closed" status in port description
            const hasClosedSSH = device.ports.some(port => 
                typeof port === 'string' && 
                (port.includes('22/tcp closed') || port.includes('closed ssh'))
            );
            
            // If explicitly closed, return false
            if (hasClosedSSH) return false;
            
            // Otherwise check for open SSH as before
            return device.ports.some(port => 
                (typeof port === 'string' && 
                 (port.includes('22/tcp') || 
                  port.includes('ssh') || 
                  port === '22')
                ) &&
                !port.includes('closed') &&
                port === 22
            );
        }
        
        // If ports is an object
        if (typeof device.ports === 'object') {
            // Check for closed status
            const hasClosedSSH = Object.entries(device.ports).some(([key, value]) => 
                (key === '22' || key === 22) && 
                typeof value === 'string' && 
                value.toLowerCase().includes('closed')
            );
            
            // If explicitly closed, return false
            if (hasClosedSSH) return false;
            
            return Object.keys(device.ports).some(key => 
                key === '22' || key === 22 || 
                (device.ports[key] && 
                 device.ports[key].toLowerCase().includes('ssh') && 
                 !device.ports[key].toLowerCase().includes('closed'))
            );
        }
        
        return false;
    };

    const formatPorts = (ports) => {
        if (!ports) return "None";
        if (Array.isArray(ports)) {
            return ports.join(", ");
        }
        if (typeof ports === 'object') {
            return Object.keys(ports).join(", ");
        }
        return String(ports);
    };

    return (
        <div className="relative w-full h-full">
            <svg ref={svgRef} width="100%" height="100%" className="select-none" />
            
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
                    
                    <div className="space-y-2 text-sm">
                        <div>
                            <span className="font-semibold">IP Address:</span> {contextMenu.device.ip}
                        </div>
                        
                        {contextMenu.device.hostname && (
                            <div>
                                <span className="font-semibold">Hostname:</span> {contextMenu.device.hostname}
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
                        
                        {contextMenu.device.os && (
                            <div>
                                <span className="font-semibold">OS:</span> {contextMenu.device.os}
                            </div>
                        )}
                        
                        <div>
                            <span className="font-semibold">Open Ports:</span> {formatPorts(contextMenu.device.ports)}
                        </div>
                        
                        {contextMenu.device.scanSource && (
                            <div>
                                <span className="font-semibold">Scan Source:</span> {contextMenu.device.scanSource.name}
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 flex justify-end gap-2">
                        {isSSHAvailable(contextMenu.device) && (
                            <button
                                className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm flex items-center gap-1"
                                onClick={() => {
                                    // Here you would trigger the SSH modal
                                    console.log("SSH to:", contextMenu.device.ip);
                                    setContextMenu({...contextMenu, visible: false});
                                }}
                            >
                                <FaTerminal /> SSH
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}