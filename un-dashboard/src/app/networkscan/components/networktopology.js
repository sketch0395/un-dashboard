import { forwardRef } from 'react';
import NetworkViewManager from '../networkviews/NetworkViewManager'; // Direct import

// determineDeviceRoles has been moved to deviceManagementUtils.js

// Wrap component with forwardRef to expose refresh method
const TopologyMap = forwardRef(({ devices, vendorColors, customNames, setCustomNames, openSSHModal, setModalDevice }, ref) => {
    // Simply pass through props to the NetworkViewManager component
    // which now handles all visualization logic and UI controls
    return (
        <div className="w-full h-full">
            <NetworkViewManager 
                ref={ref}
                devices={devices} 
                vendorColors={vendorColors} 
                customNames={customNames}
                setCustomNames={setCustomNames}
                openSSHModal={openSSHModal}
                setModalDevice={setModalDevice}
            />
        </div>
    );
});

TopologyMap.displayName = 'TopologyMap';

export default TopologyMap;
