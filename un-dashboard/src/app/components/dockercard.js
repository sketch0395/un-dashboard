"use client";

import { FaPlay, FaStop, FaRedo, FaLink } from "react-icons/fa";

const DockerCard = ({ container, onAction, onOpenContainerPage }) => {
    const getStatusColor = (status) => {
        if (status.includes("Up")) return "bg-green-500";
        if (status.includes("Restarting")) return "bg-yellow-500";
        return "bg-red-500";
    };

    return (
        <div className="p-6 bg-gray-800 text-white rounded-lg shadow-lg mb-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <span
                        className={`inline-block w-4 h-4 rounded-full ${getStatusColor(container.Status)}`}
                    />
                    <span className="font-semibold">{container.Names}</span>
                </div>
            </div>

            <div className="flex gap-2 mb-4">
                {container.refreshing ? (
                    <div className="animate-spin w-5 h-5 border-4 border-t-4 border-gray-300 rounded-full border-t-blue-500"></div>
                ) : (
                    <>
                        <button
                            onClick={() => onAction(container.ID, "start")}
                            className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white"
                            title="Start"
                        >
                            <FaPlay />
                        </button>
                        <button
                            onClick={() => onAction(container.ID, "stop")}
                            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white"
                            title="Stop"
                        >
                            <FaStop />
                        </button>
                        <button
                            onClick={() => onAction(container.ID, "restart")}
                            className="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-white"
                            title="Restart"
                        >
                            <FaRedo />
                        </button>
                    </>
                )}
            </div>

            {container.PublishedPort && (
                <div>
                    <button
                        onClick={() => onOpenContainerPage(container.PublishedPort)}
                        className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white"
                        title="Open in browser"
                    >
                        <FaLink />
                    </button>
                </div>
            )}
        </div>
    );
};

export default DockerCard;
