"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import DockerCard from "./dockercard";

export default function DockerStatus() {
    const [containers, setContainers] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const socket = io("http://10.5.1.83:4002");

        socket.on("containers", (data) => {
            console.log("WebSocket Data:", data);
            setContainers(data);
        });

        socket.on("connect_error", () => {
            console.warn("WebSocket failed, using polling");
            fetchContainers();

            const interval = setInterval(fetchContainers, 10000);
            return () => clearInterval(interval);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchContainers = () => {
        fetch("http://10.5.1.83:4002/api/containers")
            .then((res) => res.json())
            .then((data) => {
                console.log("API response:", data);
                setContainers(Array.isArray(data) ? data : []);
            })
            .catch((err) => {
                console.error("Fetch error:", err);
                setError("Failed to fetch containers");
            });
    };

    const handleAction = (id, action) => {
        console.log("Container ID:", id, "Action:", action);

        if (!id) {
            console.error("Invalid container ID");
            return;
        }

        setContainers((prevContainers) =>
            prevContainers.map((container) =>
                container.Id === id ? { ...container, refreshing: true } : container
            )
        );

        const socket = io("http://10.5.1.83:4002");
        socket.emit("containerAction", { action, containerID: id });

        socket.on("error", (message) => {
            console.error(`Failed to ${action} container:`, message);
            setContainers((prevContainers) =>
                prevContainers.map((container) =>
                    container.Id === id ? { ...container, refreshing: false } : container
                )
            );
        });
    };

    const openContainerPage = (hostPort) => {
        const protocol = hostPort === "443" ? "https" : "http";
        window.open(`${protocol}://10.5.1.212:${hostPort}`, "_blank");
    };

    return (
        <div className="p-6 bg-gray-900 text-white rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Docker Containers</h2>
            {error ? (
                <p className="text-red-500">{error}</p>
            ) : containers.length === 0 ? (
                <p className="text-gray-400">No containers found</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {containers.map((container) => (
                        <DockerCard
                            key={container.Id}
                            container={container}
                            onAction={handleAction}
                            onOpenContainerPage={openContainerPage}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
