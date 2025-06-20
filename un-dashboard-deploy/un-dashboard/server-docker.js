const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const socketIo = require('socket.io');
const http = require('http');
const Docker = require('dockerode'); // Import dockerode

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["http://localhost:3000", "http://10.5.1.83:3000", /^http:\/\/10\.5\.1\.\d+:3000$/, "0.0.0.0:3000"],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    },
    // Add explicit WebSocket configuration
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,  // 60 seconds until a ping times out
    pingInterval: 25000, // Send a ping every 25 seconds
    allowEIO3: true,     // Allow Engine.IO protocol version 3
    maxHttpBufferSize: 1e8, // Increase buffer size for large payloads (100MB)
});

app.use(cors());

// Add engine.io error logging
io.engine.on('connection_error', (err) => {
    console.error('[ERROR] Socket.IO engine connection error:', err);
});

// --- DOCKER MANAGEMENT API ---
const docker = new Docker({ host: '10.5.1.212', port: 2375 }); // Connect to the remote Docker daemon

// Track container stats
const containerStats = {};

// Add active connections tracking
const activeConnections = new Set();
const MAX_CONCURRENT_OPERATIONS = 10;
let activeOperations = 0;

app.get('/api/connections', (req, res) => {
    res.json({ 
        activeConnections: activeConnections.size,
        activeOperations: activeOperations
    });
});

app.get('/api/containers', async (req, res) => {
    try {
        // Notify about operation start
        io.emit('operation', { type: 'containerList', status: 'start' });
        activeOperations++;
        
        const containers = await docker.listContainers({ all: true });
        const formattedContainers = containers.map((container) => {
            const portMatch = container.Ports?.find((port) => port.PublicPort);
            return {
                ...container,
                PublishedPort: portMatch ? portMatch.PublicPort : null,
            };
        });
        
        // Notify about operation completion
        activeOperations--;
        io.emit('operation', { 
            type: 'containerList', 
            status: 'complete',
            count: containers.length 
        });
        
        res.json(formattedContainers);
    } catch (error) {
        activeOperations--;
        console.error('Docker Error:', error.message);
        io.emit('operation', { type: 'containerList', status: 'error', message: error.message });
        res.status(500).json({ error: error.message });
    }
});

