// Health check API endpoint for Docker deployment
import { NextResponse } from 'next/server';
import dbConnection from '@/lib/db';

export async function GET() {
  try {
    // Check database connection
    const dbStatus = await checkDatabase();
    
    // Check application status
    const appStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    };

    // Overall health check
    const isHealthy = dbStatus.connected;

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks: {
        database: dbStatus,
        application: appStatus
      }
    }, {
      status: isHealthy ? 200 : 503
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}

async function checkDatabase() {
  try {
    await dbConnection.connectMongoDB();
    
    // Try to perform a simple operation
    const mongoose = await import('mongoose');
    await mongoose.connection.db.admin().ping();
    
    return {
      connected: true,
      status: 'healthy',
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  } catch (error) {
    return {
      connected: false,
      status: 'unhealthy',
      error: error.message
    };
  }
}
