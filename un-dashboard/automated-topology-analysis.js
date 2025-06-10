// Automated Topology Issue Detection Script
// Run with: node automated-topology-analysis.js

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/undashboard');
        console.log('✅ Connected to MongoDB');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        return false;
    }
};

// Scan History Schema
const ScanHistorySchema = new mongoose.Schema({}, { strict: false });
const ScanHistory = mongoose.model('ScanHistory', ScanHistorySchema);

// Analysis functions
async function analyzeDuplicationIssues() {
    console.log('\n🔍 Analyzing Duplication Issues...');
    
    try {
        // Check for duplicate scanIds
        const duplicateScanIds = await ScanHistory.aggregate([
            { $group: { _id: "$scanId", count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]);
        
        if (duplicateScanIds.length > 0) {
            console.log('❌ Found duplicate scan IDs:');
            duplicateScanIds.forEach(dup => {
                console.log(`  - ${dup._id}: ${dup.count} copies`);
            });
        } else {
            console.log('✅ No duplicate scan IDs found');
        }
        
        // Check for similar scans (same name, different IDs)
        const allScans = await ScanHistory.find({}, { scanId: 1, name: 1, createdAt: 1 });
        const nameGroups = {};
        
        allScans.forEach(scan => {
            if (!nameGroups[scan.name]) {
                nameGroups[scan.name] = [];
            }
            nameGroups[scan.name].push(scan);
        });
        
        const suspiciousDuplicates = Object.entries(nameGroups).filter(([name, scans]) => scans.length > 1);
        
        if (suspiciousDuplicates.length > 0) {
            console.log('⚠️  Found potentially duplicated scans by name:');
            suspiciousDuplicates.forEach(([name, scans]) => {
                console.log(`  - "${name}": ${scans.length} scans`);
                scans.forEach(scan => {
                    console.log(`    * ${scan.scanId} (${scan.createdAt})`);
                });
            });
        } else {
            console.log('✅ No suspicious name duplicates found');
        }
        
    } catch (error) {
        console.error('❌ Error analyzing duplications:', error.message);
    }
}

async function analyzeTopologyData() {
    console.log('\n🌐 Analyzing Topology Data Structure...');
    
    try {
        const scans = await ScanHistory.find({}).sort({ createdAt: -1 }).limit(10);
        
        console.log(`📊 Analyzing ${scans.length} recent scans...`);
        
        const topologyIssues = [];
        
        scans.forEach((scan, index) => {
            console.log(`\n${index + 1}. Scan: ${scan.scanId} (${scan.deviceCount} devices)`);
            
            if (!scan.scanData || !Array.isArray(scan.scanData)) {
                topologyIssues.push({
                    scanId: scan.scanId,
                    issue: 'Missing or invalid scanData array'
                });
                console.log('  ❌ Missing or invalid scanData');
                return;
            }
            
            // Analyze device relationships
            const devices = scan.scanData;
            const deviceIPs = devices.map(d => d.ip);
            const connectionIssues = [];
            const hierarchyIssues = [];
            
            devices.forEach(device => {
                // Check connections reference valid devices
                if (device.connections && Array.isArray(device.connections)) {
                    device.connections.forEach(connIP => {
                        if (!deviceIPs.includes(connIP)) {
                            connectionIssues.push(`${device.ip} → ${connIP} (target not found)`);
                        }
                    });
                }
                
                // Check connectedTo references
                if (device.connectedTo && !deviceIPs.includes(device.connectedTo)) {
                    hierarchyIssues.push(`${device.ip} connectedTo ${device.connectedTo} (parent not found)`);
                }
                
                // Check for gateways
                if (device.gateway && device.deviceType !== 'router') {
                    hierarchyIssues.push(`${device.ip} marked as gateway but type is ${device.deviceType}`);
                }
            });
            
            if (connectionIssues.length > 0) {
                console.log('  ⚠️  Connection issues:');
                connectionIssues.forEach(issue => console.log(`    - ${issue}`));
                topologyIssues.push({
                    scanId: scan.scanId,
                    issue: 'Invalid connection references',
                    details: connectionIssues
                });
            }
            
            if (hierarchyIssues.length > 0) {
                console.log('  ⚠️  Hierarchy issues:');
                hierarchyIssues.forEach(issue => console.log(`    - ${issue}`));
                topologyIssues.push({
                    scanId: scan.scanId,
                    issue: 'Invalid hierarchy references',
                    details: hierarchyIssues
                });
            }
            
            // Count device types
            const typeCount = {};
            devices.forEach(device => {
                typeCount[device.deviceType || 'unknown'] = (typeCount[device.deviceType || 'unknown'] || 0) + 1;
            });
            
            console.log('  📋 Device types:', Object.entries(typeCount).map(([type, count]) => `${type}(${count})`).join(', '));
            
            // Check for network roles if present
            const rolesCount = {};
            devices.forEach(device => {
                if (device.networkRole) {
                    rolesCount[device.networkRole] = (rolesCount[device.networkRole] || 0) + 1;
                }
            });
            
            if (Object.keys(rolesCount).length > 0) {
                console.log('  🏷️  Network roles:', Object.entries(rolesCount).map(([role, count]) => `${role}(${count})`).join(', '));
            }
        });
        
        if (topologyIssues.length > 0) {
            console.log('\n❌ Topology Issues Summary:');
            topologyIssues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue.scanId}: ${issue.issue}`);
                if (issue.details) {
                    issue.details.forEach(detail => console.log(`   - ${detail}`));
                }
            });
        } else {
            console.log('\n✅ No topology structure issues found');
        }
        
    } catch (error) {
        console.error('❌ Error analyzing topology data:', error.message);
    }
}

async function analyzeVisualizationComponents() {
    console.log('\n🎨 Analyzing Visualization Components...');
    
    const componentsToCheck = [
        'src/app/networkscan/networkviews/NetworkViewManager.js',
        'src/app/networkscan/networkviews/HierarchicalNetworkView.js',
        'src/app/networkscan/networkviews/CircularNetworkView.js',
        'src/app/networkscan/networkviews/NetworkViewUtils.js',
        'src/app/networkscan/components/networktopology.js'
    ];
    
    const issues = [];
    
    componentsToCheck.forEach(componentPath => {
        const fullPath = path.join(process.cwd(), componentPath);
        
        if (!fs.existsSync(fullPath)) {
            issues.push(`❌ Missing component: ${componentPath}`);
            return;
        }
        
        console.log(`✅ Found: ${path.basename(componentPath)}`);
        
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Check for common issues
            if (content.includes('console.error') || content.includes('console.warn')) {
                const errorLines = content.split('\n').filter(line => 
                    line.includes('console.error') || line.includes('console.warn')
                ).length;
                console.log(`  ⚠️  Contains ${errorLines} error/warning logs`);
            }
            
            // Check for D3.js usage
            if (content.includes('d3.') || content.includes("from 'd3'")) {
                console.log(`  📊 Uses D3.js for visualization`);
            }
            
            // Check for React hooks
            const hooks = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo'];
            const usedHooks = hooks.filter(hook => content.includes(hook));
            if (usedHooks.length > 0) {
                console.log(`  ⚛️  Uses React hooks: ${usedHooks.join(', ')}`);
            }
            
        } catch (error) {
            issues.push(`❌ Error reading ${componentPath}: ${error.message}`);
        }
    });
    
    if (issues.length > 0) {
        console.log('\n❌ Component Issues:');
        issues.forEach(issue => console.log(`  ${issue}`));
    }
}

async function generateTestRecommendations() {
    console.log('\n🎯 Test Recommendations...');
    
    try {
        const scanCount = await ScanHistory.countDocuments();
        console.log(`📈 Total scans in database: ${scanCount}`);
        
        if (scanCount === 0) {
            console.log('💡 Recommendation: Create test scans to verify visualization');
            console.log('   Use the browser test scripts to submit sample topology data');
        } else {
            const recentScans = await ScanHistory.find({}).sort({ createdAt: -1 }).limit(3);
            console.log('💡 Recent scans available for testing:');
            recentScans.forEach((scan, index) => {
                console.log(`   ${index + 1}. ${scan.scanId} - ${scan.name} (${scan.deviceCount} devices)`);
            });
        }
        
        console.log('\n🔧 Recommended Testing Steps:');
        console.log('1. Open http://localhost:3000/networkscan in browser');
        console.log('2. Log in as admin (admin/admin123!)');
        console.log('3. Run the browser test scripts from MANUAL_TOPOLOGY_TESTING.md');
        console.log('4. Check for visualization rendering issues');
        console.log('5. Test view switching between Circular and Hierarchical');
        console.log('6. Verify device hierarchy and connections');
        
    } catch (error) {
        console.error('❌ Error generating recommendations:', error.message);
    }
}

// Main analysis function
async function runAnalysis() {
    console.log('🚀 Starting Automated Topology Analysis...');
    console.log('='.repeat(60));
    
    const connected = await connectDB();
    if (!connected) {
        console.log('❌ Cannot proceed without database connection');
        return;
    }
    
    await analyzeDuplicationIssues();
    await analyzeTopologyData();
    await analyzeVisualizationComponents();
    await generateTestRecommendations();
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Analysis completed!');
    console.log('📋 Next: Run manual browser tests for frontend validation');
    
    await mongoose.disconnect();
}

// Run the analysis
runAnalysis().catch(error => {
    console.error('💥 Critical error:', error);
    process.exit(1);
});
