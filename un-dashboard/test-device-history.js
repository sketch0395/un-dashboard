// Test script to add device history entries and test page reload functionality
// This script simulates the device history functionality to verify our fix works

const testDeviceHistory = () => {
    console.log("🧪 Testing Device History Persistence Fix");
    
    // 1. Create test device history data
    const testDeviceIP = "10.5.1.100";
    const testHistory = [
        {
            timestamp: new Date().toISOString(),
            changes: {
                name: "Test Device",
                category: "Server",
                networkRole: "switch"
            }
        },
        {
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
            changes: {
                name: "Old Name",
                status: "online"
            }
        }
    ];
    
    // 2. Get existing customDeviceProperties or create new
    const existingProps = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
    
    // 3. Add test device with history
    existingProps[testDeviceIP] = {
        name: "Test Device",
        category: "Server", 
        networkRole: "switch",
        notes: [],
        history: testHistory
    };
    
    // 4. Save to localStorage
    localStorage.setItem("customDeviceProperties", JSON.stringify(existingProps));
    
    console.log("✅ Test device with history added to localStorage");
    console.log("📊 Device IP:", testDeviceIP);
    console.log("📈 History entries:", testHistory.length);
    console.log("🔍 Verify history persists after page reload...");
    
    return testDeviceIP;
};

const verifyDeviceHistory = (deviceIP) => {
    console.log("🔍 Verifying device history after page reload...");
    
    const storedProps = JSON.parse(localStorage.getItem("customDeviceProperties") || "{}");
    const deviceData = storedProps[deviceIP];
    
    if (deviceData && deviceData.history) {
        console.log("✅ SUCCESS: Device history found in localStorage");
        console.log("📈 History entries:", deviceData.history.length);
        console.log("📝 History data:", deviceData.history);
        return true;
    } else {
        console.log("❌ FAILED: Device history not found or missing");
        return false;
    }
};

// For browser console usage
if (typeof window !== 'undefined') {
    window.testDeviceHistory = testDeviceHistory;
    window.verifyDeviceHistory = verifyDeviceHistory;
    console.log("🧪 Device History Test Functions Available:");
    console.log("   - testDeviceHistory() - Add test device with history");
    console.log("   - verifyDeviceHistory(deviceIP) - Check if history persists");
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testDeviceHistory, verifyDeviceHistory };
}
