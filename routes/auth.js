const express = require("express");
const router = express.Router();
const { generateToken, rateLimit } = require("../middleware/auth");

/**
 * Admin login
 * POST /api/auth/login
 */
router.post("/login", rateLimit(15 * 60 * 1000, 5), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }

    // Check admin credentials (in production, use hashed passwords)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
    }

    // Generate JWT token
    const token = generateToken({
      email: adminEmail,
      role: "admin"
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          email: adminEmail,
          role: "admin"
        }
      },
      message: "Login successful"
    });

  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during login"
    });
  }
});

/**
 * Verify token
 * POST /api/auth/verify
 */
router.post("/verify", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token is required"
      });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      success: true,
      data: {
        valid: true,
        user: decoded
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Invalid token"
    });
  }
});

/**
 * Refresh token
 * POST /api/auth/refresh
 */
router.post("/refresh", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token is required"
      });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

    // Generate new token
    const newToken = generateToken({
      email: decoded.email,
      role: decoded.role
    });

    res.json({
      success: true,
      data: {
        token: newToken
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Invalid token"
    });
  }
});

module.exports = router;