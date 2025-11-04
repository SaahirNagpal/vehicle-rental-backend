const express = require('express');
const router = express.Router();
const db = require('../db');

// Calculate total amount for rental
const calculateTotalAmount = async (vehicle_id, start_date, end_date) => {
  try {
    // Get vehicle details
    const [vehicleRows] = await db.execute(
      'SELECT rent_per_day FROM vehicle WHERE id = ?',
      [vehicle_id]
    );

    if (vehicleRows.length === 0) {
      throw new Error('Vehicle not found');
    }

    const rent_per_day = vehicleRows[0].rent_per_day;

    // Calculate rental days
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate subtotal and tax (10% tax)
    const subtotal = days * rent_per_day;
    const tax = subtotal * 0.1;
    const total_amount = subtotal + tax;

    return {
      days,
      daily_rate: rent_per_day,
      subtotal,
      tax,
      total_amount: Math.round(total_amount * 100) / 100 // Round to 2 decimal places
    };
  } catch (error) {
    throw error;
  }
};

// Get all rentals with enhanced details
router.get('/', async (req, res) => {
  try {
    const { status, customer_id, vehicle_id } = req.query;
    let query = `
      SELECT r.*,
             c.Name as customer_name, c.Email,
             v.model, v.type
      FROM rental r
      JOIN customer c ON r.customer_id = c.Customer_id
      JOIN vehicle v ON r.vehicle_id = v.id
    `;
    const queryParams = [];
    const conditions = [];

    if (status) {
      conditions.push('r.status = ?');
      queryParams.push(status);
    }

    if (customer_id) {
      conditions.push('r.customer_id = ?');
      queryParams.push(customer_id);
    }

    if (vehicle_id) {
      conditions.push('r.vehicle_id = ?');
      queryParams.push(vehicle_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY r.created_at DESC';

    const [rows] = await db.execute(query, queryParams);

    res.json({
      success: true,
      data: {
        rentals: rows,
        count: rows.length
      }
    });

  } catch (error) {
    console.error("Error fetching rentals:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching rentals"
    });
  }
});

// Get single rental by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT r.*,
             c.Name as customer_name, c.Email, c.Phone_number,
             v.model, v.type, v.rent_per_day,
             p.amount as payment_amount, p.payment_method, p.status as payment_status
      FROM rental r
      JOIN customer c ON r.customer_id = c.Customer_id
      JOIN vehicle v ON r.vehicle_id = v.id
      LEFT JOIN payment p ON r.id = p.rental_id
      WHERE r.id = ?
    `;

    const [rows] = await db.execute(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Rental not found"
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    console.error("Error fetching rental:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching rental"
    });
  }
});

// Add rental with automatic total calculation
router.post('/', async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { customer_id, vehicle_id, start_date, end_date, total_amount: provided_total_amount } = req.body;

    // Validate required fields
    if (!customer_id || !vehicle_id || !start_date || !end_date) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: "customer_id, vehicle_id, start_date, and end_date are required"
      });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDate) || isNaN(endDate)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Use YYYY-MM-DD format"
      });
    }

    if (startDate < today) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: "Start date cannot be in the past"
      });
    }

    if (startDate >= endDate) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: "End date must be after start date"
      });
    }

    // Check if customer exists
    const [customerRows] = await connection.execute(
      'SELECT Customer_id FROM customer WHERE Customer_id = ?',
      [customer_id]
    );

    if (customerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: "Customer not found"
      });
    }

    // Check if vehicle exists and is available
    const [vehicleRows] = await connection.execute(
      'SELECT * FROM vehicle WHERE id = ? AND availability = true',
      [vehicle_id]
    );

    if (vehicleRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: "Vehicle not found or not available"
      });
    }

    // Check for conflicting rentals
    const [conflictRows] = await connection.execute(`
      SELECT id FROM rental
      WHERE vehicle_id = ?
        AND status NOT IN ('cancelled', 'completed')
        AND NOT (end_date < ? OR start_date > ?)
    `, [vehicle_id, start_date, end_date]);

    if (conflictRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        error: "Vehicle is not available for the selected dates"
      });
    }

    // Calculate total amount if not provided
    let pricing;
    if (provided_total_amount && provided_total_amount > 0) {
      pricing = {
        days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1,
        daily_rate: vehicleRows[0].rent_per_day,
        subtotal: provided_total_amount / 1.1, // Remove tax to get subtotal
        tax: provided_total_amount * 0.09, // Approximate tax
        total_amount: provided_total_amount
      };
    } else {
      pricing = await calculateTotalAmount(vehicle_id, start_date, end_date);
    }

    // Create rental record
    const [result] = await connection.execute(`
      INSERT INTO rental (customer_id, vehicle_id, start_date, end_date, total_amount, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `, [customer_id, vehicle_id, start_date, end_date, pricing.total_amount]);

    await connection.commit();

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        customer_id,
        vehicle_id,
        start_date,
        end_date,
        pricing,
        status: 'pending',
        message: "Rental added successfully!"
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error adding rental:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while adding rental"
    });
  } finally {
    connection.release();
  }
});

// Update rental
router.put('/:id', async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { customer_id, vehicle_id, start_date, end_date, total_amount, status } = req.body;

    // Check if rental exists
    const [existingRows] = await connection.execute(
      'SELECT * FROM rental WHERE id = ?',
      [id]
    );

    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: "Rental not found"
      });
    }

    const existingRental = existingRows[0];

    // If changing dates or vehicle, check availability and recalculate
    let newTotalAmount = total_amount || existingRental.total_amount;
    if (vehicle_id || start_date || end_date) {
      const newVehicleId = vehicle_id || existingRental.vehicle_id;
      const newStartDate = start_date || existingRental.start_date;
      const newEndDate = end_date || existingRental.end_date;

      // Check for conflicts if vehicle or dates changed
      if (newVehicleId !== existingRental.vehicle_id ||
          newStartDate !== existingRental.start_date ||
          newEndDate !== existingRental.end_date) {

        const [conflictRows] = await connection.execute(`
          SELECT id FROM rental
          WHERE vehicle_id = ? AND id != ?
            AND status NOT IN ('cancelled', 'completed')
            AND NOT (end_date < ? OR start_date > ?)
        `, [newVehicleId, id, newStartDate, newEndDate]);

        if (conflictRows.length > 0) {
          await connection.rollback();
          return res.status(409).json({
            success: false,
            error: "Vehicle is not available for the selected dates"
          });
        }

        // Recalculate total if dates or vehicle changed
        if (!total_amount) {
          const pricing = await calculateTotalAmount(newVehicleId, newStartDate, newEndDate);
          newTotalAmount = pricing.total_amount;
        }
      }
    }

    // Update rental
    const [result] = await connection.execute(`
      UPDATE rental
      SET customer_id = ?, vehicle_id = ?, start_date = ?, end_date = ?, total_amount = ?, status = ?
      WHERE id = ?
    `, [
      customer_id || existingRental.customer_id,
      vehicle_id || existingRental.vehicle_id,
      start_date || existingRental.start_date,
      end_date || existingRental.end_date,
      newTotalAmount,
      status || existingRental.status,
      id
    ]);

    await connection.commit();

    res.json({
      success: true,
      data: {
        message: "Rental updated successfully!",
        affected_rows: result.affectedRows
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error updating rental:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while updating rental"
    });
  } finally {
    connection.release();
  }
});

// Delete rental
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if rental exists
    const [existingRows] = await db.execute(
      'SELECT status FROM rental WHERE id = ?',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Rental not found"
      });
    }

    const rental = existingRows[0];

    // Prevent deletion of active rentals
    if (rental.status === 'active') {
      return res.status(400).json({
        success: false,
        error: "Cannot delete active rental. Cancel it first."
      });
    }

    const [result] = await db.execute('DELETE FROM rental WHERE id = ?', [id]);

    res.json({
      success: true,
      data: {
        message: "Rental deleted successfully!"
      }
    });

  } catch (error) {
    console.error("Error deleting rental:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while deleting rental"
    });
  }
});

module.exports = router;
