// Rate limiting service for API endpoints
class RateLimiter {
  constructor() {
    this.requests = new Map(); // Store requests by IP
    this.cleanup(); // Start cleanup interval
  }

  // Check if request is within rate limit
  checkLimit(ip, endpoint, maxRequests = 5, windowMs = 15 * 60 * 1000) { // 5 requests per 15 minutes by default
    const key = `${ip}:${endpoint}`;
    const now = Date.now();
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const requests = this.requests.get(key);
    
    // Remove expired requests
    const validRequests = requests.filter(time => now - time < windowMs);
    this.requests.set(key, validRequests);

    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      return {
        allowed: false,
        resetTime: Math.min(...validRequests) + windowMs,
        remaining: 0,
        limit: maxRequests
      };
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return {
      allowed: true,
      resetTime: now + windowMs,
      remaining: maxRequests - validRequests.length,
      limit: maxRequests
    };
  }

  // Get request info for IP
  getRequestInfo(ip, endpoint) {
    const key = `${ip}:${endpoint}`;
    const requests = this.requests.get(key) || [];
    const now = Date.now();
    
    return {
      requests: requests.length,
      lastRequest: requests.length > 0 ? Math.max(...requests) : null,
      timeSinceLastRequest: requests.length > 0 ? now - Math.max(...requests) : null
    };
  }

  // Clean up expired entries
  cleanup() {
    setInterval(() => {
      const now = Date.now();
      const expiredTime = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const [key, requests] of this.requests.entries()) {
        const validRequests = requests.filter(time => now - time < expiredTime);
        if (validRequests.length === 0) {
          this.requests.delete(key);
        } else {
          this.requests.set(key, validRequests);
        }
      }
    }, 60 * 60 * 1000); // Clean up every hour
  }

  // Clear all requests for an IP (for testing or admin purposes)
  clearIP(ip) {
    const keysToDelete = [];
    for (const key of this.requests.keys()) {
      if (key.startsWith(`${ip}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.requests.delete(key));
  }

  // Get all rate limit info for an IP
  getIPInfo(ip) {
    const ipRequests = {};
    for (const [key, requests] of this.requests.entries()) {
      if (key.startsWith(`${ip}:`)) {
        const endpoint = key.split(':')[1];
        ipRequests[endpoint] = requests;
      }
    }
    return ipRequests;
  }
}

// Rate limiting configurations for different endpoints
export const RATE_LIMITS = {
  // Authentication endpoints - more restrictive
  'auth/login': { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  'auth/register': { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 registrations per hour
  'auth/logout': { maxRequests: 10, windowMs: 60 * 1000 }, // 10 logouts per minute
  'user/change-password': { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 password changes per hour
  
  // Admin endpoints - moderate limits
  'admin/users': { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 requests per hour
  'admin/sessions': { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50 requests per hour
  'admin/audit-logs': { maxRequests: 200, windowMs: 60 * 60 * 1000 }, // 200 requests per hour
  
  // General API endpoints
  'user/profile': { maxRequests: 60, windowMs: 60 * 60 * 1000 }, // 60 requests per hour
  'user/sessions': { maxRequests: 30, windowMs: 60 * 60 * 1000 }, // 30 requests per hour
  
  // Default for unspecified endpoints
  'default': { maxRequests: 100, windowMs: 60 * 60 * 1000 } // 100 requests per hour
};

// Singleton instance
export const rateLimiter = new RateLimiter();

// Helper function to get client IP from request
export function getClientIP(request) {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to connection remote address (may not be available in all environments)
  return request.ip || 'unknown';
}

// Helper function to get endpoint key from URL
export function getEndpointKey(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    // Remove /api prefix if present
    if (pathParts[0] === 'api') {
      pathParts.shift();
    }
    
    // Join the remaining parts to create endpoint key
    const endpoint = pathParts.join('/');
    
    // Return specific endpoint or default
    return RATE_LIMITS[endpoint] ? endpoint : 'default';
  } catch (error) {
    return 'default';
  }
}

// Middleware function for rate limiting
export function withRateLimit(handler, customLimits = {}) {
  return async (request, context) => {
    try {
      const ip = getClientIP(request);
      const endpointKey = getEndpointKey(request.url);
      
      // Get rate limit config
      const limits = customLimits[endpointKey] || RATE_LIMITS[endpointKey] || RATE_LIMITS.default;
      
      // Check rate limit
      const limitResult = rateLimiter.checkLimit(ip, endpointKey, limits.maxRequests, limits.windowMs);
      
      if (!limitResult.allowed) {
        const resetDate = new Date(limitResult.resetTime);
        
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again after ${resetDate.toISOString()}`,
          resetTime: limitResult.resetTime,
          limit: limitResult.limit
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': limitResult.resetTime.toString(),
            'Retry-After': Math.ceil((limitResult.resetTime - Date.now()) / 1000).toString()
          }
        });
      }

      // Add rate limit headers to successful responses
      const response = await handler(request, context);
      
      if (response instanceof Response) {
        response.headers.set('X-RateLimit-Limit', limitResult.limit.toString());
        response.headers.set('X-RateLimit-Remaining', limitResult.remaining.toString());
        response.headers.set('X-RateLimit-Reset', limitResult.resetTime.toString());
      }
      
      return response;
      
    } catch (error) {
      console.error('Rate limiting error:', error);
      // If rate limiting fails, allow the request to proceed
      return handler(request, context);
    }
  };
}

export default rateLimiter;
