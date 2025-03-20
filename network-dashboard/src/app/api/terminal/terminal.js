"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "xterm/css/xterm.css";

// Load xterm.js dynamically (client-side only)
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
    // Load xterm.js dynamically
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
      cursorBlink: true, // Blinking cursor to indicate focus
      theme: {
        background: "#1E1E1E",
        foreground: "#FFFFFF",
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalRef.current);
    fitAddon.fit();

    terminal.focus(); // Ensure input focus
    terminal.write("> "); // Display prompt

    // Handle user input
    terminal.onData((data) => {
      if (data === "\r") {
        // Enter key pressed -> Process command
        handleCommand(terminal);
      } else if (data === "\x7F") {
        // Backspace handling
        if (inputBuffer.current.length > 0) {
          inputBuffer.current = inputBuffer.current.slice(0, -1);
          terminal.write("\b \b"); // Visually remove last character
        }
      } else {
        // Append to input buffer and display character
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

  // Function to process commands
  const handleCommand = (terminal) => {
    const command = inputBuffer.current.trim();
    terminal.write("\n"); // Move to next line

    if (command === "clear") {
      terminal.clear();
    } else if (command === "help") {
      terminal.writeln("Available commands:");
      terminal.writeln(" - help : Show this message");
      terminal.writeln(" - clear : Clear the terminal");
      terminal.writeln(" - echo [text] : Print text to the terminal");
    } else if (command.startsWith("echo ")) {
      terminal.writeln(command.slice(5)); // Print whatever follows "echo "
    } else if (command) {
      terminal.writeln(`Command not found: ${command}`);
    }

    // Reset input buffer and prompt again
    inputBuffer.current = "";
    terminal.write("\n> ");
  };

  return (
    <div
      ref={terminalRef}
      className="w-full h-64 border border-gray-500 rounded-md"
      onClick={() => term.current?.focus()} // Click to refocus input
    />
  );
};

export default XTermTerminal;
