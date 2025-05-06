import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Higher timeout for nmap scans (120 seconds)
const NMAP_TIMEOUT = 120000;
// Shorter timeout for other commands (15 seconds)
const DEFAULT_TIMEOUT = 15000;

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        let ip = searchParams.get('ip');

        if (!ip) {
            return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
        }

        // Handle IP addresses that might include a hostname
        if (ip.includes('(') && ip.includes(')')) {
            ip = ip.match(/\(([^)]+)\)/)[1]; // Extract IP from format "hostname (IP)"
        }

        // Set a longer overall timeout for the entire request (2 minutes)
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
            abortController.abort();
        }, 120000);

        try {
            // Use docker-network-tools to scan the device
            const headers = await getDeviceHeaders(ip, abortController.signal);
            clearTimeout(timeoutId);
            return NextResponse.json({ headers, ip });
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                return NextResponse.json({ 
                    error: 'Scan operation timed out', 
                    headers: { 
                        http: {}, 
                        tcp: {}, 
                        ssl: { enabled: false }, 
                        services: [], 
                        userAgents: [],
                        error: 'Timeout'
                    } 
                }, { status: 408 }); // 408 = Request Timeout
            }
            throw error;
        }
    } catch (error) {
        console.error('Error in headers scan:', error);
        return NextResponse.json({ 
            error: error.message || 'Failed to scan device headers',
            headers: { 
                http: {}, 
                tcp: {}, 
                ssl: { enabled: false }, 
                services: [], 
                userAgents: [],
                error: error.message
            } 
        }, { status: 500 });
    }
}

