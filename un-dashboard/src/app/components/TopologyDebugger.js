// Debug component to inject into NetworkViewManager for topology debugging
// This will help us identify exactly where the topology rendering breaks in collaboration mode

import React, { useEffect, useState } from 'react';

const TopologyDebugger = ({ 
    devices, 
    customNames, 
    dimensions, 
    collaborativeMode, 
    scanId, 
    isConnected 
}) => {
    const [debugInfo, setDebugInfo] = useState({});

    useEffect(() => {
        const info = {
            timestamp: new Date().toISOString(),
            devicesCount: Array.isArray(devices) ? devices.length : (devices ? Object.keys(devices).length : 0),
            devicesType: Array.isArray(devices) ? 'array' : typeof devices,
            customNamesCount: customNames ? Object.keys(customNames).length : 0,
            dimensions: dimensions,
            collaborativeMode: collaborativeMode,
            scanId: scanId,
            isConnected: isConnected,
            hasSVGElements: typeof document !== 'undefined' ? document.querySelectorAll('svg').length : 'N/A',
            hasD3: typeof window !== 'undefined' && window.d3 ? 'Available' : 'Not available'
        };

        setDebugInfo(info);
        console.log('🔍 TOPOLOGY DEBUGGER:', info);

        // Check for specific issues
        if (collaborativeMode && (!devices || (Array.isArray(devices) && devices.length === 0))) {
            console.warn('⚠️ TOPOLOGY ISSUE: Collaboration mode enabled but no devices data');
        }

        if (dimensions && (!dimensions.width || !dimensions.height)) {
            console.warn('⚠️ TOPOLOGY ISSUE: Invalid dimensions', dimensions);
        }

        if (collaborativeMode && !isConnected) {
            console.warn('⚠️ TOPOLOGY ISSUE: Collaboration mode enabled but not connected');
        }

    }, [devices, customNames, dimensions, collaborativeMode, scanId, isConnected]);

    // Don't render anything in production, just log debug info
    if (process.env.NODE_ENV === 'production') return null;

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 9999,
            maxWidth: '300px',
            fontFamily: 'monospace'
        }}>
            <h4>🔍 Topology Debug Info</h4>
            <div>Devices: {debugInfo.devicesCount} ({debugInfo.devicesType})</div>
            <div>Custom Names: {debugInfo.customNamesCount}</div>
            <div>Dimensions: {debugInfo.dimensions?.width}x{debugInfo.dimensions?.height}</div>
            <div>Collaboration: {collaborativeMode ? '✅' : '❌'}</div>
            <div>Connected: {isConnected ? '✅' : '❌'}</div>
            <div>Scan ID: {scanId || 'None'}</div>
            <div>SVG Elements: {debugInfo.hasSVGElements}</div>
            <div>D3: {debugInfo.hasD3}</div>
        </div>
    );
};

export default TopologyDebugger;
