const express = require("express");
const router = express.Router();
const db = require("../db");

// ✅ Get all customers
router.get("/", (req, res) => {
  db.query("SELECT * FROM customer", (err, results) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// ✅ Add new customer
router.post("/", (req, res) => {
  const { Name, Phone_number, Email } = req.body;

  if (!Name || !Phone_number || !Email) {
    return res.status(400).json({ error: "All fields are required" });
  }

  db.query(
    "INSERT INTO customer (Name, Phone_number, Email) VALUES (?, ?, ?)",
    [Name, Phone_number, Email],
    (err, result) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: result.insertId, Name, Phone_number, Email });
    }
  );
});

// ✅ Update customer
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { Name, Phone_number, Email } = req.body;

  db.query(
    "UPDATE customer SET Name=?, Phone_number=?, Email=? WHERE Customer_id=?",
    [Name, Phone_number, Email, id],
    (err, result) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Customer not found" });
      res.json({ message: "Customer updated successfully" });
    }
  );
});

// ✅ Delete customer
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM customer WHERE Customer_id=?", [id], (err, result) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Customer not found" });
    res.json({ message: "Customer deleted successfully" });
  });
});

module.exports = router;
