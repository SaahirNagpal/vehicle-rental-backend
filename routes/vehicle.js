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
router.post('/', (req, res) => {
  const { model, type, rent_per_day, availability } = req.body;
  db.query(
    'INSERT INTO vehicle (model, type, rent_per_day, availability) VALUES (?, ?, ?, ?)',
    [model, type, rent_per_day, availability],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Vehicle added successfully!', id: result.insertId });
    }
  );
});

// Update vehicle
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { model, type, rent_per_day, availability } = req.body;
  db.query(
    'UPDATE vehicle SET model=?, type=?, rent_per_day=?, availability=? WHERE id=?',
    [model, type, rent_per_day, availability, id],
    err => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Vehicle updated successfully!' });
    }
  );
});

// Delete vehicle
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM vehicle WHERE id=?', [id], err => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Vehicle deleted successfully!' });
  });
});

module.exports = router;


