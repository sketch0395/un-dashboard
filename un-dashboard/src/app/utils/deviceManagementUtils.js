/**
 * Utility functions for managing device updates and hierarchy
 */

/**
 * Updates a device's custom properties in localStorage
 * @param {Object} device - The device object to update
 * @param {string} device.ip - The device's IP address
 * @param {string} [device.name] - The device's custom name
 * @param {string} [device.category] - The device's category
 * @param {string} [device.networkRole] - The device's network role (gateway, switch, null)
 * @param {string} [device.parentGateway] - The parent gateway's IP (for switches)
 * @param {string} [device.parentSwitch] - The parent switch's IP (for regular devices)
 * @param {Array} [device.notes] - Array of note objects
 * @returns {Object} The updated custom properties
 */
export const updateDeviceProperties = (device) => {
    if (!device || !device.ip) return null;

    try {
        // Get existing custom properties
        const storedProps = localStorage.getItem("customDeviceProperties") || "{}";
        const customProps = JSON.parse(storedProps);            // IMPORTANT: Don't override or set parent relationships to null here
        // Use the values directly from the device object
        
        console.log(`Raw device values being saved for "${device.ip}":`);
        console.log(`- networkRole: ${device.networkRole}`);
        console.log(`- parentGateway: "${device.parentGateway}"`);
        console.log(`- parentSwitch: "${device.parentSwitch}"`);

        // For switches, ensure parentGateway is preserved as-is
        if (device.networkRole === 'switch') {
            console.log(`Preserving parent gateway "${device.parentGateway}" for switch ${device.ip}`);
        }
        
        // For regular devices, ensure parentSwitch is preserved as-is
        if (!device.networkRole || device.networkRole !== 'gateway') {
            console.log(`Preserving parent switch "${device.parentSwitch}" for device ${device.ip}`);
        }
        
        // Update the properties for this device - use the parent relationships directly from device
        customProps[device.ip] = {
            ...customProps[device.ip],
            name: device.name,
            category: device.category,
            networkRole: device.networkRole,
            // Ensure we're setting the correct parent relationships based on role
            parentGateway: device.networkRole === 'switch' ? device.parentGateway : null,
            parentSwitch: (!device.networkRole || device.networkRole !== 'gateway' && device.networkRole !== 'switch') ? 
                          device.parentSwitch : null,
            notes: device.notes || [],
            icon: device.icon,
            color: device.color,
            isMainGateway: device.isMainGateway || false,
            history: device.history || []
        };
        
        // Additional debug validation check
        if (device.networkRole === 'switch' && device.parentGateway) {
            // Verify the parent was actually saved
            if (customProps[device.ip].parentGateway !== device.parentGateway) {
                console.error(`ERROR: Failed to save parent gateway "${device.parentGateway}" for switch ${device.ip}`);
                // Force it to be correct
                customProps[device.ip].parentGateway = device.parentGateway;
            }
        }
        
        // Debug output for troubleshooting
        console.log("Saved device properties:", device.ip, customProps[device.ip]);

        // Save back to localStorage
        localStorage.setItem("customDeviceProperties", JSON.stringify(customProps));
        return customProps;
    } catch (error) {
        console.error("Error updating device properties:", error);
        return null;
    }
};

/**
 * Gets the full device hierarchy information including parent devices, children, and adjacent gateways
 * @param {string} deviceIp - The IP of the device to get hierarchy for
 * @param {Object} [customNames] - Optional custom device properties, if not provided will be loaded from localStorage
 * @returns {Object} Object containing parents, children, and adjacent gateways of the device
 */
