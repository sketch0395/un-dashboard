# un-dashboard

A network monitoring and Docker management dashboard for local networks.

## Features

### Network Scan Page
The Network Scan page provides comprehensive tools for discovering and analyzing devices on your network:
- **Device Discovery**: Scans your specified IP range to identify all active devices
- **Device Classification**: Automatically categorizes devices by vendor and device type
- **Port Scanning**: Identifies open ports and running services on discovered devices
- **Header Analysis**: Uses Docker network tools to inspect HTTP headers, SSL/TLS information, and TCP fingerprints
- **Historical Scanning**: Saves scan results for later reference and comparison
- **Visual Timeline**: Shows device changes and availability over time
- **SSH Connection**: Connect directly to devices with SSH capability
- **Custom Device Properties**: Add custom names, icons, and notes to devices for better organization

### Network Performance Page
The Network Performance page monitors and tracks the performance metrics of selected network devices:
- **Latency Monitoring**: Tracks ping times and packet loss for selected devices
- **Bandwidth Testing**: Measures upload and download speeds using iperf3
- **Uptime Tracking**: Monitors device availability over time with percentage calculations
- **Connection Quality**: Analyzes jitter, packet loss, and network stability
- **Path Analysis**: Identifies network bottlenecks and problematic hops between devices
- **Historical Data**: Maintains performance history for trend analysis
- **Scheduled Monitoring**: Supports automatic monitoring at configurable intervals
- **Visual Graphs**: Presents data through interactive charts for easy analysis

## Docker Containers Used

This project uses several Docker containers for various functions:

### Network Tools Container
- **Image**: `jonlabelle/network-tools`
- **Purpose**: A persistent container used for network scanning, header analysis, and performance testing.
- **Features**:
  - Network performance measurements (latency, bandwidth)
  - Port scanning and service detection
  - HTTP header analysis
  - SSL/TLS analysis
  - TCP/IP fingerprinting

### Network Scanning Container
- **Image**: `instrumentisto/nmap`
- **Purpose**: Dedicated container for comprehensive network scans.
- **Features**:
  - Network device discovery
  - OS fingerprinting
  - Service detection

### Additional Function-specific Containers
The dashboard allows you to create and manage various Docker containers through the UI, including:
- Web servers
- Database containers
- Custom application containers

## Docker Setup on remote
1. Set up /etc/docker/daemon.json
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