// --- SOCKET.IO ---
const SOCKET_UPDATE_INTERVAL = 30000; // 30 seconds to match client-side refresh

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    activeConnections.add(socket.id);
    
    // Create connection-specific lastFetched timestamp
    socket.lastFetched = Date.now();
    
    // Broadcast updated connection count
    io.emit('connectionCount', activeConnections.size);
    
    // Log transport being used (websocket or polling)
    const transport = socket.conn.transport.name;
    console.log(`Client ${socket.id} connected using ${transport}`);
    
    // Track transport upgrades
    socket.conn.on('upgrade', (newTransport) => {
        console.log(`Client ${socket.id} upgraded transport from ${transport} to ${newTransport.name}`);
    });
    
    let fetchContainersInterval;
    
    // Cache for container data to improve performance
    const containerCache = {
        list: [],
        timestamp: 0,
        ttl: 5000 // 5 second cache TTL
    };

    const fetchContainers = async (options = { forceRefresh: false, skipStats: false }) => {
        const startTime = Date.now();
        console.log(`[Performance] Starting container fetch. Options:`, options);
        
        const now = Date.now();
        const useCache = !options.forceRefresh && 
                         containerCache.list.length > 0 && 
                         (now - containerCache.timestamp < containerCache.ttl);
        
        if (now - socket.lastFetched < SOCKET_UPDATE_INTERVAL && !options.forceRefresh) return;
        socket.lastFetched = now;

        try {
            socket.emit('operation', { type: 'refresh', status: 'start' });
            activeOperations++;
            
            // First emit cached containers if available for immediate display
            if (useCache && containerCache.list.length > 0) {
                console.log('[Performance] Using cached container list for initial display');
                socket.emit('containers', containerCache.list);
            }
            
            // Add timeout to prevent hanging connections
            const containerPromise = docker.listContainers({ all: true });
            const listStartTime = Date.now();
            
            const containers = await Promise.race([
                containerPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Docker operation timed out')), 10000)
                )
            ]);
            
            const listTime = Date.now() - listStartTime;
            console.log(`[Performance] Container list fetch completed in ${listTime}ms. Found ${containers.length} containers.`);
            
            // Send basic container list first without stats for faster initial rendering
            if (!useCache || options.skipStats) {
                const basicContainers = containers.map((container) => {
                    const portMatch = container.Ports?.find((port) => port.PublicPort);
                    return {
                        ...container,
                        PublishedPort: portMatch ? portMatch.PublicPort : null,
                        stats: containerStats[container.Id] || null // Use previously cached stats if available
                    };
                });
                
                // Update the cache with basic data
                containerCache.list = basicContainers;
                containerCache.timestamp = now;
                
                // Send basic container data immediately
                console.log(`[Performance] Sending basic container list after ${Date.now() - startTime}ms`);
                socket.emit('containers', basicContainers);
                
                // Skip stats collection if requested
                if (options.skipStats) {
                    activeOperations--;
                    socket.emit('operation', { type: 'refresh', status: 'complete', skipStats: true });
                    console.log(`[Performance] Skip stats mode - operation completed in ${Date.now() - startTime}ms`);
                    return;
                }
            }
            
            // Prepare container stats promises for running containers with improved parallelization
            const runningContainers = containers.filter(container => container.State === 'running');
            
            // Process stats in smaller batches to avoid overloading the Docker API
            const BATCH_SIZE = 5; // Process 5 containers at a time
            const batches = [];
            const statsMap = {};
            
            for (let i = 0; i < runningContainers.length; i += BATCH_SIZE) {
                batches.push(runningContainers.slice(i, i + BATCH_SIZE));
            }
            
            console.log(`[Performance] Processing stats in ${batches.length} batches of ${BATCH_SIZE} containers`);
            const statsStartTime = Date.now();
            let batchCount = 0;
            
            // Process each batch sequentially
            for (const batch of batches) {
                const batchStartTime = Date.now();
                batchCount++;
                console.log(`[Performance] Processing batch ${batchCount}/${batches.length} with ${batch.length} containers`);
                
                // Process containers in each batch in parallel
                const batchPromises = batch.map(async container => {
                    try {
                        // Get container stats with a timeout to prevent hanging
                        const containerObj = docker.getContainer(container.Id);
                        
                        const statsPromise = containerObj.stats({ stream: false });
                        const stats = await Promise.race([
                            statsPromise,
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Stats operation timed out')), 3000) // Shorter timeout
                            )
                        ]);
                        
                        // Calculate CPU percentage
                        let cpuPercent = 0;
                        if (stats.cpu_stats && stats.cpu_stats.cpu_usage && stats.cpu_stats.cpu_usage.total_usage) {
                            const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
                            const systemCpuDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
                            const numCpus = stats.cpu_stats.online_cpus || Object.keys(stats.cpu_stats.cpu_usage.percpu_usage || {}).length;
                            
                            if (systemCpuDelta > 0 && numCpus > 0) {
                                cpuPercent = (cpuDelta / systemCpuDelta) * numCpus * 100;
                            }
                        }
                        
                        // Calculate memory percentage
                        let memoryPercent = 0;
                        let memoryUsage = 0;
                        let memoryLimit = 0;
                        if (stats.memory_stats && stats.memory_stats.usage && stats.memory_stats.limit) {
                            memoryUsage = stats.memory_stats.usage;
                            memoryLimit = stats.memory_stats.limit;
                            memoryPercent = (memoryUsage / memoryLimit) * 100;
                        }
                        
                        // Convert bytes to MB for readability
                        const memoryUsageMB = memoryUsage ? (memoryUsage / 1024 / 1024).toFixed(2) : 0;
                        const memoryLimitMB = memoryLimit ? (memoryLimit / 1024 / 1024).toFixed(2) : 0;
                          const containerStatsData = {
                            cpuPercent: cpuPercent.toFixed(2),
                            memoryPercent: memoryPercent.toFixed(2),
                            memoryUsage: memoryUsageMB,
                            memoryLimit: memoryLimitMB
                        };
                        
                        // Store in maps
                        statsMap[container.Id] = containerStatsData;
                        containerStats[container.Id] = containerStatsData;
                        
                        return {
                            containerId: container.Id,
                            stats: containerStats
                        };
                    } catch (err) {
                        console.error(`Error fetching stats for ${container.Id}:`, err.message);
                        return {
                            containerId: container.Id,
                            stats: null
                        };
                    }
                });
                
                // Wait for current batch to complete before processing next batch
                const batchResults = await Promise.allSettled(batchPromises);
                console.log(`[Performance] Batch ${batchCount} completed in ${Date.now() - batchStartTime}ms`);
                
                // Immediately update any containers with stats as they become available
                // This provides progressive updates to the UI
                const updatedContainers = batch
                    .filter(container => statsMap[container.Id])
                    .map(container => {
                        const portMatch = container.Ports?.find((port) => port.PublicPort);
                        return {
                            ...container,
                            PublishedPort: portMatch ? portMatch.PublicPort : null,
                            stats: statsMap[container.Id]
                        };
                    });
                
                if (updatedContainers.length > 0) {
                    console.log(`[Performance] Emitting incremental stats update for ${updatedContainers.length} containers`);
                    // Emit incremental updates for the containers in this batch
                    socket.emit('containerStatsUpdate', updatedContainers);
                }
                
                const batchTime = Date.now() - batchStartTime;
                console.log(`[Performance] Batch ${batchCount}/${batches.length} processed in ${batchTime}ms`);
            }
            
            const totalStatsTime = Date.now() - statsStartTime;
            console.log(`[Performance] All batches processed in ${totalStatsTime}ms`);
            
            // Final update with all containers and their stats
            const formattedContainers = containers.map((container) => {
                const portMatch = container.Ports?.find((port) => port.PublicPort);
                return {
                    ...container,
                    PublishedPort: portMatch ? portMatch.PublicPort : null,
                    stats: statsMap[container.Id] || containerStats[container.Id] || null
                };
            });
            
            // Update cache with complete data
            containerCache.list = formattedContainers;
            containerCache.timestamp = Date.now();
            
            activeOperations--;
            console.log(`[Performance] Total operation completed in ${Date.now() - startTime}ms`);
            socket.emit('operation', { type: 'refresh', status: 'complete' });
            socket.emit('containers', formattedContainers);
        } catch (error) {
            activeOperations--;
            console.error('Docker Error:', error.message);
            socket.emit('operation', { type: 'refresh', status: 'error', message: error.message });
            socket.emit('error', error.message);
        }
    };

    // Initial fetch - First fetch just containers without stats for quick loading
    fetchContainers({ skipStats: true }); 
    
    // Then immediately queue up a full fetch with stats
    setTimeout(() => {
        fetchContainers({ forceRefresh: true });
    }, 500);
    
    // Set the interval for regular updates
    fetchContainersInterval = setInterval(() => fetchContainers(), SOCKET_UPDATE_INTERVAL);

    // Add a socket event to request containers without stats for faster loading
    socket.on('quickRefreshContainers', async () => {
        fetchContainers({ forceRefresh: true, skipStats: true });
    });

    socket.on('refreshContainers', async () => {
        fetchContainers({ forceRefresh: true });
    });

    socket.on('getContainerStats', async (containerId) => {
        try {
            if (!containerId) {
                socket.emit('error', "Container ID is required for stats");
                return;
            }
            
            console.log(`Getting stats for container: ${containerId}`);
            socket.emit('operation', { 
                type: 'containerStats', 
                containerId,
                status: 'start' 
            });
            
            // Get the container
            const container = docker.getContainer(containerId);
            
            // Get the stats for the container with a stream
            const stats = await container.stats({ stream: false });
            
            // Calculate CPU percentage
            let cpuPercent = 0;
            if (stats.cpu_stats.cpu_usage.total_usage) {
                const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
                const systemCpuDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
                const numCpus = stats.cpu_stats.online_cpus || Object.keys(stats.cpu_stats.cpu_usage.percpu_usage || {}).length;
                
                if (systemCpuDelta > 0 && numCpus > 0) {
                    cpuPercent = (cpuDelta / systemCpuDelta) * numCpus * 100;
                }
            }
            
            // Calculate memory percentage
            let memoryPercent = 0;
            let memoryUsage = 0;
            let memoryLimit = 0;
            if (stats.memory_stats.usage && stats.memory_stats.limit) {
                memoryUsage = stats.memory_stats.usage;
                memoryLimit = stats.memory_stats.limit;
                memoryPercent = (memoryUsage / memoryLimit) * 100;
            }
            
            // Convert bytes to MB for readability
            const memoryUsageMB = memoryUsage ? (memoryUsage / 1024 / 1024).toFixed(2) : 0;
            const memoryLimitMB = memoryLimit ? (memoryLimit / 1024 / 1024).toFixed(2) : 0;
            
            // Format values to be human-readable
            const formattedStats = {
                cpuPercent: cpuPercent.toFixed(2),
                memoryPercent: memoryPercent.toFixed(2),
                memoryUsage: memoryUsageMB,
                memoryLimit: memoryLimitMB
            };
            
            // Store stats for this container
            containerStats[containerId] = formattedStats;
            
            // Send the formatted stats
            socket.emit('containerStats', {
                containerId,
                stats: formattedStats
            });
            
            socket.emit('operation', { 
                type: 'containerStats', 
                containerId,
                status: 'complete' 
            });
            
        } catch (error) {
            console.error('Error getting container stats:', error.message);
            socket.emit('operation', { 
                type: 'containerStats', 
                containerId,
                status: 'error',
                message: error.message 
            });
        }
    });

    socket.on('containerAction', async (data) => {
        const { action, containerID } = data;

        if (!containerID) {
            console.error("Invalid container ID received");
            socket.emit('error', "Invalid container ID");
            return;
        }

        // Rate limit operations if needed
        if (activeOperations >= MAX_CONCURRENT_OPERATIONS) {
            socket.emit('error', "Too many concurrent operations. Please try again later.");
            return;
        }

        try {
            activeOperations++;
            socket.emit('operation', { 
                type: 'containerAction', 
                action,
                containerID,
                status: 'start' 
            });
            
            switch (action) {
                case 'start':
                    await docker.getContainer(containerID).start();
                    break;
                case 'stop':
                    await docker.getContainer(containerID).stop();
                    break;
                case 'restart':
                    await docker.getContainer(containerID).restart();
                    break;
                case 'delete':
                    await docker.getContainer(containerID).remove({ force: true });
                    break;
                default:
                    console.error("Invalid action:", action);
                    return;
            }
            
            activeOperations--;
            console.log(`Docker ${action} executed successfully`);
            socket.emit('operation', { 
                type: 'containerAction', 
                action,
                containerID,
                status: 'complete' 
            });
            
            // First send a quick refresh without stats
            fetchContainers({ forceRefresh: true, skipStats: true });
            
            // Then queue up a full refresh with stats
            setTimeout(() => {
                fetchContainers({ forceRefresh: true });
            }, 500);
        } catch (error) {
            activeOperations--;
            console.error('Docker Error:', error.message);
            socket.emit('operation', { 
                type: 'containerAction', 
                action,
                containerID,
                status: 'error',
                message: error.message
            });
            socket.emit('error', error.message);        }
    });

    // Docker exec terminal functionality
    socket.on('dockerExecConnect', async (data) => {
        const { containerId } = data;
        console.log(`Attempting Docker exec connection to container: ${containerId}`);
        
        try {
            if (!containerId) {
                socket.emit('dockerExecData', '\r\nError: Container ID is required\r\n');
                socket.emit('dockerExecClose');
                return;
            }

            // Get the container
            const container = docker.getContainer(containerId);
            
            // Check if container is running
            const containerInfo = await container.inspect();
            if (!containerInfo.State.Running) {
                socket.emit('dockerExecData', '\r\nError: Container is not running\r\n');
                socket.emit('dockerExecClose');
                return;
            }

            socket.emit('dockerExecData', `Connected to container: ${containerInfo.Name || containerId}\r\n`);
            socket.emit('dockerExecData', 'Starting shell...\r\n');

            // Create exec instance
            const exec = await container.exec({
                Cmd: ['/bin/bash'],
                AttachStdin: true,
                AttachStdout: true,
                AttachStderr: true,
                Tty: true
            });

            // Start the exec session
            const stream = await exec.start({
                hijack: true,
                stdin: true
            });

            // Handle data from container
            stream.on('data', (data) => {
                socket.emit('dockerExecData', data.toString('utf-8'));
            });

            // Handle stream close
            stream.on('close', () => {
                console.log('Docker exec stream closed');
                socket.emit('dockerExecClose');
            });

            stream.on('error', (err) => {
                console.error('Docker exec stream error:', err);
                socket.emit('dockerExecData', `\r\nStream error: ${err.message}\r\n`);
                socket.emit('dockerExecClose');
            });

            // Handle user input
            socket.on('dockerExecData', (data) => {
                try {
                    stream.write(data);
                } catch (err) {
                    console.error('Error writing to Docker exec stream:', err);
                }
            });

            // Store stream reference for cleanup
            socket.dockerExecStream = stream;
            socket.dockerExec = exec;

        } catch (error) {
            console.error('Docker exec connection error:', error);
            socket.emit('dockerExecData', `\r\nConnection error: ${error.message}\r\n`);
            socket.emit('dockerExecClose');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Clean up Docker exec stream if it exists
        if (socket.dockerExecStream) {
            try {
                socket.dockerExecStream.destroy();
            } catch (err) {
                console.error('Error cleaning up Docker exec stream:', err);
            }
        }
        
        activeConnections.delete(socket.id);
        io.emit('connectionCount', activeConnections.size);
        clearInterval(fetchContainersInterval);
    });
});

// --- START SERVER ---
server.listen(4002, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:4002');
});
