"use client";

import { Button } from "flowbite-react";
import { useState, useEffect, useRef } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import DnsOverHttpResolver from "dns-over-http-resolver";
import Switch from "react-switch";
import "bootstrap/dist/css/bootstrap.min.css";
import "./speedtestcomp.css"; // Import the CSS file

export function UserControls({
  inputType,
  inputValue,
  setInputValue,
  isRunning,
  startTest,
  stopTest,
  clearTest,
  toggleInputType,
  errorMessage,
}) {
  return (
    <div className="flex mb-2">
      <div className="p-1 bg-gradient-to-b from-blue-400 to-fuchsia-500 rounded-lg shadow-lg min-w-52 flex">
        <div className="card p-4 ">
          <h3 className="text-xl font-bold mb-4">IP Controls</h3>
          <div className="flex items-center mb-4">
            <span className="mr-2">IP</span>
            <Switch checked={inputType === "URL"} onChange={toggleInputType} />
            <span className="ml-2">URL</span>
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="p-2 border rounded text-black w-full mb-4"
            placeholder={`Enter Server ${inputType}`}
          />
          {errorMessage && (
            <div className="text-red-500 mb-4">{errorMessage}</div>
          )}
          <div className="flex justify-center mb-2">
            <Button
              onClick={startTest}
              disabled={isRunning}
              className="bg-green-500 p-2 rounded mr-2 disabled:bg-gray-500 w-full"
            >
              Start
            </Button>
          </div>
          <div className="flex justify-center mb-2">
          <Button
            onClick={stopTest}
            disabled={!isRunning}
            className="bg-red-500 p-2 rounded mr-2 disabled:bg-gray-500 w-full"
          >
            Stop
          </Button>
        </div>
        <div className="flex justify-center mb-2">
          <Button
            onClick={clearTest}
            className="bg-yellow-500 p-2 rounded ml-2 w-full"
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
    </div>
  );
}

function PingStats({ pingStats }) {
  return (
    <div className="p-1 mb-2 mr-2 bg-gradient-to-b from-blue-400 to-fuchsia-500 rounded-lg shadow-lg min-w-2xs flex">
      <div className="card p-4 min-w-2xl ">
        <h3 className="text-md font-bold min-w-2xs">Ping Statistics</h3>
        {pingStats ? (
          <>
            <p>Host: {pingStats.host}</p>
            <p>Alive: {pingStats.alive ? "Yes" : "No"}</p>
            <p>Time: {pingStats.time} ms</p>
            <p>Min: {pingStats.min} ms</p>
            <p>Max: {pingStats.max} ms</p>
            <p>Avg: {pingStats.avg} ms</p>
            <p>Stddev: {pingStats.stddev} ms</p>
            <p>Packet Loss: {pingStats.packetLoss} %</p>
          </>
        ) : (
          <p>No ping statistics available.</p>
        )}
      </div>
    </div>
  );
}

