"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
// import "xterm/css/xterm.css";
import dynamic from "next/dynamic";

// const XTerm = dynamic(
//     async () => {
//       const { Terminal } = await import("xterm");
//       await import("../xterm/css/xterm.css");
//       return { default: Terminal };
//     },
//     { ssr: false }
//   );

const theTerminal = dynamic(
    () => import('xterm').then((mod) => mod.Terminal),
    { ssr: false }
  );

const XTermTerminal = () => {
  const terminalRef = useRef(null);
  const term = useRef(null);


  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new theTerminal({
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

    terminal.writeln("Welcome to XTerm.js in Next.js!");
    terminal.write("> ");

    // Handle user input
    terminal.onData((data) => {
      if (data === "\r") {
        terminal.write("\n> "); // New line on Enter
      } else if (data === "\x7F") {
        // Handle Backspace (delete last character)
        if (terminal._core.buffer.x > 2) {
          terminal.write("\b \b");
        }
      } else {
        terminal.write(data); // Write the character
      }
    });

    term.current = terminal;

    return () => {
      terminal.dispose();
    };
  }, []);

  return <div ref={terminalRef} className="w-full h-64 border border-gray-500 rounded-md" />;
};

export default XTermTerminal;