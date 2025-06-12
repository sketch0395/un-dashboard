// Shared device types configuration for consistency across all modals
import { 
  FaServer,
  FaDatabase,
  FaNetworkWired,
  FaShieldAlt,
  FaMicrochip,
  FaDesktop,
  FaMobile,
  FaPrint,
  FaCamera,
  FaRoad,
  FaWifi,
  FaPlug
} from "react-icons/fa";

export const DEVICE_TYPES = [
  // Network Infrastructure
  { 
    id: "gateway",
    name: "Gateway", 
    icon: FaRoad, 
    color: "#3b82f6",
    category: "network",
    description: "Primary network gateway or router",
    canHaveParent: false,
    canBeParent: true,
    connectionTypes: ["switch", "router"]
  },
  { 
    id: "router",
    name: "Router", 
    icon: FaNetworkWired, 
    color: "#8b5cf6",
    category: "network",
    description: "Network router for traffic routing",
    canHaveParent: true,
    canBeParent: true,
    connectionTypes: ["gateway", "switch"]
  },
  { 
    id: "switch",
    name: "Switch", 
    icon: FaPlug, 
    color: "#06b6d4",
    category: "network",
    description: "Network switch for device connectivity",
    canHaveParent: true,
    canBeParent: true,
    connectionTypes: ["gateway", "router", "switch"]
  },
  { 
    id: "access_point",
    name: "Access Point", 
    icon: FaWifi, 
    color: "#10b981",
    category: "network",
    description: "Wireless access point",
    canHaveParent: true,
    canBeParent: false,
    connectionTypes: ["switch", "router"]
  },
  
  // Servers
  { 
    id: "production_server",
    name: "Production Server", 
    icon: FaServer, 
    color: "#10b981",
    category: "server",
    description: "Production server or critical service",
    canHaveParent: true,
    canBeParent: false,
    connectionTypes: ["switch"]
  },
  { 
    id: "development_server",
    name: "Development Server", 
    icon: FaServer, 
    color: "#f59e0b",
    category: "server",
    description: "Development or testing server",
    canHaveParent: true,
    canBeParent: false,
    connectionTypes: ["switch"]
  },
  { 
    id: "database_server",
    name: "Database Server", 
    icon: FaDatabase, 
    color: "#ef4444",
    category: "server",
    description: "Database server",
    canHaveParent: true,
    canBeParent: false,
    connectionTypes: ["switch"]
  },
  
  // Security
  { 
    id: "firewall",
    name: "Firewall", 
    icon: FaShieldAlt, 
    color: "#dc2626",
    category: "security",
    description: "Network firewall or security appliance",
    canHaveParent: true,
    canBeParent: true,
    connectionTypes: ["gateway", "switch"]
  },
  
  // End Devices
  { 
    id: "workstation",
    name: "Workstation", 
    icon: FaDesktop, 
    color: "#6366f1",
    category: "endpoint",
    description: "Desktop computer or workstation",
    canHaveParent: true,
    canBeParent: false,
    connectionTypes: ["switch", "access_point"]
  },
  { 
    id: "laptop",
    name: "Laptop", 
    icon: FaDesktop, 
    color: "#8b5cf6",
    category: "endpoint",
    description: "Laptop computer",
    canHaveParent: true,
    canBeParent: false,
    connectionTypes: ["switch", "access_point"]
  },
  { 
    id: "mobile_device",
    name: "Mobile Device", 
    icon: FaMobile, 
    color: "#ec4899",
    category: "endpoint",
    description: "Mobile phone or tablet",
    canHaveParent: true,
    canBeParent: false,
    connectionTypes: ["access_point"]
  },
  { 
    id: "printer",
    name: "Printer", 
    icon: FaPrint, 
    color: "#64748b",
    category: "peripheral",
    description: "Network printer",
    canHaveParent: true,
    canBeParent: false,
    connectionTypes: ["switch", "access_point"]
  },
  { 
    id: "camera",
    name: "IP Camera", 
    icon: FaCamera, 
    color: "#0891b2",
    category: "security",
    description: "IP security camera",
    canHaveParent: true,
    canBeParent: false,
    connectionTypes: ["switch", "access_point"]
  },
  { 
    id: "iot_device",
    name: "IoT Device", 
    icon: FaMicrochip, 
    color: "#059669",
    category: "iot",
    description: "Internet of Things device",
    canHaveParent: true,
    canBeParent: false,
    connectionTypes: ["switch", "access_point"]
  },
  { 
    id: "other",
    name: "Other", 
    icon: FaMicrochip, 
    color: "#9ca3af",
    category: "other",
    description: "Other network device",
    canHaveParent: true,
    canBeParent: false,
    connectionTypes: ["switch", "access_point"]
  }
];

// Helper functions
export const getDeviceTypeById = (id) => {
  return DEVICE_TYPES.find(type => type.id === id) || DEVICE_TYPES[DEVICE_TYPES.length - 1];
};

export const getDeviceTypeByName = (name) => {
  // Handle legacy names and variations
  const nameMap = {
    "Production Server": "production_server",
    "Development Server": "development_server", 
    "Database Server": "database_server",
    "Gateway": "gateway",
    "Router": "router",
    "Switch": "switch",
    "Firewall": "firewall",
    "Workstation": "workstation",
    "Mobile Device": "mobile_device",
    "IP Camera": "camera",
    "IoT Device": "iot_device",
    "Access Point": "access_point",
    "Laptop": "laptop",
    "Printer": "printer",
    "Other": "other",
    // Legacy compatibility
    "server": "production_server",
    "switch": "switch",
    "router": "router",
    "gateway": "gateway",
    "workstation": "workstation",
    "mobile": "mobile_device",
    "printer": "printer",
    "iot": "iot_device"
  };

  const id = nameMap[name] || name;
  return getDeviceTypeById(id);
};

export const getDeviceTypesByCategory = (category) => {
  return DEVICE_TYPES.filter(type => type.category === category);
};

export const getAvailableParentTypes = (deviceTypeId) => {
  const deviceType = getDeviceTypeById(deviceTypeId);
  if (!deviceType || !deviceType.canHaveParent) return [];
  
  return deviceType.connectionTypes.map(getDeviceTypeById);
};

export const canDeviceBeParent = (deviceTypeId) => {
  const deviceType = getDeviceTypeById(deviceTypeId);
  return deviceType ? deviceType.canBeParent : false;
};

export const getDeviceCategories = () => {
  const categories = [...new Set(DEVICE_TYPES.map(type => type.category))];
  return categories.map(category => ({
    id: category,
    name: category.charAt(0).toUpperCase() + category.slice(1),
    types: getDeviceTypesByCategory(category)
  }));
};

// Migration helper for existing data
export const migrateDeviceType = (oldType) => {
  if (!oldType) return null;
  
  // If it's already a valid ID, return it
  if (DEVICE_TYPES.find(type => type.id === oldType)) {
    return oldType;
  }
  
  // Try to find by name
  const deviceType = getDeviceTypeByName(oldType);
  return deviceType.id;
};
