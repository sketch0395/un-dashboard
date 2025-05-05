"use client";

import { useState, useEffect } from "react";
import NetworkPerfControl from "../components/networkperfcontrol";
import NetworkPerformanceDisplay from "../components/networkperformance";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export default function NetworkPerformancePage() {
    const [devices, setDevices] = useState([]);
    const [activeTab, setActiveTab] = useState('latency'); // 'latency', 'bandwidth', or 'uptime'
    const [controlsMinimized, setControlsMinimized] = useState(false);
    const [performanceData, setPerformanceData] = useState({
        latency: [],
        bandwidth: [],
        uptime: [],
        quality: [],
        pathAnalysis: []
    });

    useEffect(() => {
        // Load devices from localStorage if available
        const loadDevices = async () => {
            try {
                // First try to load from API
                const response = await fetch('/api/system-info');
                const systemInfo = await response.json();
                
                if (systemInfo?.devices?.length > 0) {
                    setDevices(systemInfo.devices);
                    return;
                }
                
                // If no devices from API, try localStorage
                const savedHistory = localStorage.getItem("scanHistory");
                if (savedHistory) {
                    const history = JSON.parse(savedHistory);
                    if (history.length > 0) {
                        const latestScan = history[history.length - 1];
                        if (latestScan?.data) {
                            const devicesList = Object.values(latestScan.data).flat();
                            setDevices(devicesList);
                            return;
                        }
                    }
                }
                
                // Default empty array if no devices found
                setDevices([]);
            } catch (error) {
                console.error("Error loading devices:", error);
                setDevices([]);
            }
        };
        
        loadDevices();
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-gray-950 text-white">
            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel - Network Performance Controls */}
                <div 
                    className={`bg-gray-800 panel-transition flex flex-col ${controlsMinimized ? 'w-12' : 'w-[350px]'}`}
                >
                    <div className="flex justify-between items-center p-4">
                        {!controlsMinimized && <h2 className="text-lg font-semibold">Controls</h2>}
                        <button 
                            className={`bg-gray-700 p-2 rounded-full hover:bg-gray-600 ${controlsMinimized ? 'mx-auto' : ''}`}
                            onClick={() => setControlsMinimized(!controlsMinimized)}
                            title={controlsMinimized ? "Expand controls" : "Minimize controls"}
                        >
                            {controlsMinimized ? <FaChevronRight /> : <FaChevronLeft />}
                        </button>
                    </div>
                    
                    {!controlsMinimized && (
                        <div className="flex-1 overflow-y-auto p-4 pt-0">
                            <NetworkPerfControl 
                                setPerformanceData={setPerformanceData} 
                                devices={devices} 
                            />
                        </div>
                    )}
                </div>
                
                {/* Right Panel - Network Performance Display */}
                <div className="flex-1 p-4 overflow-auto">
                    <NetworkPerformanceDisplay 
                        devices={devices}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        performanceData={performanceData}
                    />
                </div>
            </div>
        </div>
    );
}