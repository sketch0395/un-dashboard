const mongoose = require('mongoose');
const redis = require('redis');

class DatabaseConnection {
  constructor() {
    this.mongoConnection = null;
    this.redisClient = null;
  }

  async connectMongoDB() {
    try {
      if (this.mongoConnection && mongoose.connection.readyState === 1) {
        console.log('MongoDB already connected');
        return this.mongoConnection;
      }

      const mongoUrl = process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://admin:un-dashboard-2024@10.5.1.212:27017/undashboard?authSource=admin';
        this.mongoConnection = await mongoose.connect(mongoUrl, {
        serverSelectionTimeoutMS: 5000, // 5 second timeout
        socketTimeoutMS: 45000, // 45 second socket timeout
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      });

      console.log('MongoDB connected successfully');
      
      // Handle connection events
      mongoose.connection.on('connected', () => {
        console.log('MongoDB connected');
      });

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
      });

      return this.mongoConnection;
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async connectRedis() {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        console.log('Redis already connected');
        return this.redisClient;
      }

      const redisUrl = process.env.REDIS_URL || 'redis://10.5.1.212:6379';
      
      this.redisClient = redis.createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.redisClient.on('connect', () => {
        console.log('Redis connected');
      });

      this.redisClient.on('ready', () => {
        console.log('Redis ready');
      });

      this.redisClient.on('end', () => {
        console.log('Redis connection ended');
      });

      await this.redisClient.connect();
      console.log('Redis connected successfully');
      
      return this.redisClient;
    } catch (error) {
      console.error('Redis connection failed:', error);
      throw error;
    }
  }

  async connectAll() {
    try {
      await Promise.all([
        this.connectMongoDB(),
        this.connectRedis()
      ]);
      console.log('All database connections established');
    } catch (error) {
      console.error('Failed to establish database connections:', error);
      throw error;
    }
  }

  async disconnectAll() {
    try {
      const promises = [];
      
      if (this.mongoConnection) {
        promises.push(mongoose.disconnect());
      }
      
      if (this.redisClient && this.redisClient.isOpen) {
        promises.push(this.redisClient.disconnect());
      }
      
      await Promise.all(promises);
      console.log('All database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
      throw error;
    }
  }

  getMongoConnection() {
    return this.mongoConnection;
  }

  getRedisClient() {
    return this.redisClient;
  }
}

// Create singleton instance
const dbConnection = new DatabaseConnection();

module.exports = dbConnection;