export function Gauges({
  downloadSpeed,
  uploadSpeed,
  avgDownloadSpeed,
  avgUploadSpeed,
  maxDownloadSpeed,
  maxUploadSpeed,
}) {
  return (
    <div className="flex w-fill ">
      <div className="p-1 mb-2 bg-gradient-to-b from-blue-400 to-fuchsia-500 rounded-lg shadow-lg flex min-w-2xl w-fill">
        <div className="card p-4 min-w-2xl w-fill">
          <h3 className="text-xl font-bold mb-4">Speed Gauges</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Gauge title="Current Download Speed" value={downloadSpeed} />
            <Gauge title="Current Upload Speed" value={uploadSpeed} />
            <Gauge title="Average Download Speed" value={avgDownloadSpeed} />
            <Gauge title="Average Upload Speed" value={avgUploadSpeed} />
            <Gauge title="Fastest Download Speed" value={maxDownloadSpeed} />
            <Gauge title="Fastest Upload Speed" value={maxUploadSpeed} />
            <svg width="0" height="0">
              <defs>
                <linearGradient id="gradient" gradientTransform="rotate(90)">
                  <stop offset="0%" stopColor="blue" />
                  <stop offset="100%" stopColor="fuchsia" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Gauge({ title, value }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-center font-semibold mb-2">{title}</div>
      <div className="w-24 h-24 relative">
        <CircularProgressbar
          value={value || 0}
          maxValue={100}
          styles={buildStyles({
            textColor: "black",
            pathColor: `url(#gradient)`,
            trailColor: "rgba(128, 128, 128, 0.5)",
          })}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-black text-sm">{`${value || 0} MB/s`}</div>
        </div>
      </div>
    </div>
  );
}

function ConsoleLog({ logMessages }) {
  return (
    <div className="flex w-full">
      <div className="p-1 bg-gradient-to-b from-blue-400 to-fuchsia-500 rounded-lg shadow-lg flex w-full ">
        <div className="card p-4 w-full">
          <span className="text-2xl font-semibold mb-4">Console Log</span>
          <div className="console-log overflow-y-auto h-48 text-sm">
            {logMessages.map((msg, index) => (
              <p key={index}>{msg}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SpeedTest() {
  const [inputType, setInputType] = useState("IP"); // Default to IP
  const [inputValue, setInputValue] = useState("192.168.1.100"); // Default IP
  const [downloadSpeed, setDownloadSpeed] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(null);
  const [avgDownloadSpeed, setAvgDownloadSpeed] = useState(null);
  const [avgUploadSpeed, setAvgUploadSpeed] = useState(null);
  const [maxDownloadSpeed, setMaxDownloadSpeed] = useState(null);
  const [maxUploadSpeed, setMaxUploadSpeed] = useState(null);
  const [pingStats, setPingStats] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [logMessages, setLogMessages] = useState([]);
  const ws = useRef(null);
  const resolver = new DnsOverHttpResolver();

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:37221");

    ws.current.onopen = () => {
      console.log("WebSocket connection established");
      setLogMessages((prev) => [...prev, "WebSocket connection established"]);
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
      if (data.status === "ping") setPingStats(data.pingStats);
      if (data.status === "error") setErrorMessage(data.message);
      setLogMessages((prev) => [...prev, `Received message: ${event.data}`]);
    };

    ws.current.onclose = () => {
      console.log("WebSocket connection closed");
      setLogMessages((prev) => [...prev, "WebSocket connection closed"]);
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setLogMessages((prev) => [...prev, `WebSocket error: ${error.message}`]);
    };

    return () => ws.current.close();
  }, []);

  const startTest = () => {
    if (ws.current.readyState === WebSocket.OPEN) {
      if (inputType === "URL") {
        resolver
          .resolve4(inputValue)
          .then((addresses) => {
            if (addresses.length === 0) {
              console.error("DNS lookup failed");
              setErrorMessage("DNS lookup failed, using URL directly");
              ws.current.send(
                JSON.stringify({ ip: inputValue, action: "start" })
              );
            } else {
              ws.current.send(
                JSON.stringify({ ip: addresses[0], action: "start" })
              );
            }
            setIsRunning(true);
            setErrorMessage("");
            setLogMessages((prev) => [...prev, "Starting speed test"]);
          })
          .catch((err) => {
            console.error("DNS lookup failed:", err);
            setErrorMessage("DNS lookup failed, using URL directly");
            ws.current.send(
              JSON.stringify({ ip: inputValue, action: "start" })
            );
            setIsRunning(true);
            setLogMessages((prev) => [...prev, "Starting speed test"]);
          });
      } else {
        if (inputValue) {
          ws.current.send(JSON.stringify({ ip: inputValue, action: "start" }));
          setIsRunning(true);
          setErrorMessage("");
          setLogMessages((prev) => [...prev, "Starting speed test"]);
        } else {
          console.error("Input value is empty");
          setErrorMessage("Input value is empty");
          setLogMessages((prev) => [...prev, "Input value is empty"]);
        }
      }
    } else {
      console.error("WebSocket is not open");
      setErrorMessage("WebSocket is not open");
      setLogMessages((prev) => [...prev, "WebSocket is not open"]);
    }
  };

  const stopTest = () => {
    if (ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action: "stop" }));
      setIsRunning(false);
      setLogMessages((prev) => [...prev, "Stopping speed test"]);
    } else {
      console.error("WebSocket is not open");
      setErrorMessage("WebSocket is not open");
      setLogMessages((prev) => [...prev, "WebSocket is not open"]);
    }
  };

  const clearTest = () => {
    setDownloadSpeed(null);
    setUploadSpeed(null);
    setAvgDownloadSpeed(null);
    setAvgUploadSpeed(null);
    setMaxDownloadSpeed(null);
    setMaxUploadSpeed(null);
    setPingStats(null);
    setIsRunning(false);
    setErrorMessage("");
    setLogMessages([]);
  };

  const toggleInputType = () => {
    setInputType((prevType) => (prevType === "IP" ? "URL" : "IP"));
    setInputValue("");
  };

  return (
    <div className="p-4 text-black rounded-lg shadow-lg bg-white">
      {/* <h2 className="text-2xl font-bold mb-4 px-6">Speed Test</h2> */}
      <div className="flex flex-wrap ">
        <div className="mr-2">
        <UserControls
          inputType={inputType}
          inputValue={inputValue}
          setInputValue={setInputValue}
          isRunning={isRunning}
          startTest={startTest}
          stopTest={stopTest}
          clearTest={clearTest}
          toggleInputType={toggleInputType}
          errorMessage={errorMessage}
        />
        </div>
        <PingStats pingStats={pingStats} />
      
      <Gauges
        downloadSpeed={downloadSpeed}
        uploadSpeed={uploadSpeed}
        avgDownloadSpeed={avgDownloadSpeed}
        avgUploadSpeed={avgUploadSpeed}
        maxDownloadSpeed={maxDownloadSpeed}
        maxUploadSpeed={maxUploadSpeed}
      />
      </div>
      <ConsoleLog logMessages={logMessages} />
    </div>
  );
}
