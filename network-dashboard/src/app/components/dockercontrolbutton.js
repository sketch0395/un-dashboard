"use client";

import { useState, useEffect } from "react";

export default function DockerControlButton({ containerId }) {
    const [isRunning, setIsRunning] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await fetch(`http://localhost:3000/status/${containerId}`);
            const data = await res.json();
            setIsRunning(data.running);
        } catch (error) {
            console.error("Failed to fetch container status:", error);
        }
    };

    const toggleContainer = async () => {
        setLoading(true);
        const action = isRunning ? "stop" : "start";

        try {
            const res = await fetch("http://localhost:3000/api/docker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ containerId, action }),
            });

            if (res.ok) {
                setIsRunning(!isRunning);
            } else {
                console.error("Failed to toggle container");
            }
        } catch (error) {
            console.error("Error toggling container:", error);
        }

        setLoading(false);
    };

    return (
        <button
            onClick={toggleContainer}
            disabled={loading}
            className={`px-4 py-2 flex w-52 font-bold text-white rounded ${isRunning ? "bg-red-600" : "bg-green-600"}`}
        >
            {loading ? "Processing..." : isRunning ? "Stop Container" : "Start Container"}
        </button>
    );
}
