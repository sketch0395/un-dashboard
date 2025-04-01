"use client";
import { useEffect, useState } from "react";

export default function DockerDashboard() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:4000/api/docker/status")
      .then((res) => res.json())
      .then((data) => {
        console.log("API Response:", data);
        setContainers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch Error:", err);
        setContainers([]);
        setLoading(false);
      });
  }, []);

  const handleAction = async (containerId, action) => {
    await fetch("http://localhost:4000/api/docker/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ containerId, action }),
    });

    setLoading(true);
    fetch("http://localhost:4000/api/docker/status")
      .then((res) => res.json())
      .then((data) => {
        setContainers(data);
        setLoading(false);
      });
  };

  return (
    <div>
      <h1>Docker Container Manager</h1>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {containers.map((container) => (
              <tr key={container.Id}>
                <td>{container.Names[0]}</td>
                <td>{container.State}</td>
                <td>
                  {container.State !== "running" ? (
                    <button onClick={() => handleAction(container.Id, "start")}>Start</button>
                  ) : (
                    <button onClick={() => handleAction(container.Id, "stop")}>Stop</button>
                  )}
                  <button onClick={() => handleAction(container.Id, "restart")}>Restart</button>
                </td>
                <td>
                  {container.Ports.some((port) => port.PublicPort) && (
                    <a href={`http://localhost:${container.Ports[0].PublicPort}`} target="_blank" rel="noopener noreferrer">
                      Open
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
