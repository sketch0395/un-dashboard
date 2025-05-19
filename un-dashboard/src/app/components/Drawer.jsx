"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaDocker, FaNetworkWired, FaChartBar, FaBars, FaTimes, FaHome, FaChevronLeft, FaChevronRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';

const Drawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);  // Set to true for minimized by default
  const pathname = usePathname();
  const router = useRouter();// Function to ensure consistent sizing across the application
  const ensureConsistentSizing = () => {
    // Measure navbar height to ensure drawer positioning is consistent
    const navbar = document.querySelector('nav.navbar');
    if (navbar) {
      const navbarHeight = navbar.offsetHeight;
      document.documentElement.style.setProperty('--navbar-height', `${navbarHeight}px`);
    } else {
      // Default height if navbar not found
      document.documentElement.style.setProperty('--navbar-height', '4rem');
    }
  };

  // Load collapsed state from localStorage on component mount and set up resize observer
  useEffect(() => {
    const savedCollapsedState = localStorage.getItem('drawerCollapsed');
    if (savedCollapsedState !== null) {
      setIsCollapsed(savedCollapsedState === 'true');
    }
    
    // Call once on mount
    ensureConsistentSizing();
    
    // Set up observer to handle any dynamic changes to navbar height
    const resizeObserver = new ResizeObserver(ensureConsistentSizing);
    const navbar = document.querySelector('nav.navbar');
    if (navbar) {
      resizeObserver.observe(navbar);
    }
    
    // Also observe window resize events
    window.addEventListener('resize', ensureConsistentSizing);
    
    // Clean up observers on unmount
    return () => {
      if (navbar) {
        resizeObserver.unobserve(navbar);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', ensureConsistentSizing);
    };
  }, []);  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('drawerCollapsed', isCollapsed.toString());
    
    // Set CSS class on document body for global styling hooks
    if (isCollapsed) {
      document.body.classList.add('drawer-collapsed');
    } else {
      document.body.classList.remove('drawer-collapsed');
    }
    
    // Dispatch a custom event to notify other components about the state change
    const event = new Event('drawerStateChange');
    window.dispatchEvent(event);
  }, [isCollapsed]);

  // Close drawer when path changes (mobile navigation)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close drawer when clicking outside on mobile
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (isOpen && event.target.id === 'drawer-backdrop') {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  // Navigation items
  const navItems = [
    {
      name: 'Home',
      path: '/',
      icon: <FaHome className="w-5 h-5" />
    },
    {
      name: 'Docker Manager',
      path: '/docker',
      icon: <FaDocker className="w-5 h-5" />
    },
    {
      name: 'Network Scan',
      path: '/networkscan',
      icon: <FaNetworkWired className="w-5 h-5" />
    },
    {
      name: 'Performance',
      path: '/performance',
      icon: <FaChartBar className="w-5 h-5" />
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          id="drawer-backdrop"
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        />
      )}      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed z-50 bg-gray-700 p-2 rounded-md text-white focus:outline-none shadow-md"
        style={{
          top: 'calc(var(--navbar-height) + 0.75rem)',
          left: '1rem'
        }}
        aria-label="Toggle navigation drawer"
      >
        {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
      </button>{/* Drawer */}      <div 
        className={`
          fixed top-[var(--navbar-height)] bottom-0 left-0 z-40 bg-gray-800 text-white transform transition-all duration-300 ease-in-out
          h-[calc(100vh-var(--navbar-height))] overflow-y-auto overflow-x-hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-[var(--drawer-width-collapsed)]' : 'w-[var(--drawer-width-expanded)]'}
          lg:fixed
        `}
      >        {/* Collapse toggle button (desktop only) */}        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 hidden lg:flex items-center justify-center w-6 h-12 bg-gray-700 text-gray-300 
            rounded-r-md hover:text-white focus:outline-none z-50 shadow-md"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ 
            top: '1rem',
          }}
        >
          {isCollapsed ? <FaAngleDoubleRight size={14} /> : <FaAngleDoubleLeft size={14} />}
        </button>        <div className={`${isCollapsed ? 'px-2 pt-0 pb-2' : 'px-5 pt-0 pb-5'}`}>
          <h2 className={`font-bold mt-4 ${
            isCollapsed 
              ? 'text-center mb-4 text-xs w-[calc(var(--drawer-width-collapsed)-1rem)]' 
              : 'text-xl mb-6 w-[calc(var(--drawer-width-expanded)-2rem)]'
          }`}>
            {isCollapsed ? 'UN' : 'UN-Dashboard'}
          </h2>
          
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  href={item.path}
                  key={item.path}
                  className={`
                    flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} 
                    px-3 py-3 rounded-md transition-colors
                    ${isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                  `}
                  title={isCollapsed ? item.name : ''}
                >
                  {item.icon}
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
          {!isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-5 w-[var(--drawer-width-expanded)]">
            <div className="bg-gray-700 rounded-md p-3 text-sm shadow-inner">
              <h3 className="font-medium mb-2">Current Page</h3>
              <p className="text-gray-300 truncate">
                {navItems.find(item => item.path === pathname)?.name || 'Dashboard'}
              </p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-2 w-[var(--drawer-width-collapsed)]">
            <div className="bg-gray-700 rounded-md p-2 flex justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full" title="Current page indicator"></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Drawer;
