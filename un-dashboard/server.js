"use client";

import { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:4000");

const NetworkScanner = ({ onScanComplete }) => {
    const [status, setStatus] = useState("Idle");
    const [output, setOutput] = useState("");
    const [ipRange, setIpRange] = useState("10.5.1.130-255");
    const [currentIp, setCurrentIp] = useState("");

    useEffect(() => {
        socket.on("networkScanStatus", (data) => {
            setStatus(data.status || "Unknown status");
            if (data.output) {
                setOutput((prev) => prev + data.output);
            }
        });

        socket.on("currentScanIP", (data) => {
            setCurrentIp(data.ip);
        });

        socket.on("networkData", (devices) => {
            setStatus("Scan complete");
            setCurrentIp("");
            if (onScanComplete) {
                onScanComplete(devices);
            }
        });

        return () => {
            socket.off("networkScanStatus");
            socket.off("currentScanIP");
            socket.off("networkData");
        };
    }, [onScanComplete]);

    const startScan = () => {
        setOutput("");
        setStatus("Starting scan...");
        setCurrentIp("");
        socket.emit("startNetworkScan", { ipRange });
    };

    return (
        <div className="bg-gray-900 text-white p-4 rounded shadow mb-4">
            <div className="mb-2">
                <label className="block text-sm text-gray-300 mb-1">
                    IP Range:
                </label>
                <input
                    type="text"
                    value={ipRange}
                    onChange={(e) => setIpRange(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none"
                    placeholder="e.g. 10.5.1.130-255"
                />
            </div>
            <button
                onClick={startScan}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-2"
            >
                Start Scan
            </button>
            <div className="mt-4">
                <p className="text-yellow-300 text-sm font-medium">
                    {status} {currentIp && `(Currently scanning: ${currentIp})`}
                </p>
            </div>
            {output && (
                <pre className="mt-2 text-xs bg-gray-800 p-2 rounded overflow-x-auto max-h-64">
                    {output}
                </pre>
            )}
        </div>
    );
};

export default NetworkScanner;
