const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * Create a complete booking with customer, rental, and payment
 * POST /api/booking/create
 */
router.post("/create", async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      vehicle_id,
      customer_data,
      dates,
      payment_intent_id,
      payment_method_id
    } = req.body;

    // Validate required fields
    if (!vehicle_id || !customer_data || !dates) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: "vehicle_id, customer_data, and dates are required"
      });
    }

    const { start_date, end_date } = dates;

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

    // Validate customer data
    const { Name, Email, Phone_number } = customer_data;
    if (!Name || !Email || !Phone_number) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: "Customer Name, Email, and Phone_number are required"
      });
    }

    // Check if vehicle exists and is available
    const vehicleQuery = "SELECT * FROM vehicle WHERE id = ? AND availability = true";
    const [vehicleRows] = await connection.execute(vehicleQuery, [vehicle_id]);

    if (vehicleRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: "Vehicle not found or not available"
      });
    }

    const vehicle = vehicleRows[0];

    // Check for conflicting rentals
    const conflictQuery = `
      SELECT id FROM rental
      WHERE vehicle_id = ?
        AND status NOT IN ('cancelled', 'completed')
        AND NOT (end_date < ? OR start_date > ?)
    `;

    const [conflictRows] = await connection.execute(conflictQuery, [
      vehicle_id,
      start_date,
      end_date
    ]);

    if (conflictRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        error: "Vehicle is not available for the selected dates"
      });
    }

    // Calculate total amount
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const subtotal = days * vehicle.rent_per_day;
    const tax = subtotal * 0.1; // 10% tax
    const total_amount = subtotal + tax;

    // Create or find customer
    let customerId;
    const existingCustomerQuery = "SELECT Customer_id FROM customer WHERE Email = ?";
    const [existingCustomerRows] = await connection.execute(existingCustomerQuery, [Email]);

    if (existingCustomerRows.length > 0) {
      customerId = existingCustomerRows[0].Customer_id;

      // Update customer information
      const updateCustomerQuery = `
        UPDATE customer
        SET Name = ?, Phone_number = ?
        WHERE Customer_id = ?
      `;
      await connection.execute(updateCustomerQuery, [Name, Phone_number, customerId]);
    } else {
      // Create new customer
      const insertCustomerQuery = `
        INSERT INTO customer (Name, Phone_number, Email)
        VALUES (?, ?, ?)
      `;
      const [customerResult] = await connection.execute(insertCustomerQuery, [
        Name,
        Phone_number,
        Email
      ]);
      customerId = customerResult.insertId;
    }

    // Create rental record
    const insertRentalQuery = `
      INSERT INTO rental (customer_id, vehicle_id, start_date, end_date, total_amount, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `;
    const [rentalResult] = await connection.execute(insertRentalQuery, [
      customerId,
      vehicle_id,
      start_date,
      end_date,
      total_amount
    ]);

    const rentalId = rentalResult.insertId;

    // Create payment record (if payment intent provided)
    let paymentId = null;
    if (payment_intent_id) {
      const insertPaymentQuery = `
        INSERT INTO payment (rental_id, amount, payment_date, payment_method, stripe_payment_intent_id, status)
        VALUES (?, ?, CURDATE(), 'credit_card', ?, 'completed')
      `;
      const [paymentResult] = await connection.execute(insertPaymentQuery, [
        rentalId,
        total_amount,
        payment_intent_id
      ]);
      paymentId = paymentResult.insertId;

      // Update rental status to confirmed
      await connection.execute(
        "UPDATE rental SET status = 'confirmed' WHERE id = ?",
        [rentalId]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      data: {
        booking_id: rentalId,
        rental_details: {
          id: rentalId,
          customer_id: customerId,
          vehicle_id: vehicle_id,
          start_date,
          end_date,
          total_amount,
          status: payment_intent_id ? 'confirmed' : 'pending'
        },
        payment_status: payment_intent_id ? 'completed' : 'pending',
        payment_id,
        customer: {
          id: customerId,
          Name,
          Email,
          Phone_number
        },
        vehicle: {
          id: vehicle_id,
          model: vehicle.model,
          type: vehicle.type,
          rent_per_day: vehicle.rent_per_day
        },
        pricing: {
          days,
          daily_rate: vehicle.rent_per_day,
          subtotal,
          tax,
          total_amount
        }
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error creating booking:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while creating booking"
    });
  } finally {
    connection.release();
  }
});

/**
 * Get booking details by ID
 * GET /api/booking/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT r.*,
             c.Name as customer_name, c.Email, c.Phone_number,
             v.model, v.type, v.rent_per_day,
             p.amount as payment_amount, p.payment_method, p.status as payment_status,
             p.stripe_payment_intent_id, p.payment_date
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
        error: "Booking not found"
      });
    }

    const booking = rows[0];

    res.json({
      success: true,
      data: {
        id: booking.id,
        customer: {
          name: booking.customer_name,
          email: booking.Email,
          phone: booking.Phone_number
        },
        vehicle: {
          model: booking.model,
          type: booking.type,
          rent_per_day: booking.rent_per_day
        },
        rental: {
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_amount: booking.total_amount,
          status: booking.status,
          created_at: booking.created_at
        },
        payment: booking.stripe_payment_intent_id ? {
          amount: booking.payment_amount,
          method: booking.payment_method,
          status: booking.payment_status,
          payment_intent_id: booking.stripe_payment_intent_id,
          date: booking.payment_date
        } : null
      }
    });

  } catch (error) {
    console.error("Error getting booking details:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while getting booking details"
    });
  }
});

/**
 * Update booking status
 * PUT /api/booking/:id/status
 */
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be one of: " + validStatuses.join(", ")
      });
    }

    const query = "UPDATE rental SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
    const [result] = await db.execute(query, [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Booking not found"
      });
    }

    res.json({
      success: true,
      data: {
        id: parseInt(id),
        status,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while updating booking status"
    });
  }
});

/**
 * Get customer bookings
 * GET /api/booking/customer/:customer_id
 */
router.get("/customer/:customer_id", async (req, res) => {
  try {
    const { customer_id } = req.params;

    const query = `
      SELECT r.*, v.model, v.type, v.rent_per_day
      FROM rental r
      JOIN vehicle v ON r.vehicle_id = v.id
      WHERE r.customer_id = ?
      ORDER BY r.created_at DESC
    `;

    const [rows] = await db.execute(query, [customer_id]);

    res.json({
      success: true,
      data: {
        bookings: rows,
        count: rows.length
      }
    });

  } catch (error) {
    console.error("Error getting customer bookings:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while getting customer bookings"
    });
  }
});

module.exports = router;