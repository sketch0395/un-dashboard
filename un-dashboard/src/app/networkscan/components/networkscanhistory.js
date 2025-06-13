"use client";

import React, { lazy, Suspense, useState, useEffect, memo, useCallback } from "react";
import { FaChevronDown, FaChevronUp, FaTrash, FaEdit, FaEllipsisV, FaTerminal, FaShare } from "react-icons/fa";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { FixedSizeList as List } from "react-window";
import { useAuth } from "../../contexts/AuthContext";
import { useScanHistory } from "../../contexts/ScanHistoryContext";

const UnifiedDeviceModal = lazy(() => import("../../components/UnifiedDeviceModal"));
const SSHTerminal = lazy(() => import("../../components/sshterminal"));
const NetworkScanExportImport = lazy(() => import("./NetworkScanExportImport"));
const NetworkScanSharingModal = lazy(() => import("./NetworkScanSharingModal"));

// Use regular import instead of lazy to avoid chunk loading issues
import ScanHistorySyncStatus from "../../components/ScanHistorySyncStatus";
// Use regular import for MemoizedDeviceList to avoid chunk loading issues
import MemoizedDeviceList from "../../components/MemoizedDeviceList";

export default function NetworkScanHistory({ addZonesToTopology, scanHistoryData }) {
    const { scanHistory, saveScanHistory, deleteScan, updateScanName, clearHistory, updateDeviceInHistory, updateScanData } = useScanHistory();
    const { user, isAuthenticated } = useAuth();
    
    const [selectedScans, setSelectedScans] = useState([]);
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [modalDevice, setModalDevice] = useState(null);
    const [editingIndex, setEditingIndex] = useState(null);
    const [newName, setNewName] = useState("");
    const [menuOpenIndex, setMenuOpenIndex] = useState(null);
    const [sshModalVisible, setSSHModalVisible] = useState(false);
    const [sshTarget, setSSHTarget] = useState(null);
    const [sshUsername, setSSHUsername] = useState("");
    const [sshPassword, setSSHPassword] = useState("");
    const [showTerminal, setShowTerminal] = useState(false);
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

    const handleAddZones = async () => {
        console.log("Adding zones from selected scans with custom names");
        
        // First, make sure we have the latest customProperties data from localStorage
        const latestCustomProperties = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
        
        // Get the selected scan entries
        const selectedZones = selectedScans.map((index) => scanHistory[index]);
        
        // Create a combined array of enhanced devices
        let combinedDevices = [];
        
        // Process each selected zone/scan
        for (let zoneIndex = 0; zoneIndex < selectedZones.length; zoneIndex++) {
            const zone = selectedZones[zoneIndex];
            
            // Ensure database scans have their full data loaded
            if (zone.isFromDatabase && (!zone.data || Object.keys(zone.data).length === 0)) {
                console.log("Fetching full data for database scan:", zone.id);
                try {
                    const response = await fetch(`/api/scan-history/${zone.id}`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                      
                    if (response.ok) {
                        const fullScanData = await response.json();
                        zone.data = fullScanData.scanData?.devices || fullScanData.scanData || {};
                        
                        // Update the scan history to cache this data
                        updateScanData(zone.id, zone.data);
                    } else {
                        console.error("Failed to fetch full scan data for zone:", zone.id, response.status);
                        continue; // Skip this zone if we can't get its data
                    }
                } catch (error) {
                    console.error("Error fetching full scan data for zone:", zone.id, error);
                    continue; // Skip this zone if we can't get its data
                }
            }
            
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
                    name: zone.name || `Network Scan ${format(new Date(zone.timestamp), 'MMM dd, yyyy HH:mm')}`,
                    index: zoneIndex,
                    timestamp: zone.timestamp
                };
                
                return enhancedDevice;
            });
            
            // Add these enhanced devices to the combined array
            combinedDevices = [...combinedDevices, ...enhancedDevices];
        }
        
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

    const toggleAccordion = async (index) => {
        console.log('🎯 TOGGLE ACCORDION CALLED for index:', index);
        setExpandedIndex((prev) => (prev === index ? null : index));
        
        // Debug device flow when expanding
        if (expandedIndex !== index) {
            const entry = scanHistory[index];
            console.log('\n🔍 EXPANDING SCAN DEBUG:', {
                name: entry.name,
                deviceCount: entry.devices,
                isFromDatabase: entry.isFromDatabase,
                hasData: !!entry.data,
                dataKeys: entry.data ? Object.keys(entry.data) : [],
                entryId: entry.id,
                entryType: typeof entry
            });
            
            // CRITICAL FIX: Fetch data for database scans when expanding
            if (entry.isFromDatabase && (!entry.data || Object.keys(entry.data).length === 0)) {
                console.log("🔄 FETCHING FULL SCAN DATA for expansion:", entry.id);
                try {
                    const response = await fetch(`/api/scan-history/${entry.id}`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                    
                    console.log('📡 API Response status:', response.status);
                    
                    if (response.ok) {
                        const fullScanData = await response.json();
                        console.log("📥 RETRIEVED FULL SCAN DATA:", {
                            hasScanData: !!fullScanData.scanData,
                            scanDataKeys: fullScanData.scanData ? Object.keys(fullScanData.scanData) : 'none',
                            deviceCount: fullScanData.scanData?.devices?.length || 'no devices array'
                        });
                        
                        // Update the entry with the full data
                        const newData = fullScanData.scanData?.devices || fullScanData.scanData || {};
                        console.log('📦 NEW DATA TO SET:', {
                            type: typeof newData,
                            keys: Object.keys(newData),
                            isArray: Array.isArray(newData)
                        });
                        
                        // Update the scan history to cache this data
                        updateScanData(entry.id, newData);
                        
                        // Update the current entry reference for immediate use
                        entry.data = newData;
                        console.log("✅ UPDATED ENTRY DATA:", {
                            type: typeof entry.data,
                            keys: Object.keys(entry.data),
                            isArray: Array.isArray(entry.data)
                        });
                        
                        // Force a re-render by toggling expanded state
                        setTimeout(() => {
                            console.log('🔄 FORCING RE-RENDER');
                            setExpandedIndex(prev => prev === index ? index : prev);
                        }, 50);
                    } else {
                        const errorText = await response.text();
                        console.error("❌ FAILED TO FETCH full scan data:", response.status, errorText);
                    }
                } catch (error) {
                    console.error("❌ ERROR FETCHING full scan data:", error);
                }
            } else {
                console.log('ℹ️ Scan data already available or not from database');
            }
            
            // Test device extraction regardless of source
            if (entry.data) {
                console.log('🔧 TESTING DEVICE EXTRACTION:');
                console.log('  entry.data type:', typeof entry.data);
                console.log('  entry.data keys:', Object.keys(entry.data));
                console.log('  entry.data is array:', Array.isArray(entry.data));
                
                const extractedDevices = Object.values(entry.data).flat();
                console.log('📱 EXTRACTED DEVICES FOR DISPLAY:', {
                    count: extractedDevices.length,
                    devices: extractedDevices,
                    firstDevice: extractedDevices[0] ? {
                        ip: extractedDevices[0].ip,
                        status: extractedDevices[0].status,
                        vendor: extractedDevices[0].vendor,
                        hasRequiredFields: !!(extractedDevices[0].ip && extractedDevices[0].status)
                    } : 'none'
                });
                
                // Force a state update to trigger re-render
                setTimeout(() => {
                    console.log('🔄 FORCING STATE UPDATE');
                    setExpandedIndex(prev => prev); // Trigger re-render
                }, 100);
                
            } else {
                console.log('❌ NO DATA AVAILABLE for device extraction after all attempts');
            }
        } else {
            console.log('🔄 COLLAPSING scan accordion');
        }
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

    const visualizeOnTopology = async (entry) => {
        console.log("Visualizing entry:", { 
            id: entry.id, 
            isFromDatabase: entry.isFromDatabase,
            dataStructure: typeof entry.data,
            deviceCount: entry.devices,
            hasCustomNames: Object.keys(persistentCustomNames).length
        });
        
        // First, make sure we have the latest customNames data from localStorage
        const latestCustomProperties = JSON.parse(localStorage.getItem("customDeviceProperties")) || {};
        
        // Get all devices from the scan entry - handle both localStorage and database formats
        let entryDevices = [];
        
        if (entry.isFromDatabase) {
            // Database scans need to fetch full data including devices
            if (!entry.data || Object.keys(entry.data).length === 0) {
                console.log("Fetching full scan data from database for scan:", entry.id);
                try {
                    const response = await fetch(`/api/scan-history/${entry.id}`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                    
                    if (response.ok) {
                        const fullScanData = await response.json();
                        console.log("Retrieved full scan data:", fullScanData);
                        
                        // Update the entry with the full data
                        entry.data = fullScanData.scanData?.devices || fullScanData.scanData || {};
                        console.log("Updated entry data:", typeof entry.data, Object.keys(entry.data));
                        
                        // Update the scan history to cache this data
                        updateScanData(entry.id, entry.data);
                    } else {
                        console.error("Failed to fetch full scan data:", response.status);
                        return;
                    }
                } catch (error) {
                    console.error("Error fetching full scan data:", error);
                    return;
                }
            }
            
            // Extract devices from the full scan data
            if (entry.data && typeof entry.data === 'object') {
                if (Array.isArray(entry.data)) {
                    // If data is already an array of devices
                    entryDevices = entry.data;
                } else if (entry.data.devices) {
                    // If data has a devices property
                    entryDevices = Object.values(entry.data.devices).flat();
                } else {
                    // If data is object with vendor keys (standard format)
                    entryDevices = Object.values(entry.data).flat();
                }
            }
            console.log("Database scan devices extracted:", entryDevices.length);
        } else {
            // localStorage format: data contains vendor-grouped devices
            entryDevices = Object.values(entry.data || {}).flat();
            console.log("localStorage scan devices extracted:", entryDevices.length);
        }
        
        if (entryDevices.length === 0) {
            console.warn("No devices found in scan entry:", entry);
            return;
        }
        
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
                enhancedDevice.networkRole = customProps.networkRole || enhancedDevice.networkRole;
                enhancedDevice.parentSwitch = customProps.parentSwitch || enhancedDevice.parentSwitch;
                enhancedDevice.parentGateway = customProps.parentGateway || enhancedDevice.parentGateway;
                enhancedDevice.connectedGateways = customProps.connectedGateways || enhancedDevice.connectedGateways;
                enhancedDevice.connectedSwitches = customProps.connectedSwitches || enhancedDevice.connectedSwitches;
                enhancedDevice.isMainGateway = customProps.isMainGateway || enhancedDevice.isMainGateway;
                // Make sure we preserve history entries
                enhancedDevice.history = customProps.history || [];
            }
              
            // Add scan source information for topology grouping
            enhancedDevice.scanSource = entry.scanSource || {
                id: entry.id || `scan-${Date.now()}`,
                name: entry.name || `Network Scan ${format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}`,
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
                   `${Object.keys(latestCustomProperties).length} custom properties`,
                   "from", entry.isFromDatabase ? "database" : "localStorage");
        
        addZonesToTopology(combinedData);
    };

    const startRenaming = (index) => {
        setEditingIndex(index);
        const entry = scanHistory[index];
        const defaultName = entry.name || `Network Scan ${format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}`;
        setNewName(defaultName);
        setMenuOpenIndex(null); // Close the menu
    };

    const saveRename = (index) => {
        updateScanName(index, newName);
        setEditingIndex(null);
        setNewName("");
    };

    const toggleMenu = (index) => {
        setMenuOpenIndex((prev) => (prev === index ? null : index));
    };

    const isSSHAvailable = (device) => {
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
    };

    const getDeviceChanges = (oldDevice, newDevice) => {
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
    };

    const getSelectedScansData = async () => {
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
            for (let zoneIndex = 0; zoneIndex < selectedZones.length; zoneIndex++) {
                const zone = selectedZones[zoneIndex];
                
                // Ensure database scans have their full data loaded
                if (zone.isFromDatabase && (!zone.data || Object.keys(zone.data).length === 0)) {
                    console.log("Fetching full data for export from database scan:", zone.id);
                    try {
                        const response = await fetch(`/api/scan-history/${zone.id}`, {
                            method: 'GET',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        });
                          
                        if (response.ok) {
                            const fullScanData = await response.json();
                            zone.data = fullScanData.scanData?.devices || fullScanData.scanData || {};
                            
                            // Update the scan history to cache this data
                            updateScanData(zone.id, zone.data);
                        } else {
                            console.error("Failed to fetch full scan data for export:", zone.id, response.status);
                            continue; // Skip this zone if we can't get its data
                        }
                    } catch (error) {
                        console.error("Error fetching full scan data for export:", zone.id, error);
                        continue; // Skip this zone if we can't get its data
                    }
                }
                
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
                        name: zone.name || `Network Scan ${format(new Date(zone.timestamp), 'MMM dd, yyyy HH:mm')}`,
                        index: zoneIndex,
                        timestamp: zone.timestamp
                    };
                    
                    return enhancedDevice;
                });
                  
                // Add these enhanced devices to the combined array
                combinedDevices = [...combinedDevices, ...enhancedDevices];
            }
            
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
    };

    return (
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
                                                </button>
                                                
                                                {menuOpenIndex === originalIndex && (
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
                                                {(() => {
                                                    const extractedDevices = Object.values(entry.data || {}).flat();
                                                    console.log('🎨 PASSING TO MemoizedDeviceList:', {
                                                        scanName: entry.name,
                                                        entryDataType: typeof entry.data,
                                                        entryDataKeys: Object.keys(entry.data || {}),
                                                        extractedCount: extractedDevices.length,
                                                        extractedDevices: extractedDevices,
                                                        firstDevice: extractedDevices[0]
                                                    });
                                                    return (
                                                        <MemoizedDeviceList
                                                            devices={extractedDevices}
                                                            openModal={openModal}
                                                            isSSHAvailable={isSSHAvailable}
                                                            openSSHModal={openSSHModal}
                                                        />
                                                    );
                                                })()}
                                            </Suspense>
                                        </div>
                                    )}
                                    {/* Remove the show/hide button from here as it's now at the top */}
                                </div>
                            );
                        })}
                </div>
            )}
            
            {selectedScans.length >= 1 && (
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
            )}

            <Suspense fallback={<div>Loading modal...</div>}>
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
                            </button>
                        </div>
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
