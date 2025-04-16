"use client";

import React from "react";
import { useRouter } from "next/navigation";

const Navbar = () => {
    const router = useRouter();

    return (
        <nav className="bg-gray-800 text-white p-4 flex justify-between items-center sticky top-0 z-50">
            <div className="flex items-center">
                <span className="text-xl font-bold">UN-Dashboard</span>
            </div>
            <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => router.push("/")}
            >
                Home
            </button>
            <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => router.push("/networkscan")}
            >
                Network Scan
            </button>
        </nav>
    );
};

export default Navbar;