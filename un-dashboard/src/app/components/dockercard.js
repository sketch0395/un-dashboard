"use client";

import React from "react";

const DockerCard = ({ container, onAction, onOpenContainerPage, operations }) => {
    const { Names, Status, PublishedPort, refreshing, Id } = container;
    
    // Check if there's an active operation for this container
    const isActive = operations?.containerAction?.containerId === Id && 
                    operations?.containerAction?.status === 'start';

    return (
        <div className={`bg-gray-800 text-white p-4 rounded-lg shadow-md ${refreshing || isActive ? 'relative opacity-90' : ''}`}>
            {(refreshing || isActive) && (
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-lg">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full mb-2"></div>
                        <span className="text-sm font-medium bg-gray-900 px-2 py-1 rounded">
                            {operations?.containerAction?.action 
                                ? `${operations.containerAction.action}ing...` 
                                : "Processing..."}
                        </span>
                    </div>
                </div>
            )}
            
            <h3 className="text-lg font-bold">
                {Names?.[0] || "Unnamed Container"}
            </h3>
            <p className="text-sm text-gray-400">Status: {Status}</p>
            <div className="flex items-center gap-2 mt-2">
                <span
                    className={`inline-block w-3 h-3 rounded-full ${
                        Status.includes("Up") ? "bg-green-500" : "bg-red-500"
                    }`}
                ></span>
                <span className="text-sm">
                    {refreshing ? "Refreshing..." : Status}
                </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded disabled:opacity-50"
                    onClick={() => onAction(container.Id, "start")}
                    disabled={refreshing || isActive || Status.includes("Up")}
                >
                    Start
                </button>
                <button
                    className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded disabled:opacity-50"
                    onClick={() => onAction(container.Id, "restart")}
                    disabled={refreshing || isActive || !Status.includes("Up")}
                >
                    Restart
                </button>
                <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded disabled:opacity-50"
                    onClick={() => onAction(container.Id, "stop")}
                    disabled={refreshing || isActive || !Status.includes("Up")}
                >
                    Stop
                </button>
                <button
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded disabled:opacity-50"
                    onClick={() => onAction(container.Id, "delete")}
                    disabled={refreshing || isActive || Status.includes("Up")}
                >
                    Delete
                </button>
                {PublishedPort && (
                    <button
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded disabled:opacity-50"
                        onClick={() => onOpenContainerPage(PublishedPort)}
                        disabled={refreshing || isActive || !Status.includes("Up")}
                    >
                        Open Web
                    </button>
                )}
            </div>
        </div>
    );
};

export default DockerCard;
