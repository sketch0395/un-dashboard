const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const CONTAINER_NAME = "my_linux_container"; // Change to your container name

nextApp.prepare().then(() => {
    const app = express();
    app.use(cors({ origin: "*" })); // Allow all origins
    app.use(express.json()); // Ensure JSON parsing

    // ✅ API Route: Get Docker container status
    app.get("/status/:containerId", (req, res) => {
        const containerId = req.params.containerId;

        exec(`docker ps -q --filter "name=${containerId}"`, (error, stdout) => {
            console.log(`Docker ps result: ${stdout.trim()}`);
            const status = stdout.trim() ? "running" : "stopped";
            res.json({ status });
        });
    });

    // ✅ API Route: Start/Stop Docker container
    app.post("/api/docker", (req, res) => {
        const { containerId, action } = req.body;
        if (!containerId || !["start", "stop"].includes(action)) {
            return res.status(400).json({ error: "Invalid container ID or action" });
        }

        const command = `docker ${action} ${containerId}`;
        console.log(`Executing: ${command}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("Docker command error:", stderr);
                return res.status(500).json({ error: stderr || "Failed to execute command" });
            }
            res.status(200).json({ message: `Container ${action}ed successfully` });
        });
    });

    // ✅ API to execute commands inside Docker container
    app.post("/exec", (req, res) => {
        const { command } = req.body;
        if (!command) return res.status(400).json({ error: "No command provided" });

        exec(`docker exec my_linux_container bash -c "${command}"`, (error, stdout, stderr) => {
            if (error) return res.json({ output: stderr || error.message });
            res.json({ output: stdout });
        });
    });

    // ✅ Forward all Next.js routes
    app.all("*", (req, res) => {
        return handle(req, res);
    });

    // ✅ Start server on a single port
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`> Server running on http://localhost:${PORT}`);
    });
});
