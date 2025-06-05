'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClockIcon, CheckIcon, XMarkIcon, UserIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export default function PendingUsersPage() {
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users/pending', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data.data?.users || []);
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch pending users' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setPendingUsers(prev => prev.filter(u => u._id !== userId));
        setMessage({ type: 'success', text: 'User approved successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to approve user' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };
  const handleRejectUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${userId}/reject`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setPendingUsers(prev => prev.filter(u => u._id !== userId));
        setMessage({ type: 'success', text: 'User rejected successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to reject user' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userIds: selectedUsers,
        }),
      });

      if (response.ok) {
        setPendingUsers(prev => prev.filter(u => !selectedUsers.includes(u._id)));
        setSelectedUsers([]);
        setMessage({ type: 'success', text: `${selectedUsers.length} users approved successfully!` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to approve users' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const handleBulkReject = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users/bulk-reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userIds: selectedUsers,
        }),
      });

      if (response.ok) {
        setPendingUsers(prev => prev.filter(u => !selectedUsers.includes(u._id)));
        setSelectedUsers([]);
        setMessage({ type: 'success', text: `${selectedUsers.length} users rejected successfully!` });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to reject users' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    }
  };

  const filteredUsers = pendingUsers.filter(user => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(query) ||
      user.lastName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      (user.department && user.department.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending User Approvals</h1>
          <p className="mt-2 text-sm text-gray-600">
            Review and approve new user registrations
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
          <ClockIcon className="w-5 h-5 text-orange-500" />
          <span className="text-sm text-gray-600">
            {filteredUsers.length} pending approval{filteredUsers.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Search and Bulk Actions */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {selectedUsers.length > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={handleBulkApprove}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <CheckIcon className="w-4 h-4 mr-1" />
                Approve ({selectedUsers.length})
              </button>
              <button
                onClick={handleBulkReject}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <XMarkIcon className="w-4 h-4 mr-1" />
                Reject ({selectedUsers.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pending Users List */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending users</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? 'No users match your search criteria.' : 'All users have been processed.'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Pending Users ({filteredUsers.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map(u => u._id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(prev => [...prev, user._id]);
                          } else {
                            setSelectedUsers(prev => prev.filter(id => id !== user._id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <span className="text-orange-700 font-medium text-sm">
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <EnvelopeIcon className="w-4 h-4 mr-1" />
                            {user.email}
                          </div>
                          <div className="text-xs text-gray-400">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {user.department || 'Not specified'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1 text-orange-500" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleApproveUser(user._id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                      >
                        <CheckIcon className="w-3 h-3 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectUser(user._id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                      >
                        <XMarkIcon className="w-3 h-3 mr-1" />
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
