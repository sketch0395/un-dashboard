const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
// app.use(cors());
app.use(cors({ origin: "*" })); // Allow all origins


app.get("/status/:containerId", (req, res) => {
    const containerId = req.params.containerId;

    // exec(`docker inspect -f '{{.State.Running}}' ${containerId}`, (error, stdout) => {
    //     if (error) {
    //         return res.json({ status: "error" });
    //     }
    //     const status = stdout.trim() === "true" ? "running" : "stopped";
    //     res.json({ status });
    exec(`docker ps -q --filter "name=${containerId}"`, (error, stdout) => {
        console.log(`Docker ps result: ${stdout.trim()}`);
        const status = stdout.trim() ? "running" : "stopped";
        res.json({ status });
    });
    
});

app.listen(4000, () => console.log("Server running on port 4000"));
