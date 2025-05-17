// Network visualization utility functions shared between different views
import * as d3 from "d3";
import { getMacInfo, getOSInfo } from "../../utils/sshScanUtils";
import { determineDeviceRoles } from "../../utils/deviceManagementUtils";

// Re-export the determineDeviceRoles function
export { determineDeviceRoles };

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
    return ports.some(port => port.includes('22/tcp') && port.includes('open'));
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
        const isMainGateway = connection.target.data?.isMainGateway;
        const isGatewayToSwitch = 
            connection.source.data?.type === "gateway" && 
            connection.target.data?.type === "switch";
        const isSwitchToDevice = 
            connection.source.data?.type === "switch" && 
            connection.target.data?.type === "device";
        
        if (isMainGateway) {
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
