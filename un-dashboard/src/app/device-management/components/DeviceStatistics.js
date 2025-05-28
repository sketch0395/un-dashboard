import React from 'react';
import { FaServer, FaNetworkWired, FaDesktop, FaWifi, FaClock, FaTerminal } from 'react-icons/fa';
import { getSSHStatus } from '../../utils/sshScanUtils';

const DeviceStatistics = ({ devices }) => {
    const stats = {
        total: devices.length,
        online: devices.filter(d => d.alive).length,
        offline: devices.filter(d => !d.alive).length,
        sshAvailable: devices.filter(d => getSSHStatus(d).available).length,
        gateways: devices.filter(d => d.networkRole === 'gateway').length,
        switches: devices.filter(d => d.networkRole === 'switch').length,
        regularDevices: devices.filter(d => !d.networkRole).length,
        categories: {}
    };

    // Count devices by category
    devices.forEach(device => {
        const category = device.category || 'Other';
        stats.categories[category] = (stats.categories[category] || 0) + 1;
    });

    const topCategories = Object.entries(stats.categories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {/* Total Devices */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm">Total Devices</p>
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                    </div>
                    <FaDesktop className="text-blue-500 text-xl" />
                </div>
            </div>

            {/* Online Devices */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm">Online</p>
                        <p className="text-2xl font-bold text-green-400">{stats.online}</p>
                        <p className="text-xs text-gray-500">
                            {stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0}%
                        </p>
                    </div>
                    <FaWifi className="text-green-500 text-xl" />
                </div>
            </div>

            {/* Offline Devices */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm">Offline</p>
                        <p className="text-2xl font-bold text-red-400">{stats.offline}</p>
                        <p className="text-xs text-gray-500">
                            {stats.total > 0 ? Math.round((stats.offline / stats.total) * 100) : 0}%
                        </p>
                    </div>
                    <FaClock className="text-red-500 text-xl" />
                </div>
            </div>

            {/* Gateways */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm">Gateways</p>
                        <p className="text-2xl font-bold text-purple-400">{stats.gateways}</p>
                    </div>
                    <FaServer className="text-purple-500 text-xl" />
                </div>
            </div>

            {/* Switches */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm">Switches</p>
                        <p className="text-2xl font-bold text-orange-400">{stats.switches}</p>
                    </div>
                    <FaNetworkWired className="text-orange-500 text-xl" />
                </div>
            </div>            {/* Regular Devices */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm">Regular</p>
                        <p className="text-2xl font-bold text-blue-400">{stats.regularDevices}</p>
                    </div>
                    <FaDesktop className="text-blue-500 text-xl" />
                </div>
            </div>

            {/* SSH Available */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm">SSH Available</p>
                        <p className="text-2xl font-bold text-green-400">{stats.sshAvailable}</p>
                    </div>
                    <FaTerminal className="text-green-500 text-xl" />
                </div>
            </div>

            {/* Top Categories */}
            {topCategories.length > 0 && (
                <div className="col-span-2 md:col-span-4 lg:col-span-6 bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-gray-400 text-sm mb-2">Top Categories</h3>
                    <div className="flex flex-wrap gap-2">
                        {topCategories.map(([category, count]) => (
                            <div key={category} className="bg-gray-700 px-3 py-1 rounded-full">
                                <span className="text-sm text-white">{category}</span>
                                <span className="text-xs text-gray-400 ml-1">({count})</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeviceStatistics;
