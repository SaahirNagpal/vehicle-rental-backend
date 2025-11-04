const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all vehicles with optional availability filtering
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, type } = req.query;
    let query = 'SELECT * FROM vehicle';
    const queryParams = [];
    const conditions = [];

    // Add type filter if specified
    if (type && type.trim()) {
      conditions.push('type = ?');
      queryParams.push(type.trim());
    }

    // Add condition to only show available vehicles by default
    if (!req.query.include_unavailable) {
      conditions.push('availability = true');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY type, model';

    const [rows] = await db.execute(query, queryParams);

    // If date range is provided, check availability for each vehicle
    if (start_date && end_date) {
      for (const vehicle of rows) {
        const availabilityQuery = `
          SELECT COUNT(*) as conflict_count
          FROM rental
          WHERE vehicle_id = ?
            AND status NOT IN ('cancelled', 'completed')
            AND NOT (end_date < ? OR start_date > ?)
        `;
        const [conflictRows] = await db.execute(availabilityQuery, [
          vehicle.id,
          start_date,
          end_date
        ]);

        vehicle.available_for_dates = conflictRows[0].conflict_count === 0;
      }
    }

    res.json({
      success: true,
      data: {
        vehicles: rows,
        count: rows.length,
        filters: {
          start_date: start_date || null,
          end_date: end_date || null,
          type: type || null
        }
      }
    });

  } catch (error) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching vehicles"
    });
  }
});

// Add vehicle
router.post('/', async (req, res) => {
  try {
    const { model, type, rent_per_day, availability = true, features, seats, transmission, fuel_type, image_url } = req.body;

    // Validate required fields
    if (!model || !type || !rent_per_day) {
      return res.status(400).json({
        success: false,
        error: "model, type, and rent_per_day are required"
      });
    }

    if (rent_per_day <= 0) {
      return res.status(400).json({
        success: false,
        error: "rent_per_day must be greater than 0"
      });
    }

    const query = `
      INSERT INTO vehicle (model, type, rent_per_day, availability, features, seats, transmission, fuel_type, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      model,
      type,
      rent_per_day,
      availability,
      features ? JSON.stringify(features) : null,
      seats || null,
      transmission || null,
      fuel_type || null,
      image_url || null
    ]);

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        message: "Vehicle added successfully!"
      }
    });

  } catch (error) {
    console.error("Error adding vehicle:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while adding vehicle"
    });
  }
});

// Get single vehicle by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    const query = 'SELECT * FROM vehicle WHERE id = ?';
    const [rows] = await db.execute(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Vehicle not found"
      });
    }

    const vehicle = rows[0];

    // Check availability if dates provided
    if (start_date && end_date) {
      const availabilityQuery = `
        SELECT COUNT(*) as conflict_count
        FROM rental
        WHERE vehicle_id = ?
          AND status NOT IN ('cancelled', 'completed')
          AND NOT (end_date < ? OR start_date > ?)
      `;
      const [conflictRows] = await db.execute(availabilityQuery, [
        vehicle.id,
        start_date,
        end_date
      ]);

      vehicle.available_for_dates = conflictRows[0].conflict_count === 0;
    }

    res.json({
      success: true,
      data: vehicle
    });

  } catch (error) {
    console.error("Error fetching vehicle:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching vehicle"
    });
  }
});

// Update vehicle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { model, type, rent_per_day, availability, features, seats, transmission, fuel_type, image_url } = req.body;

    // Check if vehicle exists
    const [existingRows] = await db.execute('SELECT id FROM vehicle WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Vehicle not found"
      });
    }

    const query = `
      UPDATE vehicle
      SET model = ?, type = ?, rent_per_day = ?, availability = ?,
          features = ?, seats = ?, transmission = ?, fuel_type = ?, image_url = ?
      WHERE id = ?
    `;

    const [result] = await db.execute(query, [
      model,
      type,
      rent_per_day,
      availability,
      features ? JSON.stringify(features) : null,
      seats || null,
      transmission || null,
      fuel_type || null,
      image_url || null,
      id
    ]);

    res.json({
      success: true,
      data: {
        message: "Vehicle updated successfully!",
        affected_rows: result.affectedRows
      }
    });

  } catch (error) {
    console.error("Error updating vehicle:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while updating vehicle"
    });
  }
});

// Delete vehicle
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check for active rentals
    const [rentalCheck] = await db.execute(
      'SELECT COUNT(*) as active_rentals FROM rental WHERE vehicle_id = ? AND status NOT IN ("cancelled", "completed")',
      [id]
    );

    if (rentalCheck[0].active_rentals > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete vehicle with active rentals"
      });
    }

    const [result] = await db.execute('DELETE FROM vehicle WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Vehicle not found"
      });
    }

    res.json({
      success: true,
      data: {
        message: "Vehicle deleted successfully!"
      }
    });

  } catch (error) {
    console.error("Error deleting vehicle:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while deleting vehicle"
    });
  }
});

module.exports = router;


