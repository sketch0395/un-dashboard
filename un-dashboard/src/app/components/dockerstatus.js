"use client";

import { useEffect, useState } from "react";

export default function DockerStatus() {
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchContainers();
    }, []);

    const fetchContainers = () => {
        setLoading(true);
        fetch("http://localhost:4000/api/containers")
            .then(res => res.json())
            .then(data => {
                console.log("API response:", data);
                setContainers(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Fetch error:", err);
                setError("Failed to fetch containers");
                setLoading(false);
            });
    };

    const handleAction = (id, action) => {
        fetch(`http://localhost:4000/api/containers/${id}/${action}`, { method: "POST" })
            .then(res => res.json())
            .then(() => fetchContainers()) // Refresh container list after action
            .catch(err => console.error(`Failed to ${action} container:`, err));
    };

    const getStatusColor = (status) => {
        if (status.includes("Up")) return "bg-green-500";  // Running 🟢
        if (status.includes("Restarting")) return "bg-yellow-500"; // Restarting 🟡
        return "bg-red-500"; // Stopped or Exited 🔴
    };

    return (
        <div className="p-6 bg-gray-900 text-white rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Docker Containers</h2>
            {loading ? (
                <p className="text-gray-400">Loading...</p>
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : containers.length === 0 ? (
                <p className="text-gray-400">No containers found</p>
            ) : (
                <table className="w-full border-collapse border border-gray-700">
                    <thead>
                        <tr className="bg-gray-800">
                            <th className="p-2 border border-gray-700">Status</th>
                            <th className="p-2 border border-gray-700">Container ID</th>
                            <th className="p-2 border border-gray-700">Name</th>
                            <th className="p-2 border border-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {containers.map((container) => (
                            <tr key={container.ID} className="border border-gray-700">
                                <td className="p-2 border border-gray-700">
                                    <span className={`inline-block w-4 h-4 rounded-full ${getStatusColor(container.Status)}`} />
                                </td>
                                <td className="p-2 border border-gray-700">{container.ID}</td>
                                <td className="p-2 border border-gray-700">{container.Names}</td>
                                <td className="p-2 border border-gray-700 flex gap-2">
                                    <button
                                        onClick={() => handleAction(container.ID, "start")}
                                        className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white"
                                    >
                                        Start
                                    </button>
                                    <button
                                        onClick={() => handleAction(container.ID, "stop")}
                                        className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white"
                                    >
                                        Stop
                                    </button>
                                    <button
                                        onClick={() => handleAction(container.ID, "restart")}
                                        className="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-white"
                                    >
                                        Restart
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
