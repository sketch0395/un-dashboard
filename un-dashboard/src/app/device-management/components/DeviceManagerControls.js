import React from 'react';
import { FaSearch, FaFilter, FaSort, FaSyncAlt, FaPlus } from 'react-icons/fa';

const DeviceManagerControls = ({
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    filterRole,
    setFilterRole,
    filterStatus,
    setFilterStatus,
    filterSSH,
    setFilterSSH,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    onRefresh,
    devices
}) => {
    const categories = [...new Set(devices.map(d => d.category).filter(Boolean))];
    const roles = ['gateway', 'switch', 'none'];

    const handleSortChange = (newSortBy) => {
        if (sortBy === newSortBy) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortOrder('asc');
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
            {/* Search and Refresh */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search devices by name, IP, hostname, or vendor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded border border-gray-600 focus:border-blue-500"
                    />
                </div>
                  <button
                    onClick={onRefresh}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
                >
                    <FaSyncAlt />
                    Refresh
                </button>
            </div>            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                {/* Category Filter */}
                <div>
                    <label className="block text-sm text-gray-300 mb-1">Category</label>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                    >
                        <option value="">All Categories</option>
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>

                {/* Role Filter */}
                <div>
                    <label className="block text-sm text-gray-300 mb-1">Network Role</label>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                    >
                        <option value="">All Roles</option>
                        <option value="gateway">Gateway</option>
                        <option value="switch">Switch</option>
                        <option value="none">Regular Device</option>
                    </select>
                </div>                {/* Status Filter */}
                <div>
                    <label className="block text-sm text-gray-300 mb-1">Status</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                    >
                        <option value="">All Status</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                    </select>
                </div>

                {/* SSH Filter */}
                <div>
                    <label className="block text-sm text-gray-300 mb-1">SSH</label>
                    <select
                        value={filterSSH}
                        onChange={(e) => setFilterSSH(e.target.value)}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                    >
                        <option value="">All Devices</option>
                        <option value="available">SSH Available</option>
                        <option value="unavailable">SSH Unavailable</option>
                    </select>
                </div>

                {/* Sort */}
                <div>
                    <label className="block text-sm text-gray-300 mb-1">Sort By</label>
                    <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                            const [newSortBy, newSortOrder] = e.target.value.split('-');
                            setSortBy(newSortBy);
                            setSortOrder(newSortOrder);
                        }}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                    >
                        <option value="name-asc">Name (A-Z)</option>
                        <option value="name-desc">Name (Z-A)</option>
                        <option value="ip-asc">IP Address (Low-High)</option>
                        <option value="ip-desc">IP Address (High-Low)</option>
                        <option value="category-asc">Category (A-Z)</option>
                        <option value="category-desc">Category (Z-A)</option>
                        <option value="role-asc">Role (A-Z)</option>
                        <option value="role-desc">Role (Z-A)</option>
                        <option value="status-asc">Status (Online First)</option>
                        <option value="status-desc">Status (Offline First)</option>
                        <option value="lastSeen-desc">Last Seen (Recent First)</option>
                        <option value="lastSeen-asc">Last Seen (Oldest First)</option>
                    </select>
                </div>
            </div>

            {/* Quick Sort Buttons */}
            <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-400 mr-2">Quick Sort:</span>
                {[
                    { key: 'name', label: 'Name' },
                    { key: 'ip', label: 'IP' },
                    { key: 'category', label: 'Category' },
                    { key: 'role', label: 'Role' },
                    { key: 'status', label: 'Status' }
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => handleSortChange(key)}
                        className={`px-3 py-1 rounded text-xs flex items-center gap-1 ${
                            sortBy === key 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        {label}
                        {sortBy === key && (
                            <FaSort className={`transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default DeviceManagerControls;
