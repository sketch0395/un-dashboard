"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "xterm/css/xterm.css";

// Load xterm.js only on the client
const XTermDynamic = dynamic(() => import("xterm"), { ssr: false });
const FitAddonDynamic = dynamic(() => import("xterm-addon-fit"), { ssr: false });

const XTermTerminal = () => {
  const terminalRef = useRef(null);
  const term = useRef(null);
  const fitAddonRef = useRef(null);
  const inputBuffer = useRef(""); // Store user input without causing re-renders
  const [xtermModule, setXtermModule] = useState(null);
  const [fitAddonModule, setFitAddonModule] = useState(null);

  useEffect(() => {
    const loadXterm = async () => {
      const xterm = await import("xterm");
      const fitAddon = await import("xterm-addon-fit");
      setXtermModule(xterm);
      setFitAddonModule(fitAddon);
    };

    loadXterm();
  }, []);

  useEffect(() => {
    if (!xtermModule || !fitAddonModule || !terminalRef.current) return;

    const { Terminal } = xtermModule;
    const { FitAddon } = fitAddonModule;

    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#1E1E1E",
        foreground: "#FFFFFF",
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalRef.current);
    fitAddon.fit();

    terminal.focus();
    terminal.write("> ");

    // Handle user input
    terminal.onData((data) => {
      if (data === "\r") {
        handleCommand(terminal);
      } else if (data === "\x7F") {
        if (inputBuffer.current.length > 0) {
          inputBuffer.current = inputBuffer.current.slice(0, -1);
          terminal.write("\b \b");
        }
      } else {
        inputBuffer.current += data;
        terminal.write(data);
      }
    });

    term.current = terminal;
    fitAddonRef.current = fitAddon;

    return () => {
      terminal.dispose();
    };
  }, [xtermModule, fitAddonModule]);

  // Send command to Docker container
  const handleCommand = async (terminal) => {
    const command = inputBuffer.current.trim();
    terminal.write("\n");

    if (!command) {
      terminal.write("> ");
      return;
    }

    if (command === "clear") {
      terminal.clear();
      terminal.write("> ");
      inputBuffer.current = "";
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      const data = await response.json();
      terminal.writeln(data.output || "No output");
    } catch (error) {
      terminal.writeln("Error: Could not reach server");
    }

    inputBuffer.current = "";
    terminal.write("\n> ");
  };

  return (
    <div
      ref={terminalRef}
      className="w-full h-64 border border-gray-500 rounded-md"
      onClick={() => term.current?.focus()}
    />
  );
};

export default XTermTerminal;
