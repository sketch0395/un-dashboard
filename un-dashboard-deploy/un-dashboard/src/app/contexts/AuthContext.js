'use client';

import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { SessionManager, SessionTimeoutWarning } from '../../utils/sessionManager';

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const sessionManager = useRef(null);
  const timeoutWarning = useRef(null);

  // Initialize session management
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionManager.current = new SessionManager();
      timeoutWarning.current = new SessionTimeoutWarning(
        handleExtendSession,
        handleSessionTimeout
      );

      // Initialize session monitoring when user is authenticated
      if (state.isAuthenticated && state.user) {
        sessionManager.current.init(
          handleSessionWarning,
          handleSessionTimeout
        );
      }
    }

    return () => {
      if (sessionManager.current) {
        sessionManager.current.deactivate();
      }
      if (timeoutWarning.current) {
        timeoutWarning.current.hide();
      }
    };
  }, [state.isAuthenticated]);

  // Handle session timeout warning
  const handleSessionWarning = () => {
    const timeRemaining = sessionManager.current?.getTimeUntilExpiry() || 0;
    timeoutWarning.current?.show(timeRemaining);
  };

  // Handle session timeout
  const handleSessionTimeout = async () => {
    console.log('Session timed out');
    timeoutWarning.current?.hide();
    await logout(true); // Force logout
  };

  // Handle extend session
  const handleExtendSession = () => {
    sessionManager.current?.extendSession();
  };
  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    try {
      // Add a small delay to ensure logout cookies are cleared
      if (typeof window !== 'undefined') {
        // Check if we're on the login page - don't auto-authenticate there
        if (window.location.pathname.includes('/auth/login')) {
          dispatch({ type: 'LOGOUT' });
          return;
        }
        
        // Check for explicit logout flag in sessionStorage
        const loggedOut = sessionStorage.getItem('logged-out');
        if (loggedOut === 'true') {
          sessionStorage.removeItem('logged-out');
          dispatch({ type: 'LOGOUT' });
          return;
        }
      }

      // Use cookies instead of localStorage for better security
      const response = await fetch('/api/user/profile', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });
        
        // Activate session monitoring
        if (sessionManager.current) {
          sessionManager.current.activate();
        }
      } else {
        dispatch({ type: 'LOGOUT' });
        if (sessionManager.current) {
          sessionManager.current.deactivate();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      dispatch({ type: 'LOGOUT' });
      if (sessionManager.current) {
        sessionManager.current.deactivate();
      }
    }
  };
  const login = async (username, password) => {
    dispatch({ type: 'LOADING' });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });
        
        // Activate session monitoring
        if (sessionManager.current) {
          sessionManager.current.activate();
        }
        
        return { success: true };
      } else {
        dispatch({ type: 'LOGIN_ERROR', payload: data.message });
        return { success: false, error: data.message };
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_ERROR', payload: 'Network error occurred' });
      return { success: false, error: 'Network error occurred' };
    }
  };
  const register = async (userData) => {
    dispatch({ type: 'LOADING' });

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        // Registration successful but needs approval - don't login automatically
        dispatch({ type: 'LOGOUT' });
        return { 
          success: true, 
          pendingApproval: data.pendingApproval,
          message: data.message 
        };
      } else {
        dispatch({ type: 'LOGIN_ERROR', payload: data.message });
        return { success: false, error: data.message };
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_ERROR', payload: 'Network error occurred' });
      return { success: false, error: 'Network error occurred' };
    }
  };  const logout = async (forced = false) => {
    try {
      if (!forced) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Deactivate session monitoring
      if (sessionManager.current) {
        sessionManager.current.deactivate();
      }
      if (timeoutWarning.current) {
        timeoutWarning.current.hide();
      }
        // Clear any cached auth data
      if (typeof window !== 'undefined') {
        // Set logout flag to prevent auto re-authentication
        sessionStorage.setItem('logged-out', 'true');
        
        // Clear any potential localStorage auth data
        localStorage.removeItem('auth-token');
        localStorage.removeItem('session-id');
        localStorage.removeItem('user');
        
        // Clear sessionStorage as well
        sessionStorage.removeItem('auth-token');
        sessionStorage.removeItem('session-id');
        sessionStorage.removeItem('user');
      }
      
      dispatch({ type: 'LOGOUT' });
      
      // Force a page reload to ensure all cached data is cleared
      if (typeof window !== 'undefined' && !forced) {
        // Use replace to prevent back button from showing cached authenticated state
        window.location.replace('/auth/login');
      }
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };
  const value = {
    ...state,
    login,
    register,
    logout,
    clearError,
    checkAuth,
    sessionManager: sessionManager.current,
    // Add loading alias for backward compatibility
    loading: state.isLoading,
    // Add user alias for backward compatibility  
    user: state.user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
