// CSRF (Cross-Site Request Forgery) protection utilities
import crypto from 'crypto';

class CSRFProtection {
  constructor() {
    this.tokens = new Map(); // Store CSRF tokens with expiration
    this.tokenExpiry = 60 * 60 * 1000; // 1 hour
    this.cleanup();
  }

  // Generate a secure CSRF token
  generateToken(sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + this.tokenExpiry;
    
    this.tokens.set(token, {
      sessionId,
      expiry,
      used: false
    });

    return token;
  }

  // Verify CSRF token
  verifyToken(token, sessionId, singleUse = false) {
    if (!token || !sessionId) {
      return { valid: false, reason: 'Missing token or session ID' };
    }

    const tokenData = this.tokens.get(token);
    
    if (!tokenData) {
      return { valid: false, reason: 'Invalid token' };
    }

    if (tokenData.expiry < Date.now()) {
      this.tokens.delete(token);
      return { valid: false, reason: 'Token expired' };
    }

    if (tokenData.sessionId !== sessionId) {
      return { valid: false, reason: 'Token session mismatch' };
    }

    if (singleUse && tokenData.used) {
      return { valid: false, reason: 'Token already used' };
    }

    if (singleUse) {
      tokenData.used = true;
    }

    return { valid: true };
  }

  // Get or create token for session
  getTokenForSession(sessionId) {
    // Check if we have a valid token for this session
    for (const [token, data] of this.tokens.entries()) {
      if (data.sessionId === sessionId && data.expiry > Date.now() && !data.used) {
        return token;
      }
    }

    // Generate new token if none found
    return this.generateToken(sessionId);
  }

  // Invalidate all tokens for a session
  invalidateSession(sessionId) {
    const tokensToDelete = [];
    for (const [token, data] of this.tokens.entries()) {
      if (data.sessionId === sessionId) {
        tokensToDelete.push(token);
      }
    }
    tokensToDelete.forEach(token => this.tokens.delete(token));
  }

  // Clean up expired tokens
  cleanup() {
    setInterval(() => {
      const now = Date.now();
      const expiredTokens = [];
      
      for (const [token, data] of this.tokens.entries()) {
        if (data.expiry < now) {
          expiredTokens.push(token);
        }
      }
      
      expiredTokens.forEach(token => this.tokens.delete(token));
    }, 15 * 60 * 1000); // Clean up every 15 minutes
  }

  // Get token statistics
  getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    let used = 0;

    for (const [, data] of this.tokens.entries()) {
      if (data.expiry < now) {
        expired++;
      } else if (data.used) {
        used++;
      } else {
        active++;
      }
    }

    return { active, expired, used, total: this.tokens.size };
  }
}

// Singleton instance
export const csrfProtection = new CSRFProtection();

// Helper function to get session ID from request
export function getSessionId(request) {
  return request.cookies.get('session-id')?.value;
}

// Helper function to get CSRF token from request
export function getCSRFToken(request) {
  // Check X-CSRF-Token header first
  const headerToken = request.headers.get('X-CSRF-Token');
  if (headerToken) {
    return headerToken;
  }

  // Check body for token (for form submissions)
  // Note: This would need to be handled differently for different content types
  return null;
}

// Middleware function for CSRF protection
export function withCSRFProtection(handler, options = {}) {
  const {
    requireToken = true,
    singleUse = false,
    excludeMethods = ['GET', 'HEAD', 'OPTIONS']
  } = options;

  return async (request, context) => {
    try {
      const method = request.method;
      
      // Skip CSRF protection for safe methods
      if (excludeMethods.includes(method)) {
        return handler(request, context);
      }

      const sessionId = getSessionId(request);
      if (!sessionId) {
        return new Response(JSON.stringify({
          error: 'CSRF protection error',
          message: 'Session required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (requireToken) {
        const csrfToken = getCSRFToken(request);
        const verification = csrfProtection.verifyToken(csrfToken, sessionId, singleUse);
        
        if (!verification.valid) {
          return new Response(JSON.stringify({
            error: 'CSRF protection error',
            message: `Invalid CSRF token: ${verification.reason}`
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Proceed with the request
      const response = await handler(request, context);

      // Add CSRF token to response headers for client use
      if (response instanceof Response) {
        const newToken = csrfProtection.getTokenForSession(sessionId);
        response.headers.set('X-CSRF-Token', newToken);
      }

      return response;

    } catch (error) {
      console.error('CSRF protection error:', error);
      return new Response(JSON.stringify({
        error: 'CSRF protection error',
        message: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

// API endpoint to get CSRF token
export async function getCSRFTokenAPI(request) {
  try {
    const sessionId = getSessionId(request);
    
    if (!sessionId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Session required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = csrfProtection.getTokenForSession(sessionId);

    return new Response(JSON.stringify({
      success: true,
      token
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to generate CSRF token'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export default csrfProtection;
