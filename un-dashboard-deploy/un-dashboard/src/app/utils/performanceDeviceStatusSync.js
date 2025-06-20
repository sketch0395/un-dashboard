/**
 * Performance Device Status Synchronization Utility
 * Manages the connection between performance monitoring and device management status updates
 */

/**
 * Status mapping based on performance metrics
 * @param {Object} performanceData - Performance data from monitoring
 * @returns {string} Device status: 'online', 'offline', 'degraded'
 */
export const determineDeviceStatus = (performanceData) => {
    if (!performanceData) return 'offline';
    
    const { latency, alive, packetLoss, uptimePercentage } = performanceData;
    
    // Device is offline if not alive or has 100% packet loss
    if (!alive || packetLoss >= 100) {
        return 'offline';
    }
    
    // Device is degraded if:
    // - High latency (>500ms)
    // - High packet loss (>20%)
    // - Low uptime percentage (<80%)
    if (latency > 500 || packetLoss > 20 || (uptimePercentage && uptimePercentage < 80)) {
        return 'degraded';
    }
    
    // Device is online if alive with good metrics
    return 'online';
};

/**
 * Update device status in localStorage based on performance scan results
 * @param {Array} performanceResults - Array of performance results from network scan
 * @param {Function} onStatusUpdate - Callback for real-time status updates
 */
export const updateDeviceStatusFromPerformance = (performanceResults, onStatusUpdate = null) => {
    try {
        // Get existing custom device properties
        const storedProps = localStorage.getItem("customDeviceProperties") || "{}";
        const customProps = JSON.parse(storedProps);
        
        const statusUpdates = [];
        
        performanceResults.forEach(result => {
            if (!result.ip) return;
            
            // Determine device status based on performance metrics
            const newStatus = determineDeviceStatus(result);
            
            // Get current device properties or create new ones
            const currentProps = customProps[result.ip] || {};
            
            // Update device status and last checked timestamp
            const updatedProps = {
                ...currentProps,
                status: newStatus,
                lastChecked: new Date().toISOString(),
                performanceData: {
                    latency: result.latency || null,
                    alive: result.alive || false,
                    packetLoss: result.packetLoss || 0,
                    uptimePercentage: result.uptimePercentage || null,
                    timestamp: result.timestamp || new Date().toISOString()
                }
            };
            
            // Add to history if status changed
            if (currentProps.status !== newStatus) {
                if (!updatedProps.history) updatedProps.history = [];
                updatedProps.history.push({
                    timestamp: new Date().toISOString(),
                    action: 'status_change',
                    details: `Status changed from ${currentProps.status || 'unknown'} to ${newStatus}`,
                    source: 'performance_monitoring'
                });
                
                // Keep only last 50 history entries
                if (updatedProps.history.length > 50) {
                    updatedProps.history = updatedProps.history.slice(-50);
                }
            }
            
            // Store updated properties
            customProps[result.ip] = updatedProps;
            
            // Track status update for callback
            statusUpdates.push({
                ip: result.ip,
                oldStatus: currentProps.status,
                newStatus: newStatus,
                performanceData: result
            });
        });
        
        // Save updated properties to localStorage
        localStorage.setItem("customDeviceProperties", JSON.stringify(customProps));
        
        // Call status update callback if provided
        if (onStatusUpdate && statusUpdates.length > 0) {
            onStatusUpdate(statusUpdates);
        }
        
        console.log(`[PERFORMANCE SYNC] Updated status for ${statusUpdates.length} devices`);
        return statusUpdates;
        
    } catch (error) {
        console.error("[PERFORMANCE SYNC] Error updating device status:", error);
        return [];
    }
};

/**
 * Get device status from localStorage
 * @param {string} ip - Device IP address
 * @returns {Object} Device status information
 */
export const getDeviceStatusFromStorage = (ip) => {
    try {
        const storedProps = localStorage.getItem("customDeviceProperties") || "{}";
        const customProps = JSON.parse(storedProps);
        
        const deviceProps = customProps[ip];
        if (!deviceProps) return { status: 'unknown', lastChecked: null };
        
        return {
            status: deviceProps.status || 'unknown',
            lastChecked: deviceProps.lastChecked || null,
            performanceData: deviceProps.performanceData || null
        };
    } catch (error) {
        console.error("[PERFORMANCE SYNC] Error getting device status:", error);
        return { status: 'unknown', lastChecked: null };
    }
};

