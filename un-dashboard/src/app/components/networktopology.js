import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { FaNetworkWired } from "react-icons/fa";
import { createRoot } from "react-dom/client";

export default function TopologyMap({ devices, vendorColors, customNames }) {
    const svgRef = useRef();

    useEffect(() => {
        if (!devices || Object.keys(devices).length === 0) return;

        const flattenedDevices = Array.isArray(devices) ? devices : Object.values(devices).flat();
        const width = svgRef.current.clientWidth || 1000;
        const height = svgRef.current.clientHeight || 600;
        const radius = Math.min(width, height) / 2 - 100; // Radius of the circle layout

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const zoomLayer = svg.append("g");

        const zoomBehavior = d3.zoom()
            .scaleExtent([0.2, 2])
            .on("zoom", (event) => {
                zoomLayer.attr("transform", event.transform);
            });

        svg.call(zoomBehavior);

        // Calculate circular positions for nodes
        const nodes = flattenedDevices.map((device, index) => {
            const angle = (2 * Math.PI * index) / flattenedDevices.length; // Angle for each node
            return {
                ...device,
                id: device.ip || `device-${index}`,
                x: width / 2 + radius * Math.cos(angle), // X position
                y: height / 2 + radius * Math.sin(angle), // Y position
            };
        });

        // Create links to connect nodes in a circular manner
        const links = nodes.map((node, index) => ({
            source: node.id,
            target: nodes[(index + 1) % nodes.length].id, // Connect to the next node in the circle
        }));

        // Add links (lines) to the SVG
        zoomLayer
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("stroke", "#999")
            .attr("stroke-width", 1)
            .attr("x1", (d) => nodes.find((n) => n.id === d.source).x)
            .attr("y1", (d) => nodes.find((n) => n.id === d.source).y)
            .attr("x2", (d) => nodes.find((n) => n.id === d.target).x)
            .attr("y2", (d) => nodes.find((n) => n.id === d.target).y);

        // Add nodes (circles) to the SVG
        const nodeGroup = zoomLayer
            .selectAll("g")
            .data(nodes)
            .enter()
            .append("g");

        nodeGroup
            .append("circle")
            .attr("r", 25)
            .attr("fill", (d) => customNames?.[d.id]?.color || vendorColors[d.vendor?.toLowerCase()] || "#6b7280")
            .attr("stroke", "#1e3a8a")
            .attr("stroke-width", 2)
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y);

        // Add icons and names using foreignObject
        nodeGroup
            .append("foreignObject")
            .attr("width", 80) // Increase the width to prevent text cutoff
            .attr("height", 60) // Increase the height for better spacing
            .attr("x", (d) => d.x - 40) // Adjust x to center the text
            .attr("y", (d) => d.y - 30) // Adjust y to center the text
            .each(function (d) {
                const customIcon = customNames?.[d.id]?.icon || <FaNetworkWired />;
                const customName = customNames?.[d.id]?.name || d.ip;

                const container = document.createElement("div");
                createRoot(container).render(
                    <div style={{ textAlign: "center", color: "white", fontSize: "12px", overflow: "visible" }}>
                        <div style={{ fontSize: "20px", marginBottom: "4px" }}>{customIcon}</div>
                        <div style={{ whiteSpace: "nowrap" }}>{customName}</div> {/* Prevent text wrapping */}
                    </div>
                );
                this.appendChild(container);
            });
    }, [devices, vendorColors, customNames]); // Add customNames as a dependency

    return <svg ref={svgRef} width="100%" height="100%" className="select-none" />;
}