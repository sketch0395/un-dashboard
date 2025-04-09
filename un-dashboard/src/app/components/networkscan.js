"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import * as d3 from "d3";
import {
    Laptop,
    Smartphone,
    Server,
    Monitor,
    HelpCircle,
    ChevronDown,
    ChevronUp
} from "lucide-react";

export default function NetworkScanner() {
    const [devices, setDevices] = useState([]);
    const [status, setStatus] = useState("Idle");
    const [currentScanIP, setCurrentScanIP] = useState(null);
    const [scanOutput, setScanOutput] = useState("");
    const [ipRange, setIpRange] = useState("10.5.1.130-255");
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [deviceHistory, setDeviceHistory] = useState([]);
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [expandedIPs, setExpandedIPs] = useState({});
    const svgRef = useRef(null);
    const socketRef = useRef(null);
    const zoomRef = useRef(d3.zoom());

    useEffect(() => {
        const socket = io("http://localhost:4000");
        socketRef.current = socket;

        socket.on("networkScanStatus", (data) => {
            setStatus(data.status);
            if (data.output) {
                setScanOutput((prev) => prev + data.output);
                const match = data.output.match(/Nmap scan report for ([\d.]+)/);
                if (match) setCurrentScanIP(match[1]);
            }
        });

        socket.on("networkData", (data) => {
            setDevices(data);
            setStatus("Scan complete");
            setCurrentScanIP(null);
            updateDeviceHistory(data);
        });

        return () => socket.disconnect();
    }, []);

    const updateDeviceHistory = (newDevices) => {
        const updated = [...deviceHistory];
        newDevices.forEach((device) => {
            if (!updated.find((d) => d.ip === device.ip)) {
                updated.push(device);
            }
        });
        setDeviceHistory(updated);
    };

    useEffect(() => {
        if (devices.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        const simulation = d3.forceSimulation(devices)
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(60));

        const container = svg.append("g");

        const nodes = container.selectAll("g")
            .data(devices)
            .enter()
            .append("g")
            .attr("class", "node")
            .on("click", (event, d) => setSelectedDevice(d));

        nodes.append("circle")
            .attr("r", 30)
            .attr("fill", (d) =>
                d.ip === currentScanIP ? "#facc15" : d.status === "up" ? "#22c55e" : "#ef4444"
            )
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

        nodes.append("text")
            .attr("text-anchor", "middle")
            .attr("y", 5)
            .attr("fill", "#fff")
            .text((d) => d.ip);

        simulation.on("tick", () => {
            nodes.attr("transform", (d) => `translate(${d.x},${d.y})`);
        });

        svg.call(zoomRef.current.on("zoom", (event) => {
            container.attr("transform", event.transform);
        }));

        return () => simulation.stop();
    }, [devices, currentScanIP]);

    const getDeviceIcon = (device) => {
        const label = device.vendor?.toLowerCase() || "";

        if (label.includes("apple") || label.includes("samsung")) return <Smartphone className="w-4 h-4 inline" />;
        if (label.includes("cisco") || label.includes("router")) return <Monitor className="w-4 h-4 inline" />;
        if (label.includes("pc") || label.includes("windows") || label.includes("intel")) return <Laptop className="w-4 h-4 inline" />;
        if (label.includes("server") || label.includes("nas")) return <Server className="w-4 h-4 inline" />;
        return <HelpCircle className="w-4 h-4 inline" />;
    };

    const startScan = () => {
        setDevices([]);
        setStatus("Starting scan...");
        setScanOutput("");
        socketRef.current.emit("startNetworkScan", { range: ipRange });
    };

    const toggleExpand = (ip) => {
        setExpandedIPs((prev) => ({ ...prev, [ip]: !prev[ip] }));
    };

    return (
        <div className="flex bg-gray-900 text-white h-screen">
            {/* Left Panel - Accordion IP List */}
            <div className="w-[350px] bg-gray-800 p-4 overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Network Devices</h2>
                <input
                    type="text"
                    value={ipRange}
                    onChange={(e) => setIpRange(e.target.value)}
                    placeholder="IP Range (e.g., 192.168.1.1-255)"
                    className="px-3 py-2 mb-2 rounded bg-gray-700 text-white w-full"
                />
                <button onClick={startScan} className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mb-4">
                    Start Scan
                </button>
                <div className="text-sm text-gray-400 mb-4">
                    {status} {currentScanIP && `: ${currentScanIP}`}
                </div>

                {/* Current Devices */}
                {[...devices].sort((a, b) => a.ip.localeCompare(b.ip)).map((device, idx) => (
                    <div key={idx} className="mb-2">
                        <button
                            onClick={() => toggleExpand(device.ip)}
                            className="w-full flex justify-between items-center bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded"
                        >
                            <span>{getDeviceIcon(device)} {device.ip}</span>
                            {expandedIPs[device.ip] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {expandedIPs[device.ip] && (
                            <div className="bg-gray-800 px-3 py-2 text-sm whitespace-pre-wrap text-gray-300 rounded-b">
                                {JSON.stringify(device, null, 2)}
                            </div>
                        )}
                    </div>
                ))}

                {/* Toggle History */}
                <button
                    onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                    className="text-sm text-blue-400 hover:underline my-4 block"
                >
                    {isHistoryVisible ? "Hide History" : "Show History"}
                </button>

                {/* Device History */}
                {isHistoryVisible && deviceHistory.map((device, idx) => (
                    <div key={idx} className="mb-2">
                        <button
                            onClick={() => toggleExpand(device.ip)}
                            className="w-full flex justify-between items-center bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded"
                        >
                            <span>{getDeviceIcon(device)} {device.ip}</span>
                            {expandedIPs[device.ip] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {expandedIPs[device.ip] && (
                            <div className="bg-gray-800 px-3 py-2 text-sm whitespace-pre-wrap text-gray-300 rounded-b">
                                {JSON.stringify(device, null, 2)}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Right Panel - Topology SVG */}
            <div className="flex-1 p-4">
                <div className="h-full w-full bg-gray-800 rounded-lg overflow-hidden">
                    <svg ref={svgRef} className="w-full h-full" />
                </div>
            </div>

            {/* Modal */}
            {selectedDevice && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg max-w-lg w-full">
                        <h3 className="text-lg font-bold mb-4 text-white">Device Info: {selectedDevice.ip}</h3>
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap max-h-[400px] overflow-auto">
                            {JSON.stringify(selectedDevice, null, 2)}
                        </pre>
                        <div className="text-right mt-4">
                            <button onClick={() => setSelectedDevice(null)} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
