"use client";

import React, { useState } from 'react';

const SpeedTest = () => {
  const [downloadSpeed, setDownloadSpeed] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(null);

  const runSpeedTest = async () => {
    try {
      // Download speed test
      const downloadStartTime = new Date().getTime();
      const downloadInterval = setInterval(() => {
        const currentTime = new Date().getTime();
        const elapsedTime = (currentTime - downloadStartTime) / 1000; // in seconds
        const downloadSpeed = ((10485760 * 8) / (elapsedTime * 1024 * 1024)).toFixed(2); // in Mbps
        setDownloadSpeed(downloadSpeed);
      }, 500);

      const downloadResponse = await fetch('http://localhost:80/backend/garbage.php', {
        method: 'GET',
        mode: 'cors',
      }).catch(error => {
        console.error('Fetch error:', error);
        throw error;
      });
      clearInterval(downloadInterval);
      if (!downloadResponse.ok) {
        throw new Error(`Download request failed with status ${downloadResponse.status}`);
      }
      const downloadEndTime = new Date().getTime();
      const downloadDuration = (downloadEndTime - downloadStartTime) / 1000; // in seconds
      const downloadContentLength = parseInt(downloadResponse.headers.get('Content-Length'), 10);
      const downloadSpeed = ((downloadContentLength * 8) / (downloadDuration * 1024 * 1024)).toFixed(2); // in Mbps
      setDownloadSpeed(downloadSpeed);

      // Upload speed test
      const uploadData = new Blob([new ArrayBuffer(10 * 1024 * 1024)]); // 10MB of data
      const uploadStartTime = new Date().getTime();
      const uploadInterval = setInterval(() => {
        const currentTime = new Date().getTime();
        const elapsedTime = (currentTime - uploadStartTime) / 1000; // in seconds
        const uploadSpeed = ((uploadData.size * 8) / (elapsedTime * 1024 * 1024)).toFixed(2); // in Mbps
        setUploadSpeed(uploadSpeed);
      }, 500);

      const uploadResponse = await fetch('http://localhost:80/backend/empty.php', {
        method: 'POST',
        body: uploadData,
        mode: 'cors',
      });
      clearInterval(uploadInterval);
      if (!uploadResponse.ok) {
        throw new Error(`Upload request failed with status ${uploadResponse.status}`);
      }
      const uploadEndTime = new Date().getTime();
      const uploadDuration = (uploadEndTime - uploadStartTime) / 1000; // in seconds
      const uploadSpeed = ((uploadData.size * 8) / (uploadDuration * 1024 * 1024)).toFixed(2); // in Mbps
      setUploadSpeed(uploadSpeed);
    } catch (error) {
      console.error('Error running speed test:', error);
    }
  };

  return (
    <div>
      <h1>Network Speed Test</h1>
      <button onClick={runSpeedTest}>Run Speed Test</button>
      {downloadSpeed !== null && <p>Download Speed: {downloadSpeed} Mbps</p>}
      {uploadSpeed !== null && <p>Upload Speed: {uploadSpeed} Mbps</p>}
    </div>
  );
};

export default SpeedTest;