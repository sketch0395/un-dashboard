// Functions shared between different views
import * as d3 from "d3";
import { getMacInfo, getOSInfo } from "../../utils/sshScanUtils";
import { determineDeviceRoles } from "../../utils/deviceManagementUtils";
import { 
    FaServer,
    FaDatabase,
    FaNetworkWired,
    FaShieldAlt,
    FaMicrochip,
    FaDesktop,
    FaMobile,
    FaPrint,
    FaCamera,
    FaRoad
} from "react-icons/fa";

// Re-export the determineDeviceRoles function
export { determineDeviceRoles };

/**
 * Get device type configuration including icon and color
 * This matches the device type system from UnifiedDeviceModal
 */
export const getDeviceTypeConfig = (deviceType) => {
    const deviceTypeConfigs = {
        'Production Server': { icon: FaServer, color: '#10b981' },
        'Development Server': { icon: FaServer, color: '#8b5cf6' },
        'Database': { icon: FaDatabase, color: '#f59e0b' },
        'Switch': { icon: FaNetworkWired, color: '#06b6d4' },
        'Firewall': { icon: FaShieldAlt, color: '#ef4444' },
        'IoT Device': { icon: FaMicrochip, color: '#f97316' },
        'Workstation': { icon: FaDesktop, color: '#6b7280' },
        'Mobile Device': { icon: FaMobile, color: '#ec4899' },
        'Printer': { icon: FaPrint, color: '#84cc16' },
        'Camera': { icon: FaCamera, color: '#14b8a6' },
        'Gateway': { icon: FaRoad, color: '#fbbf24' },
        'Other': { icon: FaMicrochip, color: '#9ca3af' }
    };
    
    return deviceTypeConfigs[deviceType] || deviceTypeConfigs['Other'];
};

/**
 * Enhanced function to determine device icon and color based on device type first, then fallback to vendor
 */
export const getDeviceIconAndColor = (device, customNames) => {
    // First priority: Check if device has a specific device type set
    if (device.ip && customNames?.[device.ip]?.networkRole) {
        const typeConfig = getDeviceTypeConfig(customNames[device.ip].networkRole);
        return {
            iconComponent: typeConfig.icon,
            color: typeConfig.color,
            source: 'deviceType'
        };
    }
    
    // Second priority: Legacy network role mapping
    if (customNames?.[device.ip]?.networkRole === 'switch') {
        return {
            iconComponent: FaNetworkWired,
            color: "#06b6d4",
            source: 'networkRole'
        };
    } else if (customNames?.[device.ip]?.networkRole === 'gateway') {
        return {
            iconComponent: FaRoad,
            color: "#fbbf24",
            source: 'networkRole'
        };
    }
    
    // Third priority: Custom icon stored in device properties
    if (customNames?.[device.ip]?.icon) {
        // Try to map stored icon names to actual components
        const iconMap = {
            'FaServer': FaServer,
            'FaDatabase': FaDatabase,
            'FaNetworkWired': FaNetworkWired,
            'FaShieldAlt': FaShieldAlt,
            'FaMicrochip': FaMicrochip,
            'FaDesktop': FaDesktop,
            'FaMobile': FaMobile,
            'FaPrint': FaPrint,
            'FaCamera': FaCamera,
            'FaRoad': FaRoad
        };
        
        const iconComponent = iconMap[customNames[device.ip].icon];
        if (iconComponent) {
            return {
                iconComponent,
                color: customNames[device.ip].color || "#9ca3af",
                source: 'customIcon'
            };
        }
    }
    
    // Fourth priority: Vendor-based icon (legacy fallback)
    if (device.vendor) {
        const vendor = device.vendor.toLowerCase();
        if (vendor.includes('cisco')) {
            return { iconComponent: FaNetworkWired, color: "#06b6d4", source: 'vendor' };
        } else if (vendor.includes('raspberry')) {
            return { iconComponent: FaMicrochip, color: "#10b981", source: 'vendor' };
        } else if (vendor.includes('apple')) {
            return { iconComponent: FaDesktop, color: "#6b7280", source: 'vendor' };
        } else if (vendor.includes('intel')) {
            return { iconComponent: FaMicrochip, color: "#3b82f6", source: 'vendor' };
        } else if (vendor.includes('nvidia')) {
            return { iconComponent: FaMicrochip, color: "#10b981", source: 'vendor' };
        } else if (vendor.includes('samsung')) {
            return { iconComponent: FaMobile, color: "#ec4899", source: 'vendor' };
        }
    }
    
    // Default fallback
    return {
        iconComponent: FaMicrochip,
        color: "#9ca3af",
        source: 'default'
    };
};

