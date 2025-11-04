const jwt = require("jsonwebtoken");

/**
 * Middleware to verify JWT token
 */
const requireAuth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access denied. No token provided."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Invalid token."
    });
  }
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Access denied. Admin privileges required."
    });
  }
  next();
};

/**
 * Generate JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "24h"
  });
};

/**
 * Simple rate limiting middleware
 */
const rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip + req.path;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [k, v] of requests.entries()) {
      if (v[0] < windowStart) {
        requests.delete(k);
      }
    }

    // Get or create request count for this key
    if (!requests.has(key)) {
      requests.set(key, [now, 1]);
    } else {
      const [firstTime, count] = requests.get(key);
      if (now - firstTime > windowMs) {
        requests.set(key, [now, 1]);
      } else {
        requests.set(key, [firstTime, count + 1]);
      }
    }

    const [_, count] = requests.get(key);

    if (count > max) {
      return res.status(429).json({
        success: false,
        error: "Too many requests. Please try again later."
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireAdmin,
  generateToken,
  rateLimit
};