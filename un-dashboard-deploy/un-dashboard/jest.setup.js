// Jest setup file
// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';
process.env.MONGODB_URI = 'mongodb://localhost:27017/un-dashboard-test';

// Mock external modules
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn(() => Promise.resolve({ messageId: 'test-message-id' }))
  }))
}));

// Global test timeout
jest.setTimeout(30000);
