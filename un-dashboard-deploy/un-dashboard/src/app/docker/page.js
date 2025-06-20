"use client";

import DockerStatus from "./components/dockerstatus";
import DockerControls from "./components/DockerControls";
import { useState } from 'react';

export default function DockerManager() {
    const [filterValue, setFilterValue] = useState('');
    const [showStoppedContainers, setShowStoppedContainers] = useState(true);
    
    return (
        <>
            <h1 className="text-3xl font-bold mb-6">Docker Container Management</h1>
            <DockerControls 
                filterValue={filterValue} 
                setFilterValue={setFilterValue}
                showStoppedContainers={showStoppedContainers}
                setShowStoppedContainers={setShowStoppedContainers}
            />
            <DockerStatus 
                filterValue={filterValue}
                showStoppedContainers={showStoppedContainers}
            />
        </>
    );
}