export const getDeviceHierarchy = (deviceIp, customNames = null) => {
    try {
        // Get properties either from parameter or localStorage
        const customProps = customNames || JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
        const device = customProps[deviceIp];
        if (!device) return { parents: [], children: [], adjacentGateways: [] };

        const hierarchy = {
            parents: [],
            children: [],
            adjacentGateways: []
        };

        // Build parent hierarchy
        if (device.networkRole === 'switch' && device.parentGateway) {
            const gateway = customProps[device.parentGateway];
            if (gateway) {
                hierarchy.parents.push({
                    ip: device.parentGateway,
                    name: gateway.name || device.parentGateway,
                    role: 'gateway'
                });
            }
        } else if (!device.networkRole && (device.parentSwitch || device.parentGateway)) {
            if (device.parentSwitch) {
                const parentSwitch = customProps[device.parentSwitch];
                if (parentSwitch) {
                    hierarchy.parents.push({
                        ip: device.parentSwitch,
                        name: parentSwitch.name || device.parentSwitch,
                        role: 'switch'
                    });

                    // Add the gateway if the parent switch has one
                    if (parentSwitch.parentGateway) {
                        const gateway = customProps[parentSwitch.parentGateway];
                        if (gateway) {
                            hierarchy.parents.push({
                                ip: parentSwitch.parentGateway,
                                name: gateway.name || parentSwitch.parentGateway,
                                role: 'gateway'
                            });
                        }
                    }
                }
            } else if (device.parentGateway) {
                const gateway = customProps[device.parentGateway];
                if (gateway) {
                    hierarchy.parents.push({
                        ip: device.parentGateway,
                        name: gateway.name || device.parentGateway,
                        role: 'gateway'
                    });
                }
            }
        }

        // Find children (devices connected to this gateway/switch)
        Object.entries(customProps).forEach(([ip, props]) => {
            if (ip === deviceIp) return; // Skip self

            if (props.parentGateway === deviceIp) {
                hierarchy.children.push({
                    ip,
                    name: props.name || ip,
                    role: props.networkRole || 'switch'
                });
            } else if (props.parentSwitch === deviceIp) {
                hierarchy.children.push({
                    ip,
                    name: props.name || ip,
                    role: 'device'
                });
            }
        });

        // If this is a main gateway, find other main gateways
        if (device.networkRole === 'gateway' && device.isMainGateway) {
            Object.entries(customProps).forEach(([ip, props]) => {
                if (ip === deviceIp) return; // Skip self

                if (props.networkRole === 'gateway' && props.isMainGateway) {
                    hierarchy.adjacentGateways.push({
                        ip,
                        name: props.name || ip,
                        role: 'gateway'
                    });
                }
            });
        }

        return hierarchy;
    } catch (error) {
        console.error("Error getting device hierarchy:", error);
        return { parents: [], children: [], adjacentGateways: [] };
    }
};

/**
 * Checks if adding a connection would create a circular dependency
 * @param {string} sourceIp - The IP of the source device
 * @param {string} targetIp - The IP of the target device
 * @param {string} connectionType - The type of connection ('gateway' or 'switch')
 * @returns {boolean} True if the connection would create a circular dependency
 */
export const wouldCreateCircularDependency = (sourceIp, targetIp, connectionType) => {
    try {
        const customProps = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
        const visited = new Set();

        const checkDependencies = (currentIp) => {
            if (visited.has(currentIp)) return false;
            visited.add(currentIp);

            const device = customProps[currentIp];
            if (!device) return false;

            // Check if this device points back to the source
            if (connectionType === 'gateway' && device.parentSwitch === sourceIp) return true;
            if (connectionType === 'switch' && device.parentGateway === sourceIp) return true;

            // Recursively check parent devices
            if (device.parentGateway && checkDependencies(device.parentGateway)) return true;
            if (device.parentSwitch && checkDependencies(device.parentSwitch)) return true;

            return false;
        };

        return checkDependencies(targetIp);
    } catch (error) {
        console.error("Error checking circular dependency:", error);
        return true; // Fail safe - prevent the connection if we can't verify
    }
};

/**
 * Gets all devices in a specific role
 * @param {'gateway'|'switch'|'device'} role - The role to filter by
 * @returns {Array} Array of devices with the specified role
 */
export const getDevicesByRole = (role) => {
    try {
        const customProps = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
        return Object.entries(customProps)
            .filter(([_, props]) => {
                if (role === 'device') {
                    return !props.networkRole;
                }
                return props.networkRole === role;
            })
            .map(([ip, props]) => ({
                ip,
                name: props.name || ip,
                ...props
            }));
    } catch (error) {
        console.error("Error getting devices by role:", error);
        return [];
    }
};

/**
 * Determines the roles (gateway/switch) for a device
 * @param {Object} device - The device object to check
 * @param {Object} [customProps] - Optional custom device properties, if not provided will be loaded from localStorage
 * @returns {Object} Object containing isGateway and isSwitch boolean flags
 */
export const determineDeviceRoles = (device) => {
    try {
        if (!device) return { isGateway: false, isSwitch: false };
        
        // Handle both regular device objects and those nested under .data
        const deviceData = device.data || device;
        
        // Get properties either from parameter or localStorage
        const customProps = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
        
        // Check if it's a gateway
        const isGateway = 
            deviceData?.type === "gateway" || 
            (deviceData?.networkRole === 'gateway') ||
            (deviceData.ip && customProps?.[deviceData.ip]?.networkRole === 'gateway');
            
        // Check if it's a switch
        const isSwitch = 
            deviceData?.type === "switch" || 
            (deviceData?.networkRole === 'switch') ||
            (deviceData.ip && customProps?.[deviceData.ip]?.networkRole === 'switch');
            
        // Debug output for troubleshooting
        if (isGateway || isSwitch) {
            console.log(`Device role determined - IP: ${deviceData.ip}, Gateway: ${isGateway}, Switch: ${isSwitch}`);
        }
        
        return { isGateway, isSwitch };
    } catch (error) {
        console.error("Error determining device roles:", error);
        return { isGateway: false, isSwitch: false };
    }
};

// All utility functions have been merged with their implementations above
