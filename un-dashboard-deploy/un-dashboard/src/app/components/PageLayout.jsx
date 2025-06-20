"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Drawer from '../components/Drawer';

export default function PageLayout({ children }) {
  const pathname = usePathname();
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const isLandingPage = pathname === '/';

  // Check for drawer collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('drawerCollapsed');
    if (savedState !== null) {
      setDrawerCollapsed(savedState === 'true');
    }
  }, []);

  // Add event listener for drawer state changes
  useEffect(() => {
    const handleStorageChange = () => {
      const currentState = localStorage.getItem('drawerCollapsed') === 'true';
      setDrawerCollapsed(currentState);
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for when localStorage changes in the same window
    window.addEventListener('drawerStateChange', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('drawerStateChange', handleStorageChange);
    };
  }, []);

  // Apply drawer layout only to content pages, not the landing page
  if (isLandingPage) {
    return children;
  }    return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      {/* Drawer has its own fixed positioning */}
      <Drawer />        <main className={`
          min-h-screen transition-all duration-300 ease-in-out 
          pt-[var(--navbar-height)] pb-6 overflow-y-auto
          ${drawerCollapsed 
            ? 'lg:ml-[var(--drawer-width-collapsed)]' 
            : 'lg:ml-[var(--drawer-width-expanded)]'
          }
        `}
      >        <div className="p-5">
          {children}
        </div>
      </main>
    </div>
  );
}