// Verify and validate parent-child relationships
export const validateNetworkRelationships = (devices, customNames) => {
    if (!customNames) return; // Nothing to validate
    
    console.log("Validating network relationships...");
    let changes = false;
    
    // Create a copy of customNames to work with
    const validatedNames = { ...customNames };
    
    // First pass: validate that all switches have valid gateway parents
    Object.entries(validatedNames).forEach(([ip, props]) => {        // If this is a switch, make sure it has a valid parent gateway
        if (props.networkRole === 'switch' || props.networkRole === 'Switch') {
            if (props.parentGateway) {
                const parentProps = validatedNames[props.parentGateway];
                  // If parent doesn't exist or isn't a gateway, clear the relationship
                if (!parentProps || (parentProps.networkRole !== 'gateway' && parentProps.networkRole !== 'Gateway')) {
                    console.warn(`Invalid parent gateway for switch ${ip}: ${props.parentGateway}`, 
                               parentProps ? `Parent role: ${parentProps.networkRole}` : 'Parent not found');
                    validatedNames[ip] = { ...props, parentGateway: null };
                    changes = true;
                } else {
                    console.log(`Valid relationship: Switch ${ip} → Gateway ${props.parentGateway}`);
                }
            } else {
                console.log(`Switch ${ip} has no parent gateway assigned`);
            }
            
            // Validate connectedGateways array
            if (props.connectedGateways && Array.isArray(props.connectedGateways)) {
                const validConnectedGateways = props.connectedGateways.filter(gatewayIP => {
                    const gatewayProps = validatedNames[gatewayIP];
                    return gatewayProps && gatewayProps.networkRole === 'gateway';
                });
                
                // If any invalid gateways were removed, update the array
                if (validConnectedGateways.length !== props.connectedGateways.length) {
                    console.warn(`Removed ${props.connectedGateways.length - validConnectedGateways.length} invalid gateway connections for switch ${ip}`);
                    validatedNames[ip] = { ...props, connectedGateways: validConnectedGateways };
                    changes = true;
                }
            }
            
            // Validate connectedSwitches array 
            if (props.connectedSwitches && Array.isArray(props.connectedSwitches)) {
                const validConnectedSwitches = props.connectedSwitches.filter(switchIP => {
                    const switchProps = validatedNames[switchIP];
                    return switchProps && switchProps.networkRole === 'switch';
                });
                
                // If any invalid switches were removed, update the array
                if (validConnectedSwitches.length !== props.connectedSwitches.length) {
                    console.warn(`Removed ${props.connectedSwitches.length - validConnectedSwitches.length} invalid switch connections for switch ${ip}`);
                    validatedNames[ip] = { ...props, connectedSwitches: validConnectedSwitches };
                    changes = true;
                }
            }
        }
        
        // If this is a gateway, validate its connections
        if (props.networkRole === 'gateway') {
            // Validate connectedGateways array
            if (props.connectedGateways && Array.isArray(props.connectedGateways)) {
                // Filter to keep only valid gateway connections
                // For regular gateways, allow connection to main gateways
                // For main gateways, allow connection to other main gateways
                const validConnectedGateways = props.connectedGateways.filter(gatewayIP => {
                    const gatewayProps = validatedNames[gatewayIP];
                    
                    if (!gatewayProps || gatewayProps.networkRole !== 'gateway') {
                        return false;
                    }
                    
                    // If this is a main gateway, it can connect to other main gateways
                    if (props.isMainGateway) {
                        return gatewayProps.isMainGateway;
                    }
                    
                    // If this is a regular gateway, it can connect to main gateways
                    return gatewayProps.isMainGateway;
                });
                
                // If any invalid gateways were removed, update the array
                if (validConnectedGateways.length !== props.connectedGateways.length) {
                    console.warn(`Removed ${props.connectedGateways.length - validConnectedGateways.length} invalid gateway connections for gateway ${ip}`);
                    validatedNames[ip] = { ...props, connectedGateways: validConnectedGateways };
                    changes = true;
                }
            }
            
            // Validate connectedSwitches array 
            if (props.connectedSwitches && Array.isArray(props.connectedSwitches)) {
                const validConnectedSwitches = props.connectedSwitches.filter(switchIP => {
                    const switchProps = validatedNames[switchIP];
                    return switchProps && switchProps.networkRole === 'switch';
                });
                
                // If any invalid switches were removed, update the array
                if (validConnectedSwitches.length !== props.connectedSwitches.length) {
                    console.warn(`Removed ${props.connectedSwitches.length - validConnectedSwitches.length} invalid switch connections for gateway ${ip}`);
                    validatedNames[ip] = { ...props, connectedSwitches: validConnectedSwitches };
                    changes = true;
                }
            }
        }
        
        // If this is a regular device, ensure it has a valid parent switch
        if (!props.networkRole && props.parentSwitch) {
            const parentProps = validatedNames[props.parentSwitch];
            
            // If parent doesn't exist or isn't a switch, clear the relationship
            if (!parentProps || parentProps.networkRole !== 'switch') {
                console.warn(`Invalid parent switch for device ${ip}: ${props.parentSwitch}`);
                validatedNames[ip] = { ...props, parentSwitch: null };
                changes = true;
            }
        }
          // Only regular gateways should have their parent relationships removed
        // Main gateways can have sub-gateways connected to them
        if (props.networkRole === 'gateway' && !props.isMainGateway && (props.parentGateway || props.parentSwitch)) {
            console.warn(`Regular gateway ${ip} has invalid parent relationships; removing them`);
            validatedNames[ip] = { 
                ...props, 
                parentGateway: null,
                parentSwitch: null
            };
            changes = true;
        }
        
        // For gateway with parent gateway - ensure the parent is a main gateway
        if (props.networkRole === 'gateway' && props.parentGateway) {
            const parentProps = validatedNames[props.parentGateway];
            if (!parentProps || parentProps.networkRole !== 'gateway' || !parentProps.isMainGateway) {
                console.warn(`Gateway ${ip} is connected to a non-main gateway or invalid device; removing connection`);
                validatedNames[ip] = {
                    ...props,
                    parentGateway: null
                };
                changes = true;
            } else {
                console.log(`Valid relationship: Sub-gateway ${ip} → Main Gateway ${props.parentGateway}`);
            }
        }
    });      // Look for switches with missing parent gateways and try to auto-fix if possible
    if (Object.keys(devices || {}).length > 0) {
        const gatewayIPs = Object.entries(validatedNames)
            .filter(([_, props]) => props.networkRole === 'gateway')
            .map(([ip]) => ip);
            
        console.log(`Found ${gatewayIPs.length} gateway(s) for auto-assignment:`, gatewayIPs);
            
        // If there's at least one gateway available, assign switches without parents to it
        if (gatewayIPs.length > 0) {
            const defaultGateway = gatewayIPs[0];
            
            const switchesWithoutParents = Object.entries(validatedNames)
                .filter(([_, props]) => props.networkRole === 'switch' && !props.parentGateway);
                
            console.log(`Found ${switchesWithoutParents.length} switches without parent gateways`);
            
            switchesWithoutParents.forEach(([ip, props]) => {
                console.log(`Auto-fixing: Assigning switch ${ip} to default gateway ${defaultGateway}`);
                validatedNames[ip] = { ...props, parentGateway: defaultGateway };
                changes = true;
            });
        }
    }
    
    if (changes) {
        console.log("Network relationship issues found and fixed");
        // Save the fixed relationships back to localStorage
        localStorage.setItem("customDeviceProperties", JSON.stringify(validatedNames));
        return validatedNames;
    }
    
    return null; // No changes needed
};

