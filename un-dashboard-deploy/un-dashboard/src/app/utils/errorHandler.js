// Enhanced error handling utilities for better user experience and debugging

export class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error types
export class ValidationError extends AppError {
  constructor(message, field = null, value = null) {
    super(message, 400, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR', { resource });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message, resource = null) {
    super(message, 409, 'CONFLICT_ERROR', { resource });
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(resetTime, limit) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_ERROR', { resetTime, limit });
    this.name = 'RateLimitError';
  }
}

export class CSRFError extends AppError {
  constructor(reason = 'CSRF token validation failed') {
    super('CSRF protection error', 403, 'CSRF_ERROR', { reason });
    this.name = 'CSRFError';
  }
}

// Error handling middleware
export function withErrorHandler(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleError(error, request);
    }
  };
}

// Main error handler function
export function handleError(error, request = null) {
  // Log error for debugging
  console.error('Error occurred:', {
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    details: error.details,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: request?.url,
    method: request?.method,
    timestamp: new Date().toISOString()
  });

  // Handle different error types
  if (error instanceof AppError) {
    return createErrorResponse(error);
  }

  // Handle MongoDB errors
  if (error.name === 'ValidationError' && error.errors) {
    const validationErrors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    
    const validationError = new ValidationError('Validation failed');
    validationError.details.errors = validationErrors;
    return createErrorResponse(validationError);
  }

  if (error.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    const conflictError = new ConflictError(`${field} already exists`, field);
    return createErrorResponse(conflictError);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return createErrorResponse(new AuthenticationError('Invalid token'));
  }

  if (error.name === 'TokenExpiredError') {
    return createErrorResponse(new AuthenticationError('Token expired'));
  }

  // Handle network/connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    const networkError = new AppError(
      'Service temporarily unavailable',
      503,
      'NETWORK_ERROR',
      { originalError: error.code }
    );
    return createErrorResponse(networkError);
  }

  // Generic server error for unhandled cases
  const genericError = new AppError(
    process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    500,
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'development' 
      ? { originalError: error.message, stack: error.stack }
      : {}
  );

  return createErrorResponse(genericError);
}

// Create standardized error response
function createErrorResponse(error) {
  const response = {
    success: false,
    error: {
      message: error.message,
      code: error.code,
      timestamp: error.timestamp || new Date().toISOString()
    }
  };

  // Add details in development mode or for validation errors
  if (process.env.NODE_ENV === 'development' || error instanceof ValidationError) {
    response.error.details = error.details;
  }

  // Add specific fields for certain error types
  if (error instanceof RateLimitError) {
    response.error.resetTime = error.details.resetTime;
    response.error.limit = error.details.limit;
  }

  return new Response(JSON.stringify(response), {
    status: error.statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...(error instanceof RateLimitError && {
        'X-RateLimit-Reset': error.details.resetTime.toString(),
        'Retry-After': Math.ceil((error.details.resetTime - Date.now()) / 1000).toString()
      })
    }
  });
}

// Validation helpers
export function validateRequired(fields, data) {
  const missing = [];
  
  for (const field of fields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      missing[0]
    );
  }
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email', email);
  }
}

export function validatePassword(password) {
  if (!password || password.length < 8) {
    throw new ValidationError(
      'Password must be at least 8 characters long',
      'password'
    );
  }
  
  // Additional password strength checks
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strength = {
    hasUppercase,
    hasLowercase,
    hasNumbers,
    hasSpecialChar,
    score: [hasUppercase, hasLowercase, hasNumbers, hasSpecialChar].filter(Boolean).length
  };
  
  if (strength.score < 2) {
    throw new ValidationError(
      'Password must contain at least uppercase, lowercase, and numbers or special characters',
      'password',
      null,
      { strength }
    );
  }
  
  return strength;
}

export function validateObjectId(id, fieldName = 'id') {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName, id);
  }
}

// Async error wrapper for async route handlers
export function asyncHandler(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleError(error, request);
    }
  };
}

// Custom error for business logic violations
export class BusinessLogicError extends AppError {
  constructor(message, code = null, details = {}) {
    super(message, 422, code || 'BUSINESS_LOGIC_ERROR', details);
    this.name = 'BusinessLogicError';
  }
}

// Database connection error handler
export function handleDBError(error) {
  console.error('Database error:', error);
  
  if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
    throw new AppError(
      'Database connection error',
      503,
      'DATABASE_CONNECTION_ERROR'
    );
  }
  
  throw error;
}

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  CSRFError,
  BusinessLogicError,
  withErrorHandler,
  handleError,
  asyncHandler,
  validateRequired,
  validateEmail,
  validatePassword,
  validateObjectId,
  handleDBError
};
