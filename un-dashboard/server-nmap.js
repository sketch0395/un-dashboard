// server-nmap.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { exec } = require("child_process");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Nmap client connected");

  socket.on("start-scan", (ipRange) => {
    console.log(`Starting Nmap scan on ${ipRange}`);

    const nmapCmd = `docker exec nmap nmap -sP ${ipRange}`;
    const nmapProcess = exec(nmapCmd);

    let output = "";
    nmapProcess.stdout.on("data", (data) => {
      output += data;
      const lines = data.split("\n").filter(Boolean);
      for (const line of lines) {
        socket.emit("nmap-progress", line);
      }
    });

    nmapProcess.stderr.on("data", (data) => {
      socket.emit("nmap-error", data);
    });

    nmapProcess.on("close", (code) => {
      console.log(`Nmap process exited with code ${code}`);
      socket.emit("nmap-complete", output);
    });
  });
});

server.listen(4001, () => {
  console.log("Nmap server listening on port 4001");
});
