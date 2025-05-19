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
});

app.use(cors());

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
    
    let fetchContainersInterval;    const fetchContainers = async () => {
        if (Date.now() - socket.lastFetched < SOCKET_UPDATE_INTERVAL) return;
        socket.lastFetched = Date.now();

        try {
            socket.emit('operation', { type: 'refresh', status: 'start' });
            activeOperations++;
            
            // Add timeout to prevent hanging connections
            const containerPromise = docker.listContainers({ all: true });
            const containers = await Promise.race([
                containerPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Docker operation timed out')), 15000)
                )
            ]);
              // Prepare container stats promises for running containers
            const statsPromises = containers
                .filter(container => container.State === 'running')
                .map(async container => {
                    try {
                        console.log(`Fetching stats for container: ${container.Id}`);
                        // Get container stats with a timeout to prevent hanging
                        const containerObj = docker.getContainer(container.Id);
                        
                        const statsPromise = containerObj.stats({ stream: false });
                        const stats = await Promise.race([
                            statsPromise,
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Stats operation timed out')), 5000)
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
                        
                        return {
                            containerId: container.Id,
                            stats: {
                                cpuPercent: cpuPercent.toFixed(2),
                                memoryPercent: memoryPercent.toFixed(2),
                                memoryUsage: memoryUsageMB,
                                memoryLimit: memoryLimitMB
                            }
                        };
                    } catch (err) {
                        console.error(`Error fetching stats for ${container.Id}:`, err.message);
                        return {
                            containerId: container.Id,
                            stats: null
                        };
                    }
                });
            
            // Wait for all stats to be collected
            const statsResults = await Promise.allSettled(statsPromises);
            
            // Create a map of container ID to stats for fast lookup
            const statsMap = {};
            statsResults.forEach(result => {
                if (result.status === 'fulfilled' && result.value && result.value.stats) {
                    statsMap[result.value.containerId] = result.value.stats;
                    containerStats[result.value.containerId] = result.value.stats;
                }
            });
            
            // Rest of the function remains the same
            const formattedContainers = containers.map((container) => {
                const portMatch = container.Ports?.find((port) => port.PublicPort);
                return {
                    ...container,
                    PublishedPort: portMatch ? portMatch.PublicPort : null,
                    stats: statsMap[container.Id] || null
                };
            });
            
            activeOperations--;
            socket.emit('operation', { type: 'refresh', status: 'complete' });
            socket.emit('containers', formattedContainers);
        } catch (error) {
            activeOperations--;
            console.error('Docker Error:', error.message);
            socket.emit('operation', { type: 'refresh', status: 'error', message: error.message });
            socket.emit('error', error.message);
        }
    };

    fetchContainers(); // On connect
    fetchContainersInterval = setInterval(fetchContainers, SOCKET_UPDATE_INTERVAL);

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
            
            fetchContainers(); // Refresh the container list
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
            socket.emit('error', error.message);
        }
    });

    socket.on("createContainer", async (config) => {
        try {
            const { image, name, ports, environment, volumes } = config;
            
            // Update operation status to show we're working on it
            socket.emit("operation", {
                type: "containerAction",
                status: "start",
                action: "create",
                message: `Creating container from image ${image}...`
            });
            
            // Check if image exists locally, if not pull it
            try {
                await docker.getImage(image).inspect();
                console.log(`Image ${image} found locally`);
            } catch (err) {
                // Image not found locally, try to pull it
                console.log(`Image ${image} not found locally, pulling from registry...`);
                socket.emit("operation", {
                    type: "containerAction",
                    status: "start",
                    action: "pull",
                    message: `Pulling image ${image}...`
                });
                
                // Use stream to track pull progress
                const stream = await docker.pull(image);
                await new Promise((resolve, reject) => {
                    docker.modem.followProgress(stream, (err, output) => {
                        if (err) reject(err);
                        else resolve(output);
                    }, (event) => {
                        // Optional: emit progress updates if desired
                        if (event.progress) {
                            socket.emit("operation", {
                                type: "containerAction",
                                status: "progress",
                                action: "pull",
                                message: `Pulling ${image}: ${event.progress}`
                            });
                        }
                    });
                });
                
                socket.emit("operation", {
                    type: "containerAction",
                    status: "progress",
                    action: "create",
                    message: `Image pulled, creating container...`
                });
            }
            
            // Parse port mappings
            const portBindings = {};
            const exposedPorts = {};
            
            if (ports) {
                ports.split(',').forEach(portMapping => {
                    const [hostPort, containerPort] = portMapping.trim().split(':');
                    const containerPortWithProto = `${containerPort}/tcp`;
                    exposedPorts[containerPortWithProto] = {};
                    portBindings[containerPortWithProto] = [{ HostPort: hostPort }];
                });
            }
            
            // Parse environment variables
            const envArray = environment ? environment.split('\n').filter(line => line.trim()) : [];
            
            // Parse volumes
            const volumeBindings = [];
            if (volumes) {
                volumes.split('\n').forEach(volume => {
                    if (volume.trim()) {
                        const [hostPath, containerPath] = volume.trim().split(':');
                        volumeBindings.push(`${hostPath}:${containerPath}`);
                    }
                });
            }
            
            // Create container config
            const containerConfig = {
                Image: image,
                name: name || undefined,
                ExposedPorts: Object.keys(exposedPorts).length > 0 ? exposedPorts : undefined,
                HostConfig: {
                    PortBindings: Object.keys(portBindings).length > 0 ? portBindings : undefined,
                    Binds: volumeBindings.length > 0 ? volumeBindings : undefined
                },
                Env: envArray.length > 0 ? envArray : undefined
            };
            
            // Create and start container using Docker API
            const container = await docker.createContainer(containerConfig);
            await container.start();
            
            // Emit success message
            socket.emit("operation", {
                type: "containerAction",
                status: "complete",
                action: "create",
                message: `Container ${name || container.id.substring(0, 12)} created successfully`
            });
            
            // Send updated container list
            fetchContainers(); // Use your existing fetch function to update the container list
        } catch (error) {
            console.error("Error creating container:", error);
            socket.emit("operation", {
                type: "containerAction",
                status: "error",
                action: "create",
                message: error.message
            });
        }
    });    socket.on('refreshContainers', async () => {
        try {
            console.log('Manual refresh of containers requested');
            socket.emit('operation', { type: 'refresh', status: 'start' });
            
            const containers = await docker.listContainers({ all: true });
            const formattedContainers = containers.map((container) => {
                const portMatch = container.Ports?.find((port) => port.PublicPort);
                return {
                    ...container,
                    PublishedPort: portMatch ? portMatch.PublicPort : null,
                };
            });
            
            socket.emit('operation', { type: 'refresh', status: 'complete' });
            socket.emit('containers', formattedContainers);
            
            // Also broadcast to all clients for consistency
            socket.broadcast.emit('operation', { 
                type: 'containerList', 
                status: 'complete',
                message: 'Containers refreshed by another user',
                count: containers.length 
            });
        } catch (error) {
            console.error('Error refreshing containers:', error.message);
            socket.emit('operation', { type: 'refresh', status: 'error', message: error.message });
        }
    });

    socket.on('startAllContainers', async () => {
        try {
            socket.emit('operation', { 
                type: 'batchOperation', 
                action: 'start',
                status: 'start',
                message: 'Starting all containers...' 
            });
            
            // Get all stopped containers
            const containers = await docker.listContainers({ 
                all: true,
                filters: JSON.stringify({
                    status: ['created', 'exited', 'dead']
                }) 
            });
            
            if (containers.length === 0) {
                socket.emit('operation', { 
                    type: 'batchOperation', 
                    action: 'start',
                    status: 'complete',
                    message: 'No stopped containers to start' 
                });
                return;
            }
            
            // Start each container sequentially
            let successCount = 0;
            let errorCount = 0;
            
            for (const container of containers) {
                try {
                    await docker.getContainer(container.Id).start();
                    successCount++;
                } catch (containerError) {
                    console.error(`Error starting container ${container.Id}:`, containerError.message);
                    errorCount++;
                }
            }
            
            // Report completion
            socket.emit('operation', { 
                type: 'batchOperation', 
                action: 'start',
                status: 'complete',
                message: `Started ${successCount} containers. Failed: ${errorCount}.`
            });
            
            // Refresh container list for all clients
            const updatedContainers = await docker.listContainers({ all: true });
            const formattedContainers = updatedContainers.map((container) => {
                const portMatch = container.Ports?.find((port) => port.PublicPort);
                return {
                    ...container,
                    PublishedPort: portMatch ? portMatch.PublicPort : null,
                };
            });
            
            // Broadcast to all including the sender
            io.emit('containers', formattedContainers);
            
        } catch (error) {
            console.error('Error starting all containers:', error.message);
            socket.emit('operation', { 
                type: 'batchOperation', 
                action: 'start',
                status: 'error',
                message: error.message
            });
        }
    });    socket.on('stopAllContainers', async () => {
        console.log('Received stopAllContainers event');
        try {
            console.log('Emitting operation start event');
            socket.emit('operation', { 
                type: 'batchOperation', 
                action: 'stop',
                status: 'start',
                message: 'Stopping all containers...' 
            });
            
            // Get all running containers
            console.log('Fetching running containers');
            const containers = await docker.listContainers({
                filters: JSON.stringify({
                    status: ['running']
                })
            });
            
            console.log(`Found ${containers.length} running containers`);
            
            if (containers.length === 0) {
                console.log('No running containers to stop');
                socket.emit('operation', { 
                    type: 'batchOperation', 
                    action: 'stop',
                    status: 'complete',
                    message: 'No running containers to stop' 
                });
                return;
            }
            
            // Stop each container sequentially
            let successCount = 0;
            let errorCount = 0;
            
            console.log('Starting to stop containers...');            for (const container of containers) {
                try {
                    console.log(`Attempting to stop container ${container.Id} (${container.Names ? container.Names.join(', ') : 'unnamed'})`);
                    const containerObj = docker.getContainer(container.Id);
                    console.log('Container object retrieved, calling stop method');
                    
                    // Execute stop with timeout and error handling
                    try {
                        // Use a promise with timeout to avoid hanging
                        await Promise.race([
                            containerObj.stop(),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Docker stop operation timed out')), 15000)
                            )
                        ]);
                        
                        successCount++;
                        console.log(`Successfully stopped container ${container.Id}`);
                    } catch (stopError) {
                        if (stopError.statusCode === 304) {
                            // This is "container already stopped" - count as success
                            console.log(`Container ${container.Id} was already stopped (304)`);
                            successCount++;
                        } else {
                            throw stopError; // Re-throw for the outer catch block
                        }
                    }
                } catch (containerError) {
                    console.error(`Error stopping container ${container.Id}:`, containerError.message);
                    errorCount++;
                }
            }
              // Report completion
            console.log(`Completed stopping containers: ${successCount} successful, ${errorCount} failed`);
            socket.emit('operation', { 
                type: 'batchOperation', 
                action: 'stop',
                status: 'complete',
                message: `Stopped ${successCount} containers. Failed: ${errorCount}.`
            });
            
            // Refresh container list for all clients
            console.log('Refreshing container list after stopping containers');
            const updatedContainers = await docker.listContainers({ all: true });
            const formattedContainers = updatedContainers.map((container) => {
                const portMatch = container.Ports?.find((port) => port.PublicPort);
                return {
                    ...container,
                    PublishedPort: portMatch ? portMatch.PublicPort : null,
                };
            });
            
            // Broadcast to all including the sender
            console.log('Broadcasting updated containers to all clients');
            io.emit('containers', formattedContainers);
            
        } catch (error) {
            console.error('Error stopping all containers:', error.message);
            socket.emit('operation', { 
                type: 'batchOperation', 
                action: 'stop',
                status: 'error',
                message: error.message
            });
        }
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

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        activeConnections.delete(socket.id);
        io.emit('connectionCount', activeConnections.size);
        clearInterval(fetchContainersInterval);
    });
});

// --- START SERVER ---
server.listen(4002, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:4002');
});