/**
 * Bulk update device statuses and emit socket event for real-time updates
 * @param {Array} latencyResults - Latency results from performance monitoring
 * @param {Array} uptimeResults - Uptime results from performance monitoring
 * @param {Object} socket - Socket.IO client instance
 */
export const syncPerformanceToDeviceStatus = (latencyResults = [], uptimeResults = [], socket = null) => {
    try {
        // Combine latency and uptime data by IP
        const combinedResults = {};
        
        // Process latency results
        latencyResults.forEach(result => {
            if (result.ip) {
                combinedResults[result.ip] = {
                    ip: result.ip,
                    latency: result.latency,
                    alive: result.alive,
                    packetLoss: result.packetLoss,
                    timestamp: result.timestamp
                };
            }
        });
        
        // Add uptime data
        uptimeResults.forEach(result => {
            if (result.ip) {
                if (combinedResults[result.ip]) {
                    combinedResults[result.ip].uptimePercentage = result.uptimePercentage;
                    combinedResults[result.ip].systemUptime = result.systemUptime;
                } else {
                    combinedResults[result.ip] = {
                        ip: result.ip,
                        uptimePercentage: result.uptimePercentage,
                        systemUptime: result.systemUptime,
                        timestamp: result.timestamp
                    };
                }
            }
        });
        
        // Convert to array and update statuses
        const resultsArray = Object.values(combinedResults);
        
        const statusUpdates = updateDeviceStatusFromPerformance(resultsArray, (updates) => {
            // Emit real-time status updates via socket if available
            if (socket && socket.connected) {
                socket.emit('deviceManagementStatusUpdate', {
                    timestamp: new Date().toISOString(),
                    updates: updates.map(update => ({
                        ip: update.ip,
                        status: update.newStatus,
                        previousStatus: update.oldStatus,
                        performanceData: update.performanceData,
                        source: 'performance_monitoring'
                    }))
                });
            }
        });
        
        return statusUpdates;
        
    } catch (error) {
        console.error("[PERFORMANCE SYNC] Error in sync operation:", error);
        return [];
    }
};

/**
 * Create a status update listener for real-time synchronization
 * @param {Function} onUpdate - Callback function for status updates
 * @returns {Function} Cleanup function
 */
export const createStatusUpdateListener = (onUpdate) => {
    const handleStorageChange = (event) => {
        if (event.key === 'customDeviceProperties') {
            try {
                const newData = JSON.parse(event.newValue || '{}');
                const oldData = JSON.parse(event.oldValue || '{}');
                
                // Find devices with status changes
                const changes = [];
                Object.keys(newData).forEach(ip => {
                    const newProps = newData[ip];
                    const oldProps = oldData[ip] || {};
                    
                    if (newProps.status !== oldProps.status) {
                        changes.push({
                            ip,
                            oldStatus: oldProps.status,
                            newStatus: newProps.status,
                            lastChecked: newProps.lastChecked,
                            performanceData: newProps.performanceData
                        });
                    }
                });
                
                if (changes.length > 0 && onUpdate) {
                    onUpdate(changes);
                }
            } catch (error) {
                console.error("[PERFORMANCE SYNC] Error handling storage change:", error);
            }
        }
    };
    
    // Listen for localStorage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Return cleanup function
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
};

/**
 * Get status color based on device status
 * @param {string} status - Device status
 * @returns {string} Color class or hex code
 */
export const getStatusColor = (status) => {
    switch (status) {
        case 'online':
            return '#4CAF50'; // Green
        case 'degraded':
            return '#FF9800'; // Orange
        case 'offline':
            return '#f44336'; // Red
        default:
            return '#9E9E9E'; // Gray
    }
};

/**
 * Get status icon based on device status
 * @param {string} status - Device status
 * @returns {string} Icon name for react-icons
 */
export const getStatusIcon = (status) => {
    switch (status) {
        case 'online':
            return 'FaCheck';
        case 'degraded':
            return 'FaExclamationTriangle';
        case 'offline':
            return 'FaTimes';
        default:
            return 'FaQuestion';
    }
};
