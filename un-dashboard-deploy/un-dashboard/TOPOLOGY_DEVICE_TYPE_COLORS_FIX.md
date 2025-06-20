# Topology Device Type Colors & Icons Consistency Fix

## Problem
The device type dropdown in modals and the topology map views were using different color and icon systems, causing visual inconsistencies.

## Root Cause
- `NetworkViewUtils.js` had hardcoded color/icon mappings
- Topology views weren't using the standard `deviceTypes.js` system
- Modal was saving device types to `networkRole` but topology was looking for `category`

## Solution Applied

### 1. Updated NetworkViewUtils.js
- **Imported standard device types**: Now uses `getDeviceTypeById` and `getDeviceTypeByName` from `deviceTypes.js`
- **Enhanced getDeviceIconAndColor function**: 
  - First checks `category` field (new standard)
  - Then checks `networkRole` field (backward compatibility)
  - Maps legacy networkRole values to standard device type IDs
  - Vendor-based fallback also uses standard device types
  - Default fallback uses standard "other" device type

### 2. Updated UnifiedDeviceModal.js
- **Dual field saving**: DeviceTypeSelector now saves to both `category` (new) and `networkRole` (legacy)
- **Backward compatibility**: Reads from either `category` or `networkRole`
- **ParentDeviceSelector**: Updated to use the same field priority

### 3. Fixed Icon Visibility in Both Views
- **Hierarchical View**: Icons now render in white on colored backgrounds for visibility
- **Circular View**: Fixed icon color to white and ensured proper rendering
- **Icon Components**: Both views now use React icon components from deviceTypes.js

### 4. Priority Order for Device Types
1. **category** field (standard device type ID)
2. **networkRole** field (legacy, mapped to standard types)
3. **Custom icon** (legacy support)
4. **Vendor-based** (using standard device types)
5. **Default fallback** (standard "other" type)

## Key Changes

### NetworkViewUtils.js
```javascript
// OLD: Hardcoded mappings
const deviceTypeConfigs = {
    'Switch': { icon: FaNetworkWired, color: '#06b6d4' },
    // ...
};

// NEW: Uses standard device types
const deviceType = getDeviceTypeById('switch');
return {
    iconComponent: deviceType.icon,
    color: deviceType.color,
    source: 'deviceType'
};
```

### UnifiedDeviceModal.js
```javascript
// OLD: Single field
onChange={(value) => handleFieldChange('networkRole', value)}

// NEW: Dual field for compatibility
onChange={(value) => {
    handleFieldChange('category', value);
    handleFieldChange('networkRole', value);
}}
```

### Both Topology Views
```javascript
// NEW: White icons on colored backgrounds for visibility
root.render(React.createElement(iconComponent, { 
    size: iconSize,
    style: { color: 'white' } // White icons for visibility
}));
```

## Result
✅ **Device type dropdown and topology maps now use identical colors and icons**  
✅ **Icons are now visible with white color on colored backgrounds**  
✅ **Both Hierarchical and Circular views show proper device type icons**  
✅ **Maintains backward compatibility with existing data**  
✅ **Vendor-based device detection improved**  
✅ **Consistent visual representation across all views**

## Files Modified
- `src/app/networkscan/networkviews/NetworkViewUtils.js`
- `src/app/components/UnifiedDeviceModal.js`
- `src/app/networkscan/networkviews/HierarchicalNetworkView.js`
- `src/app/networkscan/networkviews/CircularNetworkView.js`

## No Functional Changes
- All existing functionality preserved
- Only visual consistency improved
- No breaking changes to data storage or retrieval
