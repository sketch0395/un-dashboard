// Parent Device Selection Component for Network Topology
'use client';

import React, { useState, useEffect } from 'react';
import { FaNetworkWired, FaPlug, FaRoad, FaSearch, FaTimes } from 'react-icons/fa';
import { getDeviceTypeById, getAvailableParentTypes, canDeviceBeParent } from '../utils/deviceTypes';

export function ParentDeviceSelector({ 
  deviceType, 
  currentParent, 
  onParentChange, 
  excludeDeviceId,
  className = '',
  label = 'Parent Device'
}) {
  const [availableDevices, setAvailableDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadAvailableDevices();
  }, [deviceType, excludeDeviceId]);

  const loadAvailableDevices = () => {
    if (typeof window === 'undefined') return;

    try {
      const savedDevices = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
      const availableParentTypes = getAvailableParentTypes(deviceType);
      
      if (availableParentTypes.length === 0) {
        setAvailableDevices([]);
        return;
      }

      const devices = Object.entries(savedDevices)
        .filter(([ip, props]) => {
          // Exclude self
          if (ip === excludeDeviceId) return false;
          
          // Check if device type can be a parent
          const deviceTypeObj = getDeviceTypeById(props.networkRole || props.type);
          if (!canDeviceBeParent(deviceTypeObj.id)) return false;
          
          // Check if device type is in allowed parent types
          return availableParentTypes.some(parentType => 
            parentType.id === deviceTypeObj.id
          );
        })
        .map(([ip, props]) => ({
          ip,
          name: props.name || props.hostname || ip,
          type: props.networkRole || props.type,
          typeObj: getDeviceTypeById(props.networkRole || props.type)
        }))
        .sort((a, b) => {
          // Sort by type priority (gateway first, then switches, etc.)
          const typePriority = { gateway: 0, router: 1, switch: 2, firewall: 3 };
          const aPriority = typePriority[a.typeObj.id] || 99;
          const bPriority = typePriority[b.typeObj.id] || 99;
          
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
          
          return a.name.localeCompare(b.name);
        });

      setAvailableDevices(devices);
    } catch (error) {
      console.error('Error loading available devices:', error);
      setAvailableDevices([]);
    }
  };

  const filteredDevices = availableDevices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.ip.includes(searchTerm) ||
    device.typeObj.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedDevice = availableDevices.find(device => device.ip === currentParent);
  const availableParentTypes = getAvailableParentTypes(deviceType);

  if (availableParentTypes.length === 0) {
    return (
      <div className={`${className}`}>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
        <div className="text-sm text-gray-400 italic">
          This device type cannot have a parent device
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      
      <div className="text-xs text-gray-400 mb-2">
        Can connect to: {availableParentTypes.map(type => type.name).join(', ')}
      </div>

      <div className="relative">
        {/* Current Selection Display */}
        <div 
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-650 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {selectedDevice ? (
                <>
                  <selectedDevice.typeObj.icon 
                    className="w-4 h-4" 
                    style={{ color: selectedDevice.typeObj.color }}
                  />
                  <div>
                    <div className="text-white text-sm">{selectedDevice.name}</div>
                    <div className="text-gray-400 text-xs">
                      {selectedDevice.ip} • {selectedDevice.typeObj.name}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-sm">No parent device selected</div>
              )}
            </div>
            
            <div className="text-gray-400">
              {isExpanded ? '▲' : '▼'}
            </div>
          </div>
        </div>

        {/* Dropdown */}
        {isExpanded && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-600">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                <input
                  type="text"
                  placeholder="Search devices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-gray-600 text-white text-sm rounded border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {/* No Parent Option */}
              <div
                className={`px-3 py-2 cursor-pointer hover:bg-gray-600 border-b border-gray-600 ${
                  !currentParent ? 'bg-blue-600' : ''
                }`}
                onClick={() => {
                  onParentChange(null);
                  setIsExpanded(false);
                }}
              >
                <div className="flex items-center space-x-2">
                  <FaTimes className="w-4 h-4 text-gray-400" />
                  <div className="text-gray-300 text-sm">No parent device</div>
                </div>
              </div>

              {/* Available Devices */}
              {filteredDevices.length === 0 ? (
                <div className="px-3 py-4 text-center text-gray-400 text-sm">
                  {availableDevices.length === 0 
                    ? 'No compatible parent devices found'
                    : 'No devices match your search'
                  }
                </div>
              ) : (
                filteredDevices.map((device) => (
                  <div
                    key={device.ip}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-600 ${
                      currentParent === device.ip ? 'bg-blue-600' : ''
                    }`}
                    onClick={() => {
                      onParentChange(device.ip);
                      setIsExpanded(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <device.typeObj.icon 
                        className="w-4 h-4" 
                        style={{ color: device.typeObj.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm truncate">{device.name}</div>
                        <div className="text-gray-400 text-xs">
                          {device.ip} • {device.typeObj.name}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Create New Device Hint */}
            {availableDevices.length === 0 && (
              <div className="px-3 py-3 bg-gray-800 text-xs text-gray-400 border-t border-gray-600">
                💡 Tip: Create {availableParentTypes.map(type => type.name).join(' or ')} devices first to enable parent selection
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}

export default ParentDeviceSelector;
