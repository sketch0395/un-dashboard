// Security headers middleware for enhanced protection

// Default security headers configuration
export const DEFAULT_SECURITY_HEADERS = {
  // Prevent XSS attacks
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  
  // HTTPS enforcement
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Relaxed for Next.js dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()'
  ].join(', ')
};

// Production-specific security headers
export const PRODUCTION_SECURITY_HEADERS = {
  ...DEFAULT_SECURITY_HEADERS,
  
  // Stricter CSP for production
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'", // No unsafe-inline/unsafe-eval in production
    "style-src 'self' 'unsafe-inline'", // Next.js still needs this for CSS-in-JS
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ')
};

// Development-specific security headers (more relaxed)
export const DEVELOPMENT_SECURITY_HEADERS = {
  ...DEFAULT_SECURITY_HEADERS,
  
  // More relaxed CSP for development
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* ws:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: localhost:*",
    "font-src 'self' data:",
    "connect-src 'self' localhost:* ws: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

// Security headers for API endpoints
export const API_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Referrer-Policy': 'no-referrer'
};

// Get appropriate security headers based on environment
export function getSecurityHeaders(isAPI = false) {
  if (isAPI) {
    return API_SECURITY_HEADERS;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? PRODUCTION_SECURITY_HEADERS : DEVELOPMENT_SECURITY_HEADERS;
}

// Middleware function to add security headers
export function withSecurityHeaders(handler, options = {}) {
  const {
    isAPI = false,
    customHeaders = {},
    overrideDefaults = false
  } = options;

  return async (request, context) => {
    try {
      // Execute the original handler
      const response = await handler(request, context);

      // Only add headers to Response objects
      if (response instanceof Response) {
        const headers = overrideDefaults 
          ? customHeaders 
          : { ...getSecurityHeaders(isAPI), ...customHeaders };

        // Add security headers
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        // Remove potentially sensitive headers in production
        if (process.env.NODE_ENV === 'production') {
          response.headers.delete('X-Powered-By');
          response.headers.delete('Server');
        }
      }

      return response;

    } catch (error) {
      console.error('Security headers middleware error:', error);
      // Return the original handler result even if header setting fails
      return handler(request, context);
    }
  };
}

// Helper function to create secure cookie options
export function getSecureCookieOptions(options = {}) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    ...options
  };
}

// Helper function to validate Content-Type for API endpoints
export function validateContentType(request, allowedTypes = ['application/json']) {
  const contentType = request.headers.get('content-type');
  
  if (!contentType) {
    return { valid: false, error: 'Content-Type header is required' };
  }

  const isValid = allowedTypes.some(type => 
    contentType.toLowerCase().includes(type.toLowerCase())
  );

  if (!isValid) {
    return { 
      valid: false, 
      error: `Invalid Content-Type. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }

  return { valid: true };
}

// Middleware for Content-Type validation
export function withContentTypeValidation(handler, allowedTypes = ['application/json']) {
  return async (request, context) => {
    // Skip validation for GET, HEAD, OPTIONS methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return handler(request, context);
    }

    const validation = validateContentType(request, allowedTypes);
    
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: 'Invalid Content-Type',
        message: validation.error
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return handler(request, context);
  };
}

// Combined security middleware
export function withSecurity(handler, options = {}) {
  const {
    enableCSRF = false,
    enableRateLimit = false,
    enableContentTypeValidation = false,
    ...otherOptions
  } = options;

  let securedHandler = handler;

  // Apply security headers
  securedHandler = withSecurityHeaders(securedHandler, otherOptions);

  // Apply content type validation if enabled
  if (enableContentTypeValidation) {
    securedHandler = withContentTypeValidation(securedHandler);
  }

  // Note: CSRF and rate limiting would be applied separately as they need their own imports

  return securedHandler;
}

export default {
  withSecurityHeaders,
  withContentTypeValidation,
  withSecurity,
  getSecurityHeaders,
  getSecureCookieOptions,
  validateContentType
};
