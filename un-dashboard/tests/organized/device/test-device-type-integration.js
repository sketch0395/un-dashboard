/**
 * Test script to verify device type consistency and parent selection system
 */

// Import the shared device type system
const { DEVICE_TYPES, getDeviceTypeById, migrateDeviceType, getDeviceTypesForRole } = require('./src/app/utils/deviceTypes');

console.log('🧪 Testing Device Type Integration...\n');

// Test 1: Verify all device types are properly defined
console.log('1️⃣ Testing device type definitions:');
console.log('Available device types:', Object.keys(DEVICE_TYPES).length);
Object.entries(DEVICE_TYPES).forEach(([id, type]) => {
    console.log(`  - ${id}: ${type.name} (Can have parent: ${type.canHaveParent})`);
});

// Test 2: Test device type retrieval
console.log('\n2️⃣ Testing device type retrieval:');
const gatewayType = getDeviceTypeById('gateway');
const serverType = getDeviceTypeById('server');
const switchType = getDeviceTypeById('switch');

console.log('Gateway type:', gatewayType ? gatewayType.name : 'NOT FOUND');
console.log('Server type:', serverType ? serverType.name : 'NOT FOUND');
console.log('Switch type:', switchType ? switchType.name : 'NOT FOUND');

// Test 3: Test device type migration
console.log('\n3️⃣ Testing device type migration:');
const legacyTypes = ['Gateway', 'Switch', 'Router', 'Production Server'];
legacyTypes.forEach(legacyType => {
    const migratedType = migrateDeviceType(legacyType);
    console.log(`  ${legacyType} → ${migratedType}`);
});

// Test 4: Test parent-child relationships
console.log('\n4️⃣ Testing parent-child relationship logic:');
const testDevices = [
    { type: 'gateway', name: 'Main Gateway' },
    { type: 'switch', name: 'Core Switch' },
    { type: 'server', name: 'Web Server' },
    { type: 'router', name: 'Edge Router' }
];

testDevices.forEach(device => {
    const typeConfig = getDeviceTypeById(device.type);
    if (typeConfig) {
        console.log(`  ${device.name} (${typeConfig.name}): Can have parent = ${typeConfig.canHaveParent}`);
    }
});

// Test 5: Test role-based filtering
console.log('\n5️⃣ Testing role-based device type filtering:');
const networkRoles = ['gateway', 'switch', 'router'];
networkRoles.forEach(role => {
    const typesForRole = getDeviceTypesForRole(role);
    if (typesForRole && typesForRole.length > 0) {
        console.log(`  ${role} role: ${typesForRole.map(t => t.name).join(', ')}`);
    } else {
        console.log(`  ${role} role: No specific types found`);
    }
});

console.log('\n✅ Device type integration test completed!');
