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

export default function SSHTerminal({ ip, username, password, visible, onClose }) {
    const terminalRef = useRef(null);
    const terminalInstanceRef = useRef(null);
    const socketRef = useRef(null);
    const fitAddonRef = useRef(null);
    const [terminalLoaded, setTerminalLoaded] = useState(false);
    
    // Add a resize observer to ensure terminal fits the container
    useEffect(() => {
        if (!visible || !terminalRef.current) return;
        
        const resizeObserver = new ResizeObserver(() => {
            if (fitAddonRef.current) {
                try {
                    fitAddonRef.current.fit();
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
                
                // Initialize terminal with constrained dimensions
                term = new Terminal({
                    cursorBlink: true,
                    theme: {
                        background: '#1e1e1e',
                        foreground: '#f0f0f0',
                    },
                    cols: 80,  // Start with standard dimensions
                    rows: 24,  // Start with standard dimensions
                    allowProposedApi: true
                });
                
                fitAddon = new FitAddon();
                fitAddonRef.current = fitAddon; // Store reference for resize observer
                
                term.loadAddon(fitAddon);
                term.loadAddon(new WebLinksAddon());
                
                // Open terminal with a try-catch to handle potential errors
                try {
                    term.open(terminalRef.current);
                    terminalInstanceRef.current = term;
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
                        } catch (e) {
                            console.error("Error fitting terminal:", e);
                        }
                    }
                }, 300); // Increase timeout to ensure DOM is fully rendered
                
                try {
                    term.focus();
                } catch (e) {
                    console.error("Error focusing terminal:", e);
                }
                
                // Connect to SSH proxy on backend
                socket = io("http://10.5.1.83:4000");
                socketRef.current = socket;
                
                socket.emit('sshConnect', { ip, username, password });
                
                socket.on('sshData', (data) => {
                    if (term && !term.element.isConnected) {
                        console.error("Terminal not connected to DOM");
                        return;
                    }
                    try {
                        term.write(data);
                    } catch (e) {
                        console.error("Error writing to terminal:", e);
                    }
                });
                
                // Rest of socket event handlers
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
    }, [visible, ip, username, password, onClose]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            {/* Adjust the modal size here */}
            <div className="bg-gray-800 rounded-lg p-4 w-10/12 md:w-4/5 h-5/6 max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-white">SSH: {username}@{ip}</h2>
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
                    style={{ width: '100%', height: '100%' }}
                ></div>
            </div>
        </div>
    );
}