// Device Polling Service for Real-time Status Updates
// This service polls devices every minute to update their online/offline status

let pollingInterval = null;
let isPolling = false;
let socket = null;
let pollingDevices = [];

const POLLING_INTERVAL = 60000; // 1 minute in milliseconds

// Initialize the polling service
export const initializePolling = (socketInstance) => {
    socket = socketInstance;
    console.log('[POLLING] Device polling service initialized');
};

// Start polling for device status
export const startPolling = (devices) => {
    if (isPolling) {
        console.log('[POLLING] Already polling, updating device list');
        pollingDevices = [...devices];
        return;
    }

    if (!socket) {
        console.error('[POLLING] Socket not initialized. Cannot start polling.');
        return;
    }

    pollingDevices = [...devices];
    isPolling = true;

    console.log(`[POLLING] Starting device status polling for ${pollingDevices.length} devices`);
    
    // Perform initial poll immediately
    performPoll();
    
    // Set up recurring polling
    pollingInterval = setInterval(() => {
        performPoll();
    }, POLLING_INTERVAL);
};

// Stop polling
export const stopPolling = () => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    isPolling = false;
    pollingDevices = [];
    console.log('[POLLING] Device status polling stopped');
};

// Update the list of devices to poll
export const updatePollingDevices = (devices) => {
    pollingDevices = [...devices];
    console.log(`[POLLING] Updated polling device list to ${pollingDevices.length} devices`);
};

// Perform a single poll of all devices
const performPoll = async () => {
    if (!socket || pollingDevices.length === 0) {
        return;
    }

    const timestamp = new Date().toISOString();
    console.log(`[POLLING] Starting device status poll at ${timestamp}`);

    try {
        // Extract IP addresses for polling
        const ips = pollingDevices.map(device => device.ip);
        
        // Emit polling request to server
        socket.emit('pollDeviceStatus', {
            ips: ips,
            timestamp: timestamp
        });

    } catch (error) {
        console.error('[POLLING] Error during device poll:', error);
    }
};

// Get polling status
export const getPollingStatus = () => {
    return {
        isPolling,
        deviceCount: pollingDevices.length,
        interval: POLLING_INTERVAL
    };
};

// Cleanup on service shutdown
export const cleanupPolling = () => {
    stopPolling();
    socket = null;
    console.log('[POLLING] Device polling service cleaned up');
};
