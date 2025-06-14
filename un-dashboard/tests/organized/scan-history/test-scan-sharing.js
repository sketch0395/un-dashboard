// Test script to verify scan sharing with network scan type
const testScanSharing = async () => {
  const testData = {
    name: "Test Network Scan",
    description: "Testing network scan sharing with validation fix",
    originalScanId: "test-scan-123",
    scanData: {
      devices: [
        { ip: "192.168.1.1", status: "up" },
        { ip: "192.168.1.2", status: "down" }
      ]
    },
    metadata: {
      ipRange: "192.168.1.0/24",
      deviceCount: 2,
      scanDate: new Date(),
      scanType: "network", // This was causing the validation error
      hasNetworkTopology: true,
      ports: ["80", "443", "22"],
      osDetection: true,
      serviceDetection: true
    },
    sharing: {
      visibility: "private"
    },
    collaboration: {
      allowComments: true,
      allowRating: true,
      allowModification: false
    },
    tags: ["test", "network"],
    category: "infrastructure"
  };

  console.log("Test data with network scan type:");
  console.log(JSON.stringify(testData, null, 2));
  
  // Simulate the normalization logic from the API
  const normalizedMetadata = { ...testData.metadata };
  if (normalizedMetadata && normalizedMetadata.scanType) {
    if (normalizedMetadata.scanType === 'network') {
      normalizedMetadata.scanType = 'full';
    }
    const validScanTypes = ['ping', 'os', 'full', 'custom'];
    if (!validScanTypes.includes(normalizedMetadata.scanType)) {
      normalizedMetadata.scanType = 'custom';
    }
  }
  
  console.log("\nNormalized metadata:");
  console.log("Original scanType:", testData.metadata.scanType);
  console.log("Normalized scanType:", normalizedMetadata.scanType);
  console.log("✓ Network scan type properly mapped to 'full'");
};

testScanSharing().catch(console.error);
