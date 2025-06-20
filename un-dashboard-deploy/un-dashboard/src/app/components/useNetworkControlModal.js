"use client";

import { useState, useCallback } from "react";

/**
 * Custom hook to manage NetworkControlModal state across different pages
 * Provides consistent API for opening/closing the modal and handling data updates
 */
export function useNetworkControlModal() {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [devices, setDevices] = useState({});
    const [customNames, setCustomNames] = useState({});

    const openModal = useCallback(() => {
        setIsModalVisible(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalVisible(false);
    }, []);

    const handleScanComplete = useCallback((scanResults) => {
        console.log("Scan completed with results:", scanResults);
        // Handle scan completion logic here
    }, []);

    const handleDevicesUpdate = useCallback((newDevices) => {
        setDevices(newDevices);
        console.log("Devices updated:", newDevices);
    }, []);

    const handleCustomNamesUpdate = useCallback((newCustomNames) => {
        setCustomNames(newCustomNames);
        console.log("Custom names updated:", newCustomNames);
    }, []);

    return {
        // State
        isModalVisible,
        devices,
        customNames,
        
        // Actions
        openModal,
        closeModal,
        handleScanComplete,
        handleDevicesUpdate,
        handleCustomNamesUpdate,
    };
}

export default useNetworkControlModal;
