import { UAParser } from "ua-parser-js";
import os from "os";
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(req) {
  try {
    console.log("API /api/system-info called"); // Debugging log

    // Get client IP address
    const forwardedFor = req.headers.get("x-forwarded-for");
    console.log("Forwarded-For Header:", forwardedFor); // Debugging log
    const clientIp = forwardedFor?.split(",")[0] || "Unknown";
    console.log("Client IP:", clientIp); // Debugging log

    // Parse User-Agent header
    const userAgentString = req.headers.get("user-agent") || "Unknown";
    console.log("User-Agent Header:", userAgentString); // Debugging log

    // Instantiate UAParser
    let userAgent;
    try {
      const parser = new UAParser(userAgentString);
      userAgent = parser.getResult();
      console.log("Parsed User-Agent:", userAgent); // Debugging log
    } catch (uaError) {
      console.error("🚨 Error parsing User-Agent:", uaError.message);
      userAgent = {
        device: { type: "Unknown" },
        os: { name: "Unknown", version: "" },
        browser: { name: "Unknown", version: "" },
      };
    }

    const clientInfo = {
      ip: clientIp,
      device: userAgent.device.type || "Unknown",
      os: `${userAgent.os.name} ${userAgent.os.version}`.trim() || "Unknown",
      browser: `${userAgent.browser.name} ${userAgent.browser.version}`.trim() || "Unknown",
    };

    console.log("Client Info:", clientInfo); // Debugging log

    // Fetch host system information
    const hostInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      osType: os.type(),
      osRelease: os.release(),
      architecture: os.arch(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
    };

    console.log("Host Info:", hostInfo); // Debugging log

    const responseInfo = {
      client: clientInfo,
      host: hostInfo,
    };

    return new Response(JSON.stringify(responseInfo), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("🚨 Error fetching system info:", error.message);

    return new Response(
      JSON.stringify({ error: "Failed to fetch system information", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { action, scanType = 'ping', ipRange = '192.168.1.1-255' } = data;

    if (action === 'scan') {
      // Execute network scan using our test-nmap.js script
      const scriptPath = path.join(process.cwd(), 'test-nmap.js');
      
      // Pass scan type and IP range as environment variables
      const env = {
        ...process.env,
        SCAN_TYPE: scanType,
        IP_RANGE: ipRange
      };
      
      const { stdout, stderr } = await execAsync(`node ${scriptPath}`, { env });
      
      // Parse the scan results to extract structured data including MAC addresses and vendors
      const hosts = parseNmapOutput(stdout);
      
      return NextResponse.json({
        status: 'success',
        hosts,
        raw: stdout,
        scanType,
        ipRange
      });
    }
    
    return NextResponse.json({
      status: 'error',
      message: 'Invalid action'
    }, { status: 400 });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Parse nmap output to extract host information including MAC addresses and vendors
function parseNmapOutput(output) {
  const lines = output.split('\n');
  const hosts = [];
  let currentHost = null;
  let captureMAC = false;
  
  lines.forEach(line => {
    // New host detection
    if (line.includes('Nmap scan report for')) {
      // Save the previous host if exists
      if (currentHost) {
        hosts.push(currentHost);
      }
      
      const ipMatch = line.match(/for\s+([0-9.]+)/);
      if (ipMatch) {
        currentHost = {
          ip: ipMatch[1],
          status: line.includes('[host down]') ? 'down' : 'up',
          ports: [],
          osInfo: [],
          osDetails: {
            name: null,
            accuracy: null,
            uptime: null,
            uptimeLastBoot: null,
            networkDistance: null,
            tcpSequence: null,
            ipIdSequence: null
          },
          mac: null,
          vendor: null
        };
      }
    }
    // Host status detection
    else if (currentHost && line.includes('Host is up')) {
      currentHost.status = 'up';
      
      // Extract latency if available
      const latencyMatch = line.match(/\(([0-9.]+)s latency\)/);
      if (latencyMatch) {
        currentHost.latency = parseFloat(latencyMatch[1]);
      }
    }
    // MAC Address detection - improved to handle multiple formats
    else if (currentHost && (line.includes('MAC Address:') || line.includes('MAC:'))) {
      const macLine = line.trim();
      // Extract MAC address - handles "MAC Address: XX:XX:XX:XX:XX:XX (Vendor)" format
      const macMatch = macLine.match(/(?:MAC Address:|MAC:)\s+([0-9A-Fa-f:]{17})/);
      if (macMatch) {
        currentHost.mac = macMatch[1];
        
        // Extract vendor information if available
        const vendorMatch = macLine.match(/(?:MAC Address:|MAC:)\s+[0-9A-Fa-f:]{17}\s+\(([^)]+)\)/);
        if (vendorMatch) {
          currentHost.vendor = vendorMatch[1];
        }
      }
    }
    // Port information
    else if (currentHost && (line.match(/^\d+\/tcp/) || line.match(/^\d+\/udp/))) {
      currentHost.ports.push(line.trim());
    }
    // OS detection information
    else if (currentHost && (
      line.includes('OS:') || 
      line.includes('Device type:') || 
      line.includes('Running:') || 
      line.includes('OS CPE:') || 
      line.includes('OS details:') ||
      line.includes('Uptime guess:') ||
      line.includes('Network Distance:') ||
      line.includes('TCP Sequence Prediction:') ||
      line.includes('IP ID Sequence Generation:')
    )) {
      // Save raw OS information
      if (line.trim()) {
        currentHost.osInfo.push(line.trim());
      }
      
      // Extract structured OS information
      if (line.includes('OS details:')) {
        currentHost.osDetails.name = line.split('OS details:')[1].trim();
      }
      else if (line.includes('Accuracy:')) {
        const accuracyMatch = line.match(/Accuracy:\s*(\d+)/i);
        if (accuracyMatch) {
          currentHost.osDetails.accuracy = parseInt(accuracyMatch[1]);
        }
      }
      else if (line.includes('Uptime guess:')) {
        const uptimeMatch = line.match(/Uptime guess:\s*([\d.]+)\s*(\w+)/i);
        if (uptimeMatch) {
          currentHost.osDetails.uptime = `${uptimeMatch[1]} ${uptimeMatch[2]}`;
        }
        
        // Extract last boot time if present
        const bootTimeMatch = line.match(/\(since\s+(.*?)\)/i);
        if (bootTimeMatch) {
          currentHost.osDetails.uptimeLastBoot = bootTimeMatch[1];
        }
      }
      else if (line.includes('Network Distance:')) {
        const distanceMatch = line.match(/Network Distance:\s*(\d+)/i);
        if (distanceMatch) {
          currentHost.osDetails.networkDistance = `${distanceMatch[1]} hops`;
        }
      }
      else if (line.includes('TCP Sequence Prediction:')) {
        const tcpSeqMatch = line.match(/TCP Sequence Prediction:\s*(.*)/i);
        if (tcpSeqMatch) {
          currentHost.osDetails.tcpSequence = tcpSeqMatch[1];
        }
      }
      else if (line.includes('IP ID Sequence Generation:')) {
        const ipIdMatch = line.match(/IP ID Sequence Generation:\s*(.*)/i);
        if (ipIdMatch) {
          currentHost.osDetails.ipIdSequence = ipIdMatch[1];
        }
      }
    }
  });
  
  // Add the last host if exists
  if (currentHost) {
    hosts.push(currentHost);
  }
  
  return hosts;
}