"use client";

import React from "react";
import { FaNetworkWired, FaPlus } from "react-icons/fa";
import NetworkControlModal from "./NetworkControlModal";
import { useNetworkControlModal } from "./useNetworkControlModal";

/**
 * Example component showing how to integrate NetworkControlModal into any page
 * This can be used as a template for different pages that need network scanning functionality
 */
export default function ExamplePageWithNetworkControl({ 
    pageTitle = "Example Page",
    showQuickActions = true,
    modalTitle = "Network Control Center",
    defaultIpRange = "10.5.1.1-255"
}) {
    const {
        isModalVisible,
        devices,
        customNames,
        openModal,
        closeModal,
        handleScanComplete,
        handleDevicesUpdate,
        handleCustomNamesUpdate,
    } = useNetworkControlModal();

    const handleQuickScan = () => {
        openModal();
        // You could automatically start a scan here if needed
    };

    return (
        <div className="p-6 bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">{pageTitle}</h1>
                    
                    {/* Quick Actions */}
                    {showQuickActions && (
                        <div className="flex space-x-4">
                            <button
                                onClick={handleQuickScan}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center transition-colors"
                            >
                                <FaNetworkWired className="mr-2" />
                                Quick Network Scan
                            </button>
                            
                            <button
                                onClick={openModal}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center transition-colors"
                            >
                                <FaPlus className="mr-2" />
                                Open Network Control
                            </button>
                        </div>
                    )}
                </div>

                {/* Page Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2">
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-white mb-4">Your Page Content</h2>
                            <p className="text-gray-300 mb-4">
                                This is where your main page content would go. The network control modal 
                                can be triggered from anywhere on this page.
                            </p>
                            
                            {/* Example: Show current device count */}
                            {Object.keys(devices).length > 0 && (
                                <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-4 mb-4">
                                    <h3 className="text-blue-300 font-medium mb-2">Network Devices Discovered</h3>
                                    <p className="text-white">
                                        Found {Object.values(devices).flat().length} devices across {Object.keys(devices).length} vendor categories
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={openModal}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                            >
                                Open Network Control Modal
                            </button>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Network Status Card */}
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Network Status</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Devices:</span>
                                    <span className="text-white">{Object.values(devices).flat().length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Custom Names:</span>
                                    <span className="text-white">{Object.keys(customNames).length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Vendors:</span>
                                    <span className="text-white">{Object.keys(devices).length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions Card */}
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={openModal}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
                                >
                                    Network Scan
                                </button>
                                <button
                                    onClick={openModal}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors"
                                >
                                    Device Management
                                </button>
                                <button
                                    onClick={openModal}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
                                >
                                    Export Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Network Control Modal */}
                <NetworkControlModal
                    isVisible={isModalVisible}
                    onClose={closeModal}
                    onScanComplete={handleScanComplete}
                    onDevicesUpdate={handleDevicesUpdate}
                    onCustomNamesUpdate={handleCustomNamesUpdate}
                    title={modalTitle}
                    defaultIpRange={defaultIpRange}
                    allowFullscreen={true}
                    showExportImport={true}
                    showHistory={true}
                    showRawDataInspector={true}
                    currentState={{ devices }}
                />
            </div>
        </div>
    );
}
