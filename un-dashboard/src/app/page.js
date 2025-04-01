"use client";
import { useEffect, useState } from "react";

export default function DockerDashboard() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/docker/status")
      .then((res) => res.json())
      .then((data) => {
        console.log("API Response:", data); // ✅ Debugging log
        setContainers(Array.isArray(data) ? data : []); // ✅ Ensure it's an array
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch Error:", err);
        setContainers([]); // ✅ Prevent crashes
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1>Docker Container Manager</h1>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {containers.map((container) => (
              <tr key={container.Id}>
                <td>{container.Names[0]}</td>
                <td>{container.State}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
