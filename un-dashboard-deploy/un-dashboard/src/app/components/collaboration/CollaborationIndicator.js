'use client';

import React from 'react';

export default function CollaborationIndicator({ 
  isConnected, 
  collaborators = [], 
  className = ''
}) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center space-x-1">
        <div 
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="text-xs text-gray-400">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Collaborator Count */}
      {collaborators.length > 0 && (
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-400">👥</span>
          <span className="text-xs text-gray-300">
            {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
