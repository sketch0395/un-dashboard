import UAParser from "ua-parser-js";
import os from "os";

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