"use client";

import { useState, useEffect } from "react";
import { io } from "socket.io-client";

export default function AddDockerContainer({ isOpen, onClose, socketUrl }) {
    const [containerConfig, setContainerConfig] = useState({
        image: "",
        name: "",
        ports: "",
        environment: "",
        volumes: ""
    });
    const [status, setStatus] = useState({
        loading: false,
        type: null,
        message: ""
    });

    useEffect(() => {
        if (!isOpen) {
            // Reset form when modal closes
            setContainerConfig({
                image: "",
                name: "",
                ports: "",
                environment: "",
                volumes: ""
            });
            setStatus({
                loading: false,
                type: null,
                message: ""
            });
        }
    }, [isOpen]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setContainerConfig(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreateContainer = (e) => {
        e.preventDefault();
        
        console.log("Creating new container:", containerConfig);
        
        // Show loading state
        setStatus({
            loading: true,
            type: "info",
            message: "Creating container..."
        });
        
        // Connect to socket
        const socket = io(socketUrl);
        
        // Listen for operation updates
        socket.on("operation", (data) => {
            if (data.type === "containerAction") {
                if (data.status === "start" || data.status === "progress") {
                    setStatus({
                        loading: true,
                        type: "info",
                        message: data.message || `${data.action || 'Processing'}...`
                    });
                } else if (data.status === "complete") {
                    setStatus({
                        loading: false,
                        type: "success",
                        message: data.message || "Container created successfully!"
                    });
                    
                    // Close modal after success with slight delay
                    setTimeout(() => {
                        onClose();
                    }, 2000);
                } else if (data.status === "error") {
                    setStatus({
                        loading: false,
                        type: "error",
                        message: data.message || "Failed to create container"
                    });
                }
            }
        });
        
        // Handle errors
        socket.on("error", (message) => {
            setStatus({
                loading: false,
                type: "error",
                message: message || "Failed to create container"
            });
        });
        
        // Send the create container request
        socket.emit("createContainer", containerConfig);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Run New Docker Container</h2>
                    <button 
                        className="text-gray-400 hover:text-white"
                        onClick={onClose}
                        disabled={status.loading}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Status area */}
                {status.message && (
                    <div className={`mb-4 p-3 rounded ${
                        status.type === "error" ? "bg-red-900 text-white" : 
                        status.type === "success" ? "bg-green-900 text-white" : 
                        "bg-blue-900 text-white"
                    }`}>
                        <div className="flex items-center">
                            {status.loading && (
                                <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-white rounded-full mr-2"></div>
                            )}
                            <p>{status.message}</p>
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleCreateContainer}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Image*</label>
                        <input
                            type="text"
                            name="image"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                            placeholder="nginx:latest, ubuntu:20.04"
                            value={containerConfig.image}
                            onChange={handleInputChange}
                            disabled={status.loading}
                            required
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Container Name (optional)</label>
                        <input
                            type="text"
                            name="name"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                            placeholder="my-container"
                            value={containerConfig.name}
                            onChange={handleInputChange}
                            disabled={status.loading}
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Ports (optional)</label>
                        <input
                            type="text"
                            name="ports"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                            placeholder="8080:80, 3000:3000"
                            value={containerConfig.ports}
                            onChange={handleInputChange}
                            disabled={status.loading}
                        />
                        <p className="text-xs text-gray-400 mt-1">Format: hostPort:containerPort, comma-separated</p>
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Environment Variables (optional)</label>
                        <textarea
                            name="environment"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                            placeholder="KEY=value&#10;ANOTHER_KEY=value"
                            rows="3"
                            value={containerConfig.environment}
                            onChange={handleInputChange}
                            disabled={status.loading}
                        ></textarea>
                        <p className="text-xs text-gray-400 mt-1">One variable per line in KEY=value format</p>
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Volumes (optional)</label>
                        <textarea
                            name="volumes"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                            placeholder="/host/path:/container/path&#10;/another/path:/another/container/path"
                            rows="2"
                            value={containerConfig.volumes}
                            onChange={handleInputChange}
                            disabled={status.loading}
                        ></textarea>
                        <p className="text-xs text-gray-400 mt-1">One volume per line in hostPath:containerPath format</p>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded disabled:opacity-50"
                            onClick={onClose}
                            disabled={status.loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                            disabled={status.loading}
                        >
                            {status.loading ? 'Creating...' : 'Create Container'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}