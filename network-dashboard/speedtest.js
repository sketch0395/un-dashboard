const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("SpeedTest Server");
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  let isRunning = false;
  let interval;
  let downloadSpeeds = [];
  let uploadSpeeds = [];

  ws.on('message', (message) => {
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

      interval = setInterval(() => {
        if (!isRunning) return;

        // Simulate download and upload speeds in MB/s
        const downloadSpeed = parseFloat((Math.random() * 100).toFixed(2));
        const uploadSpeed = parseFloat((Math.random() * 50).toFixed(2));
        downloadSpeeds.push(downloadSpeed);
        uploadSpeeds.push(uploadSpeed);

        const avgDownloadSpeed = (downloadSpeeds.reduce((a, b) => a + b, 0) / downloadSpeeds.length).toFixed(2);
        const avgUploadSpeed = (uploadSpeeds.reduce((a, b) => a + b, 0) / uploadSpeeds.length).toFixed(2);
        const maxDownloadSpeed = Math.max(...downloadSpeeds).toFixed(2);
        const maxUploadSpeed = Math.max(...uploadSpeeds).toFixed(2);

        ws.send(JSON.stringify({
          downloadSpeed,
          uploadSpeed,
          avgDownloadSpeed,
          avgUploadSpeed,
          maxDownloadSpeed,
          maxUploadSpeed
        }));

        console.log(`Current download speed: ${downloadSpeed} MB/s, Current upload speed: ${uploadSpeed} MB/s`);
        console.log(`Average download speed: ${avgDownloadSpeed} MB/s, Average upload speed: ${avgUploadSpeed} MB/s`);
        console.log(`Fastest download speed: ${maxDownloadSpeed} MB/s, Fastest upload speed: ${maxUploadSpeed} MB/s`);
      }, 1000); // Send data every 1 second
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