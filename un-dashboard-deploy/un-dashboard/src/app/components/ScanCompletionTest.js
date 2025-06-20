"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

export default function ScanCompletionTest() {
    const socketRef = useRef(null);
    const [status, setStatus] = useState("Idle");
    const [isScanning, setIsScanning] = useState(false);
    const [lastScanTime, setLastScanTime] = useState(null);
    const [eventLog, setEventLog] = useState([]);    const logEvent = useCallback((message) => {
        const timestamp = new Date().toLocaleTimeString();
        setEventLog(prev => [...prev, `[${timestamp}] ${message}`]);
        console.log(`[${timestamp}] ${message}`);
    }, []);

    useEffect(() => {
        logEvent(`🔍 isScanning state changed to: ${isScanning}`);
    }, [isScanning, logEvent]);

    useEffect(() => {
        const serverUrl = "http://10.5.1.83:4000";
        logEvent(`Connecting to ${serverUrl}...`);
        
        const socket = io(serverUrl, {
            reconnectionAttempts: 5,
            timeout: 10000,
            transports: ['polling', 'websocket'],
            upgrade: true
        });
        
        socketRef.current = socket;
        
        socket.on('connect', () => {
            logEvent('✅ Connected to server');
        });
        
        socket.on('connect_error', (err) => {
            logEvent(`❌ Connection error: ${err.message}`);
        });
          socket.on("networkScanStatus", (data) => {
            logEvent(`📊 Status: ${data.status}`);
            setStatus(data.status);
            
            // CRITICAL: Test scan completion logic
            if (data.status === "Scan complete") {
                logEvent('🎉 SCAN COMPLETION DETECTED! Setting isScanning = false');
                logEvent(`Previous isScanning state: ${isScanning}`);
                setIsScanning(false);
                setLastScanTime(new Date());
                logEvent(`✅ setIsScanning(false) called - React will update UI on next render`);
            } else if (data.status.includes("in progress") || data.status.includes("Starting")) {
                logEvent('🔄 SCAN IN PROGRESS! Setting isScanning = true');
                logEvent(`Previous isScanning state: ${isScanning}`);
                setIsScanning(true);
                logEvent(`✅ setIsScanning(true) called - React will update UI on next render`);
            }
        });
        
        socket.on("networkData", (data) => {
            logEvent(`📡 networkData received: ${Object.keys(data).length} groups`);
        });
        
        socket.on("saveToScanHistory", (data) => {
            logEvent('💾 saveToScanHistory event received');
        });
        
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    const startScan = () => {
        if (!socketRef.current || !socketRef.current.connected) {
            logEvent('❌ Not connected to server');
            return;
        }
        
        logEvent('🚀 Starting scan...');
        setStatus("Starting scan...");
        setIsScanning(true);
        
        socketRef.current.emit("startNetworkScan", { 
            range: "127.0.0.1", 
            useDocker: true,
            scanType: 'ping'
        });
    };

    const clearLog = () => {
        setEventLog([]);
    };

    return (
        <div className="p-6 bg-gray-900 text-white min-h-screen">
            <h1 className="text-2xl font-bold mb-6">Scan Completion Test</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="bg-gray-800 p-4 rounded">
                        <h2 className="text-lg font-semibold mb-2">Current State</h2>
                        <div className="space-y-2">
                            <div><span className="font-medium">Status:</span> {status}</div>
                            <div><span className="font-medium">Is Scanning:</span> 
                                <span className={isScanning ? "text-red-400" : "text-green-400"}>
                                    {isScanning ? "TRUE" : "FALSE"}
                                </span>
                            </div>
                            <div><span className="font-medium">Last Scan:</span> {lastScanTime ? lastScanTime.toLocaleTimeString() : "Never"}</div>
                        </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                        <h2 className="text-lg font-semibold mb-2">Controls</h2>
                        <div className="space-y-2">
                            <button
                                onClick={startScan}
                                disabled={isScanning}
                                className={`px-4 py-2 rounded transition-colors ${
                                    isScanning 
                                        ? 'bg-gray-600 cursor-not-allowed' 
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {isScanning ? (
                                    <>🔄 Scanning...</>
                                ) : (
                                    <>▶️ Start Scan</>
                                )}
                            </button>
                            <button
                                onClick={clearLog}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors ml-2"
                            >
                                Clear Log
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded">
                        <h2 className="text-lg font-semibold mb-2">Button State Debug</h2>
                        <div className="text-sm text-gray-300">
                            <div>Button disabled: {isScanning ? "YES" : "NO"}</div>
                            <div>Button class: {isScanning ? "bg-gray-600" : "bg-blue-600"}</div>
                            <div>React state isScanning: {JSON.stringify(isScanning)}</div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-lg font-semibold mb-2">Event Log</h2>
                    <div className="bg-black p-3 rounded font-mono text-sm h-96 overflow-y-auto">
                        {eventLog.map((entry, index) => (
                            <div key={index} className="mb-1">{entry}</div>
                        ))}
                        {eventLog.length === 0 && (
                            <div className="text-gray-500">No events yet...</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
