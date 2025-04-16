"use client";

import React from "react";

const DockerCard = ({ container, onAction, onOpenContainerPage }) => {
    const { Names, Status, PublishedPort, refreshing } = container;

    return (
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md">
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
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                    onClick={() => onAction(container.Id, "start")}
                >
                    Start
                </button>
                <button
                    className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded"
                    onClick={() => onAction(container.Id, "restart")}
                >
                    Restart
                </button>
                <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                    onClick={() => onAction(container.Id, "stop")}
                >
                    Stop
                </button>
                <button
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded"
                    onClick={() => onAction(container.Id, "delete")}
                >
                    Delete
                </button>
                {PublishedPort && (
                    <button
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
                        onClick={() => onOpenContainerPage(PublishedPort)}
                    >
                        Open Web
                    </button>
                )}
            </div>
        </div>
    );
};

export default DockerCard;
