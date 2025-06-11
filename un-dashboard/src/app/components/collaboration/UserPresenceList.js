'use client';

import React from 'react';

export default function UserPresenceList({ 
  collaborators = [], 
  currentUserId,
  className = ''
}) {
  if (collaborators.length === 0) {
    return null;
  }
  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-medium text-gray-300">Active Collaborators</h4>
      <div className="space-y-1">
        {collaborators
          .filter((collaborator, index, array) => 
            // Remove duplicates by userId
            array.findIndex(c => c.userId === collaborator.userId) === index
          )
          .map((collaborator, index) => (
          <div 
            key={`${collaborator.userId}-${index}`}
            className="flex items-center justify-between p-2 bg-gray-800 rounded text-sm"
          >
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                {collaborator.username.charAt(0).toUpperCase()}
              </div>
              <span className={`${collaborator.userId === currentUserId ? 'text-blue-400' : 'text-gray-300'}`}>
                {collaborator.username}
                {collaborator.userId === currentUserId && ' (You)'}
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-400">online</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
