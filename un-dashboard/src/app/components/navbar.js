"use client";

import React, { useEffect, useState, memo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import UserMenu from "./auth/UserMenu";

const Navbar = memo(() => {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated } = useAuth();
    const [hostInfo, setHostInfo] = useState({
        hostname: "Loading...",
        platform: "Loading...",
        osType: "Loading...",
        osRelease: "Loading...",
        architecture: "Loading...",
        totalMemory: "Loading...",
        freeMemory: "Loading...",
        uptime: "Loading...",
    });    const [error, setError] = useState(null);

    // Helper function to format uptime
    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / (24 * 3600));
        const hours = Math.floor((seconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    useEffect(() => {
        const fetchHostInfo = async () => {
            try {
                const apiEndpoint = process.env.NEXT_PUBLIC_API_SYSTEM_INFO || "/api/system-info";
                const response = await fetch(apiEndpoint);
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

    // Don't show navbar on auth pages
    const authRoutes = ['/auth/login', '/auth/register'];
    if (authRoutes.includes(pathname)) {
        return null;
    }

    if (hostInfo.hostname === "Loading...") {
        return <div>Loading host information...</div>;
    }    return (
        <nav className="navbar bg-gray-800 text-white p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-50">
            <div className="flex items-center">
                <span className="text-xl font-bold">Nexus Control</span>
            </div>
            <div className="text-sm text-gray-400">
                {error ? (
                    <p className="text-red-500">{error}</p>
                ) : (
                    <>
                        <p>Hostname: {hostInfo.hostname}</p>
                        <p>Uptime: {hostInfo.uptime}</p>
                        

                    </>
                )}
            </div>
            <div className="text-sm text-gray-400">
                {error ? (
                    <p className="text-red-500">{error}</p>
                ) : (
                    <>

                        <p>Free Memory: {hostInfo.freeMemory}</p>
                        <p>Total Memory: {hostInfo.totalMemory}</p>
                    </>
                )}            </div>            
            <div className="flex items-center space-x-4">
                {isAuthenticated && (
                    <>
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
                            onClick={() => router.push("/")}
                        >
                            Home
                        </button>
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
                            onClick={() => router.push("/docker")}
                        >
                            Docker
                        </button>
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
                            onClick={() => router.push("/networkscan")}
                        >
                            Network Scan
                        </button>
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
                            onClick={() => router.push("/performance")}
                        >
                            Performance
                        </button>
                        <UserMenu />
                    </>
                )}
            </div>        </nav>
    );
});

Navbar.displayName = 'Navbar';

export default Navbar;