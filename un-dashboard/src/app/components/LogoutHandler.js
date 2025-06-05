'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

function LogoutHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Only act if we're not still loading the auth state
    if (isLoading) return;

    // Only redirect if user is explicitly not authenticated AND not already on auth pages
    if (!isAuthenticated && 
        !pathname.includes('/auth/login') && 
        !pathname.includes('/auth/register') &&
        pathname !== '/') {
      
      // Check if this is an intentional logout (not just a page refresh with expired session)
      const wasLoggedOut = sessionStorage.getItem('logged-out');
      
      if (wasLoggedOut === 'true') {
        // This was an intentional logout, redirect to login
        router.replace('/auth/login');
      }
      // If no logout flag, let the AuthContext handle the redirect naturally
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Handle browser navigation to prevent accessing protected pages after logout
  useEffect(() => {
    if (isLoading) return;

    const handlePopState = (event) => {
      // Only intervene if user is not authenticated and trying to access protected routes
      if (!isAuthenticated && !pathname.includes('/auth/') && pathname !== '/') {
        const wasLoggedOut = sessionStorage.getItem('logged-out');
        if (wasLoggedOut === 'true') {
          // Prevent back/forward navigation to protected pages after logout
          event.preventDefault();
          window.location.replace('/auth/login');
        }
      }
    };    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAuthenticated, isLoading, pathname]);

  return null; // This component doesn't render anything
}

export default LogoutHandler;
