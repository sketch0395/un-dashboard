"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function DockerStatus() {
    const [containers, setContainers] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const socket = io("http://localhost:4000");

        socket.on("containers", (data) => {
            console.log("WebSocket Data:", data);
            setContainers(data);  // Update containers
        });

        socket.on("connect_error", () => {
            console.warn("WebSocket failed, using polling");
            fetchContainers();

            const interval = setInterval(fetchContainers, 10000);  // Slow down polling
            return () => clearInterval(interval);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchContainers = () => {
        fetch("http://localhost:4000/api/containers")
            .then(res => res.json())
            .then(data => {
                console.log("API response:", data);
                setContainers(Array.isArray(data) ? data : []);
            })
            .catch(err => {
                console.error("Fetch error:", err);
                setError("Failed to fetch containers");
            });
    };

    const handleAction = (id, action) => {
        // Mark the container as refreshing
        setContainers(prevContainers =>
            prevContainers.map(container =>
                container.ID === id ? { ...container, refreshing: true } : container
            )
        );

        fetch(`http://localhost:4000/api/containers/${id}/${action}`, { method: "POST" })
            .then(() => {
                fetchContainers();  // Re-fetch containers after action
            })
            .catch(err => {
                console.error(`Failed to ${action} container:`, err);
                setContainers(prevContainers =>
                    prevContainers.map(container =>
                        container.ID === id ? { ...container, refreshing: false } : container
                    )
                );
            });
    };

    const openContainerPage = (hostPort) => {
        const protocol = hostPort === "443" ? "https" : "http";
        window.open(`${protocol}://localhost:${hostPort}`, "_blank");
    };

    const getStatusColor = (status) => {
        if (status.includes("Up")) return "bg-green-500";
        if (status.includes("Restarting")) return "bg-yellow-500";
        return "bg-red-500";
    };

    return (
        <div className="p-6 bg-gray-900 text-white rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Docker Containers</h2>
            {error ? (
                <p className="text-red-500">{error}</p>
            ) : containers.length === 0 ? (
                <p className="text-gray-400">No containers found</p>
            ) : (
                <table className="w-full border-collapse border border-gray-700">
                    <thead>
                        <tr className="bg-gray-800">
                            <th className="p-2 border border-gray-700">Status</th>
                            <th className="p-2 border border-gray-700">Name</th>
                            <th className="p-2 border border-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {containers.map((container) => (
                            <tr key={container.ID} className="border border-gray-700">
                                <td className="p-2 border border-gray-700">
                                    <span
                                        className={`inline-block w-4 h-4 rounded-full ${getStatusColor(container.Status)}`}
                                    />
                                </td>
                                <td className="p-2 border border-gray-700 flex items-center gap-2">
                                    {container.Names}
                                    <div className="relative group">
                                        <span className="cursor-pointer text-blue-500">🛈</span>
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            Container ID: {container.ID}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-2 border border-gray-700 flex gap-2">
                                    {container.refreshing ? (
                                        <div className="animate-spin w-5 h-5 border-4 border-t-4 border-gray-300 rounded-full border-t-blue-500"></div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleAction(container.ID, "start")}
                                                className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white"
                                            >
                                                Start
                                            </button>
                                            <button
                                                onClick={() => handleAction(container.ID, "stop")}
                                                className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white"
                                            >
                                                Stop
                                            </button>
                                            <button
                                                onClick={() => handleAction(container.ID, "restart")}
                                                className="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-white"
                                            >
                                                Restart
                                            </button>
                                        </>
                                    )}
                                    {container.PublishedPort && (
                                        <div className="relative group">
                                            <button
                                                onClick={() => openContainerPage(container.PublishedPort)}
                                                className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white"
                                            >
                                                Open
                                            </button>
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                Port: {container.PublishedPort}
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
