'use client';

import React from 'react';
import { FaUsers, FaLock, FaEdit, FaEye, FaWifi, FaTimes } from 'react-icons/fa';

export function CollaborationIndicator({ 
  isConnected, 
  collaborators, 
  className = '' 
}) {
  const activeCount = collaborators.length;
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Connection status */}
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
        isConnected 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {isConnected ? <FaWifi className="w-3 h-3" /> : <FaTimes className="w-3 h-3" />}
        <span>{isConnected ? 'Live' : 'Offline'}</span>
      </div>

      {/* Active users */}
      {activeCount > 0 && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-xs">
          <FaUsers className="w-3 h-3" />
          <span>{activeCount} {activeCount === 1 ? 'user' : 'users'}</span>
        </div>
      )}
    </div>
  );
}

export function UserPresenceList({ collaborators, currentUserId, className = '' }) {
  if (collaborators.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700 flex items-center">
        <FaUsers className="w-4 h-4 mr-2" />
        Active Users ({collaborators.length})
      </h4>
      <div className="space-y-1">
        {collaborators.map(user => (
          <div 
            key={user.userId} 
            className={`flex items-center space-x-2 p-2 rounded-lg text-sm ${
              user.userId === currentUserId 
                ? 'bg-blue-50 border border-blue-200' 
                : 'bg-gray-50'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              user.isActive ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <div className="flex-1">
              <div className="font-medium">
                {user.username} {user.userId === currentUserId && '(You)'}
              </div>
              {user.email && (
                <div className="text-xs text-gray-500">{user.email}</div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {user.lastActivity && new Date(user.lastActivity).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeviceLockIndicator({ 
  deviceId, 
  lock, 
  isLockedByMe, 
  isLockedByOther,
  onUnlock,
  className = '' 
}) {
  if (!lock) return null;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isLockedByMe ? (
        <div className="flex items-center space-x-2 px-2 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded text-xs">
          <FaEdit className="w-3 h-3" />
          <span>You're editing</span>
          {onUnlock && (
            <button 
              onClick={() => onUnlock(deviceId)}
              className="ml-1 text-blue-600 hover:text-blue-800"
              title="Stop editing"
            >
              ×
            </button>
          )}
        </div>
      ) : isLockedByOther ? (
        <div className="flex items-center space-x-2 px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded text-xs">
          <FaLock className="w-3 h-3" />
          <span>{lock.username} is editing</span>
        </div>
      ) : null}
    </div>
  );
}

export function TypingIndicator({ indicators, className = '' }) {
  if (indicators.length === 0) return null;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-800 border border-purple-200 rounded text-xs">
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span>
          {indicators.length === 1 
            ? `${indicators[0].username} is typing...`
            : `${indicators.length} users are typing...`
          }
        </span>
      </div>
    </div>
  );
}

export function CursorPosition({ cursor, className = '' }) {
  return (
    <div 
      className={`absolute pointer-events-none z-50 ${className}`}
      style={{
        left: cursor.position?.x || 0,
        top: cursor.position?.y || 0,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="flex items-center space-x-1">
        <div className="w-2 h-4 bg-blue-500 rounded-sm" />
        <div className="px-2 py-1 bg-blue-500 text-white text-xs rounded whitespace-nowrap">
          {cursor.username}
        </div>
      </div>
    </div>
  );
}

export function CollaborationPanel({ 
  collaboration,
  currentUserId,
  onDeviceEdit,
  className = '' 
}) {
  const { 
    isConnected, 
    collaborators, 
    deviceLocks, 
    connectionError,
    unlockDevice 
  } = collaboration;

  return (
    <div className={`bg-white rounded-lg shadow border p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Real-time Collaboration
        </h3>
        <CollaborationIndicator 
          isConnected={isConnected}
          collaborators={collaborators}
        />
      </div>

      {connectionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <strong>Connection Error:</strong> {connectionError}
        </div>
      )}

      <UserPresenceList 
        collaborators={collaborators}
        currentUserId={currentUserId}
      />

      {deviceLocks.size > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 flex items-center">
            <FaLock className="w-4 h-4 mr-2" />
            Active Edits ({deviceLocks.size})
          </h4>
          <div className="space-y-1">
            {Array.from(deviceLocks.entries()).map(([deviceId, lock]) => {
              const isMyLock = lock.userId === currentUserId;
              return (
                <div 
                  key={deviceId}
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    isMyLock ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="font-medium">Device {deviceId}</div>
                    <div className="text-xs text-gray-500">
                      {isMyLock ? 'You' : lock.username} • {new Date(lock.lockedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  {isMyLock && (
                    <button
                      onClick={() => unlockDevice(deviceId)}
                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                    >
                      Stop Editing
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>• Click a device to start editing</div>
          <div>• Changes are synced in real-time</div>
          <div>• Only one user can edit a device at a time</div>
        </div>
      </div>
    </div>
  );
}
