const express = require("express");
const cors = require("cors");
const Docker = require("dockerode");

const app = express();
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

app.use(cors());
app.use(express.json());

// Get list of Docker containers
app.get("/api/docker/status", async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    res.json(containers);
  } catch (error) {
    console.error("Docker API Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start, Stop, Restart Containers
app.post("/api/docker/control", async (req, res) => {
  try {
    const { containerId, action } = req.body;
    const container = docker.getContainer(containerId);

    if (action === "start") await container.start();
    else if (action === "stop") await container.stop();
    else if (action === "restart") await container.restart();
    else return res.status(400).json({ error: "Invalid action" });

    res.json({ message: `Container ${action}ed successfully` });
  } catch (error) {
    console.error("Docker API Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start the Express server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Express server running at http://localhost:${PORT}`);
});
