'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useCollaboration(scanId) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [deviceLocks, setDeviceLocks] = useState(new Map());
  const [typingIndicators, setTypingIndicators] = useState(new Map());
  const [cursorPositions, setCursorPositions] = useState(new Map());
  const [connectionError, setConnectionError] = useState(null);  const [sessionVersion, setSessionVersion] = useState(1);
  
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000);
  const pendingLockRequests = useRef(new Map());
  const connect = useCallback(async () => {
    if (!scanId || !user || ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Get auth token by making a request to verify endpoint
      // This ensures we have proper authentication state
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!verifyResponse.ok) {
        throw new Error('Authentication verification failed');
      }      const authData = await verifyResponse.json();
      if (!authData.authenticated) {
        throw new Error('User not authenticated');
      }

      // Get the auth token from cookies to pass to WebSocket
      // Since WebSocket to different port might not include cookies
      const cookieToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];      console.log('🍪 Cookie token found:', cookieToken ? 'yes' : 'no');      // Connect to the collaboration server on port 4000
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname;
      const wsPort = 4000; // Collaboration server runs on port 4000
      
      // Connect to the collaboration WebSocket endpoint
      let wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/collaboration-ws?scanId=${encodeURIComponent(scanId)}`;
      if (cookieToken) {
        wsUrl += `&token=${encodeURIComponent(cookieToken)}`;
      }
      
      console.log('🔗 Attempting WebSocket connection to:', wsUrl.replace(/token=[^&]+/, 'token=***'));
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('🤝 Collaboration connected for scan:', scanId);
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        reconnectDelay.current = 1000;
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received collaboration message:', data.type, data);
          handleMessage(data);
        } catch (error) {
          console.error('Error parsing collaboration message:', error);
        }
      };      ws.current.onclose = (event) => {
        console.log('🔌 Collaboration disconnected:', event.code, event.reason);        setIsConnected(false);
        
        // Resolve any pending lock requests with failure (connection lost)
        for (const [deviceId, resolver] of pendingLockRequests.current.entries()) {
          resolver.resolve(false);
        }
        pendingLockRequests.current.clear();
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          setTimeout(() => {
            reconnectAttempts.current++;
            reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
            connect();
          }, reconnectDelay.current);
        }
      };

      ws.current.onerror = (error) => {
        console.error('🚨 Collaboration WebSocket error:', error);
        setConnectionError('Connection failed');
      };

    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
      setConnectionError(error.message);
    }
  }, [scanId, user]);
  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close(1000);
      ws.current = null;
    }
    setIsConnected(false);
    setCollaborators([]);
    setDeviceLocks(new Map());
    setTypingIndicators(new Map());
    setCursorPositions(new Map());
    // Reject any pending lock requests
    for (const [deviceId, resolver] of pendingLockRequests.current.entries()) {
      resolver.reject(new Error('Connection lost'));
    }
    pendingLockRequests.current.clear();
  }, []);
  const sendMessage = useCallback((message) => {
    console.log('📤 Attempting to send message:', message.type, 'WebSocket state:', ws.current?.readyState);
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('✅ Sending message via WebSocket');
      ws.current.send(JSON.stringify(message));
    } else {
      console.log('❌ WebSocket not ready, message not sent. State:', ws.current?.readyState);
    }
  }, []);

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'session_data':
        setCollaborators(data.users || []);
        setDeviceLocks(new Map(data.locks?.map(lock => [lock.deviceId, lock]) || []));
        setSessionVersion(data.version || 1);
        break;

      case 'user_joined':
        setCollaborators(prev => {
          const exists = prev.find(u => u.userId === data.user.userId);
          if (exists) return prev;
          return [...prev, data.user];
        });
        break;

      case 'user_left':
        setCollaborators(prev => prev.filter(u => u.userId !== data.user.userId));
        setCursorPositions(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.user.userId);
          return newMap;
        });
        setTypingIndicators(prev => {
          const newMap = new Map(prev);
          for (const [key, indicator] of newMap) {
            if (indicator.userId === data.user.userId) {
              newMap.delete(key);
            }
          }
          return newMap;
        });
        break;      case 'device_locked':
        setDeviceLocks(prev => new Map(prev).set(data.deviceId, {
          deviceId: data.deviceId,
          userId: data.userId,
          username: data.username,
          lockedAt: data.timestamp
        }));
        // Resolve pending lock request
        const lockResolver = pendingLockRequests.current.get(data.deviceId);
        if (lockResolver) {
          lockResolver.resolve(true);
          pendingLockRequests.current.delete(data.deviceId);
        }
        break;

      case 'device_unlocked':
        setDeviceLocks(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.deviceId);
          return newMap;
        });
        break;      case 'device_updated':
        setSessionVersion(data.version);
        console.log('📱 Received device update from collaboration:', data.deviceId, data.changes);
        // Emit custom event for device updates with the actual changes
        window.dispatchEvent(new CustomEvent('collaborationDeviceUpdate', {
          detail: {
            deviceId: data.deviceId,
            changes: data.changes,
            userId: data.userId,
            username: data.username,
            version: data.version,
            timestamp: data.timestamp
          }
        }));
        break;

      case 'scan_updated':
        setSessionVersion(data.version);
        console.log('📊 Received scan update from collaboration:', data.changes);
        // Emit custom event for scan updates with the actual changes
        window.dispatchEvent(new CustomEvent('collaborationScanUpdate', {
          detail: {
            changes: data.changes,
            userId: data.userId,
            username: data.username,
            version: data.version,
            timestamp: data.timestamp
          }
        }));
        break;

      case 'cursor_position':
        setCursorPositions(prev => new Map(prev).set(data.userId, {
          userId: data.userId,
          username: data.username,
          deviceId: data.deviceId,
          position: data.position,
          timestamp: data.timestamp
        }));
        break;

      case 'typing_indicator':
        const indicatorKey = `${data.userId}-${data.deviceId}-${data.field}`;
        setTypingIndicators(prev => {
          const newMap = new Map(prev);
          if (data.isTyping) {
            newMap.set(indicatorKey, {
              userId: data.userId,
              username: data.username,
              deviceId: data.deviceId,
              field: data.field,
              timestamp: data.timestamp
            });
          } else {
            newMap.delete(indicatorKey);
          }
          return newMap;
        });
        break;      case 'device_lock_failed':
        console.warn('Device lock failed:', data.reason);
        // Resolve pending lock request with failure
        const failedLockResolver = pendingLockRequests.current.get(data.deviceId);
        if (failedLockResolver) {
          failedLockResolver.resolve(false);
          pendingLockRequests.current.delete(data.deviceId);
        }
        // Emit custom event for lock failures
        window.dispatchEvent(new CustomEvent('collaborationLockFailed', {
          detail: data
        }));
        break;

      case 'error':
        console.error('Collaboration error:', data.message);
        setConnectionError(data.message);
        break;

      default:
        console.log('Unknown collaboration message:', data.type);
    }
  }, []);  // Collaboration actions
  const lockDevice = useCallback((deviceId) => {      console.log('🔒 Attempting to lock device:', deviceId);
    return new Promise((resolve, reject) => {
      // Check if WebSocket is connected
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      // Set up a timeout for the lock request
      const timeout = setTimeout(() => {
        console.log('⏰ Lock request timeout for device:', deviceId);
        pendingLockRequests.current.delete(deviceId);
        reject(new Error('Lock request timeout'));
      }, 10000); // Increased to 10 seconds

      // Store the resolver
      pendingLockRequests.current.set(deviceId, {
        resolve: (success) => {
          console.log('✅ Lock request resolved for device:', deviceId, 'success:', success);
          clearTimeout(timeout);
          resolve(success);
        },
        reject: (error) => {
          console.log('❌ Lock request rejected for device:', deviceId, 'error:', error);
          clearTimeout(timeout);
          reject(error);
        }
      });

      // Send the lock request
      console.log('📤 Sending lock request for device:', deviceId);
      sendMessage({
        type: 'device_lock',
        deviceId,
        timestamp: new Date()
      });
    });
  }, [sendMessage]);

  const unlockDevice = useCallback((deviceId) => {
    sendMessage({
      type: 'device_unlock',
      deviceId,
      timestamp: new Date()
    });
  }, [sendMessage]);

  const updateDevice = useCallback((deviceId, changes, version) => {
    sendMessage({
      type: 'device_update',
      deviceId,
      changes,
      version,
      timestamp: new Date()
    });
  }, [sendMessage]);

  const updateScan = useCallback((changes) => {
    sendMessage({
      type: 'scan_update',
      changes,
      timestamp: new Date()
    });
  }, [sendMessage]);

  const setCursorPosition = useCallback((deviceId, position) => {
    sendMessage({
      type: 'cursor_position',
      deviceId,
      position,
      timestamp: new Date()
    });
  }, [sendMessage]);

  const setTypingIndicator = useCallback((deviceId, field, isTyping) => {
    sendMessage({
      type: 'typing_indicator',
      deviceId,
      field,
      isTyping,
      timestamp: new Date()
    });
  }, [sendMessage]);

  const ping = useCallback(() => {
    sendMessage({ type: 'ping' });
  }, [sendMessage]);

  // Auto-connect when scan ID changes
  useEffect(() => {
    if (scanId && user) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [scanId, user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Heartbeat
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, [isConnected, ping]);

  // Auto-clear old typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingIndicators(prev => {
        const newMap = new Map();
        for (const [key, indicator] of prev) {
          if (now - new Date(indicator.timestamp).getTime() < 3000) {
            newMap.set(key, indicator);
          }
        }
        return newMap;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    // Connection state
    isConnected,
    connectionError,
    collaborators,
    sessionVersion,
    
    // Device state
    deviceLocks,
    typingIndicators,
    cursorPositions,
    
    // Actions
    connect,
    disconnect,
    lockDevice,
    unlockDevice,
    updateDevice,
    updateScan,
    setCursorPosition,
    setTypingIndicator,
    
    // Utilities
    isDeviceLocked: (deviceId) => deviceLocks.has(deviceId),
    isDeviceLockedByMe: (deviceId) => {
      const lock = deviceLocks.get(deviceId);
      return lock?.userId === user?._id;
    },
    isDeviceLockedByOther: (deviceId) => {
      const lock = deviceLocks.get(deviceId);
      return lock && lock.userId !== user?._id;
    },
    getDeviceLock: (deviceId) => deviceLocks.get(deviceId),
    getTypingIndicators: (deviceId, field) => {
      return Array.from(typingIndicators.values()).filter(
        indicator => indicator.deviceId === deviceId && 
                    (!field || indicator.field === field)
      );
    },
    getCursorPositions: (deviceId) => {
      return Array.from(cursorPositions.values()).filter(
        cursor => cursor.deviceId === deviceId
      );
    }
  };
}
