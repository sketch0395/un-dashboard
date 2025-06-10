"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";

const ScanHistoryContext = createContext();

export const ScanHistoryProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [scanHistory, setScanHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(null);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    
    // Add scan save mutex to prevent race conditions
    const [scanSaveInProgress, setScanSaveInProgress] = useState(new Set());

    // Get user-specific localStorage key
    const getScanHistoryKey = () => {
        if (isAuthenticated && user && user._id) {
            return `scanHistory_${user._id}`;
        }
        return "scanHistory"; // fallback for unauthenticated users
    };

    // Load scan history with database-first approach
    const loadScanHistory = async () => {
        setIsLoading(true);
        
        // If not authenticated, load from localStorage only
        if (!isAuthenticated || !user) {
            console.log('User not authenticated - loading from localStorage only');
            try {
                const localKey = getScanHistoryKey();
                const localScans = JSON.parse(localStorage.getItem(localKey) || '[]');
                setScanHistory(localScans);
                console.log(`Loaded ${localScans.length} scans from localStorage`);
            } catch (error) {
                console.error('Error loading from localStorage:', error);
                setScanHistory([]);
            }
            setIsLoading(false);
            return;
        }

        try {
            console.log('Authenticated user - attempting database load...');
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
                    data: {}, // Leave empty - will be fetched on demand
                    name: dbEntry.name,
                    settings: dbEntry.settings,
                    metadata: dbEntry.metadata,
                    _dbId: dbEntry._id,
                    isFromDatabase: true,
                    scanSource: {
                        id: dbEntry.scanId,
                        name: dbEntry.name,
                        timestamp: format(new Date(dbEntry.createdAt), "yyyy-MM-dd HH:mm:ss")
                    }
                }));

                // Remove duplicates
                const uniqueHistory = [];
                const seenIds = new Set();
                convertedHistory.forEach(scan => {
                    if (!seenIds.has(scan.id)) {
                        seenIds.add(scan.id);
                        uniqueHistory.push(scan);
                    }
                });

                setScanHistory(uniqueHistory);
                setLastSyncTime(new Date());
                console.log(`Loaded ${uniqueHistory.length} unique scans from database`);

                // Update localStorage as cache
                const storageKey = getScanHistoryKey();
                localStorage.setItem(storageKey, JSON.stringify(uniqueHistory));
                
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
            console.log(`Loaded ${savedHistory.length} scans from localStorage`);
            setSyncError(null);
        }
        
        setIsLoading(false);
    };

    // Main save scan history function
    const saveScanHistory = async (data, ipRange) => {
        console.log("saveScanHistory called with:", { data: typeof data, ipRange });
        
        // For now, just log to verify the function is working
        if (!isAuthenticated || !user) {
            console.log("Cannot save scan history: user not authenticated");
            return;
        }
        
        // Basic implementation for testing
        const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
        const scanId = uuidv4();
        
        const newEntry = {
            id: scanId,
            timestamp,
            ipRange,
            devices: Array.isArray(data) ? data.length : 0,
            data: data || {},
            name: `Network Scan ${format(new Date(), 'MMM dd, yyyy HH:mm')}`,
            isFromDatabase: false
        };
        
        setScanHistory(prev => [...prev, newEntry]);
        console.log("Added scan to history:", scanId);
    };    // Update scan data function
    const updateScanData = useCallback((scanId, newData) => {
        setScanHistory(prev => prev.map(scan => 
            scan.id === scanId 
                ? { ...scan, data: newData }
                : scan
        ));
        console.log('🔄 Updated scan data in history for scan:', scanId);
        
        // Also update localStorage
        const storageKey = getScanHistoryKey();
        setTimeout(() => {
            const currentHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const updatedHistory = currentHistory.map(scan => 
                scan.id === scanId 
                    ? { ...scan, data: newData }
                    : scan
            );
            localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
        }, 100);
    }, []);

    // Delete scan function
    const deleteScan = useCallback(async (index) => {
        setScanHistory(prev => prev.filter((_, i) => i !== index));
        
        // Update localStorage
        const storageKey = getScanHistoryKey();
        setTimeout(() => {
            const currentHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const updatedHistory = currentHistory.filter((_, i) => i !== index);
            localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
        }, 100);
        
        console.log('🗑️ Deleted scan at index:', index);
    }, []);

    // Update scan name function
    const updateScanName = useCallback((index, newName) => {
        setScanHistory(prev => prev.map((scan, i) => 
            i === index 
                ? { ...scan, name: newName }
                : scan
        ));
        
        // Update localStorage
        const storageKey = getScanHistoryKey();
        setTimeout(() => {
            const currentHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const updatedHistory = currentHistory.map((scan, i) => 
                i === index 
                    ? { ...scan, name: newName }
                    : scan
            );
            localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
        }, 100);
        
        console.log('📝 Updated scan name at index:', index, 'to:', newName);
    }, []);

    // Clear all history function
    const clearHistory = useCallback(() => {
        setScanHistory([]);
        
        // Clear localStorage
        const storageKey = getScanHistoryKey();
        localStorage.removeItem(storageKey);
        
        console.log('🧹 Cleared all scan history');
    }, []);

    // Update device in history function
    const updateDeviceInHistory = useCallback((scanId, deviceId, updatedDevice) => {
        setScanHistory(prev => prev.map(scan => {
            if (scan.id === scanId && scan.data && scan.data[deviceId]) {
                return {
                    ...scan,
                    data: {
                        ...scan.data,
                        [deviceId]: updatedDevice
                    }
                };
            }
            return scan;
        }));
        
        console.log('🔧 Updated device in scan history:', { scanId, deviceId });
    }, []);    // Add a function to handle user logout cleanup
    const clearScanHistoryOnLogout = useCallback(() => {
        setScanHistory([]);
        console.log("Cleared scan history due to user logout");
    }, []);

    // Manual sync function - push localStorage scans to database
    const syncToDatabase = useCallback(async () => {
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
                try {
                    const response = await fetch('/api/scan-history', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            scanId: scan.id,
                            name: scan.name,
                            ipRange: scan.ipRange,
                            deviceCount: scan.devices,
                            scanData: scan.data,
                            metadata: scan.metadata || {},
                            settings: scan.settings || {}
                        })
                    });
                    
                    if (response.ok) {
                        successCount++;
                    } else {
                        console.error('Failed to sync scan:', scan.id, response.status);
                    }
                } catch (error) {
                    console.error('Error syncing scan:', scan.id, error);
                }
            }
            
            if (successCount > 0) {
                // Mark synced scans as from database
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
    }, [scanHistory, isAuthenticated, user]);

    // Refresh from database
    const refreshFromDatabase = useCallback(async () => {
        if (!isAuthenticated || !user) {
            return false;
        }
        
        setIsLoading(true);
        await loadScanHistory();
        return true;
    }, [isAuthenticated, user]);

    // Clear scan history when user logs out
    useEffect(() => {
        if (!isAuthenticated) {
            clearScanHistoryOnLogout();
        }
    }, [isAuthenticated, clearScanHistoryOnLogout]);

    // Initialize scan history on auth state change
    useEffect(() => {
        loadScanHistory();
    }, [isAuthenticated, user]);    // Context value with essential functions
    const contextValue = {
        scanHistory,
        saveScanHistory,
        updateScanData,
        deleteScan,
        updateScanName,
        clearHistory,
        updateDeviceInHistory,
        syncToDatabase,
        refreshFromDatabase,
        isLoading,
        isSyncing,
        syncError,
        lastSyncTime,
        clearScanHistoryOnLogout
    };

    return (
        <ScanHistoryContext.Provider value={contextValue}>
            {children}
        </ScanHistoryContext.Provider>
    );
};

export const useScanHistory = () => {
    const context = useContext(ScanHistoryContext);
    if (!context) {
        throw new Error('useScanHistory must be used within a ScanHistoryProvider');
    }
    return context;
};
