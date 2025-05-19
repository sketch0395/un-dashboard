"use client";

import React, { useState } from "react";
import { FaChevronDown, FaChevronUp, FaDocker, FaClock, FaTag, FaTerminal, FaMemory, FaMicrochip } from "react-icons/fa";

const DockerCard = ({ container, onAction, onOpenContainerPage, operations }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { Names, Status, PublishedPort, refreshing, Id, Image, Command, Created, stats } = container;
    
    // Check if there's an active operation for this container
    const isActive = operations?.containerAction?.containerId === Id && 
                    operations?.containerAction?.status === 'start';
                    
    // Format the created date for better readability
    const createdDate = new Date(Created * 1000).toLocaleString();
    
    // Format container command for display (limit length)
    const displayCommand = Command ? (Command.length > 50 ? Command.substring(0, 50) + '...' : Command) : 'N/A';
    
    // Get CPU and memory stats, if available
    const cpuPercent = stats?.cpuPercent || '0.00';
    const memoryPercent = stats?.memoryPercent || '0.00';
    const memoryUsage = stats?.memoryUsage || '0';
    const memoryLimit = stats?.memoryLimit || '0';

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
            </h3>            <div className="flex items-center gap-2 mt-2">
                <span
                    className={`inline-block w-3 h-3 rounded-full ${
                        Status.includes("Up") ? "bg-green-500" : "bg-red-500"
                    }`}
                ></span>
                <span className="text-sm">
                    {refreshing ? "Refreshing..." : Status}
                </span>
            </div>
            
            {/* Display resource usage for running containers */}
            {Status.includes("Up") && (
                <div className="mt-3 flex flex-wrap gap-4">
                    <div className="flex items-center gap-1">
                        <FaMicrochip className="text-blue-400 min-w-[14px]" />
                        <span className="text-sm text-gray-300">{cpuPercent}% CPU</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <FaMemory className="text-blue-400 min-w-[14px]" />
                        <span className="text-sm text-gray-300">{memoryUsage}MB ({memoryPercent}%)</span>
                    </div>
                </div>
            )}
            
            {/* Accordion toggle */}
            <div 
                className="mt-3 pt-2 border-t border-gray-700 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Container Details</span>
                    <span>{isExpanded ? <FaChevronUp /> : <FaChevronDown />}</span>
                </div>
            </div>
            
            {/* Accordion content */}
            {isExpanded && (
                <div className="mt-2 text-sm bg-gray-900 p-3 rounded-md border border-gray-700 space-y-2">
                    <div className="flex items-center gap-2">
                        <FaDocker className="text-blue-400 min-w-[16px]" />
                        <span className="text-gray-300 truncate">{Image}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <FaClock className="text-blue-400 min-w-[16px]" />
                        <span className="text-gray-300">Created: {createdDate}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <FaTerminal className="text-blue-400 min-w-[16px]" />
                        <span className="text-gray-300 break-all">
                            <span className="block text-xs">Command:</span>
                            <span className="text-gray-400 text-xs">{displayCommand}</span>
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <FaTag className="text-blue-400 min-w-[16px]" />
                        <span className="text-gray-300 text-xs font-mono">{Id.substring(0, 12)}</span>
                    </div>
                    
                    {Status.includes("Up") && (
                        <>
                            {/* Detailed resource stats */}
                            <div className="pt-1 mt-1 border-t border-gray-700 grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-xs text-gray-500">Memory Usage:</span>
                                    <div className="h-1.5 w-full bg-gray-700 rounded-full mt-1 overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500 rounded-full" 
                                            style={{ width: `${Math.min(parseFloat(memoryPercent), 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs text-gray-400">{memoryUsage} / {memoryLimit} MB</span>
                                </div>
                                
                                <div>
                                    <span className="text-xs text-gray-500">CPU Usage:</span>
                                    <div className="h-1.5 w-full bg-gray-700 rounded-full mt-1 overflow-hidden">
                                        <div 
                                            className="h-full bg-green-500 rounded-full" 
                                            style={{ width: `${Math.min(parseFloat(cpuPercent), 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs text-gray-400">{cpuPercent}%</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
            
            {/* Action buttons */}
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
