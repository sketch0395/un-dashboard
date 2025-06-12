// Network Topology Visualization Component
'use client';

import React, { useState, useEffect } from 'react';
import { FaNetworkWired, FaEye, FaExpand, FaCompress } from 'react-icons/fa';
import { getDeviceTypeById } from '../utils/deviceTypes';

export function NetworkTopologyVisualization({ 
  className = '', 
  devices = null,
  maxHeight = '400px',
  showControls = true 
}) {
  const [topologyData, setTopologyData] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  useEffect(() => {
    loadTopologyData();
  }, [devices]);

  const loadTopologyData = () => {
    let deviceData;
    
    if (devices) {
      // Use provided devices data
      deviceData = devices;
    } else if (typeof window !== 'undefined') {
      // Load from localStorage
      deviceData = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
    } else {
      deviceData = {};
    }

    // Process devices into hierarchy
    const processedDevices = Object.entries(deviceData).map(([ip, props]) => ({
      ip,
      name: props.name || props.hostname || ip,
      deviceType: props.networkRole || props.deviceType || props.type || 'other',
      parentDevice: props.parentDevice,
      // Legacy fields for compatibility
      parentGateway: props.parentGateway,
      parentSwitch: props.parentSwitch,
      connectedGateways: props.connectedGateways || [],
      connectedSwitches: props.connectedSwitches || [],
      isMainGateway: props.isMainGateway || false,
      typeObj: getDeviceTypeById(props.networkRole || props.deviceType || props.type || 'other')
    }));

    setTopologyData(processedDevices);
  };

  const buildHierarchy = () => {
    const hierarchy = {
      gateways: [],
      orphans: []
    };

    // Find gateways first
    const gateways = topologyData.filter(device => 
      device.typeObj.id === 'gateway' || 
      device.deviceType === 'gateway' || 
      device.deviceType === 'Gateway'
    );

    // Sort gateways by main gateway first
    gateways.sort((a, b) => {
      if (a.isMainGateway && !b.isMainGateway) return -1;
      if (!a.isMainGateway && b.isMainGateway) return 1;
      return a.name.localeCompare(b.name);
    });

    // Build gateway hierarchy
    gateways.forEach(gateway => {
      const gatewayNode = {
        ...gateway,
        children: []
      };

      // Find devices connected to this gateway
      const connectedDevices = topologyData.filter(device => {
        return device.parentDevice === gateway.ip ||
               device.parentGateway === gateway.ip ||
               (Array.isArray(device.connectedGateways) && device.connectedGateways.includes(gateway.ip));
      });

      // Group connected devices by type
      const switches = connectedDevices.filter(d => d.typeObj.id === 'switch');
      const otherDevices = connectedDevices.filter(d => d.typeObj.id !== 'switch');

      // Add switches with their children
      switches.forEach(switchDevice => {
        const switchNode = {
          ...switchDevice,
          children: []
        };

        // Find devices connected to this switch
        const switchConnectedDevices = topologyData.filter(device => {
          return device.parentDevice === switchDevice.ip ||
                 device.parentSwitch === switchDevice.ip ||
                 (Array.isArray(device.connectedSwitches) && device.connectedSwitches.includes(switchDevice.ip));
        });

        switchNode.children = switchConnectedDevices.filter(d => d.ip !== gateway.ip);
        gatewayNode.children.push(switchNode);
      });

      // Add other devices directly connected to gateway
      gatewayNode.children.push(...otherDevices);

      hierarchy.gateways.push(gatewayNode);
    });

    // Find orphaned devices (not connected to any gateway or switch)
    const allConnectedIps = new Set();
    hierarchy.gateways.forEach(gateway => {
      allConnectedIps.add(gateway.ip);
      const addChildrenIps = (children) => {
        children.forEach(child => {
          allConnectedIps.add(child.ip);
          if (child.children) addChildrenIps(child.children);
        });
      };
      addChildrenIps(gateway.children);
    });

    hierarchy.orphans = topologyData.filter(device => !allConnectedIps.has(device.ip));

    return hierarchy;
  };

  const renderDevice = (device, level = 0, isLast = false) => {
    const indentStyle = {
      paddingLeft: `${level * 20}px`
    };

    const hasChildren = device.children && device.children.length > 0;

    return (
      <div key={device.ip} className="relative">
        {/* Connection Lines */}
        {level > 0 && (
          <>
            <div 
              className="absolute border-l border-gray-600"
              style={{
                left: `${(level - 1) * 20 + 8}px`,
                top: '-12px',
                height: '24px'
              }}
            />
            <div 
              className="absolute border-t border-gray-600"
              style={{
                left: `${(level - 1) * 20 + 8}px`,
                top: '12px',
                width: '12px'
              }}
            />
          </>
        )}

        {/* Device Item */}
        <div 
          className={`flex items-center py-2 px-3 rounded hover:bg-gray-700 cursor-pointer transition-colors ${
            selectedDevice?.ip === device.ip ? 'bg-blue-600' : ''
          }`}
          style={indentStyle}
          onClick={() => setSelectedDevice(selectedDevice?.ip === device.ip ? null : device)}
        >
          <device.typeObj.icon 
            className="w-4 h-4 mr-2" 
            style={{ color: device.typeObj.color }}
          />
          <div 
            className="w-2 h-2 rounded-full mr-2" 
            style={{ backgroundColor: device.typeObj.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{device.name}</div>
            <div className="text-gray-400 text-xs">
              {device.ip} • {device.typeObj.name}
              {device.isMainGateway && <span className="text-yellow-400 ml-1">⭐ Main</span>}
            </div>
          </div>
          {hasChildren && (
            <span className="text-gray-400 text-xs">
              {device.children.length} device{device.children.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Children */}
        {hasChildren && device.children.map((child, index) => 
          renderDevice(child, level + 1, index === device.children.length - 1)
        )}
      </div>
    );
  };

  const hierarchy = buildHierarchy();

  return (
    <div className={`bg-gray-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center">
          <FaNetworkWired className="w-5 h-5 text-blue-400 mr-2" />
          <h3 className="text-lg font-medium text-white">Network Topology</h3>
          <span className="ml-2 text-sm text-gray-400">
            ({topologyData.length} device{topologyData.length !== 1 ? 's' : ''})
          </span>
        </div>
        
        {showControls && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadTopologyData()}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Refresh topology"
            >
              <FaEye className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <FaCompress className="w-4 h-4" /> : <FaExpand className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Topology Content */}
      <div 
        className="p-4 overflow-y-auto"
        style={{ 
          maxHeight: isExpanded ? '80vh' : maxHeight 
        }}
      >
        {topologyData.length === 0 ? (
          <div className="text-center py-8">
            <FaNetworkWired className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <div className="text-gray-400">No network devices found</div>
            <div className="text-sm text-gray-500 mt-1">
              Configure device types and parent relationships to see topology
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Gateways and their hierarchies */}
            {hierarchy.gateways.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-300 mb-3 uppercase tracking-wide">
                  Network Infrastructure
                </div>
                {hierarchy.gateways.map(gateway => renderDevice(gateway))}
              </div>
            )}

            {/* Orphaned devices */}
            {hierarchy.orphans.length > 0 && (
              <div className={hierarchy.gateways.length > 0 ? 'mt-6' : ''}>
                <div className="text-sm font-medium text-gray-300 mb-3 uppercase tracking-wide">
                  Unconnected Devices
                </div>
                {hierarchy.orphans.map(device => renderDevice(device))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Device Details */}
      {selectedDevice && (
        <div className="border-t border-gray-700 p-4 bg-gray-750">
          <div className="text-sm font-medium text-white mb-2">Device Details</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Name:</span>
              <span className="text-white ml-2">{selectedDevice.name}</span>
            </div>
            <div>
              <span className="text-gray-400">IP:</span>
              <span className="text-white ml-2">{selectedDevice.ip}</span>
            </div>
            <div>
              <span className="text-gray-400">Type:</span>
              <span className="text-white ml-2">{selectedDevice.typeObj.name}</span>
            </div>
            {selectedDevice.parentDevice && (
              <div>
                <span className="text-gray-400">Parent:</span>
                <span className="text-white ml-2">
                  {topologyData.find(d => d.ip === selectedDevice.parentDevice)?.name || selectedDevice.parentDevice}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkTopologyVisualization;
