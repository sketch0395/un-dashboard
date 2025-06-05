'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function SessionCleanupPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cleanupOptions, setCleanupOptions] = useState({
    olderThanDays: 0,
    userId: '',
    inactive: false
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/session-cleanup', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.message || 'Failed to fetch stats');
      }
    } catch (err) {
      setError('Error fetching cleanup stats');
      console.error('Fetch stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, options = {}) => {
    try {
      setActionLoading(true);
      setMessage('');
      setError('');

      const response = await fetch('/api/admin/session-cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, options })
      });

      const data = await response.json();
      if (data.success) {
        setMessage(data.message);
        fetchStats(); // Refresh stats
      } else {
        setError(data.message || 'Action failed');
      }
    } catch (err) {
      setError(`Error performing ${action}: ${err.message}`);
      console.error('Action error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualCleanup = () => {
    const options = {};
    if (cleanupOptions.olderThanDays > 0) {
      options.olderThanDays = parseInt(cleanupOptions.olderThanDays);
    }
    if (cleanupOptions.userId.trim()) {
      options.userId = cleanupOptions.userId.trim();
    }
    if (cleanupOptions.inactive) {
      options.inactive = true;
    }
    
    handleAction('manual-cleanup', options);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Admin access required</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Session Cleanup Management</h1>
            <p className="text-gray-600 mt-1">Manage automatic session cleanup and perform manual cleanups</p>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{message}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cleanup Service Status */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Cleanup Service Status</h2>
            </div>
            <div className="p-6">
              {stats?.cleanupService && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Status</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      stats.cleanupService.isRunning
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {stats.cleanupService.isRunning ? 'Running' : 'Stopped'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Total Cleaned</span>
                    <span className="text-sm text-gray-900">{stats.cleanupService.totalCleaned}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Last Cleanup Count</span>
                    <span className="text-sm text-gray-900">{stats.cleanupService.lastCleanupCount}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Errors</span>
                    <span className="text-sm text-gray-900">{stats.cleanupService.errors}</span>
                  </div>
                  
                  {stats.cleanupService.lastCleanup && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Last Cleanup</span>
                      <span className="text-sm text-gray-900">
                        {new Date(stats.cleanupService.lastCleanup).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => handleAction('start-service')}
                  disabled={actionLoading || stats?.cleanupService?.isRunning}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Service
                </button>
                <button
                  onClick={() => handleAction('stop-service')}
                  disabled={actionLoading || !stats?.cleanupService?.isRunning}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Stop Service
                </button>
                <button
                  onClick={() => handleAction('restart-service')}
                  disabled={actionLoading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Restart
                </button>
              </div>
            </div>
          </div>

          {/* Session Statistics */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Session Statistics</h2>
            </div>
            <div className="p-6">
              {stats?.sessionStats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.sessionStats.total}</div>
                    <div className="text-sm text-blue-800">Total Sessions</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.sessionStats.active}</div>
                    <div className="text-sm text-green-800">Active Sessions</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{stats.sessionStats.expired}</div>
                    <div className="text-sm text-red-800">Expired Sessions</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{stats.sessionStats.createdToday}</div>
                    <div className="text-sm text-yellow-800">Created Today</div>
                  </div>
                </div>
              )}
              
              <button
                onClick={fetchStats}
                disabled={actionLoading}
                className="w-full mt-4 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                Refresh Stats
              </button>
            </div>
          </div>
        </div>

        {/* Manual Cleanup */}
        <div className="bg-white shadow rounded-lg mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Manual Cleanup</h2>
            <p className="text-sm text-gray-600 mt-1">Perform custom session cleanup with specific criteria</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sessions older than (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cleanupOptions.olderThanDays}
                  onChange={(e) => setCleanupOptions(prev => ({ ...prev, olderThanDays: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0 = all expired"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific User ID
                </label>
                <input
                  type="text"
                  value={cleanupOptions.userId}
                  onChange={(e) => setCleanupOptions(prev => ({ ...prev, userId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for all users"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="inactive-sessions"
                  checked={cleanupOptions.inactive}
                  onChange={(e) => setCleanupOptions(prev => ({ ...prev, inactive: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="inactive-sessions" className="ml-2 block text-sm text-gray-900">
                  Include inactive sessions (30+ min)
                </label>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleManualCleanup}
                disabled={actionLoading}
                className="bg-orange-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Processing...' : 'Run Manual Cleanup'}
              </button>
              
              <button
                onClick={() => handleAction('manual-cleanup', {})}
                disabled={actionLoading}
                className="bg-red-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clean Expired Only
              </button>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Manual cleanup will permanently delete sessions matching the criteria. 
                    This action cannot be undone. Use with caution.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
