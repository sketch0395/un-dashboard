/**
 * MongoDB Scan Investigation Script
 * 
 * This script examines what scans are saved in MongoDB and what device data they contain
 * to help debug why device history is not being returned.
 */

import mongoose from 'mongoose';
import dbConnection from './lib/db.js';

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

const ScanHistory = mongoose.models.ScanHistory || mongoose.model('ScanHistory', ScanHistorySchema);

async function investigateScans() {
    console.log('🔍 MONGODB SCAN INVESTIGATION');
    console.log('=============================');
    console.log('Examining saved scans and their device data...\n');

    try {
        // Connect to MongoDB
        await dbConnection.connectMongoDB();
        console.log('✅ Connected to MongoDB\n');

        // Get all scans
        const allScans = await ScanHistory.find({}).sort({ createdAt: -1 });
        
        console.log(`📊 Total scans found: ${allScans.length}\n`);
        
        if (allScans.length === 0) {
            console.log('❌ No scans found in database');
            return;
        }

        // Analyze each scan
        for (let i = 0; i < allScans.length; i++) {
            const scan = allScans[i];
            console.log(`🔍 Scan ${i + 1}:`);
            console.log(`   ID: ${scan.scanId}`);
            console.log(`   Name: ${scan.name || 'Unnamed'}`);
            console.log(`   IP Range: ${scan.ipRange}`);
            console.log(`   Device Count: ${scan.deviceCount}`);
            console.log(`   Created: ${scan.createdAt}`);
            console.log(`   User ID: ${scan.userId}`);
            
            // Analyze scan data structure
            console.log(`   📋 Scan Data Analysis:`);
            if (!scan.scanData) {
                console.log(`      ❌ No scanData field found!`);
            } else {
                console.log(`      ✅ scanData field exists`);
                console.log(`      📊 scanData type: ${typeof scan.scanData}`);
                
                if (typeof scan.scanData === 'object') {
                    const keys = Object.keys(scan.scanData);
                    console.log(`      🔑 scanData keys: [${keys.join(', ')}]`);
                    
                    // Check for devices
                    if (scan.scanData.devices) {
                        console.log(`      📱 devices field exists`);
                        console.log(`      📊 devices type: ${typeof scan.scanData.devices}`);
                        
                        if (typeof scan.scanData.devices === 'object') {
                            const deviceKeys = Object.keys(scan.scanData.devices);
                            console.log(`      🏷️  vendor groups: [${deviceKeys.join(', ')}]`);
                            
                            let totalDevices = 0;
                            deviceKeys.forEach(vendor => {
                                if (Array.isArray(scan.scanData.devices[vendor])) {
                                    const count = scan.scanData.devices[vendor].length;
                                    totalDevices += count;
                                    console.log(`         📱 ${vendor}: ${count} devices`);
                                    
                                    // Show sample device if exists
                                    if (count > 0) {
                                        const sampleDevice = scan.scanData.devices[vendor][0];
                                        console.log(`            🔍 Sample: ${sampleDevice.ip || 'no IP'} (${sampleDevice.hostname || 'no hostname'})`);
                                    }
                                }
                            });
                            
                            console.log(`      ✅ Total devices in scanData: ${totalDevices}`);
                            
                            // Check if device count matches
                            if (totalDevices === scan.deviceCount) {
                                console.log(`      ✅ Device count matches stored deviceCount`);
                            } else {
                                console.log(`      ⚠️  Device count mismatch: scanData has ${totalDevices}, stored deviceCount is ${scan.deviceCount}`);
                            }
                        }
                    } else {
                        console.log(`      ❌ No 'devices' field in scanData`);
                        console.log(`      🔍 Available fields: ${Object.keys(scan.scanData).join(', ')}`);
                    }
                    
                    // Check for other common fields
                    if (scan.scanData.portScanResults) {
                        console.log(`      📡 portScanResults: ${Array.isArray(scan.scanData.portScanResults) ? scan.scanData.portScanResults.length + ' entries' : 'exists'}`);
                    }
                    if (scan.scanData.networkInfo) {
                        console.log(`      🌐 networkInfo: exists`);
                    }
                }
            }
            
            // Check metadata
            if (scan.metadata) {
                console.log(`   🏷️  Metadata:`);
                console.log(`      Scan Type: ${scan.metadata.scanType || 'unknown'}`);
                console.log(`      OS Detection: ${scan.metadata.osDetection || false}`);
                console.log(`      Service Detection: ${scan.metadata.serviceDetection || false}`);
                if (scan.metadata.ports && scan.metadata.ports.length > 0) {
                    console.log(`      Ports: [${scan.metadata.ports.join(', ')}]`);
                }
            }
            
            console.log(''); // Empty line between scans
        }
        
        // Summary
        console.log('📈 SUMMARY:');
        console.log('===========');
        
        const scansWithDevices = allScans.filter(scan => 
            scan.scanData && 
            scan.scanData.devices && 
            typeof scan.scanData.devices === 'object' &&
            Object.keys(scan.scanData.devices).length > 0
        );
        
        const scansWithoutDevices = allScans.filter(scan => 
            !scan.scanData || 
            !scan.scanData.devices || 
            (typeof scan.scanData.devices === 'object' && Object.keys(scan.scanData.devices).length === 0)
        );
        
        console.log(`✅ Scans with device data: ${scansWithDevices.length}`);
        console.log(`❌ Scans without device data: ${scansWithoutDevices.length}`);
        
        if (scansWithoutDevices.length > 0) {
            console.log('\n⚠️  PROBLEMATIC SCANS:');
            scansWithoutDevices.forEach((scan, index) => {
                console.log(`   ${index + 1}. ${scan.scanId} - "${scan.name}" (${scan.deviceCount} devices expected)`);
            });
        }
        
        if (scansWithDevices.length > 0) {
            console.log('\n✅ WORKING SCANS:');
            scansWithDevices.forEach((scan, index) => {
                const deviceCount = Object.values(scan.scanData.devices).reduce((total, vendorDevices) => {
                    return total + (Array.isArray(vendorDevices) ? vendorDevices.length : 0);
                }, 0);
                console.log(`   ${index + 1}. ${scan.scanId} - "${scan.name}" (${deviceCount} devices found)`);
            });
        }
        
    } catch (error) {
        console.error('💥 Error investigating scans:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the investigation
investigateScans().catch(console.error);
