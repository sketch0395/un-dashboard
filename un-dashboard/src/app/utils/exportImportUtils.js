// Utility functions for exporting and importing network scan data

/**
 * Convert device data to CSV format
 * @param {Object} devices - The device data to convert
 * @param {Object} customNames - Custom device properties including network roles
 * @returns {string} CSV formatted string
 */
export const convertToCSV = (devices, customNames = {}) => {
    // Flatten devices object if needed
    const flattenedDevices = Array.isArray(devices) 
        ? devices 
        : Object.values(devices).flat();
    
    if (flattenedDevices.length === 0) return '';
    
    // Define CSV headers from the first device's keys
    // Include common properties and device relationship properties
    const headers = [
        'ip', 'mac', 'vendor', 'hostname', 'osDetails', 'ports', 
        'lastSeen', 'scanSource', 'name', 'category', 'networkRole', 
        'isMainGateway', 'parentGateway', 'parentSwitch', 'portCount'
    ];
    
    // Convert headers to CSV
    let csvContent = headers.join(',') + '\n';
    
    // Process each device and add to CSV
    flattenedDevices.forEach(device => {
        const row = headers.map(header => {
            // Handle nested properties
            if (header === 'ports' && Array.isArray(device.ports)) {
                return '"' + device.ports.join(';') + '"';
            }
            
            if (header === 'scanSource' && device.scanSource) {
                return '"' + (device.scanSource.name || '') + '"';
            }
            
            // Handle custom name properties
            if (device.ip && customNames && customNames[device.ip]) {
                if (header === 'name') return customNames[device.ip].name || '';
                if (header === 'category') return customNames[device.ip].category || '';
                if (header === 'networkRole') return customNames[device.ip].networkRole || '';
                if (header === 'isMainGateway') return customNames[device.ip].isMainGateway ? 'true' : 'false';
                if (header === 'parentGateway') return customNames[device.ip].parentGateway || '';
                if (header === 'parentSwitch') return customNames[device.ip].parentSwitch || '';
                if (header === 'portCount') return customNames[device.ip].portCount || '';
            }
            
            if (header === 'mac' && !device.mac && device.macInfo?.address) {
                return device.macInfo.address;
            }
            
            if (header === 'vendor' && !device.vendor && device.macInfo?.vendor) {
                return device.macInfo.vendor;
            }
            
            // For regular properties
            const value = device[header];
            if (value === undefined || value === null) return '';
            
            // Quote strings that might contain commas
            return typeof value === 'string' && value.includes(',') 
                ? '"' + value.replace(/"/g, '""') + '"'  // Escape quotes within quotes 
                : value;
        });
        
        csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
};

/**
 * Convert the devices and customNames to a JSON structure for export
 * @param {Object} devices - The device data
 * @param {Object} customNames - Custom name mappings
 * @returns {Object} - Structured data for JSON export
 */
export const prepareForJsonExport = (devices, customNames) => {
    const flattenedDevices = Array.isArray(devices) 
        ? devices 
        : Object.values(devices).flat();
    
    // Extract scan information to include in metadata
    let scanName = "Network Scan";
    let ipRange = "Unknown";
    let scanDate = new Date().toISOString();
    
    // Try to get scan name and ip range from the first device
    if (flattenedDevices.length > 0) {
        const firstDevice = flattenedDevices[0];
        if (firstDevice.scanSource) {
            scanName = firstDevice.scanSource.name || scanName;
            scanDate = firstDevice.scanSource.timestamp || scanDate;
        }
        
        // Try to determine IP range from the IPs
        if (flattenedDevices.length > 0) {
            const ips = flattenedDevices.map(d => d.ip).filter(Boolean);
            if (ips.length > 0) {
                // Get common prefix
                const firstIp = ips[0];
                const ipParts = firstIp.split('.');
                if (ipParts.length === 4) {
                    ipRange = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0-255`;
                }
            }
        }
    }
    
    // Create export metadata
    const metadata = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        scanName: scanName,
        scanDate: scanDate,
        ipRange: ipRange,
        deviceCount: flattenedDevices.length,
        format: "nexus-control-network-scan"
    };
    
    // Enhancement: Check if any devices have parent-child relationships
    const hasNetworkTopology = Object.values(customNames).some(
        props => props.networkRole === 'gateway' || props.networkRole === 'switch' || props.parentGateway || props.parentSwitch
    );
    
    if (hasNetworkTopology) {
        metadata.hasNetworkTopology = true;
    }

    return {
        metadata,
        devices,
        customNames
    };
};

/**
 * Parse CSV data and convert it to device format
 * @param {string} csvData - The CSV string to parse
 * @returns {Object} - Parsed device data with metadata
 */
export const parseCSVImport = (csvData) => {
    // Split CSV into lines, handling different line ending formats
    const lines = csvData.split(/\r?\n/);
    if (lines.length < 2) return { devices: {}, metadata: { ipRange: 'Unknown' } };
    
    // Extract headers
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Process rows
    const devices = {};
    const ipAddresses = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Split by comma, but respect quoted values that might contain commas
        const getCSVValues = (line) => {
            const values = [];
            let inQuote = false;
            let currentValue = '';
            
            for (let char of line) {
                if (char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    values.push(currentValue);
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            values.push(currentValue); // Add the last value
            return values;
        };
        
        const values = getCSVValues(lines[i]);
        
        // Create device object from the row
        const device = {};
        headers.forEach((header, index) => {
            if (values[index]) {
                if (header === 'ports') {
                    // Convert semicolon-separated ports back to array
                    device[header] = values[index].split(';');
                } else if (header === 'scanSource') {
                    // Create scanSource object
                    device[header] = { name: values[index] };
                } else {
                    device[header] = values[index];
                }
            }
        });
        
        // Add to devices object using IP as key
        if (device.ip) {
            ipAddresses.push(device.ip);
            if (!devices[device.ip]) {
                devices[device.ip] = [];
            }
            devices[device.ip].push(device);
        }
    }
    
    // Generate metadata for the import
    const metadata = {
        version: "1.0",
        importDate: new Date().toISOString(),
        format: "csv-imported-scan",
        deviceCount: Object.values(devices).flat().length
    };
    
    // Try to determine IP range from device IPs
    if (ipAddresses.length > 0) {
        // Get first three octets of first IP to create a range
        const firstIp = ipAddresses[0];
        const ipParts = firstIp.split('.');
        if (ipParts.length === 4) {
            // Create range like "10.5.1.0-255" based on common prefix
            const prefix = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
            metadata.ipRange = `${prefix}.0-255`;
        } else {
            metadata.ipRange = 'Imported CSV';
        }
    } else {
        metadata.ipRange = 'Imported CSV';
    }
    
    return { 
        devices,
        metadata
    };
};

/**
 * Parse JSON import data
 * @param {Object} jsonData - The JSON data to parse
 * @returns {Object} - { devices, customNames, metadata }
 */
export const parseJSONImport = (jsonData) => {
    try {
        // Validate that the data has the expected structure
        if (!jsonData.devices) {
            throw new Error('Invalid JSON format: missing devices');
        }
        
        // Validate and ensure integrity of network topology data
        if (jsonData.customNames) {
            const customNames = jsonData.customNames;
            
            // Check for dangling references in parent-child relationships
            Object.entries(customNames).forEach(([ip, props]) => {
                // Check if parentGateway exists in customNames
                if (props.parentGateway && !customNames[props.parentGateway]) {
                    console.warn(`Warning: Device ${ip} references non-existent parent gateway ${props.parentGateway}`);
                }
                
                // Check if parentSwitch exists in customNames
                if (props.parentSwitch && !customNames[props.parentSwitch]) {
                    console.warn(`Warning: Device ${ip} references non-existent parent switch ${props.parentSwitch}`);
                }
                
                // Validate that devices marked as switches don't have a parentSwitch to avoid circular references
                if (props.networkRole === 'switch' && props.parentSwitch) {
                    console.warn(`Warning: Switch ${ip} cannot have a parent switch, removing reference`);
                    props.parentSwitch = null;
                }
            });
        }

        // Check for our format or attempt to handle other formats
        let metadata = jsonData.metadata || {};
        if (!metadata.format) {
            // Try to determine if this is our format
            if (typeof jsonData.devices === 'object' && 
                (Object.keys(jsonData.devices).length > 0 || Array.isArray(jsonData.devices))) {
                // Looks like our format
                metadata = {
                    version: "unknown",
                    importDate: new Date().toISOString(),
                    format: "detected-network-scan"
                };
            } else {
                throw new Error('Unrecognized network scan data format');
            }
        }
        
        // Validate device data format
        let validDevices;
        if (Array.isArray(jsonData.devices)) {
            // Convert array to expected object format with IP as key
            validDevices = {};
            jsonData.devices.forEach(device => {
                if (device && device.ip) {
                    if (!validDevices[device.ip]) {
                        validDevices[device.ip] = [];
                    }
                    validDevices[device.ip].push(device);
                }
            });
        } else if (typeof jsonData.devices === 'object') {
            // Already in expected format
            validDevices = jsonData.devices;
        } else {
            throw new Error('Invalid device data format');
        }

        // Extract IP range information from the data if not already in metadata
        if (!metadata.ipRange) {
            // Try to determine IP range from device IPs
            const ipAddresses = Array.isArray(jsonData.devices) 
                ? jsonData.devices.map(device => device.ip).filter(Boolean)
                : Object.keys(validDevices);

            if (ipAddresses.length > 0) {
                // Get first three octets of first IP to create a range
                const firstIp = ipAddresses[0];
                const ipParts = firstIp.split('.');
                if (ipParts.length === 4) {
                    // Create range like "10.5.1.0-255" based on common prefix
                    const prefix = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
                    metadata.ipRange = `${prefix}.0-255`;
                }
            } else {
                metadata.ipRange = 'Imported Range';
            }
        }

        // Add import timestamp if not present
        if (!metadata.importDate) {
            metadata.importDate = new Date().toISOString();
        }        // Check if we need to reconstruct customNames from devices with embedded properties
        let customNamesData = jsonData.customNames || {};
        
        // If no customNames but devices have network topology properties, rebuild them
        if (Object.keys(customNamesData).length === 0) {
            const flattenedDevices = Array.isArray(jsonData.devices) 
                ? jsonData.devices 
                : Object.values(validDevices).flat();
                
            flattenedDevices.forEach(device => {
                if (device.ip && (
                    device.name || 
                    device.networkRole || 
                    device.isMainGateway || 
                    device.category ||
                    device.parentGateway ||
                    device.parentSwitch ||
                    device.portCount
                )) {
                    customNamesData[device.ip] = {
                        name: device.name || device.ip,
                        category: device.category || '',
                        notes: device.notes || [],
                        networkRole: device.networkRole || null,
                        isMainGateway: device.isMainGateway || false,
                        parentGateway: device.parentGateway || null,
                        parentSwitch: device.parentSwitch || null,
                        portCount: device.portCount || null,
                        history: device.history || [] // CRITICAL: Preserve device history data
                    };
                }
            });
        }
        
        // IMPORTANT: Even if customNames exists, ensure history is preserved from devices
        // This handles cases where the exported data has history in both places
        if (Object.keys(customNamesData).length > 0) {
            const flattenedDevices = Array.isArray(jsonData.devices) 
                ? jsonData.devices 
                : Object.values(validDevices).flat();
                
            flattenedDevices.forEach(device => {
                if (device.ip && customNamesData[device.ip] && device.history) {
                    // Merge history from device if it exists and is more complete
                    if (!customNamesData[device.ip].history || 
                        (Array.isArray(device.history) && device.history.length > 0)) {
                        customNamesData[device.ip].history = device.history;
                    }
                }
            });
        }

        // Return the parsed and validated data
        return {
            devices: validDevices,
            customNames: customNamesData,
            metadata: metadata
        };
    } catch (error) {
        console.error('Error parsing JSON import:', error);
        throw error; // Propagate error for better handling
    }
};
