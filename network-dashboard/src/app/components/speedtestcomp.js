"use client";

import { Button } from "react-bootstrap";
import { useState, useEffect, useRef } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import DnsOverHttpResolver from 'dns-over-http-resolver';
import Switch from "react-switch";
import 'bootstrap/dist/css/bootstrap.min.css';

export default function SpeedTest() {
  const [inputType, setInputType] = useState("IP"); // Default to IP
  const [inputValue, setInputValue] = useState("192.168.1.100"); // Default IP
  const [downloadSpeed, setDownloadSpeed] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(null);
  const [avgDownloadSpeed, setAvgDownloadSpeed] = useState(null);
  const [avgUploadSpeed, setAvgUploadSpeed] = useState(null);
  const [maxDownloadSpeed, setMaxDownloadSpeed] = useState(null);
  const [maxUploadSpeed, setMaxUploadSpeed] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const ws = useRef(null);
  const resolver = new DnsOverHttpResolver();

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:37221");

    ws.current.onopen = () => {
      console.log("WebSocket connection established");
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.downloadSpeed) setDownloadSpeed(data.downloadSpeed);
      if (data.uploadSpeed) setUploadSpeed(data.uploadSpeed);
      if (data.avgDownloadSpeed) setAvgDownloadSpeed(data.avgDownloadSpeed);
      if (data.avgUploadSpeed) setAvgUploadSpeed(data.avgUploadSpeed);
      if (data.maxDownloadSpeed) setMaxDownloadSpeed(data.maxDownloadSpeed);
      if (data.maxUploadSpeed) setMaxUploadSpeed(data.maxUploadSpeed);
      if (data.status === "stopped") setIsRunning(false);
    };

    ws.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => ws.current.close();
  }, []);

  const startTest = () => {
    if (ws.current.readyState === WebSocket.OPEN) {
      if (inputType === "URL") {
        resolver.resolve4(inputValue).then((addresses) => {
          if (addresses.length === 0) {
            console.error("DNS lookup failed");
            setErrorMessage("DNS lookup failed, using URL directly");
            ws.current.send(JSON.stringify({ inputValue, action: "start" }));
          } else {
            ws.current.send(JSON.stringify({ inputValue: addresses[0], action: "start" }));
          }
          setIsRunning(true);
          setErrorMessage("");
        }).catch((err) => {
          console.error("DNS lookup failed:", err);
          setErrorMessage("DNS lookup failed, using URL directly");
          ws.current.send(JSON.stringify({ inputValue, action: "start" }));
          setIsRunning(true);
        });
      } else {
        ws.current.send(JSON.stringify({ inputValue, action: "start" }));
        setIsRunning(true);
        setErrorMessage("");
      }
    } else {
      console.error("WebSocket is not open");
      setErrorMessage("WebSocket is not open");
    }
  };

  const stopTest = () => {
    if (ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: "stop" }));
      setIsRunning(false);
    } else {
      console.error("WebSocket is not open");
      setErrorMessage("WebSocket is not open");
    }
  };

  const clearTest = () => {
    setDownloadSpeed(null);
    setUploadSpeed(null);
    setAvgDownloadSpeed(null);
    setAvgUploadSpeed(null);
    setMaxDownloadSpeed(null);
    setMaxUploadSpeed(null);
    setIsRunning(false);
    setErrorMessage("");
  };

  const toggleInputType = () => {
    setInputType((prevType) => (prevType === "IP" ? "URL" : "IP"));
    setInputValue("");
  };

  return (
    <div className="p-6 text-black rounded-lg shadow-lg border-2 border-gradient-to-r from-blue-500 to-fuchsia-500 bg-white">
      <h2 className="text-2xl font-bold mb-4">Speed Test</h2>
      <div className="mb-4">
        <div className="flex items-center mb-4">
          <span className="mr-2">IP</span>
          <Switch
            checked={inputType === "URL"}
            onChange={toggleInputType}
          />
          <span className="ml-2">URL</span>
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="p-2 border rounded text-black w-full mb-4"
          placeholder={`Enter Server ${inputType}`}
        />
      </div>
      {errorMessage && <div className="text-red-500 mb-4">{errorMessage}</div>}
      <div className="flex justify-center mb-4">
        <Button
          onClick={startTest}
          disabled={isRunning}
          className="bg-green-500 p-2 rounded mr-2 disabled:bg-gray-500"
        >
          Start Test
        </Button>
        <Button
          onClick={stopTest}
          disabled={!isRunning}
          className="bg-red-500 p-2 rounded mr-2 disabled:bg-gray-500"
        >
          Stop Test
        </Button>
        <Button
          onClick={clearTest}
          className="bg-yellow-500 p-2 rounded ml-2"
        >
          Clear
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col items-center">
          <h3 className="text-center mb-2">Current Download Speed</h3>
          <div className="w-24 h-24 relative">
            <CircularProgressbar
              value={downloadSpeed || 0}
              maxValue={100}
              styles={buildStyles({
                textColor: "black",
                pathColor: `url(#gradient)`,
                trailColor: "rgba(128, 128, 128, 0.5)",
              })}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-black text-sm">{`${downloadSpeed || 0} MB/s`}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <h3 className="text-center mb-2">Current Upload Speed</h3>
          <div className="w-24 h-24 relative">
            <CircularProgressbar
              value={uploadSpeed || 0}
              maxValue={100}
              styles={buildStyles({
                textColor: "black",
                pathColor: `url(#gradient)`,
                trailColor: "rgba(128, 128, 128, 0.5)",
              })}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-black text-sm">{`${uploadSpeed || 0} MB/s`}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <h3 className="text-center mb-2">Average Download Speed</h3>
          <div className="w-24 h-24 relative">
            <CircularProgressbar
              value={avgDownloadSpeed || 0}
              maxValue={100}
              styles={buildStyles({
                textColor: "black",
                pathColor: `url(#gradient)`,
                trailColor: "rgba(128, 128, 128, 0.5)",
              })}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-black text-sm">{`${avgDownloadSpeed || 0} MB/s`}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <h3 className="text-center mb-2">Average Upload Speed</h3>
          <div className="w-24 h-24 relative">
            <CircularProgressbar
              value={avgUploadSpeed || 0}
              maxValue={100}
              styles={buildStyles({
                textColor: "black",
                pathColor: `url(#gradient)`,
                trailColor: "rgba(128, 128, 128, 0.5)",
              })}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-black text-sm">{`${avgUploadSpeed || 0} MB/s`}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <h3 className="text-center mb-2">Fastest Download Speed</h3>
          <div className="w-24 h-24 relative">
            <CircularProgressbar
              value={maxDownloadSpeed || 0}
              maxValue={100}
              styles={buildStyles({
                textColor: "black",
                pathColor: `url(#gradient)`,
                trailColor: "rgba(128, 128, 128, 0.5)",
              })}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-black text-sm">{`${maxDownloadSpeed || 0} MB/s`}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <h3 className="text-center mb-2">Fastest Upload Speed</h3>
          <div className="w-24 h-24 relative">
            <CircularProgressbar
              value={maxUploadSpeed || 0}
              maxValue={100}
              styles={buildStyles({
                textColor: "black",
                pathColor: `url(#gradient)`,
                trailColor: "rgba(128, 128, 128, 0.5)",
              })}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-black text-sm">{`${maxUploadSpeed || 0} MB/s`}</div>
            </div>
          </div>
        </div>
      </div>
      <svg width="0" height="0">
        <defs>
          <linearGradient id="gradient" gradientTransform="rotate(90)">
            <stop offset="0%" stopColor="blue" />
            <stop offset="100%" stopColor="fuchsia" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}