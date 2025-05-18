import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { createRoot } from 'react-dom/client';
import { iconMap } from '../icons/iconMapping';
import { determineDeviceRoles } from "../../utils/deviceManagementUtils";
import { validateNetworkRelationships } from './NetworkViewUtils';

const HierarchicalNetworkView = ({ 
    devices, 
    customNames, 
    dimensions, 
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
        
        // Validate network relationships before rendering
        try {
            const fixedRelationships = validateNetworkRelationships(devices, customNames);
            if (fixedRelationships) {
                console.log("Network relationships were fixed, using updated relationships");
                // The customNames object will be updated on next render since localStorage changed
            }
        } catch (error) {
            console.error("Error validating network relationships:", error);
        }
          
        // Debug output for troubleshooting parent-child relationships
        console.log("Rendering hierarchical network view with customNames:", customNames);
        if (customNames) {
            const switchDevices = Object.entries(customNames).filter(([_, props]) => props.networkRole === 'switch');
            const gatewayDevices = Object.entries(customNames).filter(([_, props]) => props.networkRole === 'gateway');
            
            console.log(`Found ${switchDevices.length} switches and ${gatewayDevices.length} gateways`);
            
            console.log("Switch devices:", switchDevices);
            console.log("Gateway devices:", gatewayDevices);
              // More detailed check of switch-to-gateway connections
            console.log("=== NETWORK RELATIONSHIP VALIDATION ===");
            console.log("CUSTOM NAMES FULL DATA:", JSON.stringify(customNames, null, 2));
            
            switchDevices.forEach(([ip, props]) => {
                // Check the raw value of parentGateway
                console.log(`Raw parentGateway value for switch ${ip}: "${props.parentGateway}"`);
                
                if (props.parentGateway) {
                    const gateway = customNames[props.parentGateway];
                    if (gateway) {
                        if (gateway.networkRole === 'gateway') {
                            console.log(`✅ VALID: Switch ${ip} connected to gateway ${props.parentGateway}`);
                        } else {
                            console.error(`❌ INVALID: Switch ${ip} connected to non-gateway device ${props.parentGateway} (role: ${gateway.networkRole})`);
                        }
                    } else {
                        console.error(`❌ MISSING: Switch ${ip} references non-existent gateway ${props.parentGateway}`);
                    }
                } else {
                    console.warn(`⚠️ NOTE: Switch ${ip} has no parent gateway assigned`);
                }
            });
            
            // Check for regular devices with parent switches
            Object.entries(customNames).filter(([_, props]) => !props.networkRole).forEach(([ip, props]) => {
                if (props.parentSwitch) {
                    const switchDevice = customNames[props.parentSwitch];
                    if (switchDevice) {
                        if (switchDevice.networkRole === 'switch') {
                            console.log(`✅ VALID: Device ${ip} connected to switch ${props.parentSwitch}`);
                        } else {
                            console.error(`❌ INVALID: Device ${ip} connected to non-switch device ${props.parentSwitch} (role: ${switchDevice.networkRole})`);
                        }
                    } else {
                        console.error(`❌ MISSING: Device ${ip} references non-existent switch ${props.parentSwitch}`);
                    }
                }
            });
            console.log("======================================");
        }
        
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
           
        // Render the hierarchical view
        renderHierarchicalView(svg, zoomLayer, devices, width, height);
        
    }, [devices, customNames, dimensions, subnetGroups, refreshTrigger]);
    
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
            
        // Add info message if no gateway/switch is designated
        const hasNetworkRoleDevice = filteredDevices.some(device => 
            device.ip && (customNames?.[device.ip]?.networkRole === 'gateway' || 
                         customNames?.[device.ip]?.networkRole === 'switch')
        );
        
        if (!hasNetworkRoleDevice) {
            zoomLayer.append("text")
                .attr("x", width / 2)
                .attr("y", 55)
                .attr("text-anchor", "middle")
                .attr("fill", "#9CA3AF")
                .attr("font-size", "12px")
                .text("Tip: Right-click on a device and select 'Edit' to set it as a Gateway or Switch");
        }
        
        // When using subnet grouping, we create a different hierarchical structure
        const useSubnetGrouping = Object.keys(subnetGroups).length > 0;

        // Find any devices that have been designated with a specific network role
        const findNetworkRoleDevices = (role) => {
            return filteredDevices
                .filter(device => device.ip && customNames?.[device.ip]?.networkRole === role)
                .map(device => {
                    // Use device name from customNames if available, then device.name, then IP
                    const deviceName = (device.ip && customNames?.[device.ip]?.name) || device.name || device.ip;
                    return {
                        ...device,
                        name: deviceName,
                        networkRole: role
                    };
                });
        };

        // Find all gateway devices
        const gatewayDevices = findNetworkRoleDevices('gateway');

        // Find all devices marked as switches
        const switchDevices = filteredDevices
            .filter(device => device.ip && customNames?.[device.ip]?.networkRole === 'switch')
            .map(device => ({
                ...device,
                name: (device.ip && customNames?.[device.ip]?.name) || device.name || device.ip,
                networkRole: 'switch'
            }));
            
        // Filter main gateways from gateway devices
        const mainGateways = gatewayDevices.filter(gateway => 
            customNames?.[gateway.ip]?.isMainGateway
        );
          // Create hierarchical data structure for D3 tree layout
        // Create maps to store references to nodes for quick access
        const nodeMap = new Map();
        
        const createHierarchy = () => {
            const root = {
                name: "",
                type: "virtual-root",
                children: []
            };

            // Helper to add a device to the hierarchy
            const addDeviceToHierarchy = (device, parentNode) => {
                const deviceName = customNames?.[device.ip]?.name || device.ip;
                const deviceNode = {
                    ...device,
                    name: deviceName,
                    type: "device",
                    data: device,
                    children: []
                };
                
                if (parentNode.children) {
                    parentNode.children.push(deviceNode);
                } else {
                    parentNode.children = [deviceNode];
                }
                
                nodeMap.set(device.ip, deviceNode);
                return deviceNode;
            };
        
            // Find main gateways first
            const mainGateways = gatewayDevices.filter(gateway => 
                customNames?.[gateway.ip]?.isMainGateway
            );
        
            // Use first main gateway if available, then any gateway, then any switch, or no root
            const rootDevice = mainGateways.length > 0 ? mainGateways[0] : 
                            gatewayDevices.length > 0 ? gatewayDevices[0] : 
                            switchDevices.length > 0 ? switchDevices[0] : null;
        
            // Create the root of our hierarchy
            if (rootDevice) {
                const rootName = customNames?.[rootDevice.ip]?.name || rootDevice.ip;
                const isMain = customNames?.[rootDevice.ip]?.isMainGateway;
                const rootLabel = isMain ? ' (Main Gateway)' : ' (Gateway)';
                
                const rootNode = {
                    ...rootDevice,
                    name: `${rootName}${rootLabel}`,
                    type: "gateway",
                    data: rootDevice,
                    children: []
                };
                
                root.children.push(rootNode);
                nodeMap.set(rootDevice.ip, rootNode);
            }

            // Add all gateway devices except the root
            if (gatewayDevices.length > 1) {
                gatewayDevices
                    .filter(gateway => !rootDevice || gateway.ip !== rootDevice.ip)
                    .forEach(gateway => {
                        const gatewayName = customNames?.[gateway.ip]?.name || gateway.ip;
                        const gatewayNode = {
                            ...gateway,
                            name: `${gatewayName} (Gateway)`,
                            type: "gateway",
                            data: gateway,
                            children: []
                        };
                        
                        root.children.push(gatewayNode);
                        nodeMap.set(gateway.ip, gatewayNode);
                    });
            }            // Add all switch devices under their respective gateways or directly to root
            switchDevices.forEach(switchDevice => {
                const switchName = customNames?.[switchDevice.ip]?.name || switchDevice.ip;
                const switchNode = {
                    ...switchDevice,
                    name: `${switchName} (Switch)`,
                    type: "switch",
                    data: switchDevice,
                    children: []
                };
                
                // Check for connected gateways from the new array format
                const connectedGateways = customNames?.[switchDevice.ip]?.connectedGateways || [];
                
                // Also check legacy parentGateway for backward compatibility
                const parentGatewayIP = customNames?.[switchDevice.ip]?.parentGateway;
                
                // Log the relationships for debugging
                console.log(`CONNECTIONS CHECK: Switch ${switchDevice.ip} gateway connections:`, 
                           Array.isArray(connectedGateways) && connectedGateways.length > 0 
                               ? connectedGateways 
                               : `Legacy parent: ${parentGatewayIP || "none"}`);
                
                // Determine the primary parent node for hierarchy visualization
                // We'll pick the first connected gateway, fallback to parentGateway, or null
                const primaryGatewayIP = 
                    (Array.isArray(connectedGateways) && connectedGateways.length > 0)
                        ? connectedGateways[0]
                        : (parentGatewayIP === "" ? null : parentGatewayIP);
                
                // Find the primary gateway node
                const primaryGatewayNode = primaryGatewayIP ? nodeMap.get(primaryGatewayIP) : null;
                
                // Store all gateway connections for later visualizing connection lines
                switchNode.connectedGateways = [];
                
                // Process all gateway connections for this switch
                const allGatewayConnections = Array.isArray(connectedGateways) && connectedGateways.length > 0
                    ? connectedGateways
                    : parentGatewayIP ? [parentGatewayIP] : [];
                
                allGatewayConnections.forEach(gatewayIP => {
                    if (gatewayIP) {
                        const gatewayNode = nodeMap.get(gatewayIP);
                        if (gatewayNode) {
                            // Add gateway node to switch's connected gateways
                            switchNode.connectedGateways.push({
                                ip: gatewayIP,
                                node: gatewayNode
                            });
                        }
                    }
                });
                
                // Add a visual indicator for switches connected to gateways
                if (switchNode.connectedGateways.length > 0) {
                    switchNode.connectedToGateway = true;
                }
                
                // Only add the switch to its primary parent gateway if the relationship exists
                // For visualization hierarchy, we place it under the first gateway
                if (primaryGatewayIP && primaryGatewayNode) {
                    primaryGatewayNode.children.push(switchNode);
                    switchNode.parent = primaryGatewayNode; // Track parent reference
                    switchNode.primaryGateway = primaryGatewayIP;
                } else {
                    root.children.push(switchNode);
                    
                    // Try to find an appropriate gateway to connect to if no parent specified
                    if ((!primaryGatewayIP || !allGatewayConnections.length) && gatewayDevices.length > 0) {
                        console.log(`Switch ${switchDevice.ip} has no gateway connections but gateways exist; could connect to one`);
                    }
                }
                
                nodeMap.set(switchDevice.ip, switchNode);
            });

            // Add remaining devices under their assigned switches or gateways
            const remainingDevices = filteredDevices.filter(device => 
                !gatewayDevices.some(g => g.ip === device.ip) && 
                !switchDevices.some(s => s.ip === device.ip)
            );

            remainingDevices.forEach(device => {
                // Check if device has an assigned parent switch
                const parentSwitchIP = customNames?.[device.ip]?.parentSwitch;
                const parentSwitchNode = parentSwitchIP ? nodeMap.get(parentSwitchIP) : null;
                
                // If no parent switch, check for parent gateway
                const parentGatewayIP = customNames?.[device.ip]?.parentGateway;
                const parentGatewayNode = parentGatewayIP ? nodeMap.get(parentGatewayIP) : null;
                
                // Add device to its parent, or to root if no parent found
                if (parentSwitchNode) {
                    addDeviceToHierarchy(device, parentSwitchNode);
                } else if (parentGatewayNode) {
                    addDeviceToHierarchy(device, parentGatewayNode);
                } else {
                    addDeviceToHierarchy(device, root);
                }
            });
        
            return d3.hierarchy(root);
        };
        
        const hierarchyRoot = createHierarchy();
        
        // Calculate the tree layout with cluster for better sibling arrangement
        const treeLayout = d3.tree()
            .nodeSize([100, 100]) // Wider node spacing for better readability
            .separation((a, b) => {
                // More space between different types of nodes
                if (a.parent !== b.parent) return 2.5;
                // Regular sibling separation
                return 1.5;
            });
        
        // Apply the layout to the hierarchy
        const treeData = treeLayout(hierarchyRoot);

        // Helper to calculate node dimensions for different shapes
        const getNodeDimensions = (node) => {
            // Check if this is a switch (which uses rectangles)
            const isSwitch = node.data?.networkRole === 'switch' || 
                            (node.data?.ip && customNames?.[node.data.ip]?.networkRole === 'switch');
            
            // Get node size (default to 20 if not specified)
            const size = node.data?.size || 20;
            
            if (isSwitch) {
                return {
                    type: "rect",
                    width: size * 2,
                    height: size * 1.6
                };
            } else {
                return {
                    type: "circle",
                    radius: size
                };
            }
        };
    
        // Helper to calculate intersection with a circle
        const getCircleIntersection = (cx, cy, radius, tx, ty) => {
            const dx = tx - cx;
            const dy = ty - cy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If target is at center of circle, move slightly right
            if (distance === 0) {
                return {
                    x: cx + radius,
                    y: cy
                };
            }
            
            // Calculate the point on the circle's circumference
            return {
                x: cx + (dx * radius) / distance,
                y: cy + (dy * radius) / distance
            };
        };
    
        // Helper to calculate intersection with a rectangle
        const getRectIntersection = (cx, cy, width, height, tx, ty) => {
            const hw = width / 2;   // half width
            const hh = height / 2;  // half height
            const dx = tx - cx;
            const dy = ty - cy;
            
            // Handle case where target is at rectangle's center
            if (dx === 0 && dy === 0) {
                return { x: cx + hw, y: cy };
            }
            
            const angle = Math.atan2(dy, dx);
            
            // Calculate possible intersection points with all edges
            const intersections = [
                // right edge
                {
                    x: cx + hw,
                    y: cy + hw * Math.tan(angle)
                },
                // left edge
                {
                    x: cx - hw,
                    y: cy - hw * Math.tan(angle)
                },
                // top edge
                {
                    x: cx + hh / Math.tan(angle),
                    y: cy - hh
                },
                // bottom edge
                {
                    x: cx - hh / Math.tan(angle),
                    y: cy + hh
                }
            ];
            
            // Find the first intersection point that lies within the bounds of its edge
            return intersections.find(point => {
                // Check if point lies within rectangle bounds
                const validX = point.x >= cx - hw && point.x <= cx + hw;
                const validY = point.y >= cy - hh && point.y <= cy + hh;
                
                // Point must be between source and target
                const betweenX = (dx > 0) ? 
                    (point.x >= cx && point.x <= tx) : 
                    (point.x >= tx && point.x <= cx);
                const betweenY = (dy > 0) ?
                    (point.y >= cy && point.y <= ty) :
                    (point.y >= ty && point.y <= cy);
                    
                return validX && validY && betweenX && betweenY;
            }) || { 
                // Fallback to rectangle center edge if no valid intersection found
                x: dx > 0 ? cx + hw : cx - hw,
                y: cy
            };
        };

        // Custom curve generator for smooth paths between nodes with accurate boundary intersections
        const linkGenerator = (d) => {
            const sourceX = d.source.x;
            const sourceY = d.source.y;
            const targetX = d.target.x;
            const targetY = d.target.y;

            // Calculate boundary intersections for both nodes
            const sourceDim = getNodeDimensions(d.source);
            const targetDim = getNodeDimensions(d.target);

            // Calculate intersection points for both ends
            let startPoint;
            if (sourceDim.type === "circle") {
                startPoint = getCircleIntersection(
                    sourceX, sourceY, sourceDim.radius, targetX, targetY
                );
            } else {
                startPoint = getRectIntersection(
                    sourceX, sourceY, sourceDim.width, sourceDim.height, targetX, targetY
                );
            }

            let endPoint;
            if (targetDim.type === "circle") {
                endPoint = getCircleIntersection(
                    targetX, targetY, targetDim.radius, sourceX, sourceY
                );
            } else {
                endPoint = getRectIntersection(
                    targetX, targetY, targetDim.width, targetDim.height, sourceX, sourceY
                );
            }

            // Calculate angle and distance between points
            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            // Dynamic tension based on distance and connection type
            const baseTension = Math.min(0.3, distance * 0.001); // Scale tension with distance
            let tension = baseTension;

            // Calculate midpoint
            const midX = (startPoint.x + endPoint.x) / 2;
            const midY = (startPoint.y + endPoint.y) / 2;

            // Calculate control points for smooth curve
            const cp1x = startPoint.x + (midX - startPoint.x) * 0.5;
            const cp1y = startPoint.y;
            const cp2x = endPoint.x - (endPoint.x - midX) * 0.5;
            const cp2y = endPoint.y;

            // Create SVG path with adjusted control points for a smoother curve
            return `M${startPoint.x},${startPoint.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endPoint.x},${endPoint.y}`;
        };
        
        // Link style control function
        const getLinkStyle = (link) => {
            const baseStyle = {
                stroke: '#999',
                strokeWidth: 2,
                strokeOpacity: 0.6,
                transition: 'all 0.3s ease-in-out'
            };
            
            // Check source and target types for special styling
            if (link.source.data && link.target.data) {
                const sourceType = link.source.data.type;
                const targetType = link.target.data.type;
                
                if (sourceType === "gateway" && targetType === "switch") {
                    return {
                        ...baseStyle,
                        stroke: '#10b981',  // Green for gateway-switch connections
                        strokeWidth: 2.5,
                        strokeOpacity: 0.7
                    };
                } else if (sourceType === "switch" && targetType === "device") {
                    return {
                        ...baseStyle,
                        stroke: '#6366f1',  // Purple for switch-device connections
                        strokeWidth: 1.5,
                        strokeOpacity: 0.6
                    };
                }
            }
            
            return baseStyle;
        };

        // Calculate bounds excluding virtual root
        const bounds = treeData.descendants()
            .filter(node => node.data.type !== "virtual-root")
            .reduce((acc, node) => {
                acc.minX = Math.min(acc.minX, node.x);
                acc.maxX = Math.max(acc.maxX, node.x);
                acc.minY = Math.min(acc.minY, node.y);
                acc.maxY = Math.max(acc.maxY, node.y);
                return acc;
            }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
            
        // Create group for all network elements that need to be positioned together
        const networkGroup = zoomLayer.append("g");
        
        // Initialize linkGroup for the links
        const linkGroup = networkGroup.append("g");
          // Create tree links with proper styling and ensure they're behind nodes
        const links = linkGroup.append("g")
            .attr("class", "links")
            .attr("fill", "none")
            .selectAll("path")
            .data(treeData.links().filter(d => d.source.data.type !== "virtual-root"))
            .join("path")
            .attr("d", linkGenerator)  // Use our linkGenerator function directly
            .each(function(d) {
                const style = getLinkStyle(d);
                d3.select(this)
                    .attr("stroke", style.stroke)
                    .attr("stroke-width", style.strokeWidth)
                    .attr("stroke-opacity", style.strokeOpacity)
                    .attr("stroke-dasharray", style.strokeDasharray)
                    .on("mouseover", function() {
                        d3.select(this)
                            .attr("stroke-opacity", 1)
                            .attr("stroke-width", style.strokeWidth + 1);
                    })
                    .on("mouseout", function() {
                        d3.select(this)
                            .attr("stroke-opacity", style.strokeOpacity)
                            .attr("stroke-width", style.strokeWidth);
                    });
            });
            
        // Create additional links for switches connected to multiple gateways
        const additionalLinksData = [];
        
        treeData.descendants().forEach(node => {
            // Check if this node is a switch with multiple gateway connections
            if (node.data.type === "switch" && 
                node.data.connectedGateways && 
                node.data.connectedGateways.length > 0) {
                
                // For each connected gateway that is not the primary parent in the tree
                node.data.connectedGateways.forEach(gatewayConnection => {
                    // Skip the primary parent connection which is already rendered by the tree layout
                    if (node.data.primaryGateway !== gatewayConnection.ip) {
                        additionalLinksData.push({
                            source: gatewayConnection.node,
                            target: node,
                            isAdditionalConnection: true,
                            connectionType: "gateway-to-switch"
                        });
                    }
                });
            }
            
            // Check if this node is a switch with switch-to-switch connections
            if (node.data.type === "switch" && 
                customNames?.[node.data.ip]?.connectedSwitches && 
                customNames[node.data.ip].connectedSwitches.length > 0) {
                
                // For each connected switch
                customNames[node.data.ip].connectedSwitches.forEach(connectedSwitchIP => {
                    // Find the connected switch node
                    const connectedSwitchNode = nodeMap.get(connectedSwitchIP);
                    
                    if (connectedSwitchNode) {
                        // Create connection (only create one direction to avoid duplicates)
                        if (node.data.ip < connectedSwitchIP) {
                            additionalLinksData.push({
                                source: node,
                                target: connectedSwitchNode,
                                isAdditionalConnection: true,
                                connectionType: "switch-to-switch"
                            });
                        }
                    }
                });
            }
            
            // Check if this node is a gateway with gateway-to-gateway connections
            if (node.data.type === "gateway" && 
                customNames?.[node.data.ip]?.connectedGateways && 
                customNames[node.data.ip].connectedGateways.length > 0) {
                
                // For each connected gateway
                customNames[node.data.ip].connectedGateways.forEach(connectedGatewayIP => {
                    // Find the connected gateway node
                    const connectedGatewayNode = nodeMap.get(connectedGatewayIP);
                    
                    if (connectedGatewayNode) {
                        // Create connection (only create one direction to avoid duplicates)
                        if (node.data.ip < connectedGatewayIP) {
                            additionalLinksData.push({
                                source: node,
                                target: connectedGatewayNode,
                                isAdditionalConnection: true,
                                connectionType: "gateway-to-gateway"
                            });
                        }
                    }
                });
            }
        });
        
        // Add these additional connections with appropriate styling
        if (additionalLinksData.length > 0) {
            const additionalLinks = linkGroup.append("g")
                .attr("class", "additional-links")
                .attr("fill", "none")
                .selectAll("path")
                .data(additionalLinksData)
                .join("path")
                .attr("d", linkGenerator)
                .attr("stroke", d => {
                    // Color based on connection type
                    switch(d.connectionType) {
                        case "gateway-to-gateway":
                            return "#10b981"; // Green for gateway connections
                        case "switch-to-switch":
                            return "#6366f1"; // Purple for switch connections
                        case "gateway-to-switch":
                        default:
                            return "#10b981"; // Default green for gateway-switch connections
                    }
                })
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 0.5)
                .attr("stroke-dasharray", d => {
                    // Different dash patterns by connection type
                    switch(d.connectionType) {
                        case "gateway-to-gateway":
                            return "8,3"; // Longer dashes for gateway-to-gateway
                        case "switch-to-switch":
                            return "3,2"; // Short dashes for switch-to-switch
                        default:
                            return "5,3"; // Medium dashes for gateway-to-switch
                    }
                })
                .on("mouseover", function() {
                    d3.select(this)
                        .attr("stroke-opacity", 0.8)
                        .attr("stroke-width", 3);
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .attr("stroke-opacity", 0.5)
                        .attr("stroke-width", 2);
                });
        }
            
        // Create node groups in the same container as the links
        const nodeGroup = networkGroup.append("g");

        const nodeGroups = nodeGroup.selectAll("g")
            .data(treeData.descendants().filter(d => d.data.type !== "virtual-root"))
            .join("g")
            .attr("transform", d => `translate(${d.x},${d.y})`);
        
        // Add different styling based on node type
        nodeGroups.each(function(d) {
            const node = d3.select(this);
            
            // Get device roles using helper function
            const deviceData = d.data.data || {};
            const { isGateway, isSwitch } = determineDeviceRoles(deviceData);

            // Choose color based on type
            const deviceColor = () => {
                if (deviceData.ip && customNames?.[deviceData.ip]?.color) {
                    return customNames[deviceData.ip].color;
                }
                if (isGateway) return "#10b981";
                if (isSwitch) return "#6366f1";
                return "#6b7280"; // Default gray
            };

            const nodeShape = node.append(isSwitch ? "rect" : "circle")
                .attr("fill", deviceColor())
                .attr("stroke", "white")
                .attr("stroke-width", 1.5)
                .attr("cursor", "pointer");
                  // Apply size and shape based on node type
            if (isSwitch) {
                const nodeSize = 20;
                nodeShape
                    .attr("width", nodeSize * 2)
                    .attr("height", nodeSize * 1.6)
                    .attr("x", -nodeSize)
                    .attr("y", -nodeSize * 0.8)
                    .attr("rx", 4)
                    .attr("ry", 4);
                    
                // Special styling for switches connected to gateways
                if (d.data.connectedToGateway || deviceData.ip && customNames?.[deviceData.ip]?.parentGateway) {
                    nodeShape
                        .attr("stroke", "#10b981") // Green border for connected switches
                        .attr("stroke-width", 2.5);
                        
                    // Add a small connector line indicator
                    node.append("line")
                        .attr("x1", 0)
                        .attr("y1", -nodeSize * 0.9)
                        .attr("x2", 0)
                        .attr("y2", -nodeSize * 1.5)
                        .attr("stroke", "#10b981")
                        .attr("stroke-width", 2)
                        .attr("stroke-dasharray", "2,1");
                }
            } else {
                const nodeSize = 16;
                nodeShape.attr("r", nodeSize);
                
                // Special styling for main gateways
                if (isGateway && deviceData.ip && customNames?.[deviceData.ip]?.isMainGateway) {
                    nodeShape
                        .attr("stroke", "#f59e0b") // Gold border for main gateway
                        .attr("stroke-width", 3);
                        
                    // Add star indicator above gateway
                    node.append("text")
                        .attr("x", 0)
                        .attr("y", -nodeSize - 8)
                        .attr("text-anchor", "middle")
                        .attr("font-size", "14px")
                        .attr("fill", "#f59e0b")
                        .text("★");
                }
            }

            // Add device label below node
            node.append("text")
                .attr("text-anchor", "middle")
                .attr("dy", "24")
                .attr("fill", "white")
                .attr("font-size", "10px")
                .attr("pointer-events", "none")
                .text(d => {
                    // Use the name provided in the hierarchy data
                    return d.data.name || "Unknown";
                });

            // Add icon
            try {
                const iconSize = 18;
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

                // Determine icon component based on node type/device info
                let iconComponent;
                
                if (d.data.type === "switch" || 
                    (deviceData.ip && customNames?.[deviceData.ip]?.networkRole === 'switch')) {
                    iconComponent = iconMap.switch || iconMap.network;
                } else if (d.data.type === "gateway" ||
                          (deviceData.ip && customNames?.[deviceData.ip]?.networkRole === 'gateway')) {
                    iconComponent = iconMap.router || iconMap.network;
                } else if (deviceData.ip && customNames?.[deviceData.ip]?.icon) {
                    iconComponent = iconMap[customNames[deviceData.ip].icon];
                } else if (deviceData.vendor) {
                    const vendor = deviceData.vendor.toLowerCase();
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
            }            // Add mouse events
            node
                .on("mouseover", (event) => {
                    if (showTooltip && d.data.data) {
                        const deviceInfo = getDeviceInfo(d.data.data);
                        showTooltip(event, deviceInfo);
                    }
                })
                .on("mouseout", () => {
                    if (hideTooltip) {
                        hideTooltip();
                    }
                })
                .on("click", function(event) {
                    if (onDeviceClick && d.data.data) {
                        // Pass the native event to track right-click
                        onDeviceClick(d.data.data, event.sourceEvent || event);
                    }
                })                .on("contextmenu", function(event) {
                    // Prevent default context menu
                    event.preventDefault();
                    if (onDeviceClick && d.data.data) {
                        // Create a new object with the necessary event properties
                        // We can't modify the original event's button property as it's read-only
                        const eventCopy = {
                            clientX: (event.sourceEvent || event).clientX,
                            clientY: (event.sourceEvent || event).clientY,
                            button: 2, // Right-click button code
                            preventDefault: () => {},
                            stopPropagation: () => {}
                        };
                        onDeviceClick(d.data.data, eventCopy);
                    }
                });
        });
        
        // Center the entire visualization and apply zoom to fit
        const margin = 60;
        const scale = Math.min(
            (width - margin * 2) / (bounds.maxX - bounds.minX),
            (height - margin * 2) / (bounds.maxY - bounds.minY),
            1.5 // Maximum zoom level
        );

        // Calculate translation to center the tree
        const xTranslate = (width / 2) - ((bounds.maxX + bounds.minX) / 2 * scale);
        const yTranslate = margin + 40; // Add some top margin for the title
          networkGroup.attr("transform", `translate(${xTranslate}, ${yTranslate}) scale(${scale})`);
        
        // Legend has been moved to a separate component (NetworkLegend.js)
    };
    
    // Helper function to get device information for tooltips
    const getDeviceInfo = (device) => {
        if (!device) return '';
        
        let info = '';
        
        if (device.ip) {
            info += `IP: ${device.ip}\n`;
        }
        
        if (customNames?.[device.ip]?.name) {
            info += `Name: ${customNames[device.ip].name}\n`;
        }
        
        if (device.mac) {
            info += `MAC: ${device.mac}\n`;
        }
        
        if (device.vendor) {
            info += `Vendor: ${device.vendor}\n`;
        }
        
        if (customNames?.[device.ip]?.networkRole) {
            info += `Role: ${customNames[device.ip].networkRole}\n`;
        }
        
        return info || 'No device information available';
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

export default HierarchicalNetworkView;
