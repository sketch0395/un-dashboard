const http = require('http');
const WebSocket = require('ws');
const ping = require('ping');
const axios = require('axios');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("SpeedTest Server");
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  let isRunning = false;
  let interval;

  ws.on('message', async (message) => {
    const { ip, action } = JSON.parse(message);
    console.log(`Received message: ${message}`);

    if (action === 'stop') {
      isRunning = false;
      clearInterval(interval);
      ws.send(JSON.stringify({ status: 'stopped' }));
      console.log('Speed test stopped');
      return;
    }

    if (action === 'start') {
      isRunning = true;
      console.log(`Starting speed test for IP: ${ip}`);

      // Conduct ping test before starting speed test
      const pingPromises = [];
      for (let i = 0; i < 8; i++) {
        pingPromises.push(ping.promise.probe(ip, { timeout: 5 }));
      }

      try {
        const results = await Promise.all(pingPromises);
        const aliveResults = results.filter(res => res.alive);
        if (aliveResults.length === 0) {
          console.error(`Ping test failed for IP: ${ip}`);
          ws.send(JSON.stringify({ status: 'error', message: 'Ping test failed' }));
          isRunning = false;
          return;
        }

        const avgPingStats = {
          host: ip,
          alive: true,
          time: (aliveResults.reduce((sum, res) => sum + res.time, 0) / aliveResults.length).toFixed(2),
          min: Math.min(...aliveResults.map(res => res.min)).toFixed(2),
          max: Math.max(...aliveResults.map(res => res.max)).toFixed(2),
          avg: (aliveResults.reduce((sum, res) => sum + res.avg, 0) / aliveResults.length).toFixed(2),
          stddev: (aliveResults.reduce((sum, res) => sum + res.stddev, 0) / aliveResults.length).toFixed(2),
          packetLoss: ((results.length - aliveResults.length) / results.length * 100).toFixed(2)
        };

        console.log(`Ping test succeeded for IP: ${ip}`);
        ws.send(JSON.stringify({
          status: 'ping',
          pingStats: avgPingStats
        }));

        // Perform speed test using LibreSpeed API
        const speedTest = async () => {
          try {
            const downloadResponse = await axios.get('http://librespeed/api/download');
            const uploadResponse = await axios.get('http://librespeed/api/upload');

            const downloadSpeed = downloadResponse.data.speed;
            const uploadSpeed = uploadResponse.data.speed;

            ws.send(JSON.stringify({
              downloadSpeed,
              uploadSpeed,
              avgDownloadSpeed: downloadSpeed, // Update with actual average calculation if needed
              avgUploadSpeed: uploadSpeed, // Update with actual average calculation if needed
              maxDownloadSpeed: downloadSpeed, // Update with actual max calculation if needed
              maxUploadSpeed: uploadSpeed // Update with actual max calculation if needed
            }));

            console.log(`Download speed: ${downloadSpeed} MB/s, Upload speed: ${uploadSpeed} MB/s`);
          } catch (error) {
            console.error('Speed test error:', error);
            ws.send(JSON.stringify({ status: 'error', message: 'Speed test error' }));
          }
        };

        interval = setInterval(() => {
          if (!isRunning) return;
          speedTest();
        }, 1000); // Perform speed test every 1 second

      } catch (err) {
        console.error(`Ping test error for IP: ${ip}`, err);
        ws.send(JSON.stringify({ status: 'error', message: 'Ping test error' }));
        isRunning = false;
      }
    }
  });

  ws.on('close', () => {
    isRunning = false;
    clearInterval(interval);
    console.log('Client disconnected');
  });
});

server.listen(37221, () => {
  console.log('Server is listening on port 37221');
});