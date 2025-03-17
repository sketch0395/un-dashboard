"use client";

import dynamic from "next/dynamic";
import React, { useRef, useEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebGLRendererAddon } from 'xterm-addon-webgl';


export default function MyTerminal(){
    const terminalRef = useRef(null);

    useEffect(() => {
        if (terminalRef.current) {
            const terminal = new Terminal({
                rendererType: 'dom',
                fontFamily: 'monospace',
                fontSize: 12,
                cursorBlink: true,
                allowTransparency: true,
                background: 'black',
                color: 'white',
            });
            terminal.open(terminalRef.current);
            terminal.write('Welcome to the terminal!\n');
        }
    }, []);

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: '80%', height: '80%', backgroundColor: 'black', borderRadius: '10px', padding: '10px' }}>
                <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
            </div>
        </div>
    );
}

