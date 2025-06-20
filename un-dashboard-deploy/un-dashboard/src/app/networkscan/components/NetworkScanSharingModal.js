'use client';

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';

export default function NetworkScanSharingModal({ 
  isOpen, 
  onClose, 
  scanData, 
  onShareSuccess 
}) {
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [formData, setFormData] = useState({
    name: scanData?.name || `Network Scan - ${scanData?.timestamp || new Date().toLocaleDateString()}`,
    description: '',
    visibility: 'private',
    allowedUsers: [],
    allowedRoles: [],
    category: 'infrastructure',
    tags: [],
    allowComments: true,
    allowRating: true,
    allowModification: false,
    isTemplate: false
  });
  const [loading, setLoading] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);

  React.useEffect(() => {
    if (isOpen) {
      // Fetch available users for restricted sharing
      fetchAvailableUsers();
    }
  }, [isOpen]);

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        setAvailableUsers(data.users.filter(u => u._id !== user._id));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare scan data for sharing
      const shareData = {
        name: formData.name,
        description: formData.description,
        originalScanId: scanData.id || `local-${Date.now()}`,
        scanData: {
          devices: scanData.data,
          metadata: {
            timestamp: scanData.timestamp,
            ipRange: scanData.ipRange,
            deviceCount: scanData.devices,
            scanType: 'network'
          }
        },
        metadata: {
          ipRange: scanData.ipRange,
          deviceCount: scanData.devices,
          scanDate: new Date(scanData.timestamp),
          scanType: 'network',
          hasNetworkTopology: true
        },
        sharing: {
          visibility: formData.visibility,
          allowedUsers: formData.allowedUsers,
          allowedRoles: formData.allowedRoles
        },
        collaboration: {
          allowComments: formData.allowComments,
          allowRating: formData.allowRating,
          allowModification: formData.allowModification
        },
        tags: formData.tags,
        category: formData.category,
        isTemplate: formData.isTemplate      };      const response = await fetch('/api/scans/shared', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(shareData)
      });      const result = await response.json();      if (result.success) {
        onShareSuccess?.(result.data);
        onClose();
        showToast('Scan shared successfully!', 'success');
      } else {
        const errorMessage = result.message || 'Unknown error occurred';
        console.error('Share scan error:', result);
        showToast('Failed to share scan: ' + errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error sharing scan:', error);
      showToast('Error sharing scan. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Share Network Scan</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 text-xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Scan Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe this network scan..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="infrastructure">Infrastructure</option>
                    <option value="security">Security</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="compliance">Compliance</option>
                    <option value="research">Research</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Visibility *
                  </label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="private">Private (Only You)</option>
                    <option value="restricted">Restricted (Selected Users)</option>
                    <option value="public">Public (All Users)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Access Control */}
            {formData.visibility === 'restricted' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Access Control</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Allowed Users
                  </label>
                  <select
                    multiple
                    value={formData.allowedUsers}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      allowedUsers: Array.from(e.target.selectedOptions, option => option.value)
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                  >
                    {availableUsers.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.username} ({user.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple users</p>
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Tags</h3>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add a tag..."
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Add
                </button>
              </div>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Collaboration Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Collaboration</h3>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.allowComments}
                    onChange={(e) => setFormData(prev => ({ ...prev, allowComments: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Allow comments</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.allowRating}
                    onChange={(e) => setFormData(prev => ({ ...prev, allowRating: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Allow rating</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.isTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, isTemplate: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Save as template for future scans</span>
                </label>
              </div>
            </div>

            {/* Scan Preview */}
            <div className="bg-gray-750 p-4 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Scan Preview</h4>
              <div className="text-sm text-gray-400 space-y-1">
                <p><strong>IP Range:</strong> {scanData?.ipRange || 'N/A'}</p>
                <p><strong>Devices Found:</strong> {scanData?.devices || 0}</p>
                <p><strong>Scan Date:</strong> {scanData?.timestamp || 'N/A'}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sharing...' : 'Share Scan'}
              </button>
            </div>        </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
