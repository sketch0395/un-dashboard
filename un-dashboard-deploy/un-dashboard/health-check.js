// Simple health check for network server
const express = require('express');

// Add health check endpoint if not already present
const addHealthCheck = (app) => {
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'network-server',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
    });
  });
};

module.exports = { addHealthCheck };
