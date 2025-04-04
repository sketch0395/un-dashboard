"use client";

import { useEffect, useState } from 'react';
import io from 'socket.io-client'; // Make sure you install socket.io-client

// Initialize the socket connection
let socket;

const NetworkMap = () => {
    const [networkData, setNetworkData] = useState([]);
    const [scanStatus, setScanStatus] = useState('Idle');
    
    // Set up the socket connection
    useEffect(() => {
        socket = io('http://localhost:5001'); // Adjust this URL if needed for your server

        // Listen for network scan status updates
        socket.on('networkScanStatus', (data) => {
            setScanStatus(data.status);
            if (data.progress) {
                console.log('Scan Progress:', data.progress);
            }
            if (data.error) {
                console.error('Error:', data.error);
            }
        });

        // Listen for the network data after the scan is completed
        socket.on('networkData', (data) => {
            setNetworkData(data);
        });

        // Clean up the socket connection on component unmount
        return () => {
            socket.disconnect();
        };
    }, []);

    // Start network scan
    const startNetworkScan = () => {
        if (socket) {
            socket.emit('startNetworkScan');
        }
    };

    return (
        <div className="network-map-container">
            <h1>Network Map</h1>
            <button onClick={startNetworkScan} className="start-scan-btn">
                Start Network Scan
            </button>
            <p>Status: {scanStatus}</p>

            <div className="network-data">
                <h3>Discovered Devices</h3>
                <ul>
                    {networkData.map((device, index) => (
                        <li key={index}>IP: {device.ip}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default NetworkMap;
