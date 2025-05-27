"use client";

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// Dynamically import xterm and its addons
const loadXterm = async () => {
  if (typeof window === 'undefined') return { Terminal: null, FitAddon: null, WebLinksAddon: null };
  
  // Define self for compatibility
  if (typeof self === 'undefined' && typeof window !== 'undefined') {
    window.self = window;
  }

  const xtermModule = await import('xterm');
  const fitAddonModule = await import('xterm-addon-fit');
  const webLinksModule = await import('xterm-addon-web-links');
  
  // Import CSS
  await import('xterm/css/xterm.css');
  
  return {
    Terminal: xtermModule.Terminal,
    FitAddon: fitAddonModule.FitAddon,
    WebLinksAddon: webLinksModule.WebLinksAddon,
  };
};

export default function DockerTerminal({ containerId, containerName, visible, onClose }) {
    const terminalRef = useRef(null);
    const terminalInstanceRef = useRef(null);
    const socketRef = useRef(null);
    const fitAddonRef = useRef(null);
    const [terminalLoaded, setTerminalLoaded] = useState(false);
    
    // Add a resize observer to ensure terminal fits the container
    useEffect(() => {
        if (!visible || !terminalRef.current) return;
        
        const resizeObserver = new ResizeObserver(() => {
            if (fitAddonRef.current && terminalInstanceRef.current) {
                try {
                    const term = terminalInstanceRef.current;
                    
                    // Clear terminal before resizing to prevent artifacts
                    term.clear();
                    
                    // Fit terminal to container
                    fitAddonRef.current.fit();
                    
                    // Force a complete refresh after resize
                    term.refresh(0, term.rows - 1);
                    
                    // Always scroll to bottom after resize
                    setTimeout(() => {
                        term.scrollToBottom();
                    }, 0);
                } catch (e) {
                    console.error("Resize observer error:", e);
                }
            }
        });
        
        resizeObserver.observe(terminalRef.current);
        
        return () => {
            resizeObserver.disconnect();
        };
    }, [visible, terminalLoaded]);
    
    // Main terminal initialization logic
    useEffect(() => {
        if (!visible || !terminalRef.current) return;
        
        let term = null;
        let fitAddon = null;
        let socket = null;
        
        const initTerminal = async () => {
            try {
                // Load xterm dynamically
                const { Terminal, FitAddon, WebLinksAddon } = await loadXterm();
                if (!Terminal) return;
                
                // Add CSS to ensure proper rendering
                const style = document.createElement('style');
                style.textContent = `
                    .xterm-viewport::-webkit-scrollbar {
                        width: 5px;
                    }
                    .xterm-viewport::-webkit-scrollbar-thumb {
                        background: #666;
                        border-radius: 5px;
                    }
                    .xterm-screen {
                        width: 100% !important;
                    }
                    .xterm-viewport {
                        overflow-y: auto !important;
                        background-color: #1e1e1e !important;
                    }
                    .terminal.xterm {
                        height: 100%;
                        padding: 0;
                    }
                    .xterm .xterm-screen canvas {
                        display: block !important;
                    }
                `;
                document.head.appendChild(style);
                
                // Initialize terminal with optimized settings
                term = new Terminal({
                    cursorBlink: true,
                    theme: {
                        background: '#1e1e1e',
                        foreground: '#f0f0f0',
                        cursor: '#ffffff',
                        cursorAccent: '#000000'
                    },
                    scrollback: 5000,
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                    fontSize: 14,
                    fontWeight: 'normal',
                    rendererType: 'canvas',
                    convertEol: true,
                    letterSpacing: 0,
                    lineHeight: 1.2,
                    disableStdin: false,
                    screenReaderMode: false,
                    allowProposedApi: true
                });
                
                fitAddon = new FitAddon();
                fitAddonRef.current = fitAddon;
                
                term.loadAddon(fitAddon);
                term.loadAddon(new WebLinksAddon());
                
                // Open terminal with a try-catch to handle potential errors
                try {
                    term.open(terminalRef.current);
                    terminalInstanceRef.current = term;
                    term.clear();
                } catch (e) {
                    console.error("Error opening terminal:", e);
                    return;
                }
                
                // Set loaded state after terminal is opened
                setTerminalLoaded(true);
                
                // Wait for next render cycle before attempting to fit
                setTimeout(() => {
                    if (terminalRef.current && fitAddon) {
                        try {
                            fitAddon.fit();
                            term.clear();
                            term.refresh(0, term.rows - 1);
                            term.scrollToBottom();
                        } catch (e) {
                            console.error("Error fitting terminal:", e);
                        }
                    }
                }, 300);
                
                try {
                    term.focus();
                } catch (e) {
                    console.error("Error focusing terminal:", e);
                }
                
                // Connect to Docker exec proxy on backend
                // Determine the server URL based on environment
                let serverUrl = "http://10.5.1.83:4002";
                const protocol = window.location.protocol;
                const hostname = window.location.hostname;
                
                // If not on localhost, use the same hostname but different port
                if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
                    serverUrl = `${protocol}//${hostname}:4002`;
                }
                
                console.log(`Connecting to Docker terminal server at: ${serverUrl}`);
                
                socket = io(serverUrl, {
                    transports: ['polling', 'websocket'], // Start with reliable polling, then upgrade to WebSocket if possible
                    reconnectionAttempts: 3,              // Try to reconnect 3 times
                    reconnectionDelay: 1000,              // Start with a 1s delay between reconnection attempts
                    reconnectionDelayMax: 3000,           // Maximum delay between reconnections
                    timeout: 10000,                       // Connection timeout
                    forceNew: true                        // Create a new connection
                });
                
                socketRef.current = socket;
                
                // Add specific handler for websocket errors
                socket.io.on('error', (err) => {
                    console.warn('Docker terminal engine.io error:', err);
                    // Don't show terminal error for transport issues
                });
                
                socket.on('connect', () => {
                    console.log(`Docker terminal connected using ${socket.io.engine.transport.name}`);
                });
                
                // Handle connection errors
                socket.on('connect_error', (err) => {
                    console.error("Docker terminal socket connection error:", err);
                    
                    // Don't show error for websocket failures since we'll fall back to polling
                    if (err.message && err.message.includes('websocket error')) {
                        console.warn('WebSocket connection failed, falling back to polling');
                        return;
                    }
                    
                    term.write("\r\n\x1b[31mConnection Error: Failed to connect to Docker server.\x1b[0m\r\n");
                    term.write("Please check your network connection and try again.\r\n");
                });
                
                socket.emit('dockerExecConnect', { containerId });
                
                socket.on('dockerExecData', (data) => {
                    if (!term || !term.element || !term.element.isConnected) {
                        console.error("Terminal not connected to DOM");
                        return;
                    }
                    
                    try {
                        // Write data to terminal
                        term.write(data);
                        
                        // Force full refresh
                        term.refresh(0, term.rows - 1);
                        
                        // Always scroll to bottom for new data
                        term.scrollToBottom();
                    } catch (e) {
                        console.error("Error writing to terminal:", e);
                    }
                });
                
                // Add event handler for user input
                term.onData(data => {
                    try {
                        socket.emit('dockerExecData', data);
                    } catch (e) {
                        console.error("Error sending terminal input:", e);
                    }
                });
                
                // Add connection status handlers
                socket.on('connect', () => {
                    console.log('Docker terminal socket connected');
                });
                
                socket.on('disconnect', () => {
                    console.log('Docker terminal socket disconnected');
                    term.writeln('\r\n\nConnection closed\r\n');
                    term.scrollToBottom();
                });
                
                socket.on('error', (err) => {
                    console.error('Docker terminal socket error:', err);
                    term.writeln(`\r\n\nError: ${err}\r\n`);
                    term.scrollToBottom();
                });
                
                socket.on('dockerExecClose', () => {
                    console.log('Docker exec session closed');
                    term.writeln('\r\n\nExec session closed\r\n');
                    term.scrollToBottom();
                });
                
            } catch (error) {
                console.error("Terminal initialization error:", error);
                onClose();
            }
        };
        
        initTerminal();
        
        // Cleanup function
        return () => {
            if (terminalInstanceRef.current) {
                try {
                    terminalInstanceRef.current.dispose();
                } catch (e) {
                    console.error("Error disposing terminal:", e);
                }
            }
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            fitAddonRef.current = null;
            setTerminalLoaded(false);
        };
    }, [visible, containerId, onClose]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-4 w-10/12 md:w-4/5 h-5/6 max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-white">Container Terminal: {containerName || containerId}</h2>
                    <button 
                        onClick={onClose}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                    >
                        Close
                    </button>
                </div>
                {!terminalLoaded && (
                    <div className="flex-1 bg-gray-900 rounded flex items-center justify-center">
                        <div className="text-white">Loading terminal...</div>
                    </div>
                )}
                <div 
                    className={`flex-1 bg-gray-900 rounded ${!terminalLoaded ? 'hidden' : ''} overflow-hidden`} 
                    ref={terminalRef}
                    style={{ width: '100%', height: '100%', backgroundColor: '#1e1e1e' }}
                ></div>
            </div>
        </div>
    );
}
