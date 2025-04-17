// filepath: c:\Users\ronni\Tools\un-dashboard\un-dashboard\src\app\api\system-info\route.js
import os from "os";
import UAParser from "ua-parser-js";

export async function GET(req) {
  try {
    // Get client IP address
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0] || // For proxies/load balancers
      req.socket.remoteAddress;

    // Parse User-Agent header
    const userAgentString = req.headers["user-agent"] || "Unknown";
    const parser = new UAParser(userAgentString);
    const userAgent = parser.getResult();

    const clientInfo = {
      ip: clientIp,
      device: userAgent.device.type || "Unknown",
      os: `${userAgent.os.name} ${userAgent.os.version}` || "Unknown",
      browser: `${userAgent.browser.name} ${userAgent.browser.version}` || "Unknown",
    };

    return new Response(JSON.stringify(clientInfo), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("🚨 Error fetching client info:", error.message);

    return new Response(
      JSON.stringify({ error: "Failed to fetch client information" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

