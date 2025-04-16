"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function NetworkMap({ devices, onClearHistory }) {
    const svgRef = useRef();
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [editingDevice, setEditingDevice] = useState(null);
    const [customNames, setCustomNames] = useState({}); // Store custom names for devices
    const [vendorColors, setVendorColors] = useState({}); // Store custom colors for vendors
    const [isVendorColorModalOpen, setIsVendorColorModalOpen] = useState(false); // Modal state
    const [useDocker, setUseDocker] = useState(false);
    const [scanHistory, setScanHistory] = useState([]); // Store history of scans
    const [contextMenu, setContextMenu] = useState(null); // Context menu state

    useEffect(() => {
        if (!devices || Object.keys(devices).length === 0) return;

        // Merge new devices into scan history
        setScanHistory((prevHistory) => {
            const flattenedDevices = Object.values(devices).flat();
            const existingIPs = new Set(prevHistory.map((device) => device.ip));
            const newDevices = flattenedDevices.filter((device) => !existingIPs.has(device.ip));
            return [...prevHistory, ...newDevices];
        });
    }, [devices]);

    useEffect(() => {
        const width = svgRef.current.clientWidth || 1000;
        const height = svgRef.current.clientHeight || 600;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous content

        const zoomLayer = svg.append("g");

        const zoomBehavior = d3.zoom()
            .scaleExtent([0.5, 2]) // Limit zoom scale
            .on("zoom", (event) => {
                zoomLayer.attr("transform", event.transform);
            });

        svg.call(zoomBehavior);

        // Create nodes
        const nodes = scanHistory.map((d, i) => ({
            ...d,
            id: d.ip || `device-${i}`, // Ensure unique id
            vendor: d.vendor || "Unknown",
            ip: d.ip || `Unknown IP ${i}`,
            x: d.x || Math.random() * width, // Preserve position if available
            y: d.y || Math.random() * height,
            locked: d.locked || false, // Preserve locked state
        }));

        // Create links
        const links = nodes.map((node, i) => ({
            source: node.id, // Use the node's id
            target: nodes[(i + 1) % nodes.length].id, // Link to the next node in the array
        }));

        const simulation = d3.forceSimulation(nodes)
            .force("charge", d3.forceManyBody().strength(-300)) // Increase repulsion
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(50)) // Adjust collision radius
            .force("link", d3.forceLink(links).id((d) => d.id).distance(150)) // Adjust link distance
            .on("tick", ticked);

        // Draw links
        zoomLayer
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("stroke", "#999")
            .attr("stroke-width", 1);

        // Draw nodes
        const node = zoomLayer
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("r", 25)
            .attr("fill", (d) => getNodeColor(d))
            .attr("stroke", "#1e3a8a")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .call(
                d3.drag()
                    .on("start", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        if (!d.locked) {
                            d.fx = d.x;
                            d.fy = d.y;
                        }
                    })
                    .on("drag", (event, d) => {
                        if (!d.locked) {
                            d.fx = event.x;
                            d.fy = event.y;
                        }
                    })
                    .on("end", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        if (!d.locked) {
                            d.fx = null;
                            d.fy = null;
                        }
                    })
            )
            .on("contextmenu", (event, d) => {
                event.preventDefault();
                setContextMenu({
                    x: event.pageX,
                    y: event.pageY,
                    device: d,
                });
            });

        // Add labels
        const label = zoomLayer
            .selectAll("text")
            .data(nodes)
            .enter()
            .append("text")
            .attr("text-anchor", "middle")
            .attr("dy", 40)
            .attr("fill", "white")
            .style("font-size", "12px")
            .text((d) => customNames[d.id] || d.ip) // Use custom name if available
            .on("click", (_, d) => {
                setEditingDevice(d);
            });

        function ticked() {
            zoomLayer
                .selectAll("line")
                .attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y);

            node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
            label.attr("x", (d) => d.x).attr("y", (d) => d.y);
        }

        return () => simulation.stop();
    }, [scanHistory, customNames, vendorColors]);

    const getNodeColor = (device) => {
        const vendor = device.vendor?.toLowerCase() || "unknown";
        return vendorColors[vendor] || "#6b7280"; // Default gray
    };

    const handleContextMenuAction = (action, device) => {
        if (action === "lock") {
            setScanHistory((prev) =>
                prev.map((d) => (d.id === device.id ? { ...d, locked: !d.locked } : d))
            );
        } else if (action === "changeColor") {
            const newColor = prompt("Enter a new color (hex or name):", "#6b7280");
            if (newColor) {
                setVendorColors((prev) => ({
                    ...prev,
                    [device.vendor.toLowerCase()]: newColor,
                }));
            }
        } else if (action === "changeName") {
            const newName = prompt("Enter a new name:", device.ip);
            if (newName) {
                setCustomNames((prev) => ({
                    ...prev,
                    [device.id]: newName,
                }));
            }
        }
        setContextMenu(null);
    };

    const startScan = () => {
        socket.emit('startNetworkScan', { range: ipRange, useDocker });
    };

    return (
        <div className="relative w-full h-full bg-gray-900 rounded-lg shadow-lg overflow-hidden">
            <svg ref={svgRef} width="100%" height="100%" className="select-none" />

            {contextMenu && (
                <div
                    className="absolute bg-gray-800 text-white p-2 rounded shadow-lg"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                        onClick={() => handleContextMenuAction("lock", contextMenu.device)}
                    >
                        {contextMenu.device.locked ? "Unlock Node" : "Lock Node"}
                    </button>
                    <button
                        className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                        onClick={() => handleContextMenuAction("changeColor", contextMenu.device)}
                    >
                        Change Vendor Color
                    </button>
                    <button
                        className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                        onClick={() => handleContextMenuAction("changeName", contextMenu.device)}
                    >
                        Change Name
                    </button>
                </div>
            )}

            {isVendorColorModalOpen && (
                <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-80 flex items-center justify-center z-50">
                    <div className="bg-white text-black p-6 rounded-lg w-3/4 h-3/4 shadow-xl overflow-y-auto">
                        <h2 className="text-lg font-bold mb-4">Edit Vendor Colors</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.keys(devices).map((vendor) => (
                                <div key={vendor} className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700">
                                        {vendor}
                                    </label>
                                    <input
                                        type="color"
                                        value={vendorColors[vendor.toLowerCase()] || "#6b7280"}
                                        onChange={(e) => handleVendorColorChange(vendor, e.target.value)}
                                        className="w-16 h-8 border rounded"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="text-right mt-4">
                            <button
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mr-2"
                                onClick={() => setIsVendorColorModalOpen(false)}
                            >
                                Close
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                onClick={() => setIsVendorColorModalOpen(false)}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedDevice && (
                <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-80 flex items-center justify-center z-50">
                    <div className="bg-white text-black p-6 rounded-lg max-w-xl w-full shadow-xl overflow-y-auto max-h-[80%]">
                        <h2 className="text-lg font-bold mb-2">Device Info</h2>
                        <pre className="text-sm whitespace-pre-wrap break-words">
                            {JSON.stringify(selectedDevice, null, 2)}
                        </pre>
                        <div className="text-right mt-4">
                            <button
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                onClick={() => setSelectedDevice(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingDevice && (
                <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-80 flex items-center justify-center z-50">
                    <div className="bg-white text-black p-6 rounded-lg max-w-xl w-full shadow-xl">
                        <h2 className="text-lg font-bold mb-2">Edit Device Name</h2>
                        <input
                            type="text"
                            value={customNames[editingDevice.id] || ""}
                            onChange={(e) => setCustomNames((prev) => ({
                                ...prev,
                                [editingDevice.id]: e.target.value,
                            }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                        <div className="text-right mt-4">
                            <button
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                onClick={() => setEditingDevice(null)}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Pane Buttons */}
            <div className="absolute top-16 left-4 bg-gray-800 p-4 rounded shadow">
                <button
                    className="w-full px-4 py-2 mb-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => setIsVendorColorModalOpen(true)}
                >
                    Edit Vendor Colors
                </button>
                <button
                    className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    onClick={onClearHistory}
                >
                    Clear Device History
                </button>
                <label className="block text-white mt-4">
                    <input
                        type="checkbox"
                        checked={useDocker}
                        onChange={(e) => setUseDocker(e.target.checked)}
                        className="mr-2"
                    />
                    Use Docker for Nmap
                </label>
                <button
                    className="w-full px-4 py-2 mt-2 bg-green-600 text-white rounded hover:bg-green-700"
                    onClick={startScan}
                >
                    Start Scan
                </button>
            </div>
        </div>
    );
}
