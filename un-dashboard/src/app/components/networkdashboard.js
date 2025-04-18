"use client";

import { useState } from "react";
import NetworkScanControl from "./networkscancontrol";
import TopologyMap from "./networktopology";

export default function NetworkDashboard() {
    const [devices, setDevices] = useState({});
    const [vendorColors, setVendorColors] = useState({});
    const [customNames, setCustomNames] = useState({}); // State for custom names

    return (
        <div className="flex bg-gray-900 text-white h-screen w-screen">
            {/* Left Panel */}
            <div className="w-[350px] bg-gray-800 p-4 overflow-y-auto">
                <NetworkScanControl
                    devices={devices}
                    setDevices={setDevices}
                    vendorColors={vendorColors}
                    setVendorColors={setVendorColors}
                    customNames={customNames}
                    setCustomNames={setCustomNames} // Pass setCustomNames as a prop
                />
            </div>

            {/* Right Panel */}
            <div className="flex-1 p-4">
                <div className="h-full w-full bg-gray-800 rounded-lg overflow-hidden">
                    <TopologyMap
                        devices={devices}
                        vendorColors={vendorColors}
                        customNames={customNames}
                    />
                </div>
            </div>
        </div>
    );
}