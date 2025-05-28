import React from 'react';
import { 
    FaEdit, 
    FaWifi, 
    FaExclamationTriangle, 
    FaServer, 
    FaNetworkWired, 
    FaDesktop,
    FaCheck,
    FaCircle,
    FaClock,
    FaEthernet,
    FaStickyNote,
    FaTerminal
} from 'react-icons/fa';
import { getSSHStatus } from '../../utils/sshScanUtils';

const DeviceList = ({ 
    devices, 
    selectedDevices, 
    onDeviceSelect, 
    onSelectAll, 
    onDeviceEdit, 
    onSSHConnect,
    loading 
}) => {
    const formatLastSeen = (lastSeen) => {
        if (!lastSeen) return 'Unknown';
        const date = new Date(lastSeen);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const getRoleIcon = (networkRole) => {
        switch (networkRole) {
            case 'gateway':
                return <FaServer className="text-purple-400" />;
            case 'switch':
                return <FaNetworkWired className="text-orange-400" />;
            default:
                return <FaDesktop className="text-blue-400" />;
        }
    };

    const getRoleText = (networkRole) => {
        switch (networkRole) {
            case 'gateway':
                return 'Gateway';
            case 'switch':
                return 'Switch';
            default:
                return 'Device';
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading devices...</p>
            </div>
        );
    }

    if (devices.length === 0) {
        return (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
                <FaDesktop className="text-gray-500 text-4xl mx-auto mb-4" />
                <h3 className="text-white text-lg mb-2">No devices found</h3>
                <p className="text-gray-400">
                    No devices match your current filters. Try adjusting your search criteria or refresh the data.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gray-700 p-4 border-b border-gray-600">
                <div className="flex items-center gap-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedDevices.length === devices.length && devices.length > 0}
                            onChange={onSelectAll}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-300">
                            Select All ({devices.length})
                        </span>
                    </label>
                </div>
            </div>

            {/* Device List */}
            <div className="divide-y divide-gray-700">
                {devices.map((device) => (
                    <div 
                        key={device.ip} 
                        className={`p-4 hover:bg-gray-750 transition-colors ${
                            selectedDevices.includes(device.ip) ? 'bg-gray-750 border-l-4 border-blue-500' : ''
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            {/* Checkbox */}
                            <input
                                type="checkbox"
                                checked={selectedDevices.includes(device.ip)}
                                onChange={(e) => onDeviceSelect(device.ip, e.target.checked)}
                                className="h-4 w-4 text-blue-600 rounded"
                            />

                            {/* Status Indicator */}
                            <div className="flex-shrink-0">                                {device.alive ? (
                                    <FaWifi className="text-green-500" title="Online" />
                                ) : (
                                    <FaExclamationTriangle className="text-red-500" title="Offline" />
                                )}
                            </div>

                            {/* Role Icon */}
                            <div className="flex-shrink-0">
                                {getRoleIcon(device.networkRole)}
                            </div>

                            {/* Device Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-white font-medium truncate">
                                        {device.name}
                                    </h3>
                                    {device.notes && device.notes.length > 0 && (
                                        <FaStickyNote className="text-amber-400" title="Has notes" />
                                    )}
                                </div>
                                
                                <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                                    <span>{device.ip}</span>
                                    {device.hostname && device.hostname !== device.ip && (
                                        <span>• {device.hostname}</span>
                                    )}
                                    {device.vendor && (
                                        <span>• {device.vendor}</span>
                                    )}
                                    {device.latency && (
                                        <span>• {device.latency}ms</span>
                                    )}
                                </div>                                {/* Categories and Role */}
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="bg-gray-700 text-gray-200 px-2 py-1 rounded text-xs">
                                        {device.category}
                                    </span>
                                    <span className="bg-gray-700 text-gray-200 px-2 py-1 rounded text-xs">
                                        {getRoleText(device.networkRole)}
                                    </span>
                                    {device.alive ? (
                                        <span className="bg-green-800 text-green-200 px-2 py-1 rounded text-xs">
                                            Online
                                        </span>
                                    ) : (
                                        <span className="bg-red-800 text-red-200 px-2 py-1 rounded text-xs">
                                            Offline
                                        </span>
                                    )}
                                    {(() => {
                                        const sshStatus = getSSHStatus(device);
                                        if (sshStatus.available) {
                                            return (
                                                <span className="bg-green-800 text-green-200 px-2 py-1 rounded text-xs flex items-center gap-1">
                                                    <FaTerminal className="text-xs" />
                                                    SSH Available
                                                </span>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                {/* Network Connections */}
                                {(device.parentGateway || device.parentSwitch || 
                                  (device.connectedGateways && device.connectedGateways.length > 0) ||
                                  (device.connectedSwitches && device.connectedSwitches.length > 0)) && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        {device.parentGateway && (
                                            <span>Gateway: {device.parentGateway} </span>
                                        )}
                                        {device.parentSwitch && (
                                            <span>Switch: {device.parentSwitch} </span>
                                        )}
                                        {device.connectedGateways && device.connectedGateways.length > 0 && (
                                            <span>Connected Gateways: {device.connectedGateways.length} </span>
                                        )}
                                        {device.connectedSwitches && device.connectedSwitches.length > 0 && (
                                            <span>Connected Switches: {device.connectedSwitches.length}</span>
                                        )}
                                    </div>
                                )}

                                {/* Additional Info */}
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                    {device.macAddress && (
                                        <span className="flex items-center gap-1">
                                            <FaEthernet />
                                            {device.macAddress}
                                        </span>
                                    )}
                                    {device.ports && device.ports.length > 0 && (
                                        <span>{device.ports.length} open ports</span>
                                    )}
                                    {device.lastSeen && (
                                        <span className="flex items-center gap-1">
                                            <FaClock />
                                            {formatLastSeen(device.lastSeen)}
                                        </span>
                                    )}
                                </div>                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                {/* SSH Button - only show if SSH is available */}
                                {(() => {
                                    const sshStatus = getSSHStatus(device);
                                    if (sshStatus.available) {
                                        return (
                                            <button
                                                onClick={() => onSSHConnect(device)}
                                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                                title={`SSH to ${device.name || device.ip}`}
                                            >
                                                <FaTerminal />
                                                SSH
                                            </button>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Edit Button */}
                                <button
                                    onClick={() => onDeviceEdit(device)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                >
                                    <FaEdit />
                                    Edit
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DeviceList;
