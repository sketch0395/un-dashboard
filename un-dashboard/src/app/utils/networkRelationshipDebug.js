/**
 * Utility functions for debugging network relationships
 */

/**
 * Performs a detailed check of parent-child relationships in the network
 * and logs them to the console for debugging purposes
 */
export const debugNetworkRelationships = () => {
    try {
        const devices = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
        
        console.log("%c========== NETWORK RELATIONSHIP DEBUG ==========", "color: #4CAF50; font-weight: bold;");
        
        // Check all switches
        const switches = Object.entries(devices).filter(([_, props]) => props.networkRole === 'switch');
        console.log(`%cFound ${switches.length} switches`, "color: #2196F3; font-weight: bold;");
        
        switches.forEach(([ip, props]) => {
            const hasParent = props.parentGateway && props.parentGateway !== "";
            console.log(
                `%c${hasParent ? '✓' : '✗'} Switch: ${ip}, Parent Gateway: ${props.parentGateway || 'None'}`,
                hasParent ? "color: #4CAF50;" : "color: #F44336;"
            );
            
            // Check if parent exists
            if (hasParent && !devices[props.parentGateway]) {
                console.log(`%c  ⚠️ WARNING: Parent gateway ${props.parentGateway} does not exist!`, "color: #FF9800; font-weight: bold;");
            }
            else if (hasParent && devices[props.parentGateway]?.networkRole !== 'gateway') {
                console.log(
                    `%c  ⚠️ WARNING: Parent ${props.parentGateway} is not a gateway (role: ${devices[props.parentGateway]?.networkRole})`, 
                    "color: #FF9800; font-weight: bold;"
                );
            }
        });
        
        // Check all gateways
        const gateways = Object.entries(devices).filter(([_, props]) => props.networkRole === 'gateway');
        console.log(`%cFound ${gateways.length} gateways`, "color: #2196F3; font-weight: bold;");
        
        gateways.forEach(([ip, props]) => {
            console.log(`%cGateway: ${ip}, Name: ${props.name || ip}`, "color: #4CAF50;");
            
            // Find all devices that reference this gateway
            const connectedSwitches = Object.entries(devices)
                .filter(([_, p]) => p.parentGateway === ip && p.networkRole === 'switch');
                
            console.log(`  Connected switches: ${connectedSwitches.length}`);
            
            // List connected switches
            connectedSwitches.forEach(([switchIP, switchProps]) => {
                console.log(`  - ${switchIP} (${switchProps.name || 'Unnamed switch'})`);
            });
        });
        
        console.log("%c==============================================", "color: #4CAF50; font-weight: bold;");
    } catch (error) {
        console.error("Debug error:", error);
    }
};

/**
 * Force-fixes the parent gateway relationship for a switch by directly updating localStorage
 * @param {string} switchIP - The IP of the switch to update
 * @param {string} gatewayIP - The IP of the gateway to set as parent
 */
export const fixSwitchParentGateway = (switchIP, gatewayIP) => {
    try {
        const devices = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
        
        if (!devices[switchIP]) {
            console.error(`Switch ${switchIP} not found in device properties`);
            return false;
        }
        
        if (gatewayIP && !devices[gatewayIP]) {
            console.error(`Gateway ${gatewayIP} not found in device properties`);
            return false;
        }
        
        // Update the parent gateway
        devices[switchIP] = {
            ...devices[switchIP],
            parentGateway: gatewayIP
        };
        
        // Save back to localStorage
        localStorage.setItem("customDeviceProperties", JSON.stringify(devices));
        console.log(`%cSuccessfully set parent gateway of ${switchIP} to ${gatewayIP}`, "color: #4CAF50; font-weight: bold;");
        
        return true;
    } catch (error) {
        console.error("Error fixing switch parent gateway:", error);
        return false;
    }
};
