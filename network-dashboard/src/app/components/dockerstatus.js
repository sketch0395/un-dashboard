"use client";


import { useState, useEffect } from "react";

export default function DockerStatus({ containerId }) {
    const [status, setStatus] = useState("loading");

    useEffect(() => {
        async function fetchStatus() {
            try {
                const res = await fetch(`http://localhost:4000/status/${containerId}`);
                const data = await res.json();
                setStatus(data.status);
            } catch {
                setStatus("error");
            }
        }

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000); // Refresh every 5s

        return () => clearInterval(interval);
    }, [containerId]);

    return (
        <div className="flex items-center gap-2">
            <div
                className={`w-3 h-3 rounded-full ${
                    status === "running"
                        ? "bg-green-500"
                        : status === "stopped"
                        ? "bg-red-500"
                        : "bg-gray-500"
                }`}
            />
            <span className="text-sm">{status}</span>
        </div>
    );
}
