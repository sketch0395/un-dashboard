// Test script to debug database save issues
const mongoose = require('mongoose');

// Database connection
const mongoUrl = process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://admin:un-dashboard-2024@10.5.1.212:27017/undashboard?authSource=admin';

// Import the ScanHistory model
const ScanHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  scanId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    maxlength: 100,
    trim: true
  },
  ipRange: {
    type: String,
    required: true,
    index: true
  },
  deviceCount: {
    type: Number,
    required: true,
    min: 0
  },
  scanData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  metadata: {
    scanType: {
      type: String,
      enum: ['ping', 'os', 'full', 'custom'],
      default: 'ping'
    },
    scanDuration: Number,
    osDetection: Boolean,
    serviceDetection: Boolean,
    ports: [String],
    hasNetworkTopology: Boolean,
    vendor: String,
    deviceTypes: [String]
  },
  settings: {
    isPrivate: {
      type: Boolean,
      default: true
    },
    isFavorite: {
      type: Boolean,
      default: false
    },
    tags: [String],
    notes: {
      type: String,
      maxlength: 1000
    }
  }
}, {
  timestamps: true,
  collection: 'scan_history'
});

const ScanHistory = mongoose.model('ScanHistory', ScanHistorySchema);

async function testDatabaseSave() {
    try {
        console.log('=== TESTING DATABASE SAVE ===\n');
        
        console.log('1. Connecting to MongoDB...');
        await mongoose.connect(mongoUrl, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });
        console.log('✅ Connected to MongoDB');
        
        // Create a test user ID (this should exist in your users collection)
        const testUserId = new mongoose.Types.ObjectId();
        
        console.log('\n2. Creating test scan data...');
        const testScanData = {
            userId: testUserId,
            scanId: 'test-scan-' + Date.now(),
            name: 'Test Network Scan',
            ipRange: '10.5.1.1-255',
            deviceCount: 3,
            scanData: {
                devices: {
                    'Test Vendor': [
                        {
                            ip: '10.5.1.1',
                            hostname: 'router.local',
                            mac: '00:11:22:33:44:55',
                            vendor: 'Test Vendor',
                            ports: ['80/tcp open http', '443/tcp open https'],
                            status: 'up'
                        },
                        {
                            ip: '10.5.1.100',
                            hostname: 'desktop.local',
                            mac: '00:11:22:33:44:66',
                            vendor: 'Test Vendor',
                            ports: ['22/tcp open ssh'],
                            status: 'up'
                        }
                    ],
                    'Another Vendor': [
                        {
                            ip: '10.5.1.200',
                            hostname: 'printer.local',
                            mac: '00:11:22:33:44:77',
                            vendor: 'Another Vendor',
                            ports: ['80/tcp open http'],
                            status: 'up'
                        }
                    ]
                },
                portScanResults: [],
                networkInfo: {}
            },
            metadata: {
                scanType: 'ping',
                scanDuration: 5000,
                osDetection: false,
                serviceDetection: false,
                ports: ['80', '22', '443'],
                hasNetworkTopology: false,
                vendor: 'Mixed',
                deviceTypes: ['router', 'desktop', 'printer']
            },
            settings: {
                isPrivate: true,
                isFavorite: false,
                tags: ['test'],
                notes: 'Test scan for debugging'
            }
        };
        
        console.log('Test data structure:');
        console.log(JSON.stringify(testScanData, null, 2));
        
        console.log('\n3. Attempting to save to database...');
        const newScanHistory = new ScanHistory(testScanData);
        
        // Validate before saving
        console.log('\n4. Validating model...');
        const validationError = newScanHistory.validateSync();
        if (validationError) {
            console.error('❌ Validation failed:', validationError.errors);
            return;
        } else {
            console.log('✅ Model validation passed');
        }
        
        console.log('\n5. Saving to database...');
        const savedScan = await newScanHistory.save();
        console.log('✅ Successfully saved scan to database!');
        console.log('Saved scan ID:', savedScan._id);
        console.log('Saved scan scanId:', savedScan.scanId);
        
        console.log('\n6. Retrieving saved scan...');
        const retrievedScan = await ScanHistory.findById(savedScan._id);
        if (retrievedScan) {
            console.log('✅ Successfully retrieved scan from database');
            console.log('Device count:', retrievedScan.deviceCount);
            console.log('IP Range:', retrievedScan.ipRange);
        } else {
            console.log('❌ Failed to retrieve saved scan');
        }
        
        console.log('\n7. Cleaning up test data...');
        await ScanHistory.deleteOne({ _id: savedScan._id });
        console.log('✅ Test data cleaned up');
        
    } catch (error) {
        console.error('❌ Error during database test:', error.name);
        console.error('Error message:', error.message);
        if (error.errors) {
            console.error('Validation errors:');
            Object.keys(error.errors).forEach(key => {
                console.error(`- ${key}: ${error.errors[key].message}`);
            });
        }
        console.error('Full error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔚 Disconnected from MongoDB');
    }
}

testDatabaseSave();
