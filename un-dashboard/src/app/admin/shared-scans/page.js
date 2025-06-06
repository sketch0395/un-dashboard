'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function SharedScansPage() {
  const { user } = useAuth();
  const [sharedScans, setSharedScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    public: 0,
    private: 0,
    restricted: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    visibility: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    count: 0
  });

  useEffect(() => {
    fetchSharedScans();
    fetchStats();
  }, [filters]);

  const fetchSharedScans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: '20',
        ...filters
      });
      
      const response = await fetch(`/api/scans/shared?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setSharedScans(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching shared scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch basic stats
      const responses = await Promise.all([
        fetch('/api/scans/shared?visibility=public&limit=1'),
        fetch('/api/scans/shared?visibility=private&limit=1'),
        fetch('/api/scans/shared?visibility=restricted&limit=1'),
        fetch('/api/scans/shared?limit=1')
      ]);
      
      const [publicData, privateData, restrictedData, totalData] = await Promise.all(
        responses.map(r => r.json())
      );
      
      setStats({
        public: publicData.success ? publicData.pagination.count : 0,
        private: privateData.success ? privateData.pagination.count : 0,
        restricted: restrictedData.success ? restrictedData.pagination.count : 0,
        total: totalData.success ? totalData.pagination.count : 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDeleteScan = async (scanId, scanName) => {
    if (!confirm(`Are you sure you want to delete "${scanName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/scans/shared/${scanId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchSharedScans();
        fetchStats();
      } else {
        alert('Failed to delete scan: ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting scan:', error);
      alert('Error deleting scan');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVisibilityBadge = (visibility) => {
    const colors = {
      public: 'bg-green-100 text-green-800',
      private: 'bg-gray-100 text-gray-800',
      restricted: 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[visibility]}`}>
        {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Shared Scans Management</h1>
        <p className="text-gray-300 mt-2">Manage and moderate shared network scans</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-300">Total Scans</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-300">Public</p>
              <p className="text-2xl font-bold text-white">{stats.public}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-300">Restricted</p>
              <p className="text-2xl font-bold text-white">{stats.restricted}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-gray-600 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122l4.243 4.243M12 12l6.878 6.878" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-300">Private</p>
              <p className="text-2xl font-bold text-white">{stats.private}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search scans..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="security">Security</option>
              <option value="monitoring">Monitoring</option>
              <option value="compliance">Compliance</option>
              <option value="research">Research</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Visibility</label>
            <select
              value={filters.visibility}
              onChange={(e) => setFilters({ ...filters, visibility: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Visibility</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters({ ...filters, sortBy, sortOrder });
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="stats.viewCount-desc">Most Viewed</option>
              <option value="stats.downloadCount-desc">Most Downloaded</option>
              <option value="stats.rating-desc">Highest Rated</option>
              <option value="name-asc">Name A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Shared Scans Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Shared Scans</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading shared scans...</p>
          </div>
        ) : sharedScans.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-300">No shared scans found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-750">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Scan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Visibility</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Stats</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {sharedScans.map((scan) => (
                  <tr key={scan._id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{scan.name}</div>
                        <div className="text-sm text-gray-400 truncate max-w-xs">{scan.description}</div>
                        {scan.tags && scan.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {scan.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                {tag}
                              </span>
                            ))}
                            {scan.tags.length > 3 && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                +{scan.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{scan.ownerId?.username}</div>
                      <div className="text-sm text-gray-400">{scan.ownerId?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getVisibilityBadge(scan.sharing.visibility)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300 capitalize">{scan.category}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div>👁 {scan.stats.viewCount}</div>
                      <div>⬇ {scan.stats.downloadCount}</div>
                      {scan.stats.rating > 0 && (
                        <div>⭐ {scan.stats.rating.toFixed(1)} ({scan.stats.ratingCount})</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(scan.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteScan(scan._id, scan.name)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.total > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            Showing {Math.min((pagination.current - 1) * 20 + 1, pagination.count)} to{' '}
            {Math.min(pagination.current * 20, pagination.count)} of {pagination.count} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination({ ...pagination, current: pagination.current - 1 })}
              disabled={pagination.current === 1}
              className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md">
              {pagination.current}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, current: pagination.current + 1 })}
              disabled={pagination.current === pagination.total}
              className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
