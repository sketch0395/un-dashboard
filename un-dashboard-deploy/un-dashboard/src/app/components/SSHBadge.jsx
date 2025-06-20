"use client";

import React, { useMemo } from 'react';
import { FaTerminal, FaLock } from 'react-icons/fa';
import { getSSHStatus } from '../utils/sshScanUtils';

/**
 * SSH Badge Component
 * Displays SSH availability status and provides a button to connect if available
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.device - Device object from network scan
 * @param {Function} props.onClick - Function to call when SSH button is clicked
 * @param {String} props.size - Size variant ('sm', 'md', 'lg')
 * @param {Boolean} props.showLabel - Whether to show "SSH" text label
 */
const SSHBadge = ({ device, onClick, size = 'md', showLabel = true }) => {
    // Memoize the SSH status to prevent recalculation on every render
    const sshStatus = useMemo(() => {
        return getSSHStatus(device);
    }, [device]);
    
    // Size variants
    const sizeClasses = {
        sm: "px-1 py-0.5 text-xs",
        md: "px-2 py-1 text-sm",
        lg: "px-3 py-1.5 text-base"
    };
    
    const iconSize = {
        sm: 10,
        md: 12,
        lg: 16
    };
    
    // If SSH is available, show a clickable button
    if (sshStatus.available) {
        return (
            <button
                onClick={() => onClick(device)}
                className={`text-green-500 hover:text-green-400 flex items-center gap-1 
                          bg-gray-700 rounded transition-all duration-200 hover:bg-gray-600 
                          ${sizeClasses[size]}`}
                title={`SSH Available (${sshStatus.version || 'Unknown version'})`}
            >
                <FaTerminal size={iconSize[size]} /> 
                {showLabel && <span>SSH</span>}
            </button>
        );
    }
    
    // If SSH is not available, show a disabled indicator
    return (
        <span 
            className={`text-gray-500 flex items-center gap-1 bg-gray-700 rounded opacity-60
                      ${sizeClasses[size]}`} 
            title="SSH Not Available"
        >
            <FaLock size={iconSize[size]} /> 
            {showLabel && <span>SSH</span>}
        </span>
    );
};

export default SSHBadge;