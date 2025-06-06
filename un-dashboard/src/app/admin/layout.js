'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, isLoading, router]);
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-gray-300">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-800 shadow border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-gray-300">Manage users and system settings</p>
            </div>            <nav className="flex space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/admin/users')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Users
              </button>
              <button
                onClick={() => router.push('/admin/shared-scans')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Shared Scans
              </button>
              <button
                onClick={() => router.push('/admin/audit-logs')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Audit Logs
              </button>
            </nav>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
