'use client';

import React from 'react';

export default function DeviceLockIndicator({ 
  deviceId,
  lock,
  isLockedByMe,
  isLockedByOther,
  onUnlock,
  className = ''
}) {
  if (!lock) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {isLockedByMe ? (
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span className="text-blue-400 text-xs">Editing</span>
          {onUnlock && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnlock(deviceId);
              }}
              className="text-blue-400 hover:text-blue-300 text-xs ml-1"
              title="Stop editing"
            >
              ✓
            </button>
          )}
        </div>
      ) : isLockedByOther ? (
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span className="text-red-400 text-xs">
            Locked by {lock.username}
          </span>
        </div>
      ) : null}
    </div>
  );
}
