"use client";

import React, { lazy, Suspense, useState, useEffect, memo } from "react";
import { FaChevronDown, FaChevronUp, FaTrash, FaEdit, FaEllipsisV, FaTerminal, FaShare } from "react-icons/fa";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { createContext, useContext } from "react";
import { FixedSizeList as List } from "react-window";
import { useAuth } from "../../contexts/AuthContext";

const UnifiedDeviceModal = lazy(() => import("../../components/UnifiedDeviceModal"));
const SSHTerminal = lazy(() => import("../../components/sshterminal"));
const MemoizedDeviceList = lazy(() => import("../../components/MemoizedDeviceList"));
const NetworkScanExportImport = lazy(() => import("./NetworkScanExportImport"));
const NetworkScanSharingModal = lazy(() => import("./NetworkScanSharingModal"));
const ScanHistorySyncStatus = lazy(() => import("../../components/ScanHistorySyncStatus"));

const ScanHistoryContext = createContext();

export const ScanHistoryProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [scanHistory, setScanHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(null);
    const [lastSyncTime, setLastSyncTime] = useState(null);

    // Get user-specific localStorage key
    const getScanHistoryKey = () => {
        if (isAuthenticated && user && user._id) {
            return `scanHistory_${user._id}`;
        }
        return "scanHistory"; // fallback for unauthenticated users
    };

    // Load scan history with database-first approach
    const loadScanHistory = async () => {
        if (!isAuthenticated || !user) {
            setScanHistory([]);
            return;
        }

        setIsLoading(true);
        try {
            // Try to load from database first
            const response = await fetch('/api/scan-history', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                const dbHistory = data.scanHistory || [];
                
                // Convert database format to component format
                const convertedHistory = dbHistory.map(dbEntry => ({
                    id: dbEntry.scanId,
                    timestamp: format(new Date(dbEntry.createdAt), "yyyy-MM-dd HH:mm:ss"),
                    ipRange: dbEntry.ipRange,
                    devices: dbEntry.deviceCount,
                    data: dbEntry.scanData || {},
                    name: dbEntry.name,
                    settings: dbEntry.settings,
                    metadata: dbEntry.metadata,
                    _dbId: dbEntry._id, // Keep database ID for updates
                    isFromDatabase: true
                }));

                setScanHistory(convertedHistory);
                setLastSyncTime(new Date());
                console.log(`Loaded ${convertedHistory.length} scans from database for user ${user._id}`);

                // Update localStorage as cache
                const storageKey = getScanHistoryKey();
                localStorage.setItem(storageKey, JSON.stringify(convertedHistory));
                
            } else {
                throw new Error(`Database fetch failed: ${response.status}`);
            }
        } catch (error) {
            console.warn('Failed to load from database, falling back to localStorage:', error);
            setSyncError('Failed to sync with database');
            
            // Fallback to localStorage
            const storageKey = getScanHistoryKey();
            let savedHistory = JSON.parse(localStorage.getItem(storageKey)) || [];
            
            // Migration: If user-specific storage is empty, check for global scan history
            if (savedHistory.length === 0) {
                const globalHistory = JSON.parse(localStorage.getItem("scanHistory")) || [];
                if (globalHistory.length > 0) {
                    console.log(`Migrating ${globalHistory.length} global scan entries to user ${user._id}`);
                    savedHistory = globalHistory;
                    localStorage.setItem(storageKey, JSON.stringify(savedHistory));
                }
            }
              setScanHistory(savedHistory);
            console.log(`Loaded ${savedHistory.length} scans from localStorage for user ${user._id}`);
            
            // Clear sync error since localStorage fallback was successful
            setSyncError(null);
        }
        
        setIsLoading(false);
    };

    // Save scan to database with localStorage fallback
    const saveScanToDatabase = async (scanEntry) => {
        try {
            // Debug authentication state before making request
            console.log('Authentication Debug Info:');
            console.log('- User authenticated:', isAuthenticated);
            console.log('- User object:', user);
            console.log('- Available cookies:', document.cookie);
            
            // Check if we have the required authentication token
            const authToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('auth-token='))
                ?.split('=')[1];
            const sessionId = document.cookie
                .split('; ')
                .find(row => row.startsWith('session-id='))
                ?.split('=')[1];
                
            console.log('- Auth token present:', !!authToken);
            console.log('- Session ID present:', !!sessionId);
            
            if (!isAuthenticated || !user) {
                console.warn('User not authenticated, skipping database save');
                return false;
            }

            const dbPayload = {
                scanId: scanEntry.id,
                name: scanEntry.name || `Network Scan ${format(new Date(scanEntry.timestamp), 'MMM dd, yyyy HH:mm')}`,
                ipRange: scanEntry.ipRange,
                deviceCount: scanEntry.devices ? scanEntry.devices.length : 0,
                scanData: {
                    devices: scanEntry.devices || [],
                    portScanResults: scanEntry.portScanResults || [],
                    networkInfo: scanEntry.networkInfo || {}
                },
                metadata: {
                    timestamp: scanEntry.timestamp,
                    scanDuration: scanEntry.scanDuration || 0,
                    userAgent: navigator.userAgent
                },
                settings: scanEntry.settings || {
                    isPrivate: true,
                    isFavorite: false,
                    tags: [],
                    notes: ''
                }
            };

            console.log('Making POST request to /api/scan-history...');
            const response = await fetch('/api/scan-history', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dbPayload)
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', [...response.headers.entries()]);

            if (response.ok) {
                const savedScan = await response.json();
                console.log(`Successfully saved scan ${scanEntry.id} to database`);
                setSyncError(null);
                setLastSyncTime(new Date());
                return true;
            } else if (response.status === 409) {
                console.log(`Scan ${scanEntry.id} already exists in database`);
                return true; // Already exists, not an error
            } else {
                // Get error details from response
                let errorDetails = `${response.status}`;
                try {
                    const errorBody = await response.json();
                    errorDetails += `: ${errorBody.error || 'Unknown error'}`;
                } catch (e) {
                    // If we can't parse the error body, just use the status
                }
                console.error('Database save failed with details:', errorDetails);
                throw new Error(`Database save failed: ${errorDetails}`);
            }
        } catch (error) {
            console.error('Failed to save scan to database:', error);
            setSyncError('Failed to sync with database');
            
            // Clear sync error after a delay since data is safely stored in localStorage
            setTimeout(() => {
                setSyncError(null);
            }, 3000); // Clear error after 3 seconds
            
            return false;
        }
    };

    // Initialize scan history on auth state change
    useEffect(() => {
        loadScanHistory();
    }, [isAuthenticated, user]);

    // Auto-save to localStorage whenever scan history changes
    useEffect(() => {
        if (isAuthenticated && user && scanHistory.length > 0) {
            const storageKey = getScanHistoryKey();
            localStorage.setItem(storageKey, JSON.stringify(scanHistory));
        }
    }, [scanHistory, isAuthenticated, user]);    const saveScanHistory = async (data, ipRange) => {
        // Only save if user is authenticated
        if (!isAuthenticated || !user) {
            console.log("Cannot save scan history: user not authenticated");
            return;
        }

        console.log(`saveScanHistory called for user ${user._id} with ipRange: ${ipRange}`, { dataKeys: Object.keys(data) });
        
        // Check data structure and calculate device count properly
        let deviceCount = 0;
        if (typeof data === 'object' && data !== null) {
            try {
                // Properly handle different data formats
                if (Array.isArray(data)) {
                    deviceCount = data.length;
                    console.log(`Data is an array with ${deviceCount} devices`);
                } else {
                    // If it's an object with vendor keys (the typical format)
                    Object.entries(data).forEach(([vendor, devices]) => {
                        if (Array.isArray(devices)) {
                            deviceCount += devices.length;
                            console.log(`Vendor ${vendor} has ${devices.length} devices`);
                        }
                    });
                }
            } catch (e) {
                console.error("Error calculating device count:", e);
                deviceCount = 0;
            }
        } else {
            console.error("Invalid data format received:", typeof data);
            return; // Exit early for invalid data
        }
        
        const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
        console.log(`Preparing to save scan with ${deviceCount} devices from ${ipRange} at ${timestamp}`);
        
        // Check for duplicates within the last 5 minutes to prevent duplication
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        setScanHistory((prev) => {
            // Check if we already have a very similar scan recently
            const isDuplicate = prev.some(entry => {
                const entryTime = new Date(entry.timestamp);
                const timeDifference = Math.abs(new Date() - entryTime);
                
                const sameDeviceCount = entry.devices === deviceCount;
                const sameIpRange = entry.ipRange === ipRange;
                const sameData = JSON.stringify(entry.data) === JSON.stringify(data);
                
                const isDup = timeDifference < 5 * 60 * 1000 && 
                             sameDeviceCount && 
                             sameIpRange && 
                             sameData;
                             
                if (isDup) {
                    console.log("Potential duplicate detected:", { 
                        timeDifference: Math.round(timeDifference/1000) + "s", 
                        sameDeviceCount, 
                        sameIpRange
                    });
                }
                
                return isDup;
            });
            
            if (isDuplicate) {
                console.log("Duplicate scan detected and prevented:", { deviceCount, ipRange, timestamp });
                return prev; // Don't add duplicate
            }
            
            const newEntry = {
                id: uuidv4(),
                timestamp,
                ipRange,
                devices: deviceCount,
                data,
                isFromDatabase: false // Mark as new entry
            };
            
            console.log("Adding new scan to history:", { id: newEntry.id, deviceCount, ipRange, timestamp });
            
            // Automatically attempt to save to database
            setTimeout(async () => {
                const success = await saveScanToDatabase(newEntry);
                if (success) {
                    // Update the entry to mark it as synced
                    setScanHistory(current => 
                        current.map(entry => 
                            entry.id === newEntry.id 
                                ? { ...entry, isFromDatabase: true }
                                : entry
                        )
                    );
                }
            }, 100); // Small delay to ensure state update completes first
            
            return [...prev, newEntry];
        });
    };    const deleteScan = async (index) => {
        const scanToDelete = scanHistory[index];
        
        setScanHistory((prev) => prev.filter((_, i) => i !== index));
        
        // If scan was from database, also delete from database
        if (scanToDelete && scanToDelete.isFromDatabase && isAuthenticated && user) {
            try {
                const response = await fetch('/api/scan-history', {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ scanIds: [scanToDelete.id] })
                });
                
                if (response.ok) {
                    console.log(`Successfully deleted scan ${scanToDelete.id} from database`);
                    setSyncError(null);
                } else {
                    console.error('Failed to delete scan from database:', response.status);
                    setSyncError('Failed to delete from database');
                }
            } catch (error) {
                console.error('Error deleting scan from database:', error);
                setSyncError('Failed to delete from database');
            }
        }
    };    const updateScanName = async (index, newName) => {
        const scanToUpdate = scanHistory[index];
        
        setScanHistory((prev) => {
            const updated = [...prev];
            updated[index].name = newName;
            return updated;
        });
        
        // If scan is from database, also update in database
        if (scanToUpdate && scanToUpdate.isFromDatabase && isAuthenticated && user) {
            try {
                const response = await fetch(`/api/scan-history/${scanToUpdate.id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: newName })
                });
                
                if (response.ok) {
                    console.log(`Successfully updated scan name in database: ${newName}`);
                    setSyncError(null);
                } else {
                    console.error('Failed to update scan name in database:', response.status);
                    setSyncError('Failed to update name in database');
                }
            } catch (error) {
                console.error('Error updating scan name in database:', error);
                setSyncError('Failed to update name in database');
            }
        }
    };// Add a function to clear all scan history
    const clearHistory = async () => {
        if (isAuthenticated && user) {
            // Get all scan IDs that are from database
            const dbScanIds = scanHistory
                .filter(scan => scan.isFromDatabase)
                .map(scan => scan.id);
            
            // Delete from database if there are any database scans
            if (dbScanIds.length > 0) {
                try {
                    const response = await fetch('/api/scan-history', {
                        method: 'DELETE',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ scanIds: dbScanIds })
                    });
                    
                    if (response.ok) {
                        console.log(`Successfully deleted ${dbScanIds.length} scans from database`);
                        setSyncError(null);
                    } else {
                        console.error('Failed to delete scans from database:', response.status);
                        setSyncError('Failed to clear database');
                    }
                } catch (error) {
                    console.error('Error deleting scans from database:', error);
                    setSyncError('Failed to clear database');
                }
            }
            
            // Clear localStorage
            const storageKey = getScanHistoryKey();
            localStorage.removeItem(storageKey);
            console.log(`Cleared scan history for user ${user._id}`);
        } else {
            localStorage.removeItem("scanHistory"); // fallback cleanup
        }
        
        // Clear local state
        setScanHistory([]);
    };

    // Manual sync function - push all localStorage scans to database
    const syncToDatabase = async () => {
        if (!isAuthenticated || !user) {
            console.log("Cannot sync: user not authenticated");
            return false;
        }
        
        setIsSyncing(true);
        setSyncError(null);
        
        try {
            // Get scans that are not yet in database
            const unsynced = scanHistory.filter(scan => !scan.isFromDatabase);
            
            if (unsynced.length === 0) {
                console.log("All scans are already synced");
                setIsSyncing(false);
                return true;
            }
            
            console.log(`Syncing ${unsynced.length} unsynced scans to database...`);
            
            let successCount = 0;
            for (const scan of unsynced) {
                const success = await saveScanToDatabase(scan);
                if (success) {
                    successCount++;
                }
            }
            
            if (successCount > 0) {
                // Update synced scans to mark them as from database
                setScanHistory(current => 
                    current.map(scan => 
                        unsynced.includes(scan) 
                            ? { ...scan, isFromDatabase: true }
                            : scan
                    )
                );
                setLastSyncTime(new Date());
                console.log(`Successfully synced ${successCount}/${unsynced.length} scans`);
            }
            
            setIsSyncing(false);
            return successCount === unsynced.length;
            
        } catch (error) {
            console.error('Error during sync:', error);
            setSyncError('Sync failed');
            setIsSyncing(false);
            return false;
        }
    };

    // Refresh from database
    const refreshFromDatabase = async () => {
        if (!isAuthenticated || !user) {
            return false;
        }
        
        setIsLoading(true);
        await loadScanHistory();
        return true;
    };

    // Add a function to handle user logout cleanup
    const clearScanHistoryOnLogout = () => {
        setScanHistory([]);
        console.log("Cleared scan history due to user logout");
    };

    // Clear scan history when user logs out
    useEffect(() => {
        if (!isAuthenticated) {
            clearScanHistoryOnLogout();
        }
    }, [isAuthenticated]);    // Add a function to update device data in scan history
    const updateDeviceInHistory = async (deviceIP, updatedDeviceData) => {
        let updatedEntries = [];
        
        setScanHistory((prev) => {
            const updated = prev.map(entry => {
                // Skip entries without data
                if (!entry.data) return entry;
                
                // Create a new copy of the entry
                const newEntry = { ...entry };
                newEntry.data = { ...entry.data };
                let hasChanges = false;
                
                // Update matching devices in all categories
                Object.keys(newEntry.data).forEach(key => {
                    if (Array.isArray(newEntry.data[key])) {
                        newEntry.data[key] = newEntry.data[key].map(device => {
                            if (device.ip === deviceIP) {
                                hasChanges = true;
                                return {
                                    ...device,
                                    name: updatedDeviceData.name,
                                    color: updatedDeviceData.color,
                                    icon: updatedDeviceData.icon,
                                    category: updatedDeviceData.category,
                                    notes: updatedDeviceData.notes,
                                    networkRole: updatedDeviceData.networkRole,
                                    portCount: updatedDeviceData.portCount,
                                    parentSwitch: updatedDeviceData.parentSwitch
                                };
                            }
                            return device;
                        });
                    }
                });
                
                // Track entries that need database sync
                if (hasChanges && newEntry.isFromDatabase) {
                    updatedEntries.push(newEntry);
                }
                
                return newEntry;
            });
            
            return updated;
        });
        
        // Sync updated entries to database
        if (updatedEntries.length > 0 && isAuthenticated && user) {
            for (const entry of updatedEntries) {
                try {
                    const response = await fetch(`/api/scan-history/${entry.id}`, {
                        method: 'PUT',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            scanData: entry.data,
                            includeData: false // Don't return large data in response
                        })
                    });
                    
                    if (response.ok) {
                        console.log(`Successfully updated device ${deviceIP} in scan ${entry.id}`);
                        setSyncError(null);
                    } else {
                        console.error('Failed to sync device update to database:', response.status);
                        setSyncError('Failed to sync device update');
                    }
                } catch (error) {
                    console.error('Error syncing device update to database:', error);
                    setSyncError('Failed to sync device update');
                }
            }
        }
    };return (
        <ScanHistoryContext.Provider
            value={{ 
                scanHistory, 
                saveScanHistory, 
                deleteScan, 
                updateScanName, 
                clearHistory,
                updateDeviceInHistory,
                clearScanHistoryOnLogout,
                // Database integration functions
                syncToDatabase,
                refreshFromDatabase,
                // State indicators
                isLoading,
                isSyncing,
                syncError,
                lastSyncTime
            }}
        >
            {children}
        </ScanHistoryContext.Provider>
    );
};

export const useScanHistory = () => useContext(ScanHistoryContext);

export default function NetworkScanHistory({ addZonesToTopology, scanHistoryData }) {
    const { scanHistory, saveScanHistory, deleteScan, updateScanName, clearHistory, updateDeviceInHistory } = useScanHistory();
    const [selectedScans, setSelectedScans] = useState([]);
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [modalDevice, setModalDevice] = useState(null);
    const [editingIndex, setEditingIndex] = useState(null);
    const [newName, setNewName] = useState("");
    const [menuOpenIndex, setMenuOpenIndex] = useState(null);
    const [sshModalVisible, setSSHModalVisible] = useState(false);
    const [sshTarget, setSSHTarget] = useState(null);
    const [sshUsername, setSSHUsername] = useState("");
    const [sshPassword, setSSHPassword] = useState("");    const [showTerminal, setShowTerminal] = useState(false);
    // Add a state variable to persist custom device properties
    const [persistentCustomNames, setPersistentCustomNames] = useState({});
    // Add state for confirmation modal
    const [showConfirmClear, setShowConfirmClear] = useState(false);
    // Add state for sharing modal
    const [sharingModalVisible, setSharingModalVisible] = useState(false);
    const [scanToShare, setScanToShare] = useState(null);
    
    // Load any previously saved custom device properties from localStorage
    useEffect(() => {
        const savedCustomNames = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
        setPersistentCustomNames(savedCustomNames);
    }, []); // Empty dependency array to run only once on mount
    
    // Update localStorage whenever custom device properties change, but with a condition to prevent loops
    useEffect(() => {
        if (Object.keys(persistentCustomNames).length > 0) {
            const currentLocalStorage = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
            // Only update if there's an actual difference to prevent loops
            if (JSON.stringify(currentLocalStorage) !== JSON.stringify(persistentCustomNames)) {
                localStorage.setItem("customDeviceProperties", JSON.stringify(persistentCustomNames));
            }
        }
    }, [persistentCustomNames]);

    useEffect(() => {
        if (scanHistoryData) {
            const { data, ipRange } = scanHistoryData;
            saveScanHistory(data, ipRange);
        }
    }, [scanHistoryData]);

    const handleCheckboxChange = (index) => {
        setSelectedScans((prev) =>
            prev.includes(index)
                ? prev.filter((i) => i !== index)
                : [...prev, index]
        );
    };

    const handleAddZones = () => {
        console.log("Adding zones from selected scans with custom names");
        
        // First, make sure we have the latest customProperties data from localStorage
        const latestCustomProperties = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
        
        // Get the selected scan entries
        const selectedZones = selectedScans.map((index) => scanHistory[index]);
        
        // Create a combined array of enhanced devices
        let combinedDevices = [];
        
        // Process each selected zone/scan
        selectedZones.forEach((zone, zoneIndex) => {
            // Get all devices from this scan
            const zoneDevices = Object.values(zone.data || {}).flat();
            
            // Create enhanced devices with proper custom properties and scan source info
            const enhancedDevices = zoneDevices.map(device => {
                // Start with the original device
                const enhancedDevice = { ...device };
                
                // Apply custom properties from the latest localStorage data if they exist
                if (device.ip && latestCustomProperties[device.ip]) {
                    const customProps = latestCustomProperties[device.ip];
                    // Apply all custom properties including history
                    enhancedDevice.name = customProps.name || enhancedDevice.name;
                    enhancedDevice.color = customProps.color || enhancedDevice.color;
                    enhancedDevice.icon = customProps.icon || enhancedDevice.icon;
                    enhancedDevice.category = customProps.category || enhancedDevice.category;
                    enhancedDevice.notes = customProps.notes || enhancedDevice.notes;
                    // Make sure we preserve history entries
                    enhancedDevice.history = customProps.history || [];
                }
                
                // Add scan source information (important for grouping in the visualization)
                enhancedDevice.scanSource = {
                    id: zone.id || `scan-${zoneIndex}`,
                    name: zone.name || `Scan ${zoneIndex + 1}`,
                    index: zoneIndex,
                    timestamp: zone.timestamp
                };
                
                return enhancedDevice;
            });
            
            // Add these enhanced devices to the combined array
            combinedDevices = [...combinedDevices, ...enhancedDevices];
        });
        
        // Update our local state to match localStorage (ensuring consistency)
        if (JSON.stringify(latestCustomProperties) !== JSON.stringify(persistentCustomNames)) {
            console.log("Updating persistent custom names with latest data from localStorage");
            setPersistentCustomNames(latestCustomProperties);
        }
        
        // Log count of devices with custom names for debugging
        const namedDevices = combinedDevices.filter(d => d.name).length;
        console.log(`Combined ${combinedDevices.length} devices from ${selectedZones.length} scans, including ${namedDevices} with custom names`);
        
        // Send data to the topology map
        const combinedData = {
            devices: combinedDevices,
            vendorColors: {},
            customNames: latestCustomProperties, // Use the latest data from localStorage
        };
        
        addZonesToTopology(combinedData);
        setSelectedScans([]); // Clear selections after adding to topology
    };

    const toggleAccordion = (index) => {
        setExpandedIndex((prev) => (prev === index ? null : index));
    };

    const openModal = (device) => {
        setModalDevice(device);
    };

    const closeModal = () => {
        setModalDevice(null);
    };
      const openSSHModal = (device) => {
        setSSHTarget(device);
        setSSHUsername(""); // Reset username
        setSSHPassword(""); // Reset password
        setSSHModalVisible(true);
    };

    const openSharingModal = (scanEntry, index) => {
        setScanToShare({
            ...scanEntry,
            id: `scan-${index}-${Date.now()}`,
            index: index
        });
        setSharingModalVisible(true);
        setMenuOpenIndex(null); // Close the action menu
    };

    const closeSharingModal = () => {
        setSharingModalVisible(false);
        setScanToShare(null);
    };

    const handleShareSuccess = (sharedScanData) => {
        console.log('Scan shared successfully:', sharedScanData);
        // You could add a toast notification here or update UI state
    };

    const visualizeOnTopology = (entry) => {
        console.log("Visualizing entry with custom names:", persistentCustomNames);
        
        // First, make sure we have the latest customNames data from localStorage
        const latestCustomProperties = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
        
        // Get all devices from the scan entry
        const entryDevices = Object.values(entry.data || {}).flat();
        
        // Create a deep copy of the devices to avoid modifying the original data
        const devicesWithCustomProperties = entryDevices.map(device => {
            // Start with the original device
            const enhancedDevice = { ...device };
            
            // Apply custom properties from the latest localStorage data if they exist
            if (device.ip && latestCustomProperties[device.ip]) {
                const customProps = latestCustomProperties[device.ip];
                // Apply all custom properties (including history)
                enhancedDevice.name = customProps.name || enhancedDevice.name;
                enhancedDevice.color = customProps.color || enhancedDevice.color;
                enhancedDevice.icon = customProps.icon || enhancedDevice.icon;
                enhancedDevice.category = customProps.category || enhancedDevice.category;
                enhancedDevice.notes = customProps.notes || enhancedDevice.notes;
                // Make sure we preserve history entries
                enhancedDevice.history = customProps.history || [];
            }
            
            // Add scan source information
            enhancedDevice.scanSource = {
                id: entry.id || `scan-custom`,
                name: entry.name || `Scan`,
                timestamp: entry.timestamp
            };
            
            return enhancedDevice;
        });

        // Update our local state to match localStorage (ensuring consistency)
        if (JSON.stringify(latestCustomProperties) !== JSON.stringify(persistentCustomNames)) {
            console.log("Updating persistent custom names with latest data from localStorage");
            setPersistentCustomNames(latestCustomProperties);
        }
        
        // Visualize on the topology with properly enhanced devices
        const combinedData = {
            devices: devicesWithCustomProperties,
            vendorColors: {}, // Add vendor color mapping if needed
            customNames: latestCustomProperties, // Use the latest data from localStorage
        };
        
        console.log("Sending to topology:", 
                   `${devicesWithCustomProperties.length} devices with`, 
                   `${Object.keys(latestCustomProperties).length} custom properties`);
        
        addZonesToTopology(combinedData);
    };

    const startRenaming = (index) => {
        setEditingIndex(index);
        setNewName(scanHistory[index].name || `Scan ${index + 1}`);
        setMenuOpenIndex(null); // Close the menu
    };

    const saveRename = (index) => {
        updateScanName(index, newName);
        setEditingIndex(null);
        setNewName("");
    };

    const toggleMenu = (index) => {
        setMenuOpenIndex((prev) => (prev === index ? null : index));
    };    const isSSHAvailable = (device) => {
        if (!device || !device.ports) return false;

        // Check if port 22 is not marked as "closed" (allow filtered and open)
        if (Array.isArray(device.ports)) {
            return device.ports.some(port =>
                typeof port === 'string' &&
                port.includes('22/tcp') &&
                !port.includes('closed')
            );
        }

        if (typeof device.ports === 'object') {
            return Object.entries(device.ports).some(([key, value]) =>
                (key === '22' || key === 22) &&
                typeof value === 'string' &&
                !value.toLowerCase().includes('closed')
            );
        }

        return false;
    };

    // Add clearDeviceHistory function to handle clearing all scan history and device customizations
    const clearDeviceHistory = () => {
        // Clear scan history through context
        clearHistory();
        
        // Clear custom device properties
        setPersistentCustomNames({});
        localStorage.removeItem("customDeviceProperties");
        
        // Clear the topology map
        addZonesToTopology({
            devices: [],
            vendorColors: {},
            customNames: {}
        });
        
        // Close the confirmation modal
        setShowConfirmClear(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && sshTarget) {
            // Same action as the Connect button
            setSSHModalVisible(false);
            setShowTerminal(true);
        }
    };    const getDeviceChanges = (oldDevice, newDevice) => {
        const changes = {};
        if (oldDevice.name !== newDevice.name) changes.name = newDevice.name;
        if (oldDevice.color !== newDevice.color) changes.color = newDevice.color;
        if (oldDevice.icon !== newDevice.icon) changes.icon = newDevice.icon;
        if (oldDevice.category !== newDevice.category) changes.category = newDevice.category;
        if (oldDevice.notes !== newDevice.notes) changes.notes = newDevice.notes;
        if (oldDevice.networkRole !== newDevice.networkRole) {
            changes.networkRole = newDevice.networkRole || 'Regular Device';
        }
        if (oldDevice.portCount !== newDevice.portCount) {
            changes.portCount = newDevice.portCount ? `${newDevice.portCount} ports` : 'Not specified';
        }
        if (oldDevice.parentSwitch !== newDevice.parentSwitch) {
            changes.parentSwitch = newDevice.parentSwitch || 'Not connected';
        }
        return changes;
    };

    const saveDeviceChanges = (updatedDevice) => {
        console.log("Saving device changes:", updatedDevice);
        
        // Check if this is an SSH request
        if (updatedDevice._requestSSH) {
            // Remove the special flag
            const { _requestSSH, ...deviceWithoutFlag } = updatedDevice;
            
            // Open the SSH modal for this device
            setSSHTarget(deviceWithoutFlag);
            setSSHUsername(""); // Reset username
            setSSHPassword(""); // Reset password
            setSSHModalVisible(true);
            return; // Exit early, no need to save other changes
        }
          // First, update our persistent custom names in localStorage
        const updatedCustomNames = {
            ...persistentCustomNames,
            [updatedDevice.ip]: {
                name: updatedDevice.name,
                color: updatedDevice.color,
                icon: updatedDevice.icon,
                // Add support for new device properties
                category: updatedDevice.category || '',
                notes: updatedDevice.notes || '',
                // Add network topology properties
                networkRole: updatedDevice.networkRole,
                portCount: updatedDevice.portCount,
                parentSwitch: updatedDevice.parentSwitch,
                // Track change history with timestamp
                history: [
                    ...(persistentCustomNames[updatedDevice.ip]?.history || []),
                    {
                        timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
                        changes: getDeviceChanges(persistentCustomNames[updatedDevice.ip] || {}, updatedDevice)
                    }
                ].slice(-10) // Keep last 10 history entries
            }
        };
        
        // Update the state
        setPersistentCustomNames(updatedCustomNames);
        
        // Update localStorage directly to ensure it persists
        localStorage.setItem("customDeviceProperties", JSON.stringify(updatedCustomNames));
          // Update the device in scan history using the context function
        updateDeviceInHistory(updatedDevice.ip, {
            name: updatedDevice.name,
            color: updatedDevice.color,
            icon: updatedDevice.icon,
            category: updatedDevice.category,
            notes: updatedDevice.notes,
            networkRole: updatedDevice.networkRole,
            portCount: updatedDevice.portCount,
            parentSwitch: updatedDevice.parentSwitch
        });
        
        // Re-visualize current topology with updated device info
        
        // If we have an active entry, visualize just that one
        if (expandedIndex !== null) {
            const activeEntry = scanHistory[expandedIndex];
            console.log("Visualizing updated active entry");
            visualizeOnTopology(activeEntry);
        } 
        // Otherwise, if we have selected scans, visualize those
        else if (selectedScans.length > 0) {
            console.log("Visualizing selected scans with updated device");
            handleAddZones();
        }
        // Otherwise refresh the current view
        else if (scanHistory.length > 0) {
            console.log("Refreshing topology with all scans and updated device");
            // Combine all devices from all scans
            const allDevices = scanHistory.flatMap(entry => 
                Object.values(entry.data || {}).flat().map(device => {
                    // Apply custom properties
                    const customDevice = updatedCustomNames[device.ip];
                    if (customDevice) {
                        return {
                            ...device,
                            name: customDevice.name,
                            color: customDevice.color,
                            icon: customDevice.icon,
                            category: customDevice.category,
                            notes: customDevice.notes,
                            history: customDevice.history || []
                        };
                    }
                    return device;
                })
            );
            
            addZonesToTopology({
                devices: allDevices,
                vendorColors: {},
                customNames: updatedCustomNames
            });
        }
    };    const getSelectedScansData = () => {
        if (selectedScans.length === 0) return null;
        
        try {
            // Get the latest custom properties from localStorage
            const latestCustomProperties = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
            
            // Get the selected scan entries
            const selectedZones = selectedScans.map((index) => scanHistory[index]).filter(Boolean); // Filter out any null/undefined entries
            
            if (selectedZones.length === 0) {
                console.warn("No valid scan entries found for selected indices");
                return null;
            }
            
            // Create a combined array of devices from selected scans
            let combinedDevices = [];
            
            // Process each selected zone/scan
            selectedZones.forEach((zone, zoneIndex) => {
                // Get all devices from this scan
                const zoneDevices = Object.values(zone.data || {}).flat();
                
                // Create enhanced devices with proper custom properties and scan source info
                const enhancedDevices = zoneDevices.map(device => {
                    // Start with the original device
                    const enhancedDevice = { ...device };
                    
                    // Apply custom properties from the latest localStorage data if they exist
                    if (device.ip && latestCustomProperties[device.ip]) {
                        const customProps = latestCustomProperties[device.ip];                        // Apply all custom properties including history
                        enhancedDevice.name = customProps.name || enhancedDevice.name;
                        enhancedDevice.color = customProps.color || enhancedDevice.color;
                        enhancedDevice.icon = customProps.icon || enhancedDevice.icon;
                        enhancedDevice.category = customProps.category || enhancedDevice.category;
                        enhancedDevice.notes = customProps.notes || enhancedDevice.notes;
                        
                        // Apply network hierarchy properties - CRITICAL for export
                        if (customProps.networkRole !== undefined) enhancedDevice.networkRole = customProps.networkRole;
                        if (customProps.isMainGateway !== undefined) enhancedDevice.isMainGateway = customProps.isMainGateway;
                        if (customProps.parentGateway !== undefined) enhancedDevice.parentGateway = customProps.parentGateway;
                        if (customProps.parentSwitch !== undefined) enhancedDevice.parentSwitch = customProps.parentSwitch;
                        if (customProps.portCount !== undefined) enhancedDevice.portCount = customProps.portCount;
                        
                        // Make sure we preserve history entries
                        enhancedDevice.history = customProps.history || [];
                    }
                    
                    // Add scan source information (important for grouping in the export)
                    enhancedDevice.scanSource = {
                        id: zone.id || `scan-${zoneIndex}`,
                        name: zone.name || `Scan ${zoneIndex + 1}`,
                        index: zoneIndex,
                        timestamp: zone.timestamp
                    };
                    
                    return enhancedDevice;
                });
                
                // Add these enhanced devices to the combined array
                combinedDevices = [...combinedDevices, ...enhancedDevices];
            });
            
            // Convert to grouped format expected by export functions
            const groupedDevices = {};
            combinedDevices.forEach(device => {
                const vendor = device.vendor || 'Unknown';
                if (!groupedDevices[vendor]) {
                    groupedDevices[vendor] = [];
                }
                groupedDevices[vendor].push(device);
            });
            
            return {
                devices: groupedDevices,
                customNames: latestCustomProperties,
                scanCount: selectedScans.length
            };
        } catch (error) {
            console.error("Error preparing selected scans data for export:", error);
            return null;
        }
    };    return (
        <div className="mt-6">
            {/* Sync Status Component */}
            <Suspense fallback={<div className="animate-pulse bg-gray-200 h-16 rounded mb-4"></div>}>
                <ScanHistorySyncStatus showFullControls={true} />
            </Suspense>
            
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Scan History</h3>
                {scanHistory.length > 0 && (
                    <button
                        onClick={() => setShowConfirmClear(true)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    >
                        Clear All History
                    </button>
                )}
            </div>
            
            {scanHistory.length === 0 ? (
                <p className="text-sm text-gray-400">No scans completed yet.</p>
            ) : (
                <div className="flex flex-col gap-4">
                    {scanHistory
                        .slice()
                        .reverse()
                        .map((entry, idx) => {
                            const originalIndex = scanHistory.length - idx - 1;
                            const isExpanded = expandedIndex === originalIndex;

                            return (
                                <div
                                    key={originalIndex}
                                    className="bg-gray-700 text-white p-4 rounded-lg shadow-md"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedScans.includes(originalIndex)}
                                                onChange={() => handleCheckboxChange(originalIndex)}
                                                className="form-checkbox h-5 w-5 text-blue-600"
                                            />
                                            {editingIndex === originalIndex ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={newName}
                                                        onChange={(e) => setNewName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                saveRename(originalIndex);
                                                            }
                                                        }}
                                                        className="bg-gray-600 text-white px-2 py-1 rounded"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => saveRename(originalIndex)}
                                                        className="bg-green-600 hover:bg-green-700 text-white p-1 rounded text-xs"
                                                        title="Save name"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingIndex(null)}
                                                        className="bg-gray-600 hover:bg-gray-700 text-white p-1 rounded text-xs"
                                                        title="Cancel"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <h4 className="text-md font-bold">
                                                    {entry.name || `Scan ${originalIndex + 1}`}
                                                </h4>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Show/hide button moved to the top */}
                                            <button
                                                onClick={() => toggleAccordion(originalIndex)}
                                                className="text-blue-400 hover:underline flex items-center"
                                            >
                                                {isExpanded ? (
                                                    <>Hide Devices <FaChevronUp className="ml-1" /></>
                                                ) : (
                                                    <>View Devices <FaChevronDown className="ml-1" /></>
                                                )}
                                            </button>
                                            <div className="relative">
                                                <button
                                                    onClick={() => toggleMenu(originalIndex)}
                                                    className="text-gray-400 hover:text-white"
                                                >
                                                    <FaEllipsisV />
                                                </button>                                                {menuOpenIndex === originalIndex && (
                                                    <div className="absolute right-0 mt-2 bg-gray-800 text-white rounded shadow-lg z-10">
                                                        <button
                                                            onClick={() => startRenaming(originalIndex)}
                                                            className="block px-4 py-2 text-sm hover:bg-gray-700 w-full text-left"
                                                        >
                                                            <FaEdit className="inline mr-2" />
                                                            Rename
                                                        </button>
                                                        <button
                                                            onClick={() => openSharingModal(entry, originalIndex)}
                                                            className="block px-4 py-2 text-sm hover:bg-gray-700 w-full text-left text-blue-400"
                                                        >
                                                            <FaShare className="inline mr-2" />
                                                            Share
                                                        </button>
                                                        <button
                                                            onClick={() => deleteScan(originalIndex)}
                                                            className="block px-4 py-2 text-sm hover:bg-gray-700 w-full text-left text-red-500"
                                                        >
                                                            <FaTrash className="inline mr-2" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm">
                                        <strong>Timestamp:</strong> {entry.timestamp}
                                    </p>
                                    <p className="text-sm">
                                        <strong>IP Range:</strong> {entry.ipRange || "N/A"}
                                    </p>
                                    <p className="text-sm">
                                        <strong>Devices Found:</strong> {entry.devices}
                                    </p>

                                    {/* Visualize button outside of the list */}
                                    <div className="mt-2 flex justify-end">
                                        <button
                                            onClick={() => visualizeOnTopology(entry)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm rounded"
                                        >
                                            Visualize on Topology
                                        </button>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-4 bg-gray-800 p-3 rounded">
                                            <h5 className="text-sm font-bold mb-2">Devices:</h5>
                                            <Suspense fallback={<div>Loading devices...</div>}>
                                                <MemoizedDeviceList
                                                    devices={Object.values(entry.data || {}).flat()}
                                                    openModal={openModal}
                                                    isSSHAvailable={isSSHAvailable}
                                                    openSSHModal={openSSHModal}
                                                />
                                            </Suspense>
                                        </div>
                                    )}
                                    {/* Remove the show/hide button from here as it's now at the top */}
                                </div>
                            );
                        })}
                </div>
            )}            {selectedScans.length >= 1 && (
                <div className="mt-4 flex flex-col gap-3">
                    {/* Export Selected Scans */}
                    <div className="p-3 border border-gray-700 rounded bg-gray-800">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                            Export Selected Scans ({selectedScans.length} selected)
                        </h4>
                        <Suspense fallback={<div className="text-gray-400 text-sm">Loading export options...</div>}>
                            <NetworkScanExportImport 
                                devices={null} // Not used in selected mode
                                customNames={null} // Not used in selected mode
                                selectedScansData={getSelectedScansData()}
                                showSelectedExport={true}
                                onImport={() => {}} // Disable import for selected scans view
                            />
                        </Suspense>
                    </div>
                    
                    {/* Add to Topology (only show for 2+ selections) */}
                    {selectedScans.length >= 2 && (
                        <button
                            onClick={handleAddZones}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                        >
                            Add Selected to Topology as Zones
                        </button>
                    )}
                </div>
            )}<Suspense fallback={<div>Loading modal...</div>}>
                <UnifiedDeviceModal
                    modalDevice={modalDevice}
                    setModalDevice={setModalDevice}
                    onSave={saveDeviceChanges}
                    onStartSSH={(device) => {
                        setSSHTarget(device);
                        setSSHModalVisible(true);
                    }}
                />
            </Suspense>

            {sshModalVisible && sshTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-4 w-96">
                        <h2 className="text-white text-xl mb-4">SSH to {sshTarget.ip}</h2>
                        <div className="mb-4">
                            <label className="block text-sm text-gray-300 mb-1">Username</label>
                            <input
                                type="text"
                                value={sshUsername}
                                onChange={(e) => setSSHUsername(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm text-gray-300 mb-1">Password</label>
                            <input
                                type="password"
                                value={sshPassword}
                                onChange={(e) => setSSHPassword(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setSSHModalVisible(false)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    // Close the credentials modal
                                    setSSHModalVisible(false);
                                    // Open the terminal
                                    setShowTerminal(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                            >
                                Connect
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTerminal && sshTarget && (
                <Suspense fallback={<div>Loading SSH terminal...</div>}>
                    <SSHTerminal
                        ip={sshTarget.ip}
                        username={sshUsername}
                        password={sshPassword}
                        visible={showTerminal}
                        onClose={() => setShowTerminal(false)}
                    />
                </Suspense>
            )}
            
            {/* Confirmation Modal for Clearing All History */}
            {showConfirmClear && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-96">
                        <h2 className="text-white text-xl mb-4">Confirm Clear History</h2>
                        <p className="text-gray-300 mb-6">
                            Are you sure you want to clear all scan history and custom device names? 
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmClear(false)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={clearDeviceHistory}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                            >
                                Clear All History
                            </button>                        </div>
                    </div>
                </div>
            )}

            {/* Sharing Modal */}
            {sharingModalVisible && scanToShare && (
                <Suspense fallback={<div>Loading sharing modal...</div>}>
                    <NetworkScanSharingModal
                        isOpen={sharingModalVisible}
                        onClose={closeSharingModal}
                        scanData={scanToShare}
                        onShareSuccess={handleShareSuccess}
                    />
                </Suspense>
            )}
        </div>
    );
}

