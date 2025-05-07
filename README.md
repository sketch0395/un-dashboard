# UN-Dashboard

UN-Dashboard is a comprehensive network monitoring and Docker management system that provides real-time visibility into your network devices and Docker containers. It enables network scanning, performance monitoring, Docker container management, and secure SSH connections from a unified web interface.

## Features

### Network Discovery & Visualization
- Advanced network scanning with SSH detection
- Interactive network topology visualization with multiple view options (circular, hierarchical, timeline)
- Device grouping by vendor, category, or scan source
- SSH connectivity to network devices directly from the interface

### Network Performance Monitoring
- Real-time latency, bandwidth, and uptime monitoring
- Historical performance data tracking and visualization
- System uptime monitoring for SSH-enabled devices
- Customizable monitoring intervals

### Docker Container Management
- Real-time Docker container status monitoring
- Start, stop, restart, and delete containers
- Create new containers with custom configurations
- Port mapping and volume configuration

### Additional Features
- Customizable device information (names, categories, colors, icons)
- Persistent data storage between sessions
- Responsive design for various screen sizes
- SSH terminal access directly from the browser

## Technologies Used
- **Frontend**: Next.js, React, TailwindCSS, Chart.js, D3.js
- **Backend**: Node.js, Express, Socket.IO
- **Docker**: Dockerode for Docker API interactions
- **Network Tools**: Nmap (via Docker), SSH2 for SSH connectivity

## Docker Images Used
- `jonlabelle/network-tools` - Used for network scanning and performance monitoring
- Your application containers that you manage via the dashboard

## Installation

### Prerequisites
- Node.js 14+ and npm
- Docker (remote or local)
- Network with devices to scan

### Setup Steps
1. Clone the repository
```bash
git clone https://github.com/yourusername/un-dashboard.git
cd un-dashboard
```

2. Install dependencies
```bash
npm install
```

3. Configure the application
   - Update any hardcoded IP addresses in server files
   - Configure Docker connection settings as needed

4. Start the development server
```bash
npm run dev
```

## Docker Setup on Remote Host

If you want to connect to a remote Docker host, follow these steps:

1. Set up /etc/docker/daemon.json on the remote host
```bash 
sudo nano /etc/docker/daemon.json
```
Paste this:

```json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}
```

Save and exit.

2. Override systemd to use the config

```bash
sudo systemctl edit docker
```

Paste this:

```bash
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd
```

Then run:
```bash 
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
```

3. Restart Docker & enable on boot

```bash
sudo systemctl restart docker
sudo systemctl enable docker
```

4. Test from another machine

```bash 
DOCKER_HOST=tcp://<your-server-ip>:2375 docker ps
```

## Usage

1. **Home Dashboard**: Displays Docker container status and quick access links
   
2. **Network Scan**: 
   - Set IP range and click "Start Network Scan"
   - View discovered devices in topology view
   - Click on devices for detailed information
   - Connect to SSH-enabled devices directly

3. **Performance Monitoring**:
   - Select devices to monitor
   - Choose auto-refresh interval
   - View real-time and historical performance data
   - Monitor latency, bandwidth, and uptime

4. **Docker Management**:
   - View all containers and their status
   - Perform container operations (start, stop, restart, delete)
   - Create new containers with custom settings
   
## Architecture

UN-Dashboard uses a client-server architecture:
- **Backend Servers**:
  - `server-network.js`: Handles network scanning and performance monitoring
  - `server-docker.js`: Manages Docker container operations
- **Frontend**: Next.js application with React components
- **Communication**: Socket.IO for real-time data exchange

## Security Notes

- This dashboard exposes Docker's API on port 2375 without TLS encryption
- For production environments, consider adding TLS certificates
- Limit network access to the Docker API port using firewalls
- Consider implementing authentication for the dashboard

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the terms of the license included in the repository.