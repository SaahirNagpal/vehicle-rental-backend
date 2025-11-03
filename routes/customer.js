const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all customers
router.get('/', (req, res) => {
  db.query('SELECT * FROM customer', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// Add customer
router.post('/', (req, res) => {
  const { name, phone, email } = req.body;
  db.query(
    'INSERT INTO customer (name, phone, email) VALUES (?, ?, ?)',
    [name, phone, email],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Customer added successfully!', id: result.insertId });
    }
  );
});

// Update customer
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, email } = req.body;
  db.query(
    'UPDATE customer SET name=?, phone=?, email=? WHERE id=?',
    [name, phone, email, id],
    err => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Customer updated successfully!' });
    }
  );
});

// Delete customer
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM customer WHERE id=?', [id], err => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Customer deleted successfully!' });
  });
});

module.exports = router;

