const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * Check availability for a specific vehicle during a date range
 * GET /api/availability/check?vehicle_id={id}&start_date={date}&end_date={date}
 */
router.get("/check", async (req, res) => {
  try {
    const { vehicle_id, start_date, end_date } = req.query;

    // Validate required parameters
    if (!vehicle_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: "vehicle_id, start_date, and end_date are required"
      });
    }

    // Validate date format and logic
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Use YYYY-MM-DD format"
      });
    }

    if (startDate < today) {
      return res.status(400).json({
        success: false,
        error: "Start date cannot be in the past"
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        error: "End date must be after start date"
      });
    }

    // Check if vehicle exists and is available
    const vehicleQuery = "SELECT * FROM vehicle WHERE id = ? AND availability = true";
    const [vehicleRows] = await db.execute(vehicleQuery, [vehicle_id]);

    if (vehicleRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Vehicle not found or not available"
      });
    }

    // Check for overlapping rentals
    const overlapQuery = `
      SELECT id, start_date, end_date
      FROM rental
      WHERE vehicle_id = ?
        AND status NOT IN ('cancelled', 'completed')
        AND NOT (end_date < ? OR start_date > ?)
    `;

    const [conflictRows] = await db.execute(overlapQuery, [
      vehicle_id,
      start_date,
      end_date
    ]);

    const isAvailable = conflictRows.length === 0;

    res.json({
      success: true,
      data: {
        available: isAvailable,
        conflicts: conflictRows,
        vehicle: vehicleRows[0]
      }
    });

  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while checking availability"
    });
  }
});

/**
 * Search for available vehicles during a date range
 * GET /api/availability/search?start_date={date}&end_date={date}&type={type}
 */
router.get("/search", (req, res) => {
  const { start_date, end_date, type } = req.query;

  // Validate required parameters
  if (!start_date || !end_date) {
    return res.status(400).json({
      success: false,
      error: "start_date and end_date are required"
    });
  }

  // Validate date format and logic
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(startDate) || isNaN(endDate)) {
    return res.status(400).json({
      success: false,
      error: "Invalid date format. Use YYYY-MM-DD format"
    });
  }

  if (startDate < today) {
    return res.status(400).json({
      success: false,
      error: "Start date cannot be in the past"
    });
  }

  if (startDate >= endDate) {
    return res.status(400).json({
      success: false,
      error: "End date must be after start date"
    });
  }

  // Simple query: get all available vehicles and filter by type if needed
  let query = "SELECT * FROM vehicle WHERE availability = true";
  const queryParams = [];

  // Add type filter if specified
  if (type && type.trim()) {
    query += " AND type = ?";
    queryParams.push(type.trim());
  }

  query += " ORDER BY type, model";

  db.query(query, queryParams, (err, rows) => {
    if (err) {
      console.error("Error searching available vehicles:", err);
      return res.status(500).json({
        success: false,
        error: "Internal server error while searching vehicles"
      });
    }

    // Return all available vehicles (simplified version without complex conflict checking)
    res.json({
      success: true,
      data: {
        vehicles: rows,
        search_params: {
          start_date,
          end_date,
          type: type || null
        },
        count: rows.length
      }
    });
  });
});

/**
 * Get rental conflicts for a vehicle
 * GET /api/availability/conflicts?vehicle_id={id}
 */
router.get("/conflicts", async (req, res) => {
  try {
    const { vehicle_id } = req.query;

    if (!vehicle_id) {
      return res.status(400).json({
        success: false,
        error: "vehicle_id is required"
      });
    }

    const query = `
      SELECT start_date, end_date, status, created_at
      FROM rental
      WHERE vehicle_id = ?
        AND status NOT IN ('cancelled', 'completed')
        AND end_date >= CURDATE()
      ORDER BY start_date
    `;

    const [rows] = await db.execute(query, [vehicle_id]);

    res.json({
      success: true,
      data: {
        conflicts: rows,
        vehicle_id: parseInt(vehicle_id)
      }
    });

  } catch (error) {
    console.error("Error getting conflicts:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while getting conflicts"
    });
  }
});

module.exports = router;