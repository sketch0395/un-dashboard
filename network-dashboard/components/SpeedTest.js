"use client";

import React, { useState } from 'react';
import axios from 'axios';

const SpeedTest = () => {
  const [downloadSpeed, setDownloadSpeed] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(null);
  const [ping, setPing] = useState(null);
  const [jitter, setJitter] = useState(null);
  const [error, setError] = useState(null);

  const startSpeedTest = async () => {
    try {
      const response = await axios.get('/api/garbage.php', {
        params: {
          // Add any necessary parameters here
        }
      });

      const { dlStatus, ulStatus, pingStatus, jitterStatus } = response.data;

      setDownloadSpeed(dlStatus);
      setUploadSpeed(ulStatus);
      setPing(pingStatus);
      setJitter(jitterStatus);
    } catch (err) {
      if (err.response) {
        setError(`Failed to perform speed test: ${err.response.data}`);
      } else if (err.request) {
        setError('Failed to perform speed test: No response from server');
      } else {
        setError(`Failed to perform speed test: ${err.message}`);
      }
      console.error(err);
    }
  };

  return (
    <div>
      <h1>Speed Test</h1>
      <button onClick={startSpeedTest}>Start Speed Test</button>
      {error && <p>{error}</p>}
      {downloadSpeed !== null && <p>Download Speed: {downloadSpeed} Mbps</p>}
      {uploadSpeed !== null && <p>Upload Speed: {uploadSpeed} Mbps</p>}
      {ping !== null && <p>Ping: {ping} ms</p>}
      {jitter !== null && <p>Jitter: {jitter} ms</p>}
    </div>
  );
};

export default SpeedTest;