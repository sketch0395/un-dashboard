"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const Navbar = () => {
    const router = useRouter();
    const [hostInfo, setHostInfo] = useState({
        hostname: "Loading...",
        platform: "Loading...",
        osType: "Loading...",
        osRelease: "Loading...",
        architecture: "Loading...",
        totalMemory: "Loading...",
        freeMemory: "Loading...",
        uptime: "Loading...",
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHostInfo = async () => {
            try {
                const response = await fetch("/api/system-info");
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                // Extract host information from the API response
                const host = data.host || {};
                setHostInfo({
                    hostname: host.hostname || "Unavailable",
                    platform: host.platform || "Unavailable",
                    osType: host.osType || "Unavailable",
                    osRelease: host.osRelease || "Unavailable",
                    architecture: host.architecture || "Unavailable",
                    totalMemory: (host.totalMemory / (1024 ** 3)).toFixed(2) + " GB" || "Unavailable",
                    freeMemory: (host.freeMemory / (1024 ** 3)).toFixed(2) + " GB" || "Unavailable",
                    uptime: formatUptime(host.uptime) || "Unavailable",
                });
            } catch (error) {
                console.error("Failed to fetch host info:", error);
                setError("Failed to load host information.");
            }
        };

        fetchHostInfo();
    }, []);

    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / (24 * 3600));
        const hours = Math.floor((seconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    if (hostInfo.hostname === "Loading...") {
        return <div>Loading host information...</div>;
    }

    return (
        <nav className="bg-gray-800 text-white p-4 flex justify-between items-center sticky top-0 z-50">
            <div className="flex items-center">
                <span className="text-xl font-bold">UN-Dashboard</span>
            </div>
            <div className="text-sm text-gray-400">
                {error ? (
                    <p className="text-red-500">{error}</p>
                ) : (
                    <>
                        <p>Hostname: {hostInfo.hostname}</p>
                        <p>Platform: {hostInfo.platform}</p>
                        <p>OS Type: {hostInfo.osType}</p>
                        <p>OS Release: {hostInfo.osRelease}</p>
                        <p>Architecture: {hostInfo.architecture}</p>
                        <p>Total Memory: {hostInfo.totalMemory}</p>
                        <p>Free Memory: {hostInfo.freeMemory}</p>
                        <p>Uptime: {hostInfo.uptime}</p>
                    </>
                )}
            </div>
            <div className="flex space-x-4">
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() => router.push("/")}
                >
                    Home
                </button>
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() => router.push("/networkscan")}
                >
                    Network Scan
                </button>
            </div>
        </nav>
    );
};

export default Navbar;