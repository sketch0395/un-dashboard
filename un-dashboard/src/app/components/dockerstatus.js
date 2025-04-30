"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import DockerCard from "./dockercard";

export default function DockerStatus() {
    const [containers, setContainers] = useState([]);
    const [error, setError] = useState(null);
    const [operations, setOperations] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const socket = io("http://10.5.1.83:4002");

        socket.on("containers", (data) => {
            console.log("WebSocket Data:", data);
            setContainers(data);
            setIsLoading(false);
        });

        socket.on("operation", (data) => {
            console.log("Operation update:", data);
            setOperations(prev => ({
                ...prev,
                [data.type]: {
                    status: data.status,
                    message: data.message,
                    containerId: data.containerID,
                    action: data.action,
                    count: data.count
                }
            }));
            
            // If container action is complete, update the container's refreshing state
            if (data.type === 'containerAction' && data.status === 'complete' && data.containerID) {
                setContainers(prevContainers =>
                    prevContainers.map(container =>
                        container.Id === data.containerID ? { ...container, refreshing: false } : container
                    )
                );
            }
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
        setIsLoading(true);
        fetch("http://10.5.1.83:4002/api/containers")
            .then((res) => res.json())
            .then((data) => {
                console.log("API response:", data);
                setContainers(Array.isArray(data) ? data : []);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error("Fetch error:", err);
                setError("Failed to fetch containers");
                setIsLoading(false);
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
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Docker Containers</h2>
                <div className="flex items-center space-x-2">
                    {isLoading && (
                        <div className="flex items-center">
                            <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-blue-500 rounded-full mr-2"></div>
                            <span className="text-sm">Loading containers...</span>
                        </div>
                    )}
                    {operations.containerList?.status === 'start' && (
                        <div className="text-sm text-blue-400">Fetching containers...</div>
                    )}
                    {operations.containerList?.status === 'complete' && (
                        <div className="text-sm text-green-400">Loaded {operations.containerList.count} containers</div>
                    )}
                    {operations.refresh?.status === 'start' && (
                        <div className="text-sm text-blue-400">Refreshing data...</div>
                    )}
                    <button 
                        className="bg-blue-600 hover:bg-blue-800 text-white py-1 px-3 rounded"
                        onClick={fetchContainers}
                        disabled={isLoading}
                    >
                        Refresh
                    </button>
                </div>
            </div>
            
            {error ? (
                <div className="bg-red-900 text-white p-3 rounded mb-4">
                    <p className="text-red-300">{error}</p>
                </div>
            ) : isLoading && containers.length === 0 ? (
                <div className="flex justify-center items-center h-32">
                    <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full mr-3"></div>
                    <p>Loading containers...</p>
                </div>
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
                            operations={operations}
                        />
                    ))}
                </div>
            )}
            
            {/* Operations Status Bar */}
            {operations.containerAction && (
                <div className={`fixed bottom-4 right-4 p-3 rounded-lg shadow-lg ${
                    operations.containerAction.status === 'start' ? 'bg-blue-800' :
                    operations.containerAction.status === 'complete' ? 'bg-green-800' :
                    operations.containerAction.status === 'error' ? 'bg-red-800' : 'bg-gray-800'
                }`}>
                    <div className="flex items-center space-x-2">
                        {operations.containerAction.status === 'start' && (
                            <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                        )}
                        <span>
                            {operations.containerAction.status === 'start' && `${operations.containerAction.action} in progress...`}
                            {operations.containerAction.status === 'complete' && `${operations.containerAction.action} completed`}
                            {operations.containerAction.status === 'error' && `${operations.containerAction.action} failed: ${operations.containerAction.message}`}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
