const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const dbConnection = require('../lib/db');

// JWT secret key (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthService {
  // Generate JWT token
  static generateToken(userId, sessionId) {
    return jwt.sign(
      { 
        userId: userId.toString(),
        sessionId: sessionId
      },
      JWT_SECRET,
      { 
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'un-dashboard',
        audience: 'un-dashboard-users'
      }
    );
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'un-dashboard',
        audience: 'un-dashboard-users'
      });
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  // Create session
  static async createSession(userId, req) {
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    
    // Get client info - Next.js request handling
    const ipAddress = req.headers?.get?.('x-forwarded-for')?.split(',')[0] || 
                     req.headers?.get?.('x-real-ip') || 
                     req.ip || 
                     'unknown';
    const userAgent = req.headers?.get?.('user-agent') || 'Unknown';
    
    // Calculate expiration (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const session = new Session({
      sessionId,
      userId,
      ipAddress,
      userAgent,
      expiresAt,
      isActive: true
    });

    await session.save();
    return session;
  }

  // Validate session
  static async validateSession(sessionId, userId) {
    const session = await Session.findOne({
      sessionId,
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // Update last activity
    session.lastActivity = new Date();
    await session.save();

    return session;
  }  // Login user
  static async login(usernameOrEmail, password, req) {
    try {
      // Ensure database connection
      await dbConnection.connectMongoDB();

      // Find user by credentials
      const user = await User.findByCredentials(usernameOrEmail, password);
      
      // Create session
      const session = await this.createSession(user._id, req);
      
      // Generate token
      const token = this.generateToken(user._id, session.sessionId);
      
      return {
        user: user.getProfile(),
        token,
        sessionId: session.sessionId
      };
    } catch (error) {
      throw error;
    }
  }

  // Logout user
  static async logout(sessionId) {
    try {
      await dbConnection.connectMongoDB();
      
      const session = await Session.findOne({ sessionId });
      if (session) {
        await session.deactivate();
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Logout all sessions for user
  static async logoutAll(userId) {
    try {
      await dbConnection.connectMongoDB();
      await Session.deactivateUserSessions(userId);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Verify user authentication
  static async verifyAuth(req) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        throw new Error('No token provided');
      }

      // Verify JWT token
      const decoded = this.verifyToken(token);
      
      // Ensure database connection
      await dbConnection.connectMongoDB();
      
      // Validate session
      await this.validateSession(decoded.sessionId, decoded.userId);
      
      // Get user
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return {
        user: user.getProfile(),
        sessionId: decoded.sessionId
      };
    } catch (error) {
      throw error;
    }
  }
}

// Middleware function for protecting routes
const requireAuth = async (req, res, next) => {
  try {
    const authData = await AuthService.verifyAuth(req);
    req.user = authData.user;
    req.sessionId = authData.sessionId;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Authentication required'
    });
  }
};

// Middleware for role-based access
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Middleware for admin access
const requireAdmin = requireRole(['admin']);

module.exports = {
  AuthService,
  requireAuth,
  requireRole,
  requireAdmin
};
