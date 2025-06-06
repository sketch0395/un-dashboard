'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PerformanceMonitor() {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchPerformanceData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPerformanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch('/api/admin/performance');
      const data = await response.json();
      
      if (data.success) {
        setPerformanceData(data.data);
        setLastUpdate(new Date());
      } else {
        console.error('Failed to fetch performance data:', data.message);
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action, params = {}) => {
    setActionLoading(action);
    try {
      const response = await fetch('/api/admin/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, params })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Action "${action}" completed successfully. Result: ${JSON.stringify(data.result)}`);
        fetchPerformanceData(); // Refresh data
      } else {
        alert(`Action failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert(`Action failed: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const MetricCard = ({ title, value, subtitle, color = 'blue', icon }) => (
    <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-900 text-${color}-400`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-300">{title}</p>
          <p className="text-2xl font-semibold text-white">{value}</p>
          {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
  const ActionButton = ({ action, label, description, color = 'blue', params = {} }) => (
    <button
      onClick={() => performAction(action, params)}
      disabled={actionLoading === action}
      className={`p-4 border border-gray-700 rounded-lg hover:bg-gray-700 transition duration-200 text-left w-full bg-gray-800 ${
        actionLoading === action ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`font-medium text-${color}-400`}>{label}</h4>
          <p className="text-sm text-gray-300">{description}</p>
        </div>
        {actionLoading === action && (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
        )}
      </div>
    </button>
  );
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Performance Monitor</h1>
              <p className="text-gray-300 mt-2">System performance metrics and optimization tools</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={fetchPerformanceData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Refresh
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-200"
              >
                Back to Admin
              </button>
            </div>
          </div>
          {lastUpdate && (
            <p className="text-sm text-gray-400 mt-2">
              Last updated: {lastUpdate.toLocaleString()}
            </p>
          )}
        </div>

        {performanceData && (
          <>            {/* Cache Metrics */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Cache Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Entries"
                  value={performanceData.cache.totalEntries}
                  color="blue"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v10l-8 4-8-4V7" />
                    </svg>
                  }
                />
                <MetricCard
                  title="Active Entries"
                  value={performanceData.cache.activeEntries}
                  color="green"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <MetricCard
                  title="Expired Entries"
                  value={performanceData.cache.expiredEntries}
                  color="yellow"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <MetricCard
                  title="Memory Usage"
                  value={formatBytes(performanceData.cache.memoryUsage)}
                  color="purple"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  }
                />
              </div>
            </div>            {/* Session Metrics */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Session Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MetricCard
                  title="Total Sessions"
                  value={performanceData.sessions.total}
                  color="blue"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                />
                {performanceData.sessions.statuses && performanceData.sessions.statuses.map((status, index) => (
                  <MetricCard
                    key={status.status}
                    title={`${status.status.charAt(0).toUpperCase() + status.status.slice(1)} Sessions`}
                    value={status.count}
                    subtitle={status.avgDuration ? `Avg: ${Math.round(status.avgDuration / 1000 / 60)}min` : ''}
                    color={status.status === 'active' ? 'green' : status.status === 'expired' ? 'red' : 'gray'}
                    icon={
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  />
                ))}
              </div>
            </div>            {/* Audit Log Metrics */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Audit Log Statistics (24h)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {performanceData.auditLogs && performanceData.auditLogs.map((log, index) => (
                  <MetricCard
                    key={log._id}
                    title={`${log._id.replace('_', ' ')}`}
                    value={log.totalCount}
                    color="indigo"
                    icon={
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    }
                  />
                ))}
              </div>
            </div>            {/* Optimization Actions */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Optimization Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ActionButton
                  action="clearCache"
                  label="Clear Cache"
                  description="Clear all cached queries to free memory"
                  color="red"
                />
                <ActionButton
                  action="createIndexes"
                  label="Create Database Indexes"
                  description="Create optimal database indexes for better performance"
                  color="green"
                />
                <ActionButton
                  action="cleanupSessions"
                  label="Cleanup Sessions"
                  description="Remove expired and inactive sessions"
                  color="yellow"
                  params={{ batchSize: 1000 }}
                />
                <ActionButton
                  action="archiveLogs"
                  label="Archive Old Logs"
                  description="Archive audit logs older than 90 days"
                  color="purple"
                  params={{ olderThanDays: 90 }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
