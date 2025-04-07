"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function NetworkMap({ devices }) {
    const svgRef = useRef();
    const [selectedDevice, setSelectedDevice] = useState(null);

    useEffect(() => {
        if (!devices || devices.length === 0) return;

        const width = 1000;
        const height = 600;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous

        const zoomLayer = svg.append("g");

        svg.call(
            d3.zoom().on("zoom", (event) => {
                zoomLayer.attr("transform", event.transform);
            })
        );

        const nodes = devices.map((d, i) => ({ ...d, id: d.ip || `device-${i}` }));
        const links = []; // Optional, connect based on logic

        const simulation = d3.forceSimulation(nodes)
            .force("charge", d3.forceManyBody().strength(-200))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(60))
            .force("link", d3.forceLink(links).id(d => d.id).distance(100))
            .on("tick", ticked);

        const node = zoomLayer.selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("r", 25)
            .attr("fill", "#60a5fa")
            .attr("stroke", "#1e3a8a")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("click", (_, d) => setSelectedDevice(d));

        const label = zoomLayer.selectAll("text")
            .data(nodes)
            .enter()
            .append("text")
            .attr("text-anchor", "middle")
            .attr("dy", 40)
            .attr("fill", "white")
            .style("font-size", "12px")
            .text(d => d.ip);

        function ticked() {
            node.attr("cx", d => d.x).attr("cy", d => d.y);
            label.attr("x", d => d.x).attr("y", d => d.y);
        }

        return () => simulation.stop();
    }, [devices]);

    return (
        <div className="relative w-full h-[600px] bg-gray-900 rounded-lg shadow-lg overflow-hidden">
            <svg ref={svgRef} width="100%" height="100%" className="select-none" />

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
        </div>
    );
}
