"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import * as d3 from "d3";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function NetworkDashboard() {
    const svgRef = useRef();
    const socketRef = useRef(null);

    const [devices, setDevices] = useState([]); // Grouped by vendor
    const [status, setStatus] = useState("Idle");
    const [currentScanIP, setCurrentScanIP] = useState(null);
    const [scanOutput, setScanOutput] = useState("");
    const [ipRange, setIpRange] = useState("10.5.1.130-255");
    const [scannedSubnets, setScannedSubnets] = useState([]); // Track scanned subnets
    const [deviceHistory, setDeviceHistory] = useState([]);
    const [scanHistory, setScanHistory] = useState([]);
    const [expandedIPs, setExpandedIPs] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [editingDevice, setEditingDevice] = useState(null);
    const [customNames, setCustomNames] = useState({});
    const [vendorColors, setVendorColors] = useState({});
    const [isVendorColorModalOpen, setIsVendorColorModalOpen] = useState(false);
    const [useDocker, setUseDocker] = useState(false);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, node: null });
    const [newDeviceIPs, setNewDeviceIPs] = useState([]); // Track new device IPs
    const [selectedVendor, setSelectedVendor] = useState(null); // Track selected vendor for color change

    const colorPalette = [
        "#FF5733", "#33FF57", "#3357FF", "#FFC300", "#DAF7A6", "#C70039", "#900C3F", "#581845",
        "#FF33FF", "#33FFFF", "#FF9933", "#66FF66", "#FF6666", "#9966FF", "#66FFFF", "#FFCC66"
    ];

    const filteredDevices = Object.entries(devices).reduce((acc, [vendor, vendorDevices]) => {
        const matchingDevices = vendorDevices.filter((device) => {
            const query = searchQuery.toLowerCase();
            return (
                device.ip.toLowerCase().includes(query) ||
                (device.vendor && device.vendor.toLowerCase().includes(query)) ||
                (device.mac && device.mac.toLowerCase().includes(query))
            );
        });

        if (matchingDevices.length > 0) {
            acc[vendor] = matchingDevices;
        }

        return acc;
    }, {});

    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedDeviceHistory = localStorage.getItem("deviceHistory");
            const savedScanHistory = localStorage.getItem("scanHistory");

            setDeviceHistory(savedDeviceHistory ? JSON.parse(savedDeviceHistory) : []);
            setScanHistory(savedScanHistory ? JSON.parse(savedScanHistory) : []);
        }
    }, []);

    useEffect(() => {
        const socket = io("http://10.5.1.83:4000");
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
            console.log("Received networkData event:", data); // Debugging log

            if (!data || Object.keys(data).length === 0) {
                console.error("No data received from networkData event");
                return;
            }

            mergeDevices(data); // Merge new devices into the existing topology
            setStatus("Scan complete");
            setCurrentScanIP(null);
            assignRandomColorsToVendors(data); // Assign random colors to vendors

            // Update device history
            updateDeviceHistory(data);

            // Update scan history
            setScanHistory((prev) => {
                const updatedHistory = prev.map((scan) =>
                    scan.ipRange === ipRange ? { ...scan, status: "Complete", devices: data } : scan
                );
                console.log("Updated Scan History:", updatedHistory); // Debugging log
                localStorage.setItem("scanHistory", JSON.stringify(updatedHistory));
                return updatedHistory;
            });
        });

        return () => socket.disconnect();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (status === "In Progress") {
                setStatus("Scan complete (timeout)");
                console.warn("Scan status updated to complete due to timeout");
            }
        }, 30000); // 30 seconds timeout

        return () => clearTimeout(timeout);
    }, [status]);

    useEffect(() => {
        if (scanHistory.length > 0) {
            mergeScanHistoryToDevices();
        }
    }, [scanHistory]);

    const assignRandomColorsToVendors = (devices) => {
        const newVendorColors = { ...vendorColors };

        Object.keys(devices).forEach((vendor) => {
            if (!newVendorColors[vendor.toLowerCase()]) {
                const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
                newVendorColors[vendor.toLowerCase()] = randomColor;
            }
        });

        setVendorColors(newVendorColors);
    };

    const mergeDevices = (newDevices) => {
        const updatedDevices = { ...devices };

        Object.entries(newDevices).forEach(([vendor, vendorDevices]) => {
            if (!updatedDevices[vendor]) {
                updatedDevices[vendor] = [];
            }

            vendorDevices.forEach((newDevice) => {
                const existingDevice = updatedDevices[vendor].find((device) => device.ip === newDevice.ip);
                if (existingDevice) {
                    // Preserve locked positions (fx, fy) if the device already exists
                    newDevice.fx = existingDevice.fx;
                    newDevice.fy = existingDevice.fy;
                } else {
                    updatedDevices[vendor].push(newDevice);
                }
            });
        });

        console.log("Merged Devices:", updatedDevices); // Debugging log
        setDevices(updatedDevices);
    };

    const updateDeviceHistory = (newDevices) => {
        console.log("Updating Device History with:", newDevices); // Debugging log

        if (!newDevices || Object.keys(newDevices).length === 0) {
            console.error("No devices to update in device history");
            return;
        }

        const updatedHistory = [...deviceHistory];
        const newDeviceIPs = [];

        Object.values(newDevices).flat().forEach((device) => {
            const existingDevice = updatedHistory.find((d) => d.ip === device.ip);
            if (!existingDevice) {
                updatedHistory.push({ ...device, x: null, y: null, fx: null, fy: null }); // Add new device with no position
                newDeviceIPs.push(device.ip);
            } else {
                // Preserve locked positions (fx, fy) in the history
                existingDevice.fx = existingDevice.fx || null;
                existingDevice.fy = existingDevice.fy || null;
            }
        });

        if (newDeviceIPs.length > 0) {
            setNewDeviceIPs(newDeviceIPs); // Highlight new devices
            setTimeout(() => setNewDeviceIPs([]), 5000); // Clear highlights after 5 seconds
        }

        console.log("Updated Device History:", updatedHistory); // Debugging log
        setDeviceHistory(updatedHistory);
        localStorage.setItem("deviceHistory", JSON.stringify(updatedHistory));
    };

    const mergeScanHistoryToDevices = () => {
        const mergedDevices = {};

        // Iterate through scanHistory and merge devices
        scanHistory.forEach((scan) => {
            if (scan.devices) {
                Object.entries(scan.devices).forEach(([vendor, vendorDevices]) => {
                    if (!mergedDevices[vendor]) {
                        mergedDevices[vendor] = [];
                    }

                    vendorDevices.forEach((device) => {
                        const existingDevice = mergedDevices[vendor].find((d) => d.ip === device.ip);
                        if (!existingDevice) {
                            mergedDevices[vendor].push(device);
                        }
                    });
                });
            }
        });

        console.log("Merged Devices from Scan History:", mergedDevices); // Debugging log
        setDevices(mergedDevices); // Update the devices state
    };

    const clearHistory = () => {
        setDeviceHistory([]);
        setDevices([]);
        setScannedSubnets([]);
        localStorage.removeItem("deviceHistory");
        console.log("History cleared"); // Debugging log
    };

    const startScan = () => {
        if (scannedSubnets.includes(ipRange)) {
            alert(`Subnet ${ipRange} has already been scanned.`);
            return;
        }

        const newScan = {
            ipRange,
            timestamp: new Date().toISOString(),
            status: "In Progress",
        };

        setScanHistory((prev) => {
            const updatedHistory = [...prev, newScan];
            localStorage.setItem("scanHistory", JSON.stringify(updatedHistory));
            return updatedHistory;
        });

        setScannedSubnets((prev) => [...prev, ipRange]);
        setStatus("Starting scan...");
        setScanOutput("");
        socketRef.current.emit("startNetworkScan", { range: ipRange, useDocker });
    };

    const toggleExpand = (ip) => {
        setExpandedIPs((prev) => ({ ...prev, [ip]: !prev[ip] }));
    };

    const handleContextMenuAction = (action, device) => {
        if (action === "lock") {
            setDeviceHistory((prev) =>
                prev.map((d) => (d.ip === device.ip ? { ...d, locked: !d.locked } : d))
            );
        } else if (action === "changeColor") {
            setSelectedVendor(device.vendor.toLowerCase());
            setIsVendorColorModalOpen(true);
        } else if (action === "changeName") {
            const newName = prompt("Enter a new name:", device.ip);
            if (newName) {
                setCustomNames((prev) => ({
                    ...prev,
                    [device.ip]: newName,
                }));
            }
        }
        setContextMenu({ visible: false, x: 0, y: 0, node: null });
    };

    const handleVendorColorChange = (color) => {
        if (selectedVendor) {
            setVendorColors((prev) => ({
                ...prev,
                [selectedVendor]: color,
            }));
        }
        setIsVendorColorModalOpen(false);
    };

    useEffect(() => {
        if (!devices || Object.keys(devices).length === 0) return;

        const flattenedDevices = Object.values(devices).flat();
        console.log("Flattened Devices for D3:", flattenedDevices); // Debugging log

        const width = svgRef.current.clientWidth || 1000;
        const height = svgRef.current.clientHeight || 600;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous content

        const zoomLayer = svg.append("g");

        const zoomBehavior = d3.zoom()
            .scaleExtent([0.2, 2]) // Allow zooming in and out
            .on("zoom", (event) => {
                zoomLayer.attr("transform", event.transform);
            });

        svg.call(zoomBehavior);

        const nodes = flattenedDevices.map((device, index) => ({
            ...device,
            id: device.ip || `device-${index}`,
            x: Math.random() * width,
            y: Math.random() * height,
        }));

        const links = nodes.map((node, index) => ({
            source: node.id,
            target: nodes[(index + 1) % nodes.length].id,
        }));

        const simulation = d3.forceSimulation(nodes)
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(50))
            .force("link", d3.forceLink(links).id((d) => d.id).distance(150))
            .on("tick", () => {
                zoomLayer
                    .selectAll("line")
                    .attr("x1", (d) => d.source.x)
                    .attr("y1", (d) => d.source.y)
                    .attr("x2", (d) => d.target.x)
                    .attr("y2", (d) => d.target.y);

                zoomLayer
                    .selectAll("circle")
                    .attr("cx", (d) => d.x)
                    .attr("cy", (d) => d.y);

                zoomLayer
                    .selectAll("text")
                    .attr("x", (d) => d.x)
                    .attr("y", (d) => d.y);
            });

        const drag = d3.drag()
            .on("start", (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; // Fix the node's x position
                d.fy = d.y; // Fix the node's y position
            })
            .on("drag", (event, d) => {
                d.fx = event.x; // Update the fixed x position during drag
                d.fy = event.y; // Update the fixed y position during drag
            })
            .on("end", (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                // Keep the node locked in place by retaining fx and fy
            });

        zoomLayer
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("stroke", "#999")
            .attr("stroke-width", 1);

        zoomLayer
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("r", 25)
            .attr("fill", (d) => vendorColors[d.vendor?.toLowerCase()] || "#6b7280")
            .attr("stroke", "#1e3a8a")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("contextmenu", (event, d) => {
                event.preventDefault();
                setContextMenu({ visible: true, x: event.pageX, y: event.pageY, node: d });
            })
            .call(drag);

        zoomLayer
            .selectAll("text")
            .data(nodes)
            .enter()
            .append("text")
            .attr("text-anchor", "middle")
            .attr("dy", 40)
            .attr("fill", "white")
            .style("font-size", "12px")
            .text((d) => customNames[d.id] || d.ip);

        return () => simulation.stop();
    }, [devices, vendorColors, customNames]);

    return (
        <div className="flex bg-gray-900 text-white h-screen w-screen">
            {/* Left Panel */}
            <div className="w-[350px] bg-gray-800 p-4 overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Network Devices</h2>
                <input
                    type="text"
                    value={ipRange}
                    onChange={(e) => setIpRange(e.target.value)}
                    placeholder="IP Range (e.g., 192.168.1.1-255)"
                    className="px-3 py-2 mb-2 rounded bg-gray-700 text-white w-full"
                />
                <label className="block text-white mb-2">
                    <input
                        type="checkbox"
                        checked={useDocker}
                        onChange={(e) => setUseDocker(e.target.checked)}
                        className="mr-2"
                    />
                    Use Docker for Nmap
                </label>
                <button
                    onClick={startScan}
                    className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mb-4"
                >
                    Start Scan
                </button>
                <button
                    onClick={clearHistory}
                    className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded mb-4"
                >
                    Clear History
                </button>
                <button
                    onClick={mergeScanHistoryToDevices}
                    className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded mb-4"
                >
                    Merge Scans to Topology
                </button>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by IP, Vendor, or MAC"
                    className="px-3 py-2 mb-2 rounded bg-gray-700 text-white w-full"
                />
                <div className="text-sm text-gray-400 mb-4">
                    {status} {currentScanIP && `: ${currentScanIP}`}
                </div>
                <div>
                    {Object.entries(filteredDevices).map(([vendor, vendorDevices]) => (
                        <div key={vendor} className="mb-4">
                            <h3 className="text-lg font-bold mb-2">{vendor}</h3>
                            {vendorDevices.map((device, idx) => (
                                <div
                                    key={idx}
                                    className={`mb-2 ${
                                        newDeviceIPs.includes(device.ip) ? "bg-green-500" : "bg-gray-700"
                                    } hover:bg-gray-600 px-3 py-2 rounded`}
                                >
                                    <button
                                        onClick={() => toggleExpand(device.ip)}
                                        className="w-full flex justify-between items-center"
                                    >
                                        <span>{device.ip}</span>
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
                    ))}
                </div>
                <h2 className="text-xl font-bold mb-4">Scan History</h2>
                {scanHistory.length > 0 && scanHistory.map((scan, idx) => (
                    <div key={idx} className="mb-4 bg-gray-700 p-3 rounded">
                        <p><strong>IP Range:</strong> {scan.ipRange}</p>
                        <p><strong>Timestamp:</strong> {new Date(scan.timestamp).toLocaleString()}</p>
                        <p><strong>Status:</strong> {scan.status}</p>
                        {scan.devices && (
                            <button
                                className="mt-2 text-blue-400 underline"
                                onClick={() => console.log("Devices:", scan.devices)}
                            >
                                View Devices
                            </button>
                        )}
                    </div>
                ))}
                <button
                    onClick={() => {
                        setScanHistory([]);
                        localStorage.removeItem("scanHistory");
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded mt-4"
                >
                    Clear Scan History
                </button>
            </div>

            {/* Right Panel */}
            <div className="flex-1 p-4">
                <div className="h-full w-full bg-gray-800 rounded-lg overflow-hidden">
                    <svg ref={svgRef} width="100%" height="100%" className="select-none" />
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div
                    className="absolute bg-gray-800 text-white p-2 rounded shadow-lg"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                        onClick={() => handleContextMenuAction("lock", contextMenu.node)}
                    >
                        {contextMenu.node.locked ? "Unlock Node" : "Lock Node"}
                    </button>
                    <button
                        className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                        onClick={() => handleContextMenuAction("changeColor", contextMenu.node)}
                    >
                        Change Vendor Color
                    </button>
                    <button
                        className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                        onClick={() => handleContextMenuAction("changeName", contextMenu.node)}
                    >
                        Change Name
                    </button>
                </div>
            )}

            {/* Vendor Color Modal */}
            {isVendorColorModalOpen && (
                <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-80 flex items-center justify-center z-50">
                    <div className="bg-white text-black p-6 rounded-lg max-w-md w-full shadow-xl">
                        <h2 className="text-lg font-bold mb-4">Select Vendor Color</h2>
                        <div className="grid grid-cols-4 gap-4">
                            {colorPalette.map((color) => (
                                <button
                                    key={color}
                                    className="w-10 h-10 rounded-full"
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleVendorColorChange(color)}
                                />
                            ))}
                        </div>
                        <div className="text-right mt-4">
                            <button
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                onClick={() => setIsVendorColorModalOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}