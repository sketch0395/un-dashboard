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
    if (device.ports) {        if (Array.isArray(device.ports)) {
            const sshPort = device.ports.find(port => 
                typeof port === 'string' &&
                port.includes('22/tcp') &&
                (port.includes('open') || port.includes('filtered')) &&
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
 * Extract MAC address information from a device
 * @param {Object} device - Device object from network scan
 * @returns {Object} MAC address information with address and vendor
 */
export const getMacInfo = (device) => {
    if (!device) return { available: false };
    
    const macInfo = {
        available: false,
        address: '',
        vendor: ''
    };
    
    // Check if MAC address is directly available
    if (device.mac) {
        macInfo.available = true;
        macInfo.address = device.mac;
        
        // Get vendor information if available - check all possible locations
        if (device.vendor) {
            macInfo.vendor = device.vendor;
        } else if (device.macInfo && device.macInfo.vendor) {
            macInfo.vendor = device.macInfo.vendor;
        }
        
        return macInfo;
    }
    
    // Check various locations where nmap might put MAC info
    if (device.addresses) {
        const macAddress = device.addresses.find(addr => 
            addr.addrtype === 'mac' || addr.type === 'mac'
        );
        
        if (macAddress) {
            macInfo.available = true;
            macInfo.address = macAddress.addr || macAddress.address || '';
            macInfo.vendor = macAddress.vendor || device.vendor || '';
            return macInfo;
        }
    }
    
    return macInfo;
};

/**
 * Extract OS information from a device
 * @param {Object} device - Device object from network scan
 * @returns {Object} OS information including name, accuracy and type
 */
export const getOSInfo = (device) => {
    if (!device) return { available: false };
    
    const osInfo = {
        available: false,
        name: '',
        accuracy: 0,
        type: '',
        detail: {}
    };
    
    // First check for osDetails from nmap
    if (device.osDetails) {
        osInfo.available = true;
        osInfo.name = device.osDetails.name || 'Unknown OS';
        osInfo.accuracy = device.osDetails.accuracy || 0;
        osInfo.detail = { ...device.osDetails };
        return osInfo;
    }
    
    // Direct OS property
    if (device.os) {
        osInfo.available = true;
        
        // Handle string format
        if (typeof device.os === 'string') {
            osInfo.name = device.os;
            osInfo.accuracy = 100;
            return osInfo;
        }
        
        // Handle object format from nmap
        if (typeof device.os === 'object') {
            if (device.os.name) {
                osInfo.name = device.os.name;
            }
            if (device.os.accuracy) {
                osInfo.accuracy = parseInt(device.os.accuracy) || 0;
            }
            if (device.os.type) {
                osInfo.type = device.os.type;
            }
            
            osInfo.detail = { ...device.os };
            return osInfo;
        }
    }
    
    // Handle nmap os matches format
    if (device.osmatches && device.osmatches.length > 0) {
        const bestMatch = device.osmatches.reduce((best, current) => {
            const currentAccuracy = parseInt(current.accuracy || 0);
            return currentAccuracy > parseInt(best.accuracy || 0) ? current : best;
        }, { accuracy: 0 });
        
        if (bestMatch.name) {
            osInfo.available = true;
            osInfo.name = bestMatch.name;
            osInfo.accuracy = parseInt(bestMatch.accuracy) || 0;
            
            if (bestMatch.osclass && bestMatch.osclass.length > 0) {
                const osClass = bestMatch.osclass[0];
                osInfo.type = osClass.type || '';
                osInfo.detail = { osclass: bestMatch.osclass };
            }
            
            return osInfo;
        }
    }
    
    return osInfo;
};

/**
 * Format a scan result with enhanced information
 * @param {Object} device - Raw device object from nmap scan
 * @returns {Object} Enhanced device object with formatted information
 */
export const formatScanResult = (device) => {
    if (!device) return null;
    
    const enhancedDevice = { ...device };
    
    // Add SSH status
    enhancedDevice.ssh = getSSHStatus(device);
    
    // Add MAC information
    enhancedDevice.macInfo = getMacInfo(device);
    
    // Preserve osDetails from raw scan data
    if (device.osDetails) {
        enhancedDevice.osDetails = { ...device.osDetails };
    }
    
    // Add OS information
    enhancedDevice.osInfo = getOSInfo(device);
    
    return enhancedDevice;
};

/**
 * Format scan results from nmap with enhanced information
 * @param {Array} devices - List of raw device objects from nmap scan
 * @returns {Array} Enhanced device objects with formatted information
 */
export const formatScanResults = (devices) => {
    if (!Array.isArray(devices)) return [];
    
    return devices.map(formatScanResult);
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
    getSSHRecommendedCredentials,
    getMacInfo,
    getOSInfo,
    formatScanResult,
    formatScanResults
};