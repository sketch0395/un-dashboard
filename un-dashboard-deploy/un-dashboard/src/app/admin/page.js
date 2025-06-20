'use client';

import React, { useState, useEffect } from 'react';

export default function AdminDashboard() {  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    adminUsers: 0,
    recentLogins: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };
  const StatCard = ({ title, value, icon, color = 'blue' }) => (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-6 hover:bg-gray-750 transition-colors">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-900 text-${color}-400`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-semibold text-white">
            {loading ? '...' : value}
          </p>
        </div>
      </div>
    </div>
  );
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Dashboard Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-2.5c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z" />
              </svg>
            }
          />
          
          <StatCard
            title="Active Users"
            value={stats.activeUsers}
            color="green"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <StatCard
            title="Pending Approval"
            value={stats.pendingUsers}
            color="orange"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          
          <StatCard
            title="Admin Users"
            value={stats.adminUsers}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          
          <StatCard
            title="Recent Logins (24h)"
            value={stats.recentLogins}
            color="yellow"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            }
          />
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Quick Actions</h3>
        </div>        <div className="p-6">          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/admin/users'}
              className="p-4 border border-gray-600 bg-gray-750 rounded-lg hover:bg-gray-700 transition duration-200 text-left group"
            >
              <div className="flex items-center">
                <svg className="w-6 h-6 text-blue-400 mr-3 group-hover:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-2.5c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z" />
                </svg>
                <div>
                  <h4 className="font-medium text-white">Manage Users</h4>
                  <p className="text-sm text-gray-400">View and edit user accounts</p>
                </div>
              </div>
            </button>            <button
              onClick={() => window.location.href = '/admin/pending-users'}
              className="p-4 border border-gray-600 bg-gray-750 rounded-lg hover:bg-gray-700 transition duration-200 text-left relative group"
            >
              <div className="flex items-center">
                <svg className="w-6 h-6 text-orange-400 mr-3 group-hover:text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-white">Pending Users</h4>
                  <p className="text-sm text-gray-400">Review user registrations</p>
                </div>
              </div>
              {stats.pendingUsers > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {stats.pendingUsers > 99 ? '99+' : stats.pendingUsers}
                </span>
              )}
            </button>            <button
              onClick={() => window.location.href = '/admin/sessions'}
              className="p-4 border border-gray-600 bg-gray-750 rounded-lg hover:bg-gray-700 transition duration-200 text-left group"
            >
              <div className="flex items-center">
                <svg className="w-6 h-6 text-indigo-400 mr-3 group-hover:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <h4 className="font-medium text-white">Active Sessions</h4>
                  <p className="text-sm text-gray-400">Monitor user sessions</p>
                </div>
              </div>
            </button>            <button
              onClick={() => window.location.href = '/admin/audit-logs'}
              className="p-4 border border-gray-600 bg-gray-750 rounded-lg hover:bg-gray-700 transition duration-200 text-left group"
            >
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-400 mr-3 group-hover:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <h4 className="font-medium text-white">Audit Logs</h4>
                  <p className="text-sm text-gray-400">Review system activity</p>
                </div>
              </div>
            </button>            <button
              onClick={() => window.location.href = '/admin/session-cleanup'}
              className="p-4 border border-gray-600 bg-gray-750 rounded-lg hover:bg-gray-700 transition duration-200 text-left group"
            >
              <div className="flex items-center">
                <svg className="w-6 h-6 text-purple-400 mr-3 group-hover:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <div>
                  <h4 className="font-medium text-white">Session Cleanup</h4>
                  <p className="text-sm text-gray-400">Manage session cleanup and monitoring</p>
                </div>
              </div>
            </button>            <button
              onClick={() => window.location.href = '/admin/performance'}
              className="p-4 border border-gray-600 bg-gray-750 rounded-lg hover:bg-gray-700 transition duration-200 text-left group"
            >
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-400 mr-3 group-hover:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2 a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div>
                  <h4 className="font-medium text-white">Performance Monitor</h4>
                  <p className="text-sm text-gray-400">Monitor system performance and optimization</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
