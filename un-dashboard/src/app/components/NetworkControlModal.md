# NetworkControlModal Integration Guide

## Overview
The `NetworkControlModal` is a reusable modal component that provides network scanning functionality across multiple pages in your application. It's based on the original `DashboardNetworkScanControl` but designed to be more flexible and reusable.

## Quick Start

### 1. Import the Required Components
```javascript
import NetworkControlModal from "./components/NetworkControlModal";
import { useNetworkControlModal } from "./components/useNetworkControlModal";
```

### 2. Basic Implementation
```javascript
export default function YourPage() {
    const {
        isModalVisible,
        devices,
        customNames,
        openModal,
        closeModal,
        handleScanComplete,
        handleDevicesUpdate,
        handleCustomNamesUpdate,
    } = useNetworkControlModal();

    return (
        <div>
            {/* Your page content */}
            <button onClick={openModal}>
                Open Network Control
            </button>

            {/* Modal */}
            <NetworkControlModal
                isVisible={isModalVisible}
                onClose={closeModal}
                onScanComplete={handleScanComplete}
                onDevicesUpdate={handleDevicesUpdate}
                onCustomNamesUpdate={handleCustomNamesUpdate}
            />
        </div>
    );
}
```

## Props Configuration

### NetworkControlModal Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isVisible` | boolean | required | Controls modal visibility |
| `onClose` | function | required | Called when modal is closed |
| `onScanComplete` | function | optional | Called when scan completes |
| `onDevicesUpdate` | function | optional | Called when devices are updated |
| `onCustomNamesUpdate` | function | optional | Called when custom names are updated |
| `title` | string | "Network Control Center" | Modal title |
| `allowFullscreen` | boolean | true | Enable fullscreen toggle |
| `showExportImport` | boolean | true | Show export/import functionality |
| `showHistory` | boolean | true | Show scan history |
| `showRawDataInspector` | boolean | true | Show raw data inspector |
| `defaultIpRange` | string | "10.5.1.1-255" | Default IP range |
| `currentState` | object | {} | Current application state |

## Features

### ✅ Network Scanning
- **Ping Scan**: Fast discovery of active devices
- **OS Detection**: Deep analysis with operating system identification
- **Docker Integration**: Optional Docker-based scanning for better results

### ✅ Real-time Updates
- **Socket.IO Connection**: Real-time communication with scanning server
- **Live Status Updates**: Progress tracking and error handling
- **Automatic Reconnection**: Robust connection management

### ✅ Data Management
- **Export/Import**: Save and load scan data
- **Scan History**: Access previous scan results
- **Custom Device Names**: Manage device aliases

### ✅ User Interface
- **Responsive Design**: Works on all screen sizes
- **Fullscreen Mode**: Expand modal to full screen
- **Advanced Options**: Configurable scanning parameters
- **Raw Data Inspector**: Debug and analyze scan data

## Usage Examples

### Example 1: Device Management Page
```javascript
// In your device management page
const networkModal = useNetworkControlModal();

const handleDeviceRefresh = () => {
    networkModal.openModal();
    // Automatically start a scan when modal opens
};

return (
    <div>
        <button onClick={handleDeviceRefresh}>
            Refresh Device List
        </button>
        
        <NetworkControlModal
            {...networkModal}
            title="Device Discovery"
            showHistory={false} // Hide history for this use case
        />
    </div>
);
```

### Example 2: Network Dashboard
```javascript
// In your network dashboard
const networkModal = useNetworkControlModal();

return (
    <div>
        <NetworkTopology devices={networkModal.devices} />
        
        <button onClick={networkModal.openModal}>
            Advanced Network Tools
        </button>
        
        <NetworkControlModal
            {...networkModal}
            title="Network Dashboard Control"
            allowFullscreen={true}
            showRawDataInspector={true}
        />
    </div>
);
```

### Example 3: Minimal Integration
```javascript
// For pages that just need basic scanning
const networkModal = useNetworkControlModal();

return (
    <div>
        <NetworkControlModal
            {...networkModal}
            title="Quick Network Scan"
            showExportImport={false}
            showHistory={false}
            showRawDataInspector={false}
        />
    </div>
);
```

## Customization Options

### Custom IP Ranges
```javascript
<NetworkControlModal
    defaultIpRange="192.168.1.1-255"
    // ... other props
/>
```

### Custom Callbacks
```javascript
const handleCustomScanComplete = (results) => {
    console.log("Scan completed with", results.length, "devices");
    // Custom logic here
    updatePageState(results);
};

<NetworkControlModal
    onScanComplete={handleCustomScanComplete}
    // ... other props
/>
```

### Feature Toggles
```javascript
<NetworkControlModal
    showExportImport={false}     // Hide export/import
    showHistory={false}          // Hide scan history
    showRawDataInspector={false} // Hide debug tools
    allowFullscreen={false}      // Disable fullscreen
    // ... other props
/>
```

## Integration with Existing Pages

### Updating Existing Components
1. Replace direct `DashboardNetworkScanControl` usage with the modal
2. Use the `useNetworkControlModal` hook for state management
3. Add trigger buttons/actions where needed
4. Configure the modal props based on page requirements

### Migration from DashboardNetworkScanControl
The modal maintains the same core functionality as the original component but provides:
- Better separation of concerns
- Reusable across multiple pages
- Configurable feature set
- Improved user experience with fullscreen support

## Socket.IO Server Requirements
The modal requires a Socket.IO server running on port 4000 with the following events:
- `startNetworkScan`: Initiate network scanning
- `networkScanStatus`: Receive scan progress updates
- `networkData`: Receive scan results
- `saveToScanHistory`: Handle scan history saving

Ensure your server implements these event handlers for full functionality.

## Troubleshooting

### Common Issues
1. **Socket Connection Errors**: Ensure the scanning server is running on the correct port
2. **Import Path Issues**: Adjust import paths based on your file structure
3. **Missing Dependencies**: Ensure all required React icons and Socket.IO client are installed

### Debug Mode
Enable the Raw Data Inspector to see exactly what data is being sent and received:
```javascript
<NetworkControlModal
    showRawDataInspector={true}
    // ... other props
/>
```