// Process device data to ensure MAC and vendor info is available
export const processDeviceData = (device) => {
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

// Calculate optimal node size based on device counts
export const calculateNodeSize = (count) => {
    if (count <= 48) return 22; // Small (1-48 devices)
    if (count <= 96) return 18; // Medium (49-96 devices)
    if (count <= 128) return 14; // Large (97-128 devices)
    if (count <= 256) return 10; // Extra large (129-256 devices)
    return 8; // Fallback for extremely large networks (>256)
};

// Determine minimum distance between nodes based on total count
export const calculateMinDistance = (count) => {
    if (count <= 48) return 60;
    if (count <= 96) return 45;
    if (count <= 128) return 35; 
    if (count <= 256) return 25;
    return 20;
};

// Function to get connection status
export const getConnectionStatus = (connection) => {
    if (!connection) return 'unknown';
    
    // Determine status based on connection properties
    if (connection.health >= 90) return 'active';
    if (connection.health >= 50) return 'degraded';
    return 'inactive';
};

// Function to determine device status
export const getDeviceStatus = (device) => {
    if (!device) return 'unknown';
    
    // Check if device has active ports
    const hasActivePorts = device.ports?.some(port => port.includes('open'));
    // Check if device has recent activity
    const hasRecentActivity = device.lastSeen && (Date.now() - new Date(device.lastSeen).getTime() < 24 * 60 * 60 * 1000);
    
    if (hasActivePorts && hasRecentActivity) return 'active';
    if (hasActivePorts || hasRecentActivity) return 'degraded';
    return 'inactive';
};

// Format ports for display
export const formatPorts = (ports) => {
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

// Check if SSH is available on device
export const isSSHAvailable = (device) => {
    if (!device || !device.ports) return false;
    
    // Check if there's any port entry that contains port 22 (SSH)
    const ports = Array.isArray(device.ports) ? device.ports : [];
    return ports.some(port => port.includes('22/tcp') && (port.includes('open') || port.includes('filtered')));
};

// Group devices by subnet (extract subnet from IP)
export const groupDevicesBySubnet = (devices, customNames) => {
    const subnets = {};
    
    // Helper to extract subnet from IP
    const getSubnet = (ip) => {
        if (!ip) return "Unknown";
        // Extract the first three octets to get the /24 subnet
        const match = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
        return match ? `${match[1]}.0/24` : "Unknown";
    };
    
    // First pass: identify gateways for each subnet
    const subnetGateways = {};
    devices.forEach(device => {
        if (device.ip && customNames?.[device.ip]?.networkRole === 'gateway') {
            const subnet = getSubnet(device.ip);
            if (!subnetGateways[subnet]) {
                subnetGateways[subnet] = device;
            }
        }
    });
    
    // Group devices by subnet
    devices.forEach(device => {
        const subnet = getSubnet(device.ip);
        
        if (!subnets[subnet]) {
            subnets[subnet] = {
                name: subnet,
                devices: [],
                gateway: subnetGateways[subnet] || null
            };
        }
        
        subnets[subnet].devices.push(device);
    });
    
    return subnets;
};

// Function to get link style 
export const getLinkStyle = (connection) => {
    // For hierarchical view links
    if (connection.source && connection.target) {
        const isMainGateway = connection.source.data?.isMainGateway || connection.target.data?.isMainGateway;
        const isMainToSubGateway = 
            connection.source.data?.type === "gateway" && 
            connection.target.data?.type === "gateway" &&
            connection.source.data?.isMainGateway;
        const isGatewayToSwitch = 
            connection.source.data?.type === "gateway" && 
            connection.target.data?.type === "switch";
        const isSwitchToDevice = 
            connection.source.data?.type === "switch" && 
            connection.target.data?.type === "device";
        
        if (isMainToSubGateway) {
            return {
                stroke: '#f59e0b',  // Gold color for main gateway to sub-gateway connections
                strokeWidth: 2.5,
                strokeOpacity: 0.8,
                strokeDasharray: '7,3',
                transition: 'all 0.3s ease-in-out'
            };
        } else if (isMainGateway) {
            return {
                stroke: '#f59e0b',  // Gold color for main gateway connections
                strokeWidth: 2,
                strokeOpacity: 0.8,
                transition: 'all 0.3s ease-in-out'
            };
        } else if (isGatewayToSwitch) {
            return {
                stroke: '#10b981',  // Green for gateway-switch connections
                strokeWidth: 2,
                strokeOpacity: 0.7,
                transition: 'all 0.3s ease-in-out'
            };
        } else if (isSwitchToDevice) {
            return {
                stroke: '#6366f1',  // Purple for switch-device connections
                strokeWidth: 1.5,
                strokeOpacity: 0.6,
                transition: 'all 0.3s ease-in-out'
            };
        }
    }

    // For regular connections
    const baseStyle = {
        stroke: '#999',
        strokeWidth: 2,
        strokeOpacity: 0.6,
        transition: 'all 0.3s ease-in-out'
    };

    const status = getConnectionStatus(connection);

    switch (status) {
        case 'active':
            return {
                ...baseStyle,
                stroke: '#4CAF50',
                strokeWidth: 3,
                strokeOpacity: 0.8
            };
        case 'inactive':
            return {
                ...baseStyle,
                stroke: '#f44336',
                strokeOpacity: 0.4,
                strokeDasharray: '5,5'
            };
        case 'degraded':
            return {
                ...baseStyle,
                stroke: '#ff9800',
                strokeWidth: 2.5,
                strokeDasharray: '3,3'
            };
        default:
            return baseStyle;
    }
};

// Helper to get device information for tooltips
export const getDeviceInfo = (device, customNames) => {
    if (!device) return '';
    
    const enhancedDevice = processDeviceData(device);
    const status = getDeviceStatus(device);
    const macInfo = getMacInfo(device);
    const osInfo = getOSInfo(device);
    
    return `
        Device: ${customNames?.[device.ip]?.name || device.ip}
        Status: ${status.charAt(0).toUpperCase() + status.slice(1)}
        IP: ${device.ip || 'Unknown'}
        MAC: ${macInfo?.address || 'Unknown'}
        Vendor: ${enhancedDevice.vendor || 'Unknown'}
        OS: ${osInfo || 'Unknown'}
        ${getConnectionInfo(device)}
    `;
};

// Function to get connection information
export const getConnectionInfo = (device) => {
    // If there's no connection info, check port status
    if (!device.ports || !Array.isArray(device.ports)) {
        return 'No connection information available';
    }

    const openPorts = device.ports.filter(port => port.includes('open'));
    const closedPorts = device.ports.filter(port => port.includes('closed'));
    const filteredPorts = device.ports.filter(port => port.includes('filtered'));

    return `
        Connection Status:
        ${openPorts.length} Open Ports
        ${closedPorts.length} Closed Ports
        ${filteredPorts.length} Filtered Ports
        ${formatPorts(device.ports)}
    `;
};
