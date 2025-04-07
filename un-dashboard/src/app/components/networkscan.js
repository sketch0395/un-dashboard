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

        // Zoom
        svg.call(zoomRef.current.on("zoom", (event) => {
            container.attr("transform", event.transform);
        }));

        return () => simulation.stop();
    }, [devices, currentScanIP]);

    const startScan = () => {
        setDevices([]);
        setStatus("Starting scan...");
        setScanOutput("");
        socketRef.current.emit("startNetworkScan", { range: ipRange });
    };

    return (
        <div className="p-4 bg-gray-900 text-white h-full">
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
                    {status} {currentScanIP && `: ${currentScanIP}`}
                </div>
            </div>

            <div className="h-[600px] bg-gray-800 rounded-lg overflow-hidden">
                <svg ref={svgRef} className="w-full h-full" />
            </div>

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
