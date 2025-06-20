import React, { useState, useRef } from 'react';
import { FaFileExport, FaFileImport, FaFileCode, FaFileCsv, FaExclamationTriangle } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { 
    convertToCSV, 
    prepareForJsonExport, 
    parseCSVImport, 
    parseJSONImport 
} from '../../utils/exportImportUtils';
import { useScanHistory } from '../../contexts/ScanHistoryContext';

const NetworkScanExportImport = ({ 
    devices, 
    customNames,
    onImport,
    // New props for selected scans export
    selectedScansData = null,
    showSelectedExport = false
}) => {
    const { saveScanHistory } = useScanHistory();
    const [exportFormat, setExportFormat] = useState('json');
    const [showDropdown, setShowDropdown] = useState(false);
    const [importError, setImportError] = useState(null);
    const [importStatus, setImportStatus] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);

    // Determine which data to use for export
    const getExportData = () => {
        if (showSelectedExport && selectedScansData) {
            return {
                devices: selectedScansData.devices,
                customNames: selectedScansData.customNames,
                isSelectedScans: true,
                scanCount: selectedScansData.scanCount || 1
            };
        }
        return {
            devices: devices,
            customNames: customNames,
            isSelectedScans: false,
            scanCount: 1
        };
    };

    // Function to handle exporting data
    const handleExport = () => {
        const exportData = getExportData();
        
        if (!exportData.devices || Object.keys(exportData.devices).length === 0) {
            alert(exportData.isSelectedScans ? "No selected scan data to export." : "No scan data to export.");
            return;
        }
        
        let content;
        let filename;
        let mimeType;
        
        // Get scan name from data
        let scanName = 'network-scan';
        if (exportData.isSelectedScans) {
            scanName = `selected-scans-${exportData.scanCount}`;
        } else {
            const flattenedDevices = Array.isArray(exportData.devices) ? exportData.devices : Object.values(exportData.devices).flat();
            if (flattenedDevices.length > 0 && flattenedDevices[0].scanSource?.name) {
                // Clean the scan name for use in a filename
                scanName = flattenedDevices[0].scanSource.name
                    .replace(/:/g, '-')
                    .replace(/[\\\/\*\?\"\<\>\|]/g, '') // Remove invalid filename chars
                    .trim();
            }
        }
        
        const dateStr = new Date().toISOString().split('T')[0];

        if (exportFormat === 'csv') {
            content = convertToCSV(exportData.devices, exportData.customNames);
            filename = `${scanName}-${dateStr}.csv`;
            mimeType = 'text/csv';
        } else {
            const dataToExport = prepareForJsonExport(exportData.devices, exportData.customNames);
            // Add metadata for selected scans export
            if (exportData.isSelectedScans) {
                dataToExport.metadata = {
                    ...dataToExport.metadata,
                    exportType: 'selected-scans',
                    scanCount: exportData.scanCount,
                    exportDate: new Date().toISOString()
                };
            }
            content = JSON.stringify(dataToExport, null, 2);
            filename = `${scanName}-${dateStr}.json`;
            mimeType = 'application/json';
        }
        
        // Create a blob and download link
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        // Create download link and trigger click
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    };

    // Function to trigger file input click
    const triggerFileInput = () => {
        fileInputRef.current.click();
    };    // Function to handle file import
    const handleFileImport = async (event) => {
        // Reset states
        setImportError(null);
        setImportStatus(null);
        setIsImporting(true);
        
        const file = event.target.files[0];
        if (!file) {
            setIsImporting(false);
            return;
        }
        
        // File size handling
        const fileSizeInMB = file.size / (1024 * 1024);
        if (fileSizeInMB > 10) {
            setImportStatus(`Processing large file (${fileSizeInMB.toFixed(2)}MB). This may take a moment...`);
        }
        
        // Validate file type
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        const isJSON = file.name.toLowerCase().endsWith('.json');
        
        if (!isCSV && !isJSON) {
            setImportError('Unsupported file format. Please use CSV or JSON files.');
            setIsImporting(false);
            event.target.value = null;
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                setImportStatus('Processing file data...');
                const content = e.target.result;
                let result;
                
                // Parse the file based on type
                if (isCSV) {
                    result = parseCSVImport(content);
                    setImportStatus('Parsed CSV data successfully.');
                } else {
                    try {
                        const jsonContent = JSON.parse(content);
                        result = parseJSONImport(jsonContent);
                        setImportStatus(`Parsed JSON data successfully. Found ${Object.keys(result.devices).length} device entries.`);
                    } catch (jsonError) {
                        throw new Error(`Invalid JSON format: ${jsonError.message}`);
                    }
                }
                
                // Count devices for status
                const deviceCount = Object.values(result.devices).flat().length;
                
                // Extract import metadata
                const importDate = new Date();
                const sourceName = file.name || 'Imported Scan';
                const ipRange = result.metadata?.ipRange || 'Imported';
                
                // For large datasets, use the API endpoint
                if (deviceCount > 100 || JSON.stringify(result).length > 1000000) {
                    setImportStatus(`Importing ${deviceCount} devices via server API...`);
                    
                    try {
                        const response = await fetch('/api/network/import', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(result),
                        });
                          if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Failed to import data via API');
                        }
                        
                        const responseData = await response.json();
                        
                        // NOTE: Don't save to scan history here for API imports
                        // The server will emit saveToScanHistory event which will be handled by DashboardNetworkScanControl
                        console.log("API import successful, server will handle scan history saving");
                        
                        setImportStatus(`Successfully imported ${deviceCount} devices and added to history.`);
                        
            // API handled the import, just notify parent
                        if (onImport) {
                            onImport(result);
                        }
                    } catch (apiError) {
                        console.error('API import error:', apiError);
                        throw new Error(`API error: ${apiError.message}`);
                    }
                } 
                // For smaller datasets, use the callback directly
                else if (onImport && deviceCount > 0) {
                    setImportStatus(`Importing ${deviceCount} devices...`);
                    
                    // Check if we have network topology information
                    if (result.metadata?.hasNetworkTopology || 
                        (result.customNames && Object.values(result.customNames).some(
                            props => props.networkRole === 'gateway' || props.networkRole === 'switch'
                        ))
                    ) {
                        setImportStatus(`Importing ${deviceCount} devices with network topology information...`);
                    }
                      // Add to scan history with source information
                    const scanSourceName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
                      // Create scan source info for imported devices if not present
                    const enrichedDevices = { ...result.devices };
                    Object.values(enrichedDevices).forEach(devicesAtIp => {
                        devicesAtIp.forEach(device => {
                            if (!device.scanSource) {
                                device.scanSource = {
                                    id: uuidv4(),
                                    name: result.metadata?.scanName ? `Import: ${result.metadata.scanName}` : `Import: ${scanSourceName}`,
                                    timestamp: result.metadata?.scanDate || format(new Date(), "yyyy-MM-dd HH:mm:ss")
                                };
                            }
                            
                            // Apply device custom settings from the customNames if present
                            if (device.ip && result.customNames && result.customNames[device.ip]) {
                                const customProps = result.customNames[device.ip];
                                // Apply network role settings directly to the device for immediate visualization
                                device.name = customProps.name || device.name;
                                device.category = customProps.category;
                                device.networkRole = customProps.networkRole;
                                device.isMainGateway = customProps.isMainGateway;
                                device.parentGateway = customProps.parentGateway;
                                device.parentSwitch = customProps.parentSwitch;
                                device.portCount = customProps.portCount;
                            }
                        });                    });
                    
                    // Save to scan history with detected IP range (with small delay to avoid conflicts)
                    const historyIpRange = result.metadata?.ipRange || ipRange;
                    console.log("Client-side import: saving to scan history with deduplication protection");
                    setTimeout(() => {
                        saveScanHistory(enrichedDevices, historyIpRange);
                    }, 100); // Small delay to avoid race conditions
                      // Notify parent component
                    onImport({
                        ...result,
                        devices: enrichedDevices
                    });
                    
                    // Show success message with topology info if available
                    if (result.customNames) {
                        const gatewayCount = Object.values(result.customNames).filter(p => p.networkRole === 'gateway').length;
                        const switchCount = Object.values(result.customNames).filter(p => p.networkRole === 'switch').length;
                        
                        if (gatewayCount > 0 || switchCount > 0) {
                            setImportStatus(
                                `Successfully imported ${deviceCount} devices with ${gatewayCount} gateways and ${switchCount} switches.`
                            );
                        } else {
                            setImportStatus(`Successfully imported ${deviceCount} devices and added to scan history.`);
                        }
                    } else {
                        setImportStatus(`Successfully imported ${deviceCount} devices and added to scan history.`);
                    }
                } else {
                    throw new Error('No valid device data found in the imported file.');
                }
                
                // Success - hide import status after a delay
                setTimeout(() => {
                    setImportStatus(null);
                }, 3000);
            } catch (error) {
                console.error('Import error:', error);
                setImportError(error.message);
                setImportStatus(null);
            } finally {
                setIsImporting(false);
            }
        };
        
        reader.onerror = () => {
            setImportError('Error reading file. Please try again.');
            setImportStatus(null);
            setIsImporting(false);
        };
        
        // Read the file
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = null;
    };
      return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                {/* Export dropdown */}
                <div className="relative">                    <button
                        onClick={() => !isImporting && setShowDropdown(!showDropdown)}
                        disabled={isImporting}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-white text-sm transition-colors ${
                            isImporting 
                                ? 'bg-blue-800 opacity-70 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        <FaFileExport className="mr-1" />
                        {showSelectedExport ? 'Export Selected Scans' : 'Export Scan'}
                    </button>
                    
                    {showDropdown && !isImporting && (
                        <div className="absolute left-0 top-full mt-1 z-10 bg-gray-800 rounded shadow-lg py-1">
                            <button
                                onClick={() => {
                                    setExportFormat('json');
                                    setShowDropdown(false);
                                    handleExport();
                                }}
                                className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-700 text-white text-sm"
                            >
                                <FaFileCode className="mr-2" /> Export as JSON
                            </button>
                            <button
                                onClick={() => {
                                    setExportFormat('csv');
                                    setShowDropdown(false);
                                    handleExport();
                                }}
                                className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-700 text-white text-sm"
                            >
                                <FaFileCsv className="mr-2" /> Export as CSV
                            </button>
                        </div>
                    )}                </div>
                
                {/* Import button - only show if not in selected export mode */}
                {!showSelectedExport && (
                    <button
                        onClick={triggerFileInput}
                        disabled={isImporting}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-white text-sm transition-colors ${
                            isImporting 
                                ? 'bg-green-800 opacity-70 cursor-not-allowed' 
                                : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        <FaFileImport className="mr-1" />
                        Import Scan
                    </button>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileImport}
                    className="hidden"
                    disabled={isImporting}
                />
            </div>
            
            {/* Import status and progress indicator */}
            {isImporting && (
                <div className="bg-blue-900/30 border border-blue-700 rounded p-2 mt-2 flex items-center">
                    <div className="mr-3 relative">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <span className="text-blue-300 text-sm">Importing data, please wait...</span>
                </div>
            )}
              {/* Processing status message (not error) */}
            {importStatus && !isImporting && (
                <div className="bg-green-900/30 border border-green-700 rounded p-2 mt-2 flex items-center">
                    <svg className="w-4 h-4 text-green-300 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-green-300 text-sm">{importStatus}</span>
                </div>
            )}
            
            {/* Error message */}
            {importError && (
                <div className="text-red-400 bg-red-900/30 border border-red-700 rounded p-2 mt-2 flex items-start">
                    <FaExclamationTriangle className="mr-2 mt-1 flex-shrink-0" />
                    <span className="text-sm">{importError}</span>
                </div>
            )}
        </div>
    );
};

export default NetworkScanExportImport;
