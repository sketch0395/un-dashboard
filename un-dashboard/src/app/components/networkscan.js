"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import * as d3 from "d3";

export default function NetworkScanner() {
    const [devices, setDevices] = useState([]);
    const [status, setStatus] = useState("Idle");
    const [currentScanIP, setCurrentScanIP] = useState(null);
    const [scanOutput, setScanOutput] = useState("");
    const [ipRange, setIpRange] = useState("10.5.1.130-255");
    const [selectedDevice, setSelectedDevice] = useState(null);

    const svgRef = useRef(null);
    const socketRef = useRef(null);
    const zoomRef = useRef(d3.zoom());
    const containerRef = useRef(null);
    const simulationRef = useRef(null);

    const groupedByVendor = devices.reduce((acc, device) => {
        const vendor = device.vendor || "Unknown";
        if (!acc[vendor]) acc[vendor] = [];
        acc[vendor].push(device);
        return acc;
    }, {});

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
        });

        return () => socket.disconnect();
    }, []);

    useEffect(() => {
        if (devices.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        const container = svg.append("g");
        containerRef.current = container;

        const simulation = d3.forceSimulation(devices)
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(60));
        simulationRef.current = simulation;

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

        svg.call(
            zoomRef.current.on("zoom", (event) => {
                container.attr("transform", event.transform);
            })
        );

        return () => simulation.stop();
    }, [devices, currentScanIP]);

    const startScan = () => {
        setDevices([]);
        setStatus("Starting scan...");
        setScanOutput("");
        socketRef.current.emit("startNetworkScan", { range: ipRange });
    };

    const centerOnIP = (ip) => {
        const node = devices.find((d) => d.ip === ip);
        if (!node || !containerRef.current || !svgRef.current) return;

        const { clientWidth: width, clientHeight: height } = svgRef.current;
        const transform = d3.zoomIdentity.translate(width / 2 - node.x, height / 2 - node.y).scale(1.5);

        d3.select(svgRef.current)
            .transition()
            .duration(500)
            .call(zoomRef.current.transform, transform);
    };

    return (
        <div className="p-4 bg-gray-900 text-white h-full flex">
            {/* Sidebar */}
            <div className="w-64 mr-4">
                <h2 className="text-lg font-bold mb-2">Devices by Vendor</h2>
                {Object.entries(groupedByVendor).map(([vendor, devs]) => (
                    <div key={vendor} className="mb-4">
                        <h3 className="font-semibold text-sm text-gray-300">{vendor}</h3>
                        <ul className="ml-2">
                            {devs.map((dev) => (
                                <li
                                    key={dev.ip}
                                    onClick={() => centerOnIP(dev.ip)}
                                    className={`cursor-pointer text-sm hover:underline ${
                                        dev.status === "up" ? "text-green-400" : "text-red-400"
                                    }`}
                                >
                                    {dev.ip}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Main panel */}
            <div className="flex-1">
                <h2 className="text-xl font-bold mb-4">Network Scanner</h2>

                <div className="mb-4 flex gap-2">
                    <input
                        type="text"
                        value={ipRange}
                        onChange={(e) => setIpRange(e.target.value)}
                        placeholder="IP Range (e.g., 192.168.1.1-255)"
                        className="px-3 py-2 rounded bg-gray-700 text-white w-64"
                    />
                    <button
                        onClick={startScan}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                    >
                        Start Scan
                    </button>
                    <div className="text-sm text-gray-400 ml-4">
                        {status}
                    </div>
                </div>

                {currentScanIP && (
                    <div className="mb-2 text-yellow-400 text-sm">
                        Currently scanning: <span className="font-mono">{currentScanIP}</span>
                    </div>
                )}

                <div className="h-[600px] bg-gray-800 rounded-lg overflow-hidden relative">
                    <svg ref={svgRef} className="w-full h-full" />
                </div>
            </div>

            {/* Device Info Modal */}
            {selectedDevice && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg max-w-lg w-full">
                        <h3 className="text-lg font-bold mb-4 text-white">
                            Device Info: {selectedDevice.ip}
                        </h3>
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap max-h-[400px] overflow-auto">
                            {JSON.stringify(selectedDevice, null, 2)}
                        </pre>
                        <div className="text-right mt-4">
                            <button
                                onClick={() => setSelectedDevice(null)}
                                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