async function getDeviceHeaders(ip, abortSignal) {
    try {
        // Check if the docker image exists using Windows-compatible commands
        let dockerImageExists = false;
        try {
            const checkDockerWindows = await execPromise('docker image ls | findstr jonlabelle/network-tools', 
                { timeout: DEFAULT_TIMEOUT });
            dockerImageExists = checkDockerWindows.stdout.includes('jonlabelle/network-tools');
        } catch (error) {
            // If findstr fails, try using PowerShell to check
            try {
                const psCheckDocker = await execPromise(
                    'powershell -Command "(docker image ls) -match \'jonlabelle/network-tools\'"', 
                    { timeout: DEFAULT_TIMEOUT }
                );
                dockerImageExists = psCheckDocker.stdout.trim().length > 0;
            } catch (e) {
                console.log('Could not check for docker image with PowerShell either, assuming not present');
                dockerImageExists = false;
            }
        }
        
        // If image not available, pull it
        if (!dockerImageExists) {
            console.log('Docker image not found, pulling jonlabelle/network-tools...');
            await execPromise('docker pull jonlabelle/network-tools', { timeout: 60000 }); // 60 second timeout for pull
        }

        // Headers object to store all scan results
        const headers = {
            http: {},
            tcp: {},
            ssl: { enabled: false },
            services: [],
            userAgents: [] // Add user agent storage
        };

        // Use a more targeted nmap scan to reduce timeout issues
        // -T4 for faster timing, -F for fast scan mode, reduce service detection comprehensiveness
        try {
            // Run Nmap scan for open ports and service detection
            const nmapCommand = `docker run --rm jonlabelle/network-tools nmap -F -T4 -Pn ${ip}`;
            const nmapResult = await execPromise(nmapCommand, { timeout: NMAP_TIMEOUT });
            
            // Parse basic Nmap results for ports
            const portRegex = /(\d+)\/(\w+)\s+(\w+)/g;
            let portMatch;
            
            while ((portMatch = portRegex.exec(nmapResult.stdout)) !== null) {
                const [, port, protocol, state] = portMatch;
                
                if (state === 'open') {
                    headers.tcp.openPorts = headers.tcp.openPorts || [];
                    headers.tcp.openPorts.push(`${port}/${protocol}`);
                    
                    // Add to services with minimal info
                    headers.services.push({
                        port,
                        protocol,
                        name: 'unknown',
                        version: ''
                    });
                }
            }
            
            // Try more detailed service scan only for specific ports
            if (headers.tcp.openPorts && headers.tcp.openPorts.length > 0) {
                const commonPorts = headers.tcp.openPorts
                    .filter(p => ['80/tcp', '443/tcp', '22/tcp', '21/tcp', '25/tcp', '8080/tcp'].includes(p))
                    .map(p => p.split('/')[0])
                    .join(',');
                
                if (commonPorts) {
                    try {
                        const detailedCommand = `docker run --rm jonlabelle/network-tools nmap -sV -p ${commonPorts} ${ip}`;
                        const detailedResult = await execPromise(detailedCommand, { timeout: NMAP_TIMEOUT });
                        
                        // Parse for service info
                        const serviceRegex = /(\d+)\/(\w+)\s+(\w+)\s+(.+)/g;
                        let serviceMatch;
                        
                        while ((serviceMatch = serviceRegex.exec(detailedResult.stdout)) !== null) {
                            const [, port, protocol, state, serviceInfo] = serviceMatch;
                            
                            if (state === 'open') {
                                const name = serviceInfo.split(' ')[0];
                                const version = serviceInfo.includes('version') ? 
                                    serviceInfo.match(/version ([^ ]+)/)?.[1] : '';
                                
                                // Update the existing service entry
                                const existingService = headers.services.find(s => s.port === port && s.protocol === protocol);
                                if (existingService) {
                                    existingService.name = name;
                                    existingService.version = version || '';
                                }
                                
                                // Check for web services
                                if (['http', 'https'].includes(name.toLowerCase())) {
                                    // Get HTTP headers for web services
                                    const protocol = name.toLowerCase() === 'https' ? 'https' : 'http';
                                    await getHttpHeaders(ip, port, protocol, headers);
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Detailed service scan failed:', e.message);
                    }
                }
            }

            // TTL detection
            const ttlMatch = nmapResult.stdout.match(/ttl=(\d+)/i);
            if (ttlMatch) {
                headers.tcp.ttl = ttlMatch[1];
            }
        } catch (nmapError) {
            console.error('Error during nmap scan:', nmapError);
            // Continue with other scans even if nmap fails
        }
        
        // For SSL/TLS information on known HTTPS ports
        if (headers.tcp.openPorts && headers.tcp.openPorts.some(p => p === '443/tcp' || p === '8443/tcp')) {
            await getSslInfo(ip, headers);
        }

        // Try to get HTTP headers on common web ports even if nmap failed
        if (Object.keys(headers.http).length === 0) {
            const commonWebPorts = ['80', '443', '8080', '8443'];
            
            for (const port of commonWebPorts) {
                // Try both HTTP and HTTPS
                for (const protocol of ['http', 'https']) {
                    // Skip HTTPS on non-standard SSL ports to save time
                    if (protocol === 'https' && port !== '443' && port !== '8443') continue;
                    
                    try {
                        await getHttpHeaders(ip, port, protocol, headers);
                        
                        // If this is an HTTPS port, get SSL info
                        if (protocol === 'https') {
                            await getSslInfo(ip, headers, port);
                        }
                    } catch (e) {
                        // Just continue trying other ports
                    }
                }
            }
        }

        // Look specifically for user agent strings by probing several common services
        try {
            await getUserAgentStrings(ip, headers);
        } catch (e) {
            console.error('Error getting user agent strings:', e);
        }

        return headers;
    } catch (error) {
        console.error('Error in getDeviceHeaders:', error);
        // Return partial results if available
        return {
            error: error.message,
            http: {},
            tcp: {},
            ssl: { enabled: false },
            services: [],
            userAgents: []
        };
    }
}

async function getHttpHeaders(ip, port, protocol, headers) {
    try {
        // Use curl to get HTTP headers with a shorter timeout
        const curlCommand = `docker run --rm jonlabelle/network-tools curl -s -I -m 5 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" ${protocol}://${ip}:${port}`;
        const curlResult = await execPromise(curlCommand, { timeout: DEFAULT_TIMEOUT });
        
        // Parse headers
        const headerLines = curlResult.stdout.split('\n');
        
        headerLines.forEach(line => {
            const parts = line.split(':');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join(':').trim();
                if (key && value) {
                    headers.http[key] = value;
                    
                    // Check if this is a server header that might contain user agent info
                    if (key.toLowerCase() === 'server') {
                        if (!headers.userAgents.some(ua => ua.value === value)) {
                            headers.userAgents.push({
                                type: 'Server',
                                value: value,
                                source: `${protocol}://${ip}:${port}`
                            });
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.log(`Failed to get HTTP headers for ${ip}:${port}: ${error.message}`);
    }
}

async function getSslInfo(ip, headers, port = '443') {
    try {
        // Use openssl to get SSL certificate info with a shorter timeout
        const opensslCommand = `docker run --rm jonlabelle/network-tools bash -c "echo | openssl s_client -connect ${ip}:${port} -servername ${ip} 2>/dev/null | openssl x509 -noout -text"`;
        const opensslResult = await execPromise(opensslCommand, { timeout: DEFAULT_TIMEOUT });
        
        if (opensslResult.stdout) {
            headers.ssl.enabled = true;
            
            // Extract certificate information
            const subjectMatch = opensslResult.stdout.match(/Subject: (.+)/i);
            const issuerMatch = opensslResult.stdout.match(/Issuer: (.+)/i);
            const validToMatch = opensslResult.stdout.match(/Not After : (.+)/i);
            
            headers.ssl.certificate = {
                subject: subjectMatch ? subjectMatch[1] : 'Unknown',
                issuer: issuerMatch ? issuerMatch[1] : 'Unknown',
                expiry: validToMatch ? validToMatch[1] : 'Unknown'
            };
            
            // Get SSL/TLS version using Windows-compatible command
            const versionCommand = `docker run --rm jonlabelle/network-tools bash -c "echo | openssl s_client -connect ${ip}:${port} 2>/dev/null | grep 'Protocol :'"`;
            const versionResult = await execPromise(versionCommand, { timeout: DEFAULT_TIMEOUT });
            
            if (versionResult.stdout) {
                const versionMatch = versionResult.stdout.match(/Protocol\s*:\s*(.+)/i);
                headers.ssl.version = versionMatch ? versionMatch[1].trim() : 'Unknown';
            }
            
            // Get cipher using Windows-compatible command
            const cipherCommand = `docker run --rm jonlabelle/network-tools bash -c "echo | openssl s_client -connect ${ip}:${port} 2>/dev/null | grep 'Cipher    :'"`;
            const cipherResult = await execPromise(cipherCommand, { timeout: DEFAULT_TIMEOUT });
            
            if (cipherResult.stdout) {
                const cipherMatch = cipherResult.stdout.match(/Cipher\s*:\s*(.+)/i);
                headers.ssl.cipher = cipherMatch ? cipherMatch[1].trim() : 'Unknown';
            }
        }
    } catch (error) {
        console.log(`Failed to get SSL info for ${ip}:${port}: ${error.message}`);
        // SSL is not enabled or there was an error
        headers.ssl.enabled = false;
    }
}

// Function to specifically probe for user agent strings
async function getUserAgentStrings(ip, headers) {
    try {
        // Get the open ports from our headers if we have them
        const openPorts = headers.tcp.openPorts ? 
            headers.tcp.openPorts.map(p => p.split('/')[0]) : 
            ['80', '443', '8080', '8443'];
        
        // Only try ports we know are open
        const ports = openPorts.filter(p => 
            ['80', '443', '8080', '8443', '3000', '9000', '5000', '21', '22', '23', '25', '110', '143'].includes(p)
        );
        
        if (ports.length === 0) return; // Skip if no relevant ports
        
        // Use different user agent strings to see how the server responds
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        
        // For HTTP ports, try to grab server headers with a more efficient approach
        const webPorts = ['80', '443', '8080', '8443', '3000', '8000', '8888', '9000', '5000'];
        const httpPorts = ports.filter(p => webPorts.includes(p));
        
        for (const port of httpPorts) {
            const protocol = (port === '443' || port === '8443') ? 'https' : 'http';
            try {
                const serverHeaderCommand = `docker run --rm jonlabelle/network-tools curl -s -I -m 3 ${protocol}://${ip}:${port} | grep -i "server:"`;
                const serverResult = await execPromise(serverHeaderCommand, { timeout: DEFAULT_TIMEOUT });
                
                if (serverResult.stdout) {
                    const serverHeader = serverResult.stdout.split(':', 2)[1]?.trim();
                    if (serverHeader && !headers.userAgents.some(ua => ua.value === serverHeader)) {
                        headers.userAgents.push({
                            type: 'Server',
                            value: serverHeader,
                            source: `${protocol}://${ip}:${port}`
                        });
                    }
                }
            } catch (e) {
                // Server info unavailable for this port, continue
            }
        }
        
        // For common service ports, try to grab banners
        const servicePorts = ports.filter(p => ['21', '22', '23', '25', '110', '143', '587'].includes(p));
        
        for (const port of servicePorts) {
            try {
                const bannerCommand = `docker run --rm jonlabelle/network-tools timeout 3 bash -c "echo '' | nc -w 3 ${ip} ${port} 2>/dev/null | head -n 1"`;
                const bannerResult = await execPromise(bannerCommand, { timeout: DEFAULT_TIMEOUT });
                
                if (bannerResult.stdout && bannerResult.stdout.trim()) {
                    const banner = bannerResult.stdout.trim();
                    headers.userAgents.push({
                        type: 'Banner',
                        value: banner,
                        source: `${ip}:${port}`
                    });
                }
            } catch (e) {
                // Banner unavailable for this port
            }
        }
    } catch (error) {
        console.log(`Failed to get user agent strings for ${ip}: ${error.message}`);
    }
}