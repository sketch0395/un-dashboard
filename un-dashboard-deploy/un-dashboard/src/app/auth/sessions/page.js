'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function SessionManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [terminating, setTerminating] = useState(new Set());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      fetchSessions();
    }
  }, [user, loading, router]);

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await fetch('/api/user/sessions', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        console.error('Failed to fetch sessions');
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const terminateSession = async (sessionId) => {
    if (terminating.has(sessionId)) return;

    try {
      setTerminating(prev => new Set([...prev, sessionId]));
      
      const response = await fetch('/api/user/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        // Remove the terminated session from the list
        setSessions(prev => prev.filter(session => session.id !== sessionId));
      } else {
        const data = await response.json();
        alert(`Failed to terminate session: ${data.message}`);
      }
    } catch (error) {
      console.error('Error terminating session:', error);
      alert('Failed to terminate session');
    } finally {
      setTerminating(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getDeviceInfo = (userAgent) => {
    // Simple device detection
    if (userAgent.includes('Mobile')) return 'Mobile Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';
    return 'Unknown Device';
  };

  const getBrowserInfo = (userAgent) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  };

  if (loading || loadingSessions) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your active sessions and sign out from other devices
            </p>
          </div>

          <div className="p-6">
            {sessions.length === 0 ? (
              <div className="text-center py-8">                <div className="text-gray-400 text-lg mb-2">No active sessions</div>
                <p className="text-gray-600">You don&apos;t have any other active sessions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`border rounded-lg p-4 ${
                      session.isCurrent 
                        ? 'border-blue-200 bg-blue-50' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            session.isCurrent ? 'bg-green-400' : 'bg-gray-400'
                          }`}></div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {getDeviceInfo(session.userAgent)} - {getBrowserInfo(session.userAgent)}
                          </h3>
                          {session.isCurrent && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Current Session
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">IP Address:</span> {session.ipAddress}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {formatDate(session.createdAt)}
                          </div>
                          <div>
                            <span className="font-medium">Last Activity:</span> {formatDate(session.lastActivity)}
                          </div>
                          <div>
                            <span className="font-medium">Expires:</span> {formatDate(session.expiresAt)}
                          </div>
                        </div>
                      </div>

                      {!session.isCurrent && (
                        <div className="ml-4">
                          <button
                            onClick={() => terminateSession(session.id)}
                            disabled={terminating.has(session.id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {terminating.has(session.id) ? (
                              <>
                                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                Terminating...
                              </>
                            ) : (
                              'Terminate Session'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Security Actions</h3>
                  <p className="text-sm text-gray-600">
                    Terminate all other sessions if you suspect unauthorized access
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to sign out from all other devices? This action cannot be undone.')) {
                      fetch('/api/auth/logout', { 
                        method: 'DELETE',
                        credentials: 'include'
                      }).then(() => {
                        fetchSessions();
                      });
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Sign Out All Other Sessions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
