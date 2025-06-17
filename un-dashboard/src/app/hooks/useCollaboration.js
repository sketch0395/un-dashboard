'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useCollaboration(scanId) {
  console.log('🔄 useCollaboration hook called with scanId:', scanId);
  console.log('🔄 Hook called from stack:', new Error().stack.split('\n').slice(1, 4).join('\n'));
  console.warn('⚠️ COLLABORATION HOOK CALLED!', { scanId, timestamp: new Date().toISOString() });
  const { user } = useAuth();
  console.log('👤 Current user:', user ? user.username : 'not authenticated');
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
  const keepaliveInterval = useRef(null);
  const pendingLockRequests = useRef(new Map());  const connect = useCallback(async () => {
    console.warn('🚨 CONNECT FUNCTION CALLED!', { scanId, user: user?.username, timestamp: new Date().toISOString() });
    if (!scanId || !user || ws.current?.readyState === WebSocket.OPEN) {
      console.log('🚫 Connect function early return:', { scanId, user, wsState: ws.current?.readyState });
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
      console.log('🔍 Auth verification response:', authData);
      if (!authData.authenticated) {
        throw new Error('User not authenticated');
      }

      // Get the auth token from cookies to pass to WebSocket
      // Since WebSocket to different port might not include cookies
      console.log('🍪 All cookies:', document.cookie);
      let cookieToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];      

      // If no cookie token found, try to get it from the auth response
      // Some authentication setups might include the token in the response
      if (!cookieToken && authData.token) {
        console.log('🔑 Using token from auth response');
        cookieToken = authData.token;
      }

      console.log('🍪 Cookie token found:', cookieToken ? 'yes' : 'no');
      if (cookieToken) {
        console.log('🔑 Token preview:', cookieToken.substring(0, 20) + '...');
      } else {
        console.warn('⚠️ No auth token found - WebSocket connection may fail');
      }// Connect to the collaboration server on the same port as network server
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname;
      const wsPort = 4000; // Collaboration server runs on network server port 4000        // Connect to the collaboration WebSocket endpoint
      let wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/collaboration-ws?scanId=${encodeURIComponent(scanId)}`;
      if (cookieToken) {
        wsUrl += `&token=${encodeURIComponent(cookieToken)}`;
      } else {
        console.warn('⚠️ Attempting WebSocket connection without auth token - server will likely reject this');
      }
      
      console.log('🔗 Attempting WebSocket connection to:', wsUrl.replace(/token=[^&]+/, 'token=***'));
      ws.current = new WebSocket(wsUrl);ws.current.onopen = () => {
        console.log('🤝 Collaboration connected for scan:', scanId);
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        reconnectDelay.current = 1000;
        
        // Start client-side keepalive (send ping every 10 seconds)
        keepaliveInterval.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            console.log('🏓 Sending client-side ping to keep connection alive');
            ws.current.send(JSON.stringify({ type: 'ping', timestamp: new Date() }));
          }
        }, 10000);
      };ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received collaboration message:', data.type, data);
          handleMessage(data);
        } catch (error) {
          console.error('Error parsing collaboration message:', error);
        }
      };      ws.current.onclose = (event) => {
        console.log('🔌 Collaboration disconnected:', event.code, event.reason);
        
        // Provide user-friendly error messages for common close codes
        if (event.code === 1008) {
          console.error('❌ Collaboration connection rejected: Authentication required or invalid');
          setConnectionError('Authentication required - please check your login status');
        } else if (event.code === 1011) {
          console.error('❌ Collaboration connection rejected: Server error');
          setConnectionError('Server error - please try again later');
        } else if (event.code !== 1000) {
          console.error('❌ Collaboration connection closed unexpectedly:', event.code, event.reason);
          setConnectionError(`Connection failed: ${event.reason || 'Unknown error'}`);
        }
        
        setIsConnected(false);
        
        // Clear client-side keepalive
        if (keepaliveInterval.current) {
          clearInterval(keepaliveInterval.current);
          keepaliveInterval.current = null;
        }
        
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
  }, [scanId, user]);  const disconnect = useCallback(() => {
    // Clear client-side keepalive
    if (keepaliveInterval.current) {
      clearInterval(keepaliveInterval.current);
      keepaliveInterval.current = null;
    }
    
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
        break;      case 'error':
        console.error('Collaboration error:', data.message);
        setConnectionError(data.message);
        break;

      case 'server_ping':
        console.log('🏓 Received server ping - responding with pong');
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'server_pong', timestamp: new Date() }));
        }
        break;

      case 'pong':
        console.log('🏓 Received pong response from server');
        break;

      default:
        console.log('Unknown collaboration message:', data.type);
    }  }, []);

  // Collaboration actions
  const lockDevice = useCallback((deviceId) => {
    console.log('🔒 Attempting to lock device:', deviceId);
    return new Promise((resolve, reject) => {
      // Check if WebSocket is connected
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        console.log('🔇 Collaboration disabled - skipping device lock');
        // Resolve with success since collaboration is disabled
        resolve(true);
        return;
      }

      // Set up a timeout for the lock request
      const timeout = setTimeout(() => {
        console.log('⏰ Lock request timeout for device:', deviceId, '- resolving gracefully');
        pendingLockRequests.current.delete(deviceId);
        resolve(true); // Resolve gracefully instead of rejecting
      }, 10000); // Increased to 10 seconds

      // Store the resolver
      pendingLockRequests.current.set(deviceId, {
        resolve: (success) => {
          console.log('✅ Lock request resolved for device:', deviceId, 'success:', success);
          clearTimeout(timeout);
          resolve(success);
        },
        reject: (error) => {
          console.log('❌ Lock request rejected for device:', deviceId, 'error:', error, '- resolving gracefully');
          clearTimeout(timeout);
          resolve(true); // Resolve gracefully instead of rejecting
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
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.log('🔇 Collaboration disabled - skipping device unlock');
      return;
    }
    sendMessage({
      type: 'device_unlock',
      deviceId,
      timestamp: new Date()
    });
  }, [sendMessage]);  const updateDevice = useCallback((deviceId, changes, version) => {
    return new Promise((resolve, reject) => {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        console.log('🔇 Collaboration disabled - skipping device update');
        resolve(true); // Resolve successfully when collaboration is disabled
        return;
      }

      console.log('📤 Sending device update for:', deviceId, 'changes:', changes);

      // Create a unique identifier for this update request
      const updateId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Set up timeout for the update request
      const timeout = setTimeout(() => {
        console.log('⏰ Device update timeout for:', deviceId);
        pendingUpdateRequests.current.delete(updateId);
        resolve(true); // Resolve gracefully instead of rejecting
      }, 10000); // 10 second timeout

      // Store the resolver
      pendingUpdateRequests.current.set(updateId, {
        deviceId,
        resolve: (success) => {
          clearTimeout(timeout);
          console.log('✅ Device update resolved for:', deviceId, 'success:', success);
          resolve(success);
        },
        reject: (error) => {
          clearTimeout(timeout);
          console.log('❌ Device update rejected for:', deviceId, 'error:', error);
          resolve(false); // Resolve with false instead of rejecting
        }
      });

      sendMessage({
        type: 'device_update',
        deviceId,
        changes,
        version,
        updateId, // Include the update ID so the server can respond to this specific request
        timestamp: new Date()
      });
    });
  }, [sendMessage]);

  const updateScan = useCallback((changes) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.log('🔇 Collaboration disabled - skipping scan update');
      return;
    }
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
  }, [sendMessage]);  // Auto-connect when scan ID changes
  useEffect(() => {
    console.warn('🔄 USEEFFECT FOR AUTO-CONNECT CALLED!', { scanId, user: user?.username, timestamp: new Date().toISOString() });
    if (scanId && user) {
      console.warn('� CONDITIONS MET - CALLING CONNECT!');
      connect();
    } else {
      console.warn('🚫 CONDITIONS NOT MET', { scanId: !!scanId, user: !!user });
    }
    return () => {
      console.warn('🧹 USEEFFECT CLEANUP - CALLING DISCONNECT');
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
