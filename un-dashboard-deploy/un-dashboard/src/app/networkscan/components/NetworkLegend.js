import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const NetworkLegend = ({ isVisible = true }) => {
    const [isExpanded, setIsExpanded] = useState(true);    // Legend data for network visualization
    const legendData = {
        items: [
            { color: "#10b981", strokeColor: "#f59e0b", strokeWidth: 3, label: "Main Gateway" },
            { color: "#10b981", label: "Regular Gateway" },
            { color: "#6366f1", label: "Switch" },
            { color: "#3b82f6", label: "Device" },
            { strokeColor: "#10b981", strokeWidth: 2, fillColor: "#6366f1", label: "Connected to Gateway" },
            { strokeColor: "#10b981", strokeWidth: 2, fillColor: "#6366f1", label: "Multiple Gateway Connections", strokeDasharray: "5,3" },
            { strokeColor: "#10b981", strokeWidth: 2, label: "Gateway to Gateway Connection", strokeDasharray: "8,3" },
            { strokeColor: "#6366f1", strokeWidth: 2, label: "Switch to Switch Connection", strokeDasharray: "3,2" }
        ]
    };

    // Style for the legend container
    const containerStyle = {
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'rgba(17, 24, 39, 0.8)', // Dark background with transparency
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        color: '#FFFFFF',
        maxWidth: '250px',
        transition: 'all 0.3s ease',
        display: isVisible ? 'block' : 'none',
        zIndex: 10
    };

    // Style for the collapsed state (only show header)
    const collapsedStyle = {
        ...containerStyle,
        height: isExpanded ? 'auto' : '40px'
    };
  
    // Style for the legend header
    const headerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        padding: '4px 8px',
        marginBottom: isExpanded ? '8px' : '0',
        borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'
    };

    // Style for the legend items container
    const contentStyle = {
        display: isExpanded ? 'block' : 'none',
        overflow: 'hidden',
        transition: 'max-height 0.3s ease'
    };

    return (
        <div style={collapsedStyle}>
            <div 
                style={headerStyle}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Network Legend</span>
                {isExpanded ? <FaChevronDown /> : <FaChevronUp />}
            </div>

            <div style={contentStyle}>
                {legendData.items.map((item, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ width: '24px', height: '24px', marginRight: '8px', position: 'relative' }}>
                            {renderLegendIcon(item)}
                        </div>
                        <span style={{ fontSize: '12px' }}>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helper function to render the appropriate legend icon based on item properties
const renderLegendIcon = (item) => {
    if (item.strokeColor && item.fillColor) {
        // For items with special stroke and fill (like connected switches)
        return (
            <div
                style={{
                    width: '20px',
                    height: '15px',
                    backgroundColor: item.fillColor,
                    border: `${item.strokeWidth}px solid ${item.strokeColor}`,
                    borderRadius: '4px',
                    borderStyle: item.strokeDasharray ? 'dashed' : 'solid'
                }}
            />
        );
    } else if (item.strokeColor) {
        // For items with stroke (like main gateway)
        const isMainGateway = item.label === "Main Gateway";
        
        return (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                    style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        border: `${item.strokeWidth}px solid ${item.strokeColor}`
                    }}
                />
                {isMainGateway && (
                    <span style={{
                        position: 'absolute',
                        top: '0',
                        left: '7px',
                        color: '#f59e0b',
                        fontSize: '10px'
                    }}>
                        ★
                    </span>
                )}
            </div>
        );
    } else if (item.shape === "rect") {
        return (
            <div
                style={{
                    width: '20px',
                    height: '15px',
                    backgroundColor: item.color,
                    borderRadius: '4px'
                }}
            />
        );
    } else {
        // Default circle
        return (
            <div
                style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: item.color,
                    borderRadius: '50%'
                }}
            />
        );
    }
};

export default NetworkLegend;
