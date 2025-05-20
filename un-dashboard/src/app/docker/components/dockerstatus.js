"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import DockerCard from "./dockercard";

export default function DockerStatus({ filterValue, showStoppedContainers }) {
    const [containers, setContainers] = useState([]);
    const [error, setError] = useState(null);
    const [operations, setOperations] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [loadingPhase, setLoadingPhase] = useState('initial'); // 'initial', 'list', 'stats', 'complete'
    const [statsProgress, setStatsProgress] = useState({
        total: 0,
        loaded: 0
    });
    
    // Determine the server URL based on environment
    const SOCKET_URL = (() => {
        if (typeof window === 'undefined') return "http://10.5.1.83:4002";
        
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        // If not on localhost, use the same hostname but different port
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return `${protocol}//${hostname}:4002`;
        }
        
        return "http://10.5.1.83:4002";
    })();    useEffect(() => {
        console.log(`Connecting to Docker server at: ${SOCKET_URL}`);

        // Create socket outside of event handlers to ensure a single instance
        const socket = io(SOCKET_URL, {
            transports: ['polling', 'websocket'], // Start with polling then upgrade to websocket (more reliable)
            reconnectionAttempts: 5,              // Try to reconnect 5 times
            reconnectionDelay: 1000,              // Start with a 1s delay between reconnection attempts
            reconnectionDelayMax: 5000,           // Maximum delay between reconnections
            timeout: 30000,                       // Increased timeout
            autoConnect: true,                    // Auto-connect
            forceNew: false,                      // Reuse connection if possible
            upgrade: true                         // Allow transport upgrade
        });
        
        // Connection event handlers
        socket.on("connect", () => {
            console.log("Socket connected successfully to Docker server");
            setError(null);
        });
        
        // Improved error handling
        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
            setError("Connection to Docker server failed. Check if the server is running.");
        });
        
        // Add specific handler for websocket errors
        socket.io.on("error", (err) => {
            console.error("Socket.io engine error:", err);
            // Don't set UI error for engine errors as they may self-recover
        });socket.on("containers", (data) => {
            console.log("WebSocket Data received:", data?.length || 0, "containers");
            
            // Calculate loading statistics
            const runningContainers = data.filter(c => c.State === 'running');
            const containersWithStats = data.filter(c => c.stats !== null && c.State === 'running');
            
            // Update containers first for immediate UI feedback
            setContainers(data);
            setIsLoading(false);
            
            if (runningContainers.length === 0) {
                // No running containers to get stats for
                setLoadingPhase('complete');
            } else if (containersWithStats.length < runningContainers.length) {
                // Some stats are still loading
                setLoadingPhase('stats');
                setStatsProgress({
                    total: runningContainers.length,
                    loaded: containersWithStats.length
                });
            } else {
                // All stats have been loaded
                setLoadingPhase('complete');
            }
            
            console.log(`Stats progress: ${containersWithStats.length}/${runningContainers.length} containers`);
        });
          // Handle incremental stats updates
        socket.on("containerStatsUpdate", (updatedContainers) => {
            console.log("Received stats update for", updatedContainers.length, "containers");
            
            // Update only the containers that have new stats - using a more efficient approach
            setContainers(currentContainers => {
                if (!currentContainers || currentContainers.length === 0) return currentContainers;
                
                // Create a map of updated container stats for quick lookup
                const statsById = {};
                updatedContainers.forEach(container => {
                    if (container.stats) {
                        statsById[container.Id] = container.stats;
                    }
                });
                
                // Only create a new array if we actually have updates
                if (Object.keys(statsById).length === 0) return currentContainers;
                
                // Apply updates to matching containers
                return currentContainers.map(container => {
                    const updatedStats = statsById[container.Id];
                    if (updatedStats) {
                        return {
                            ...container,
                            stats: updatedStats
                        };
                    }
                    return container;
                });
            });            // Update stats progress more accurately based on the current state
            setStatsProgress(prev => {
                const newLoaded = Math.min(prev.loaded + updatedContainers.length, prev.total);
                
                // Check if stats loading is complete
                if (newLoaded >= prev.total) {
                    setTimeout(() => setLoadingPhase('complete'), 500);
                }
                
                return {
                    total: prev.total,
                    loaded: newLoaded
                };
            });
        });socket.on("operation", (data) => {
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
              // Handle batch operations (start all, stop all)
            if (data.type === 'batchOperation') {
                console.log('Received batch operation event:', data);
                
                // Show the batch operation status in the operations state
                setOperations(prev => ({
                    ...prev,
                    batchOperation: {
                        status: data.status,
                        message: data.message,
                        action: data.action
                    }
                }));
                
                // Clear batch operation notifications after a delay when completed
                if (data.status === 'complete' || data.status === 'error') {
                    console.log(`Batch operation ${data.action} ${data.status}:`, data.message);
                    setTimeout(() => {
                        setOperations(prev => {
                            const newOps = {...prev};
                            delete newOps.batchOperation;
                            return newOps;
                        });
                    }, 5000);
                }
            }
        });        // Socket.IO transport events
        socket.io.on("upgrade", (transport) => {
            console.log(`Transport upgraded to: ${transport.name}`);
        });
        
        socket.io.on("downgrade", (transport) => {
            console.warn(`Transport downgraded to: ${transport.name}`);
        });

        return () => {
            socket.disconnect();
        };
    }, []);    const handleAction = (id, action) => {
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

        // Create socket with improved configuration
        const socket = io(SOCKET_URL, {
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
            timeout: 10000,
            forceNew: true // Create a new connection for this specific action
        });
        
        // Set up all event handlers before emitting action
        socket.on("connect", () => {
            console.log(`Connected to server, emitting ${action} for container ${id}`);
            socket.emit("containerAction", { action, containerID: id });
            
            // Disconnect after a reasonable timeout if no response
            setTimeout(() => {
                console.log(`Disconnecting after timeout for ${action} on container ${id}`);
                socket.disconnect();
            }, 15000); // 15 second timeout
        });
        
        socket.on("error", (message) => {
            console.error(`Failed to ${action} container:`, message);
            setContainers((prevContainers) =>
                prevContainers.map((container) =>
                    container.Id === id ? { ...container, refreshing: false } : container
                )
            );
            socket.disconnect();
        });
        
        // Add handler for operation completion
        socket.on("operation", (data) => {
            if (data.type === 'containerAction' && data.containerID === id) {
                console.log(`Received operation update for ${action}:`, data);
                if (data.status === 'complete' || data.status === 'error') {
                    socket.disconnect();
                }
            }
        });
        
        socket.on("connect_error", (err) => {
            console.error("Connection error during container action:", err);
            setContainers((prevContainers) =>
                prevContainers.map((container) =>
                    container.Id === id ? { ...container, refreshing: false } : container
                )
            );
            socket.disconnect();
        });
    };

    const openContainerPage = (hostPort) => {
        const protocol = hostPort === "443" ? "https" : "http";
        window.open(`${protocol}://10.5.1.212:${hostPort}`, "_blank");
    };

    // Function to filter and sort containers consistently
    const renderFilteredContainers = () => {
        return containers
            .filter(container => {
                // Apply the showStoppedContainers filter
                if (!showStoppedContainers && !container.Status?.toLowerCase().includes('up')) {
                    return false;
                }
                
                // Apply the text filter if it exists
                if (filterValue && filterValue.trim() !== '') {
                    const searchText = filterValue.toLowerCase();
                    const containerName = container.Names?.[0]?.toLowerCase() || '';
                    const containerID = container.Id?.toLowerCase() || '';
                    const containerImage = container.Image?.toLowerCase() || '';
                    const containerStatus = container.Status?.toLowerCase() || '';
                    
                    return containerName.includes(searchText) || 
                           containerID.includes(searchText) ||
                           containerImage.includes(searchText) ||
                           containerStatus.includes(searchText);
                }
                
                return true;
            })
            .sort((a, b) => {
                // First sort by "up" status
                const aIsUp = a.Status?.toLowerCase().includes('up') ? 1 : 0;
                const bIsUp = b.Status?.toLowerCase().includes('up') ? 1 : 0;
                const statusDiff = bIsUp - aIsUp;
                
                // If status is the same, sort alphabetically by name
                if (statusDiff === 0) {
                    return (a.Names[0] || '').localeCompare(b.Names[0] || '');
                }
                
                return statusDiff;
            })
            .map(container => (
                <DockerCard 
                    key={container.Id} 
                    container={container} 
                    onAction={handleAction} 
                    onOpenContainerPage={openContainerPage}
                    operations={operations}
                />
            ));
    };

    return (
        <div className="p-6 bg-gray-900 text-white rounded-lg shadow-lg">            <div className="flex items-center justify-between mb-4">
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
                </div>
            </div>

            {/* Container listing */}
            {error ? (
                <div className="bg-red-900 text-white p-3 rounded mb-4">
                    <p className="text-red-300">{error}</p>
                </div>            ) : isLoading && containers.length === 0 ? (
                <div className="flex justify-center items-center h-32">
                    <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full mr-3"></div>
                    <p>Loading containers...</p>
                </div>            ) : loadingPhase === 'list' || loadingPhase === 'stats' ? (
                <div>
                    <div className="mb-3 bg-blue-900/40 text-blue-200 px-3 py-2 rounded text-sm">
                        <div className="flex items-center">
                            <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-blue-300 rounded-full mr-2"></div>
                            <p>Container list loaded! Fetching resource stats... {statsProgress.loaded > 0 ? `(${statsProgress.loaded}/${statsProgress.total})` : ''}</p>
                        </div>
                        {statsProgress.total > 0 && (
                            <div className="mt-2">
                                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                                    <div 
                                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min((statsProgress.loaded / statsProgress.total) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {renderFilteredContainers()}
                    </div>
                </div>
            ) : containers.length === 0 ? (
                <p className="text-gray-400">No containers found</p>
            ) : (                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {containers
                        .filter(container => {
                            // Apply the showStoppedContainers filter
                            if (!showStoppedContainers && !container.Status?.toLowerCase().includes('up')) {
                                return false;
                            }
                            
                            // Apply the text filter if it exists
                            if (filterValue && filterValue.trim() !== '') {
                                const searchText = filterValue.toLowerCase();
                                const containerName = container.Names?.[0]?.toLowerCase() || '';
                                const containerID = container.Id?.toLowerCase() || '';
                                const containerImage = container.Image?.toLowerCase() || '';
                                const containerStatus = container.Status?.toLowerCase() || '';
                                
                                return containerName.includes(searchText) || 
                                       containerID.includes(searchText) ||
                                       containerImage.includes(searchText) ||
                                       containerStatus.includes(searchText);
                            }
                            
                            return true;
                        })
                        .map((container) => (
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
                <div className={`fixed bottom-4 right-4 p-3 rounded-lg shadow-lg z-30 ${
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
            
            {/* Batch Operations Status Bar */}
            {operations.batchOperation && (
                <div className={`fixed bottom-16 right-4 p-3 rounded-lg shadow-lg z-20 ${
                    operations.batchOperation.status === 'start' ? 'bg-purple-800' :
                    operations.batchOperation.status === 'complete' ? 'bg-green-800' :
                    operations.batchOperation.status === 'error' ? 'bg-red-800' : 'bg-gray-800'
                }`}>
                    <div className="flex items-center space-x-2">
                        {operations.batchOperation.status === 'start' && (
                            <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                        )}
                        <span>
                            {operations.batchOperation.action === 'start' && operations.batchOperation.status === 'start' && "Starting all containers..."}
                            {operations.batchOperation.action === 'stop' && operations.batchOperation.status === 'start' && "Stopping all containers..."}
                            {operations.batchOperation.status === 'complete' && operations.batchOperation.message}
                            {operations.batchOperation.status === 'error' && `Batch operation error: ${operations.batchOperation.message}`}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
