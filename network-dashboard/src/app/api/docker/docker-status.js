import { exec } from "child_process";

export default function handler(req, res) {
    const { containerId } = req.query;

    if (!containerId) {
        return res.status(400).json({ error: "Container ID is required" });
    }

    exec(`docker ps -q --filter "name=${containerId}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error fetching Docker status: ${stderr}`);
            return res.status(500).json({ running: false, error: "Failed to fetch status" });
        }

        const isRunning = stdout.trim().length > 0; // If output is non-empty, container is running
        res.status(200).json({ running: isRunning });
    });
}
