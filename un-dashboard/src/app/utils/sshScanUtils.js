/**
 * SSH Scan Utilities
 * Functions for detecting and connecting to SSH devices on the network
 */

/**
 * Check if a device has SSH available
 * @param {Object} device - Device object from network scan
 * @returns {Object} SSH status information
 */
export const getSSHStatus = (device) => {
    if (!device) return { available: false };
    
    // Check if we have enhanced SSH info from our improved server detection
    if (device.sshAvailable) {
        return {
            available: true,
            version: device.sshService?.version || "SSH",
            auth: device.sshAuthMethods || []
        };
    }
    
    // Legacy check for SSH availability
    if (device.ports) {
        if (Array.isArray(device.ports)) {
            const sshPort = device.ports.find(port => 
                typeof port === 'string' &&
                port.includes('22/tcp') &&
                port.includes('open') &&
                port.includes('ssh')
            );
            
            if (sshPort) {
                const versionMatch = sshPort.match(/ssh\s+(.*?)($|\s)/i);
                return {
                    available: true,
                    version: versionMatch ? versionMatch[1] : "SSH"
                };
            }
        }
        
        if (typeof device.ports === 'object') {
            const sshPort = Object.entries(device.ports).find(([key, value]) =>
                (key === '22' || key === 22) &&
                typeof value === 'string' &&
                !value.toLowerCase().includes('filtered') &&
                !value.toLowerCase().includes('closed')
            );
            
            if (sshPort) {
                return {
                    available: true,
                    version: sshPort[1].includes('ssh') ? sshPort[1].split('ssh')[1].trim() : "SSH"
                };
            }
        }
    }
    
    return { available: false };
};

/**
 * Count SSH-enabled devices in a list
 * @param {Array} devices - List of device objects
 * @returns {Number} Count of SSH-enabled devices
 */
export const countSSHDevices = (devices) => {
    if (!Array.isArray(devices)) return 0;
    return devices.filter(device => getSSHStatus(device).available).length;
};

/**
 * Get recommended SSH login credentials based on device information
 * @param {Object} device - Device object from network scan
 * @returns {Object} Recommended username/password if available
 */
export const getSSHRecommendedCredentials = (device) => {
    if (!device || !getSSHStatus(device).available) {
        return { username: '', password: '' };
    }
    
    // This could be expanded with device fingerprinting logic
    // to suggest default credentials based on device type
    
    // Default recommendations based on device type/vendor detection
    if (device.vendor) {
        const vendorLower = device.vendor.toLowerCase();
        
        if (vendorLower.includes('mikrotik')) {
            return { username: 'admin', password: '' };
        }
        
        if (vendorLower.includes('cisco')) {
            return { username: 'cisco', password: 'cisco' };
        }
        
        if (vendorLower.includes('ubuntu') || 
            (device.sshService && device.sshService.version && 
             device.sshService.version.toLowerCase().includes('ubuntu'))) {
            return { username: 'ubuntu', password: '' };
        }
    }
    
    // Default suggestion
    return { username: 'admin', password: '' };
};

export default {
    getSSHStatus,
    countSSHDevices,
    getSSHRecommendedCredentials
};