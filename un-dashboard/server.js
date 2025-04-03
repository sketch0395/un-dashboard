const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Get all containers (running & stopped)
app.get("/api/containers", (req, res) => {
    exec(`docker ps -a --format "{{json .}}"`, (error, stdout, stderr) => {
        if (error || stderr) {
            console.error("Docker Error:", stderr || error.message);
            return res.status(500).json({ error: stderr || error.message });
        }

        if (!stdout.trim()) return res.json([]); // No containers found

        const containers = stdout.trim().split("\n").map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                console.error("JSON Parse Error:", e.message, "Line:", line);
                return null;
            }
        }).filter(Boolean);

        res.json(containers);
    });
});

// Control container (start/stop/restart)
app.post("/api/containers/:id/:action", (req, res) => {
    const { id, action } = req.params;
    if (!["start", "stop", "restart"].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
    }

    exec(`docker ${action} ${id}`, (error, stdout, stderr) => {
        if (error || stderr) {
            console.error(`Failed to ${action} container:`, stderr || error.message);
            return res.status(500).json({ error: stderr || error.message });
        }

        res.json({ message: `Container ${id} ${action}ed successfully` });
    });
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
});
