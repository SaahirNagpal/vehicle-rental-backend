const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all rentals
router.get('/', (req, res) => {
  db.query('SELECT * FROM rental', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// Add rental
router.post('/', (req, res) => {
  const { customer_id, vehicle_id, start_date, end_date, total_amount } = req.body;
  db.query(
    'INSERT INTO rental (customer_id, vehicle_id, start_date, end_date, total_amount) VALUES (?, ?, ?, ?, ?)',
    [customer_id, vehicle_id, start_date, end_date, total_amount],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Rental added successfully!', id: result.insertId });
    }
  );
});

// Update rental
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { customer_id, vehicle_id, start_date, end_date, total_amount } = req.body;
  db.query(
    'UPDATE rental SET customer_id=?, vehicle_id=?, start_date=?, end_date=?, total_amount=? WHERE id=?',
    [customer_id, vehicle_id, start_date, end_date, total_amount, id],
    err => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Rental updated successfully!' });
    }
  );
});

// Delete rental
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM rental WHERE id=?', [id], err => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Rental deleted successfully!' });
  });
});

module.exports = router;
