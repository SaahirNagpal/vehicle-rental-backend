const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all payments
router.get('/', (req, res) => {
  db.query('SELECT * FROM payment', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// Add payment
router.post('/', (req, res) => {
  const { rental_id, amount, payment_date, payment_method } = req.body;
  db.query(
    'INSERT INTO payment (rental_id, amount, payment_date, payment_method) VALUES (?, ?, ?, ?)',
    [rental_id, amount, payment_date, payment_method],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Payment added successfully!', id: result.insertId });
    }
  );
});

// Update payment
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { rental_id, amount, payment_date, payment_method } = req.body;
  db.query(
    'UPDATE payment SET rental_id=?, amount=?, payment_date=?, payment_method=? WHERE id=?',
    [rental_id, amount, payment_date, payment_method, id],
    err => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Payment updated successfully!' });
    }
  );
});

// Delete payment
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM payment WHERE id=?', [id], err => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Payment deleted successfully!' });
  });
});

module.exports = router;

