"use client";

import React, { useState, useRef, useEffect } from "react";
import { FaBars, FaLinkedin } from "react-icons/fa";
import Link from "next/link";

export default function Topbar() {
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <nav className="bg-white border-gray-200 dark:bg-gray-900">
        <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
          {/* Logo */}
          <a href="/" className="flex items-center space-x-3">
            <img
              src="https://flowbite.com/docs/images/logo.svg"
              className="h-8"
              alt="Flowbite Logo"
            />
            <span className="self-center text-2xl font-semibold dark:text-white">
              Fuckitol
            </span>
          </a>

          {/* User Profile Dropdown */}
          <div className="flex items-center space-x-3 md:order-2">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
              aria-expanded={dropdownOpen}
            >
              <span className="sr-only">Open user menu</span>
              <img
                className="w-8 h-8 rounded-full"
                src="https://flowbite.com/docs/images/people/profile-picture-3.jpg"
                alt="User Avatar"
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div
                ref={dropdownRef}
                className="absolute right-4 top-14 z-50 bg-white divide-y divide-gray-100 rounded-lg shadow-lg w-44 dark:bg-gray-700 dark:divide-gray-600"
              >
                <div className="px-4 py-3">
                  <span className="block text-sm text-gray-900 dark:text-white">
                    Bonnie Green
                  </span>
                  <span className="block text-sm text-gray-500 truncate dark:text-gray-400">
                    name@flowbite.com
                  </span>
                </div>
                <ul className="py-2">
                  <li>
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      Dashboard
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      Settings
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      Earnings
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      Sign out
                    </a>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setNavbarOpen(!navbarOpen)}
            className="md:hidden inline-flex items-center p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <FaBars className="w-5 h-5" />
          </button>

          {/* Navigation Links */}
          <div
            className={`${
              navbarOpen ? "block" : "hidden"
            } md:flex md:items-center md:space-x-8`}
          >
            <Link href="/" className="block py-2 px-3 text-blue-700 md:p-0">
              Home
            </Link>
            <Link href="/tools" className="block py-2 px-3 text-gray-900 md:p-0 hover:text-blue-700 dark:text-white">
              Tools
            </Link>
            <Link href="terminalpage" className="block py-2 px-3 text-gray-900 md:p-0 hover:text-blue-700 dark:text-white">
              Terminal
            </Link>
            {/* <Link href="#" className="block py-2 px-3 text-gray-900 md:p-0 hover:text-blue-700 dark:text-white">
              Pricing
            </Link>
            <Link href="#" className="block py-2 px-3 text-gray-900 md:p-0 hover:text-blue-700 dark:text-white">
              Contact
            </Link> */}
          </div>
        </div>
      </nav>
    </>
  );
}
