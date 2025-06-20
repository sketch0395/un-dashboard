'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

// Routes that don't require authentication
const publicRoutes = ['/auth/login', '/auth/register'];

export default function AuthWrapper({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If not loading and not authenticated, and not on a public route
    if (!isLoading && !isAuthenticated && !publicRoutes.includes(pathname)) {
      router.push('/auth/login');
    }
    
    // If authenticated and on a public route, redirect to home
    if (!isLoading && isAuthenticated && publicRoutes.includes(pathname)) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not on a public route, don't render anything
  // (will redirect to login)
  if (!isAuthenticated && !publicRoutes.includes(pathname)) {
    return null;
  }

  return children;
}
