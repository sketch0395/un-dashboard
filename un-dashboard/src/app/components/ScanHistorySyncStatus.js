"use client";

import React from 'react';
import { FaSync, FaDatabase, FaExclamationTriangle, FaCheck, FaClock } from 'react-icons/fa';
import { useScanHistory } from '../networkscan/components/networkscanhistory';
import { format } from 'date-fns';

const ScanHistorySyncStatus = ({ showFullControls = false }) => {
    const { 
        scanHistory, 
        syncToDatabase, 
        refreshFromDatabase,
        isLoading,
        isSyncing,
        syncError,
        lastSyncTime
    } = useScanHistory();

    // Count synced vs unsynced scans
    const syncedCount = scanHistory.filter(scan => scan.isFromDatabase).length;
    const unsyncedCount = scanHistory.length - syncedCount;

    const handleSync = async () => {
        await syncToDatabase();
    };

    const handleRefresh = async () => {
        await refreshFromDatabase();
    };

    if (!showFullControls && !syncError && unsyncedCount === 0) {
        return null; // Don't show if everything is synced and no errors
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <FaDatabase className="text-blue-500" />
                    <div>
                        <h3 className="text-sm font-medium text-gray-900">
                            Scan History Sync Status
                        </h3>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            <span className="flex items-center">
                                <FaCheck className="text-green-500 mr-1" />
                                {syncedCount} synced
                            </span>
                            {unsyncedCount > 0 && (
                                <span className="flex items-center">
                                    <FaClock className="text-yellow-500 mr-1" />
                                    {unsyncedCount} pending
                                </span>
                            )}
                            {lastSyncTime && (
                                <span>
                                    Last sync: {format(lastSyncTime, 'MMM dd, HH:mm')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {syncError && (
                        <div className="flex items-center text-red-500 text-xs mr-3">
                            <FaExclamationTriangle className="mr-1" />
                            <span>{syncError}</span>
                        </div>
                    )}

                    {showFullControls && (
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="flex items-center px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                            title="Refresh from database"
                        >
                            <FaSync className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    )}

                    {unsyncedCount > 0 && (
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="flex items-center px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                            title={`Sync ${unsyncedCount} pending scans to database`}
                        >
                            <FaSync className={`mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Syncing...' : `Sync ${unsyncedCount}`}
                        </button>
                    )}
                </div>
            </div>

            {syncError && showFullControls && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
                    <p className="text-red-700">
                        <strong>Sync Error:</strong> {syncError}
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                        Your scans are still saved locally. Try syncing again or check your internet connection.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ScanHistorySyncStatus;
