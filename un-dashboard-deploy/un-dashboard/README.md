# Nexus Control

A comprehensive network monitoring and Docker management system built with [Next.js](https://nextjs.org).

## Project Overview

Nexus Control offers advanced network topology visualization and management features:

- Interactive network maps with circular, hierarchical, and geographic views
- Device categorization and custom naming
- Gateway and switch role designation with visual relationships
- Main gateway designation with visual indicators
- Real-time SSH connectivity from the browser
- Docker container management with terminal access
- Robust Socket.IO connection handling for reliable real-time updates

## Docker Integration

This system extensively uses Docker containers for various network operations and management tasks. The system connects to a remote Docker daemon at `10.5.1.212:2375` and utilizes several containerized tools.

### Container Infrastructure

#### Remote Docker Host: `10.5.1.212:2375`
- **Purpose**: Central Docker daemon hosting all containerized network tools and services
- **Configuration**: Remote Docker API access on port 2375
- **Usage**: All Docker operations are performed on this remote host

#### Network Scanning & Monitoring Containers

##### 1. `jonlabelle/network-tools` (Primary Network Tools Container)
- **Purpose**: Comprehensive network scanning, monitoring, and analysis
- **Usage**: 
  - Network topology discovery using NMAP
  - SSH service detection and enumeration
  - Latency measurement (ping operations)
  - Port scanning and service identification
  - OS detection and fingerprinting
- **Deployment**: 
  - Created as persistent container named `nexus-control-network-tools`
  - Uses bridge networking mode for cross-platform compatibility
  - Includes tools: nmap, ping, curl, iperf3, ssh utilities
- **Features**:
  - Enhanced SSH authentication method detection
  - MAC address discovery for local network devices
  - Service version detection
  - Command queueing system for efficient resource usage

##### 2. iPerf3 Server Container (Performance Testing)
- **Purpose**: Network bandwidth measurement and performance testing
- **Location**: Running on `10.5.1.212:5201`
- **Usage**:
  - Download speed testing (reverse mode: `-R`)
  - Upload speed testing (standard mode)
  - Real-time bandwidth monitoring
  - Network performance baseline establishment
- **Integration**: Used by the persistent network-tools container for bandwidth tests

### Container Management Features

#### SSH Terminal Access to Containers
- **Purpose**: Direct shell access to running Docker containers
- **Implementation**: Real-time terminal sessions using xterm.js and WebSocket connections
- **Features**:
  - Multi-shell support (bash, sh, ash)
  - Real-time command execution
  - Terminal resizing and formatting
  - Session cleanup and management
- **Security**: Authenticated access through the Docker API

#### Container Lifecycle Management
- **Operations**: Start, stop, restart, delete containers
- **Monitoring**: Real-time container status and statistics
- **Creation**: Dynamic container deployment with custom configurations
- **Performance**: Container resource usage monitoring (CPU, memory, network)

### Network Discovery Configuration

#### Docker-Enhanced Network Scanning
- **Default Mode**: Uses `jonlabelle/network-tools` container for improved reliability
- **Fallback Mode**: Host-based scanning when Docker is unavailable
- **Benefits**:
  - Consistent scanning environment across different host systems
  - Better MAC address detection capabilities
  - Enhanced SSH service identification
  - Improved cross-platform compatibility

#### SSH Connection Management
- **Direct SSH**: Browser-based SSH terminal connections to network devices
- **Container SSH**: Terminal access to running Docker containers
- **Authentication**: Support for username/password and key-based authentication
- **Session Management**: Real-time terminal sessions with proper cleanup

### Environment Configuration

#### Required Environment Variables
```bash
# Network Configuration
DEFAULT_IP_RANGE=10.5.1.130-255          # Default scanning range
DEFAULT_PORTS=22,80,443                   # Default ports to scan
USE_DOCKER_NETWORK_TOOLS=true            # Enable Docker-based tools

# SSH Configuration
DEFAULT_SSH_USER=admin                    # Default SSH username
DEFAULT_SSH_PASSWORD=admin                # Default SSH password

# Docker Configuration
DOCKER_HOST=10.5.1.212                   # Remote Docker daemon host
DOCKER_PORT=2375                          # Docker API port
```

#### Container Deployment Modes
1. **Bridge Mode**: Default networking for cross-platform compatibility
2. **Host Mode**: Direct host networking on Linux systems for enhanced performance
3. **Persistent Mode**: Long-running containers with command queueing
4. **Ephemeral Mode**: Single-use containers for specific operations

## Getting Started

### Dependencies

Make sure you have Node.js (v14 or higher) and npm installed.

```bash
# Install dependencies
npm install
```

### Running the Application

1. **Start all servers with the unified development command:**

```bash
npm run dev
```

This will start all required servers concurrently:
- **Next.js** (port 3000) - Main web application
- **Network Server** (port 4000) - Network scanning and SSH connections  
- **Docker Server** (port 4002) - Container management
- **Collaboration Server** (port 4001) - Real-time collaboration features

2. **Alternative - Start servers individually (if needed):**

```bash
# Main web application
next dev

# Network scanning server
node server-network.js

# Docker management server  
node server-docker.js

# Collaboration server
node collaboration-server-standalone.js
```

3. **Test collaboration server separately:**

```bash
npm run test:collaboration
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

> **Important**: All servers (Next.js, Network, Docker, and Collaboration) are now started automatically with `npm run dev`. If you encounter connection issues, check that all servers are running and using the correct ports.

### Docker Requirements

#### Remote Docker Daemon Setup
1. **Configure Docker daemon** on `10.5.1.212` to accept remote connections:
   ```bash
   # Edit Docker daemon configuration
   sudo systemctl edit docker.service
   
   # Add the following:
   [Service]
   ExecStart=
   ExecStart=/usr/bin/dockerd -H fd:// -H tcp://0.0.0.0:2375
   
   # Restart Docker
   sudo systemctl daemon-reload
   sudo systemctl restart docker
   ```

2. **Pull required images** on the Docker host:
   ```bash
   docker pull jonlabelle/network-tools
   # This image includes: nmap, ping, curl, iperf3, ssh, and other network utilities
   ```

3. **Set up iPerf3 server** for bandwidth testing:
   ```bash
   docker run -d --name iperf3-server -p 5201:5201 networkstatic/iperf3 -s
   ```

#### Container Permissions
- Ensure the Docker daemon has appropriate network access
- Configure firewall rules to allow container network scanning
- Set up proper DNS resolution for container networking

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a custom font family.

## System Architecture

### Server Components

#### 1. Next.js Development Server (Port 3000)
- **Purpose**: Main web application interface
- **Features**: React-based dashboard, real-time updates, responsive design

#### 2. Network Scanning Server (Port 4000)
- **File**: `server-network.js`
- **Purpose**: Network discovery, SSH connections, performance monitoring
- **Docker Integration**: Manages `jonlabelle/network-tools` containers
- **Features**:
  - NMAP-based network scanning
  - SSH terminal proxy
  - Bandwidth testing with iPerf3
  - Historical performance data storage

#### 3. Docker Management Server (Port 4002)
- **Files**: `server-docker.js` or `server-docker-optimized.js`
- **Purpose**: Docker container management and monitoring
- **Features**:
  - Container lifecycle management (start/stop/restart/delete)
  - Real-time container statistics
  - Docker exec terminal sessions
  - Container creation and configuration

#### 4. Collaboration Server (Port 4001)
- **File**: `collaboration-server-standalone.js`
- **Purpose**: Real-time collaboration for shared network scans
- **Features**:
  - WebSocket-based real-time collaboration
  - Multi-user scan sharing and editing
  - Real-time cursor tracking and user presence
  - Synchronization of device updates across users
  - Session management and persistence

### Container Orchestration

#### Persistent Container Management
- **Container Name**: `nexus-control-network-tools`
- **Lifecycle**: Long-running with restart policy `unless-stopped`
- **Command Queue**: Manages concurrent network operations
- **Resource Optimization**: Reuses containers to minimize overhead

#### Performance Optimization
- **Connection Pooling**: Efficient Docker API connection management
- **Batch Operations**: Grouped container operations for better performance
- **Caching**: Container statistics and network data caching
- **Background Processing**: Non-blocking network scanning operations

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Recent Improvements

### Docker Terminal Integration (Latest)

- **Container SSH Access**: Added real-time terminal access to running Docker containers
  - Multi-shell support (bash, sh, ash) with automatic fallback
  - xterm.js integration for full terminal emulation
  - WebSocket-based bidirectional communication
  - Proper session cleanup and error handling

- **Enhanced Container Management**:
  - Real-time container statistics monitoring
  - Batch container operations (start/stop all)
  - Container creation with custom configurations
  - Port mapping and volume management

### Network Tool Containerization (December 2024)

- **Docker-Based Network Scanning**:
  - Migrated from host-based tools to containerized `jonlabelle/network-tools`
  - Persistent container management with command queueing
  - Enhanced SSH service detection and authentication methods
  - Cross-platform compatibility improvements

- **Performance Monitoring Enhancements**:
  - iPerf3 integration for accurate bandwidth measurement
  - Historical performance data collection and storage
  - Real-time latency and packet loss monitoring
  - Docker-based network connectivity testing

### Socket.IO Connection Enhancements (July 2023)

- **Client-Side Improvements**:
  - Enhanced reconnection logic with configurable retry attempts
  - Implemented proper event listener cleanup to prevent memory leaks
  - Added comprehensive error handling with specific error messages
  - Optimized transport selection with websocket prioritization

- **Server-Side Improvements**:
  - Configured CORS to allow connections from multiple origins
  - Optimized ping timeouts and intervals for better connection stability
  - Enhanced transport support with both websocket and polling options
  - Added request logging for better debugging capabilities

### Bug Fixes

- Fixed "nodeMap is not defined" error in HierarchicalNetworkView by correcting variable scope
- Resolved device connection initialization issues in UnifiedDeviceModal
- Eliminated duplicate imports in component files
- Fixed Socket.IO "xhr poll error" connection failures
- Resolved Docker container network connectivity issues
- Fixed terminal dimensions initialization errors

## Deployment Options

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Local Production Deployment

For local production deployment:

```bash
# Build the application
npm run build

# Start the production server
npm start
```

Make sure both the Next.js server and the network scanning server are running for full functionality.

## Contributing

Contributions to Nexus Control are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### Socket.IO Connection Issues

If you encounter Socket.IO connection problems:

1. **"xhr poll error" messages**:
   - Ensure the network scanning server (`server-network.js`) is running
   - Check that the server URL in your client configuration matches the actual server address
   - Verify there are no firewall rules blocking the connection

2. **Connection timeouts**:
   - The application is configured to retry connections automatically
   - Check network connectivity between client and server
   - Ensure the server is not overloaded

3. **CORS errors**:
   - If accessing from a different origin than configured, add the origin to the CORS settings in `server-network.js`

### Other Common Issues

- **Network scans not working**: Ensure you have proper permissions to perform network scans (may require admin/root privileges)
- **Docker commands failing**: Verify Docker daemon is running and current user has permissions to access it
- **Visualization not showing**: Check browser console for JavaScript errors and ensure data is being properly received from the server
