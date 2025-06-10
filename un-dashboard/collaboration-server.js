// Real-time collaboration WebSocket server for shared scans
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const WebSocket = require('ws');
const http = require('http');
const { AuthService } = require('./middleware/auth');
const dbConnection = require('./lib/db');

class CollaborationServer {
  constructor() {
    this.clients = new Map(); // scanId -> Set of clients
    this.scanSessions = new Map(); // scanId -> session data
    this.userPresence = new Map(); // scanId -> Map of userId -> user info
    this.dbConnected = false;
  }

  async initialize(server) {
    try {
      // Ensure database connection before initializing WebSocket server
      console.log('🔗 Ensuring database connection for collaboration server...');
      await dbConnection.connectMongoDB();
      this.dbConnected = true;
      console.log('✅ Database connection established for collaboration server');
    } catch (error) {
      console.error('❌ Failed to connect to database for collaboration server:', error);
      // Continue initialization but mark as not connected
      this.dbConnected = false;
    }

    this.wss = new WebSocket.Server({ 
      server,
      path: '/collaboration-ws'
    });

    this.wss.on('connection', (ws, request) => {
      console.log('New collaboration connection');
      this.handleConnection(ws, request);
    });

    // Start heartbeat mechanism
    this.startHeartbeat();

    console.log('🤝 Collaboration WebSocket server initialized');
  }async handleConnection(ws, request) {
    try {
      console.log('🔗 New collaboration connection attempt');
        // Extract scanId from query parameters
      const url = new URL(request.url, `http://${request.headers.host}`);
      const scanId = url.searchParams.get('scanId');
      const tokenFromUrl = url.searchParams.get('token');
      console.log('📋 Scan ID:', scanId);
      console.log('🔐 Token in URL:', tokenFromUrl ? 'present' : 'missing');

      if (!scanId) {
        console.log('❌ No scan ID provided');
        ws.close(1008, 'Scan ID required');
        return;
      }

      // Extract token from URL first, then cookies (HTTP-only cookies)
      const cookie = request.headers.cookie;
      let token = tokenFromUrl; // Try URL token first
      console.log('🍪 Cookie header:', cookie ? 'present' : 'missing');        if (cookie) {
        const cookies = cookie.split(';').reduce((acc, curr) => {
          const [key, value] = curr.trim().split('=');
          acc[key] = value;
          return acc;
        }, {});
        token = token || cookies['auth-token']; // Use cookie token if URL token not available
        console.log('🔑 Auth token from cookie:', cookies['auth-token'] ? 'found' : 'not found');
        if (cookies['auth-token']) {
          console.log('🍪 Raw token value:', cookies['auth-token'].substring(0, 20) + '...');
        }
      }      // Also check authorization header as fallback
      if (!token) {
        token = request.headers.authorization?.replace('Bearer ', '');
        console.log('🔑 Auth token from header:', token ? 'found' : 'not found');
      }

      console.log('🔍 Final token source:', tokenFromUrl ? 'URL' : (cookie ? 'Cookie' : 'Header'));

      if (!token) {
        console.log('❌ No authentication token found');
        ws.close(1008, 'Authentication required');
        return;
      }      // Verify authentication
      console.log('🔍 Verifying authentication...');
      
      // Check if database is connected
      if (!this.dbConnected) {
        console.log('❌ Database not connected, cannot verify authentication');
        ws.close(1011, 'Server not ready');
        return;
      }

      const authData = await this.verifyAuth(token);
      if (!authData) {
        console.log('❌ Authentication verification failed');
        ws.close(1008, 'Invalid authentication');
        return;
      }

      console.log('✅ Authentication successful for user:', authData.user.username);      ws.user = authData.user;
      ws.scanId = scanId;
      ws.isAlive = true;

      console.log('🤝 Adding client to scan session');
      // Add client to scan session
      this.addClientToScan(ws);

      // Set up message handlers
      ws.on('message', (message) => {
        console.log('📨 Received message:', message.toString());
        this.handleMessage(ws, message);
      });

      ws.on('close', () => {
        console.log('🔌 Client disconnected');
        this.removeClientFromScan(ws);
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      console.log('📤 Sending initial session data');
      // Send initial session data
      this.sendSessionData(ws);

      console.log('✅ Collaboration connection established successfully');

    } catch (error) {
      console.error('❌ Error handling collaboration connection:', error);
      ws.close(1011, 'Internal server error');
    }
  }  async verifyAuth(token) {
    try {
      console.log('🔍 Attempting to verify token:', token ? token.substring(0, 20) + '...' : 'null');
      
      // Ensure database connection first
      if (!this.dbConnected) {
        console.log('🔄 Attempting to reconnect to database...');
        try {
          await dbConnection.connectMongoDB();
          this.dbConnected = true;
          console.log('✅ Database reconnected successfully');
        } catch (dbError) {
          console.error('❌ Database reconnection failed:', dbError.message);
          throw new Error('Database connection failed');
        }
      }
      
      // Create a properly structured mock request object that matches AuthService expectations
      const mockReq = {
        headers: { 
          authorization: `Bearer ${token}`,
          get: (name) => {
            if (name === 'authorization') {
              return `Bearer ${token}`;
            }
            return null;
          }
        },
        cookies: {
          get: (name) => {
            if (name === 'auth-token') {
              return { value: token };
            }
            return null;
          }
        }
      };

      // Add direct token access for compatibility
      if (!mockReq.cookies.get('auth-token')) {
        // If no cookie token, add the token directly to mock request
        mockReq.headers.authorization = `Bearer ${token}`;
      }

      console.log('🔍 Mock request structure:', {
        hasHeaders: !!mockReq.headers,
        hasAuth: !!mockReq.headers.authorization,
        hasCookies: !!mockReq.cookies
      });

      const result = await AuthService.verifyAuth(mockReq);
      console.log('✅ Auth verification successful for user:', result.user.username);
      return result;
    } catch (error) {
      console.error('🔍 Auth verification failed:', error.message);
      console.error('🔍 Full error:', error);
      
      // Mark database as disconnected if it's a database error
      if (error.message.includes('database') || error.message.includes('connection') || error.message.includes('MongoDB')) {
        this.dbConnected = false;
      }
      
      return null;
    }
  }

  addClientToScan(ws) {
    const { scanId, user } = ws;

    // Add to clients map
    if (!this.clients.has(scanId)) {
      this.clients.set(scanId, new Set());
    }
    this.clients.get(scanId).add(ws);

    // Add to user presence
    if (!this.userPresence.has(scanId)) {
      this.userPresence.set(scanId, new Map());
    }
    this.userPresence.get(scanId).set(user._id, {
      userId: user._id,
      username: user.username,
      email: user.email,
      joinedAt: new Date(),
      lastActivity: new Date(),
      isActive: true
    });

    // Initialize scan session if needed
    if (!this.scanSessions.has(scanId)) {
      this.scanSessions.set(scanId, {
        scanId,
        createdAt: new Date(),
        lastModified: new Date(),
        lockState: new Map(), // deviceId -> { userId, lockedAt }
        pendingChanges: new Map(), // changeId -> change data
        version: 1
      });
    }

    console.log(`👤 User ${user.username} joined scan ${scanId}`);

    // Broadcast user joined event
    this.broadcastToScan(scanId, {
      type: 'user_joined',
      user: {
        userId: user._id,
        username: user.username,
        email: user.email
      },
      timestamp: new Date()
    }, ws);
  }

  removeClientFromScan(ws) {
    const { scanId, user } = ws;
    if (!scanId || !user) return;

    // Remove from clients
    if (this.clients.has(scanId)) {
      this.clients.get(scanId).delete(ws);
      if (this.clients.get(scanId).size === 0) {
        this.clients.delete(scanId);
      }
    }

    // Update user presence
    if (this.userPresence.has(scanId)) {
      this.userPresence.get(scanId).delete(user._id);
      if (this.userPresence.get(scanId).size === 0) {
        this.userPresence.delete(scanId);
        // Clean up session when no users are present
        this.scanSessions.delete(scanId);
      }
    }

    console.log(`👋 User ${user.username} left scan ${scanId}`);

    // Broadcast user left event
    this.broadcastToScan(scanId, {
      type: 'user_left',
      user: {
        userId: user._id,
        username: user.username
      },
      timestamp: new Date()
    });
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      const { scanId, user } = ws;

      // Update user activity
      if (this.userPresence.has(scanId)) {
        const userInfo = this.userPresence.get(scanId).get(user._id);
        if (userInfo) {
          userInfo.lastActivity = new Date();
        }
      }

      switch (data.type) {
        case 'device_lock':
          this.handleDeviceLock(ws, data);
          break;

        case 'device_unlock':
          this.handleDeviceUnlock(ws, data);
          break;

        case 'device_update':
          this.handleDeviceUpdate(ws, data);
          break;

        case 'scan_update':
          this.handleScanUpdate(ws, data);
          break;

        case 'cursor_position':
          this.handleCursorPosition(ws, data);
          break;

        case 'typing_indicator':
          this.handleTypingIndicator(ws, data);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
          break;

        default:
          console.warn('Unknown collaboration message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling collaboration message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }

  handleDeviceLock(ws, data) {
    const { scanId, user } = ws;
    const { deviceId } = data;

    const session = this.scanSessions.get(scanId);
    if (!session) return;

    // Check if device is already locked
    if (session.lockState.has(deviceId)) {
      const lock = session.lockState.get(deviceId);
      if (lock.userId !== user._id) {
        ws.send(JSON.stringify({
          type: 'device_lock_failed',
          deviceId,
          reason: 'Device already locked by another user',
          lockedBy: lock.userId
        }));
        return;
      }
    }

    // Lock the device
    session.lockState.set(deviceId, {
      userId: user._id,
      username: user.username,
      lockedAt: new Date()
    });

    // Broadcast lock event
    this.broadcastToScan(scanId, {
      type: 'device_locked',
      deviceId,
      userId: user._id,
      username: user.username,
      timestamp: new Date()
    });
  }

  handleDeviceUnlock(ws, data) {
    const { scanId, user } = ws;
    const { deviceId } = data;

    const session = this.scanSessions.get(scanId);
    if (!session) return;

    // Check if user owns the lock
    const lock = session.lockState.get(deviceId);
    if (lock && lock.userId === user._id) {
      session.lockState.delete(deviceId);

      // Broadcast unlock event
      this.broadcastToScan(scanId, {
        type: 'device_unlocked',
        deviceId,
        userId: user._id,
        timestamp: new Date()
      });
    }
  }

  handleDeviceUpdate(ws, data) {
    const { scanId, user } = ws;
    const { deviceId, changes, version } = data;

    const session = this.scanSessions.get(scanId);
    if (!session) return;

    // Check if user has lock on device
    const lock = session.lockState.get(deviceId);
    if (!lock || lock.userId !== user._id) {
      ws.send(JSON.stringify({
        type: 'device_update_failed',
        deviceId,
        reason: 'Device not locked by user'
      }));
      return;
    }

    // Create change record
    const changeId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const change = {
      id: changeId,
      deviceId,
      userId: user._id,
      username: user.username,
      changes,
      timestamp: new Date(),
      version
    };

    session.pendingChanges.set(changeId, change);
    session.lastModified = new Date();
    session.version++;

    // Broadcast device update
    this.broadcastToScan(scanId, {
      type: 'device_updated',
      deviceId,
      changes,
      changeId,
      userId: user._id,
      username: user.username,
      version: session.version,
      timestamp: new Date()
    }, ws);
  }

  handleScanUpdate(ws, data) {
    const { scanId, user } = ws;
    const { changes } = data;

    const session = this.scanSessions.get(scanId);
    if (!session) return;

    session.lastModified = new Date();
    session.version++;

    // Broadcast scan update
    this.broadcastToScan(scanId, {
      type: 'scan_updated',
      changes,
      userId: user._id,
      username: user.username,
      version: session.version,
      timestamp: new Date()
    }, ws);
  }

  handleCursorPosition(ws, data) {
    const { scanId, user } = ws;
    const { deviceId, position } = data;

    // Broadcast cursor position (don't send back to sender)
    this.broadcastToScan(scanId, {
      type: 'cursor_position',
      deviceId,
      userId: user._id,
      username: user.username,
      position,
      timestamp: new Date()
    }, ws);
  }

  handleTypingIndicator(ws, data) {
    const { scanId, user } = ws;
    const { deviceId, field, isTyping } = data;

    // Broadcast typing indicator
    this.broadcastToScan(scanId, {
      type: 'typing_indicator',
      deviceId,
      field,
      userId: user._id,
      username: user.username,
      isTyping,
      timestamp: new Date()
    }, ws);
  }

  broadcastToScan(scanId, message, excludeWs = null) {
    const clients = this.clients.get(scanId);
    if (!clients) return;

    const messageStr = JSON.stringify(message);
    
    clients.forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  sendSessionData(ws) {
    const { scanId } = ws;
    const session = this.scanSessions.get(scanId);
    const presence = this.userPresence.get(scanId);

    if (!session || !presence) return;

    const users = Array.from(presence.values());
    const locks = Array.from(session.lockState.entries()).map(([deviceId, lock]) => ({
      deviceId,
      ...lock
    }));

    ws.send(JSON.stringify({
      type: 'session_data',
      scanId,
      users,
      locks,
      version: session.version,
      timestamp: new Date()
    }));
  }

  startHeartbeat() {
    const interval = setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
          this.removeClientFromScan(ws);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  getSessionStats() {
    return {
      totalSessions: this.scanSessions.size,
      totalClients: Array.from(this.clients.values()).reduce((sum, clients) => sum + clients.size, 0),
      activeSessions: Array.from(this.scanSessions.entries()).map(([scanId, session]) => ({
        scanId,
        userCount: this.userPresence.get(scanId)?.size || 0,
        lastModified: session.lastModified,
        version: session.version
      }))
    };
  }
}

module.exports = { CollaborationServer };
