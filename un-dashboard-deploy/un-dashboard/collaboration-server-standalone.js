#!/usr/bin/env node

// Standalone collaboration server for development
// This runs the collaboration WebSocket server independently

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const http = require('http');
const { CollaborationServer } = require('./tests/organized/collaboration/collaboration-server');

// Create a simple HTTP server for the collaboration WebSocket server
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'collaboration-server' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Collaboration WebSocket Server - Use /collaboration-ws for WebSocket connections');
  }
});

const PORT = process.env.COLLABORATION_PORT || 4001;

async function startCollaborationServer() {
  try {
    console.log('🤝 Starting standalone collaboration server...');
    
    // Initialize collaboration server
    const collaborationServer = new CollaborationServer();
    await collaborationServer.initialize(server);
    
    // Start the HTTP server
    server.listen(PORT, () => {
      console.log(`✅ Collaboration server running on port ${PORT}`);
      console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}/collaboration-ws`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Shutting down collaboration server...');
      server.close(() => {
        console.log('✅ Collaboration server stopped');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('🛑 Shutting down collaboration server...');
      server.close(() => {
        console.log('✅ Collaboration server stopped');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start collaboration server:', error);
    process.exit(1);
  }
}

// Start the server
startCollaborationServer();
