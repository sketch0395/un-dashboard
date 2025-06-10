const WebSocket = require('ws');
const http = require('http');
const { CollaborationServer } = require('../collaboration-server');

describe('Collaboration System', () => {
  let server;
  let httpServer;
  let collaborationServer;

  beforeEach(async () => {
    // Create HTTP server
    httpServer = http.createServer();
    
    // Create collaboration server
    collaborationServer = new CollaborationServer(httpServer);
    
    // Start server on random port
    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        server = httpServer;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });

  test('should accept WebSocket connections', async () => {
    const port = server.address().port;
    const ws = new WebSocket(`ws://localhost:${port}`);
    
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  test('should handle user authentication and session creation', async () => {
    const port = server.address().port;
    const ws = new WebSocket(`ws://localhost:${port}`);
    
    await new Promise((resolve) => {
      ws.on('open', resolve);
    });

    // Send authentication message
    const authMessage = {
      type: 'auth',
      data: {
        userId: 'test-user-1',
        username: 'Test User',
        scanId: 'test-scan-1'
      }
    };

    ws.send(JSON.stringify(authMessage));

    // Wait for response
    const response = await new Promise((resolve) => {
      ws.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    expect(response.type).toBe('auth_success');
    expect(response.data.userId).toBe('test-user-1');
    expect(response.data.scanId).toBe('test-scan-1');

    ws.close();
  });

  test('should handle device locking and unlocking', async () => {
    const port = server.address().port;
    const ws1 = new WebSocket(`ws://localhost:${port}`);
    const ws2 = new WebSocket(`ws://localhost:${port}`);
    
    // Connect both clients
    await Promise.all([
      new Promise((resolve) => ws1.on('open', resolve)),
      new Promise((resolve) => ws2.on('open', resolve))
    ]);

    // Authenticate both users
    ws1.send(JSON.stringify({
      type: 'auth',
      data: { userId: 'user1', username: 'User 1', scanId: 'scan1' }
    }));

    ws2.send(JSON.stringify({
      type: 'auth',
      data: { userId: 'user2', username: 'User 2', scanId: 'scan1' }
    }));

    // Wait for auth responses
    await Promise.all([
      new Promise((resolve) => ws1.on('message', resolve)),
      new Promise((resolve) => ws2.on('message', resolve))
    ]);

    // User 1 locks a device
    ws1.send(JSON.stringify({
      type: 'lock_device',
      data: { deviceId: 'device1', deviceName: 'Test Device' }
    }));

    // User 2 should receive lock notification
    const lockNotification = await new Promise((resolve) => {
      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'device_locked') {
          resolve(message);
        }
      });
    });

    expect(lockNotification.data.deviceId).toBe('device1');
    expect(lockNotification.data.lockedBy).toBe('user1');

    ws1.close();
    ws2.close();
  });

  test('should broadcast device updates in real-time', async () => {
    const port = server.address().port;
    const ws1 = new WebSocket(`ws://localhost:${port}`);
    const ws2 = new WebSocket(`ws://localhost:${port}`);
    
    // Connect and authenticate both clients
    await Promise.all([
      new Promise((resolve) => ws1.on('open', resolve)),
      new Promise((resolve) => ws2.on('open', resolve))
    ]);

    ws1.send(JSON.stringify({
      type: 'auth',
      data: { userId: 'user1', username: 'User 1', scanId: 'scan1' }
    }));

    ws2.send(JSON.stringify({
      type: 'auth',
      data: { userId: 'user2', username: 'User 2', scanId: 'scan1' }
    }));

    // Wait for auth
    await Promise.all([
      new Promise((resolve) => ws1.on('message', resolve)),
      new Promise((resolve) => ws2.on('message', resolve))
    ]);

    // User 1 updates device data
    ws1.send(JSON.stringify({
      type: 'device_update',
      data: {
        deviceId: 'device1',
        updates: {
          name: 'Updated Device Name',
          description: 'New description'
        }
      }
    }));

    // User 2 should receive the update
    const updateNotification = await new Promise((resolve) => {
      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'device_updated') {
          resolve(message);
        }
      });
    });

    expect(updateNotification.data.deviceId).toBe('device1');
    expect(updateNotification.data.updates.name).toBe('Updated Device Name');

    ws1.close();
    ws2.close();
  });

  test('should handle user disconnection and cleanup', async () => {
    const port = server.address().port;
    const ws1 = new WebSocket(`ws://localhost:${port}`);
    const ws2 = new WebSocket(`ws://localhost:${port}`);
    
    await Promise.all([
      new Promise((resolve) => ws1.on('open', resolve)),
      new Promise((resolve) => ws2.on('open', resolve))
    ]);

    // Authenticate both users
    ws1.send(JSON.stringify({
      type: 'auth',
      data: { userId: 'user1', username: 'User 1', scanId: 'scan1' }
    }));

    ws2.send(JSON.stringify({
      type: 'auth',
      data: { userId: 'user2', username: 'User 2', scanId: 'scan1' }
    }));

    // Wait for auth
    await Promise.all([
      new Promise((resolve) => ws1.on('message', resolve)),
      new Promise((resolve) => ws2.on('message', resolve))
    ]);

    // User 1 locks a device
    ws1.send(JSON.stringify({
      type: 'lock_device',
      data: { deviceId: 'device1', deviceName: 'Test Device' }
    }));

    // Wait for lock notification
    await new Promise((resolve) => {
      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'device_locked') {
          resolve();
        }
      });
    });

    // User 1 disconnects
    ws1.close();

    // User 2 should receive user left and device unlocked notifications
    const notifications = [];
    await new Promise((resolve) => {
      let count = 0;
      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'user_left' || message.type === 'device_unlocked') {
          notifications.push(message);
          count++;
          if (count >= 2) resolve();
        }
      });
      setTimeout(resolve, 2000); // Timeout after 2 seconds
    });

    expect(notifications.some(n => n.type === 'user_left')).toBe(true);
    expect(notifications.some(n => n.type === 'device_unlocked')).toBe(true);

    ws2.close();
  });
});
