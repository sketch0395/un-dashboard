'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';

export default function SharedScansBrowser({ onScanSelect, onImportSuccess }) {
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [sharedScans, setSharedScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    count: 0
  });
  const [selectedScan, setSelectedScan] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchSharedScans();
  }, [filters, pagination.current]);

  const fetchSharedScans = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: '12',
        search: filters.search
      });
      
      const response = await fetch(`/api/shared-scans?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setSharedScans(data.scans);
        setPagination(data.pagination);
      } else {
        throw new Error(data.error || 'Failed to fetch shared scans');
      }
    } catch (error) {
      console.error('Error fetching shared scans:', error);
      setError(error.message);
      showToast('Failed to fetch shared scans', 'error');
    } finally {
      setLoading(false);
    }
  };const handleScanView = async (scan) => {
    try {
      const response = await fetch(`/api/shared-scans/${scan._id}`);
      const data = await response.json();
      
      if (response.ok) {
        setSelectedScan(data);
        setShowDetails(true);
      } else {
        throw new Error(data.error || 'Failed to load scan details');
      }
    } catch (error) {
      console.error('Error fetching scan details:', error);
      showToast('Failed to load scan details', 'error');
    }
  };  const handleScanDownload = async (scan) => {
    try {
      const response = await fetch(`/api/shared-scans/${scan._id}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${scan.name}_scan.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Refresh the list to update download counts
        fetchSharedScans();
        
        showToast('Scan downloaded successfully', 'success');
        
        try {
          // Parse the blob to provide data for import
          const jsonData = JSON.parse(await blob.text());
          onImportSuccess?.(jsonData);
        } catch (parseError) {
          console.error('Error parsing downloaded scan:', parseError);
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to download scan');
      }
    } catch (error) {
      console.error('Error downloading scan:', error);
      showToast('Failed to download scan', 'error');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  const getCategoryIcon = (category) => {
    const icons = {
      infrastructure: '🏗️',
      security: '🔒',
      monitoring: '📊',
      compliance: '✅',
      research: '🔬',
      other: '📋'
    };
    return icons[category] || '📋';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Shared Network Scans</h2>
        <p className="text-gray-300 mt-2">Browse and download shared network scans from the community</p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
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

          <div className="flex items-end">
            <button
              onClick={() => setPagination({ ...pagination, current: 1 })}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Scans Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading shared scans...</p>
        </div>
      ) : sharedScans.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-300">No shared scans found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sharedScans.map((scan) => (
            <div key={scan._id} className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors">
              {/* Scan Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getCategoryIcon(scan.category)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white truncate">{scan.name}</h3>
                    <p className="text-sm text-gray-400">by {scan.ownerId?.username}</p>
                  </div>
                </div>
                {getVisibilityBadge(scan.sharing.visibility)}
              </div>

              {/* Description */}
              {scan.description && (
                <p className="text-sm text-gray-300 mb-4 line-clamp-3">{scan.description}</p>
              )}

              {/* Metadata */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">IP Range:</span>
                  <span className="text-gray-300">{scan.metadata?.ipRange || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Devices:</span>
                  <span className="text-gray-300">{scan.metadata?.deviceCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Date:</span>
                  <span className="text-gray-300">{formatDate(scan.createdAt)}</span>
                </div>
              </div>

              {/* Tags */}
              {scan.tags && scan.tags.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {scan.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {tag}
                      </span>
                    ))}
                    {scan.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{scan.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex justify-between text-sm text-gray-400 mb-4">
                <span>👁 {scan.stats.viewCount}</span>
                <span>⬇ {scan.stats.downloadCount}</span>
                {scan.stats.rating > 0 && (
                  <span>⭐ {scan.stats.rating.toFixed(1)}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleScanView(scan)}
                  className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleScanDownload(scan)}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            Page {pagination.current} of {pagination.total} ({pagination.count} total)
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

      {/* Scan Details Modal */}
      {showDetails && selectedScan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">{selectedScan.name}</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-200 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Scan Information</h3>
                  <div className="bg-gray-750 p-4 rounded-lg space-y-2">
                    <p><strong className="text-gray-300">Owner:</strong> <span className="text-white">{selectedScan.ownerId?.username}</span></p>
                    <p><strong className="text-gray-300">Description:</strong> <span className="text-white">{selectedScan.description || 'No description'}</span></p>
                    <p><strong className="text-gray-300">Category:</strong> <span className="text-white capitalize">{selectedScan.category}</span></p>
                    <p><strong className="text-gray-300">Created:</strong> <span className="text-white">{formatDate(selectedScan.createdAt)}</span></p>
                    <p><strong className="text-gray-300">IP Range:</strong> <span className="text-white">{selectedScan.metadata?.ipRange}</span></p>
                    <p><strong className="text-gray-300">Devices Found:</strong> <span className="text-white">{selectedScan.metadata?.deviceCount}</span></p>
                  </div>
                </div>

                {/* Tags */}
                {selectedScan.tags && selectedScan.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedScan.tags.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Device Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Device Summary</h3>
                  <div className="bg-gray-750 p-4 rounded-lg">
                    {Object.entries(selectedScan.scanData?.devices || {}).map(([vendor, devices]) => (
                      <div key={vendor} className="mb-2">
                        <span className="text-gray-300">{vendor}:</span> 
                        <span className="text-white ml-2">{devices.length} devices</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => setShowDetails(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleScanDownload(selectedScan)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    Download Scan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>      )}
      <ToastContainer />
    </div>
  );
}
