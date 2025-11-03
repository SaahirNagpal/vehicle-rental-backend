const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all vehicles
router.get('/', (req, res) => {
  db.query('SELECT * FROM vehicle', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
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


