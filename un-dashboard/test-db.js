// Add environment variables support
require('dotenv').config({ path: './.env.local' });

const dbConnection = require('./lib/db');
const User = require('./models/User');

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    console.log('MONGODB_URL:', process.env.MONGODB_URL);
    console.log('REDIS_URL:', process.env.REDIS_URL);
    
    // Test MongoDB connection
    await dbConnection.connectMongoDB();
    console.log('✅ MongoDB connection successful');
    
    // Test Redis connection
    await dbConnection.connectRedis();
    console.log('✅ Redis connection successful');
    
    // Test User model (create a test user)
    console.log('\nTesting User model...');
    
    // Check if test user already exists
    let testUser = await User.findOne({ username: 'testuser' });
    
    if (testUser) {
      console.log('Test user already exists, removing...');
      await User.deleteOne({ username: 'testuser' });
    }
    
    // Create a test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
      role: 'user'
    });
    
    await testUser.save();
    console.log('✅ Test user created successfully');
    
    // Test user authentication
    const authenticatedUser = await User.findByCredentials('testuser', 'testpassword123');
    console.log('✅ User authentication test successful');
    
    // Cleanup test user
    await User.deleteOne({ username: 'testuser' });
    console.log('✅ Test user cleaned up');
    
    // Test database collections
    console.log('\nTesting collections...');
    const collections = await require('mongoose').connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name).join(', '));
    
    // Test Redis operations
    console.log('\nTesting Redis operations...');
    const redisClient = dbConnection.getRedisClient();
    await redisClient.set('test-key', 'test-value');
    const value = await redisClient.get('test-key');
    console.log('✅ Redis set/get test successful:', value);
    await redisClient.del('test-key');
    
    console.log('\n🎉 All database tests passed successfully!');
    console.log('\nDatabase is ready for user authentication implementation.');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await dbConnection.disconnectAll();
    process.exit(0);
  }
}

// Run the test
testDatabaseConnection();
