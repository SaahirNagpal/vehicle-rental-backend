const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * Create a payment intent for a booking
 * POST /api/stripe/create-payment-intent
 */
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency = "usd", metadata = {} } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valid amount is required"
      });
    }

    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      metadata: {
        ...metadata,
        source: "vehicle_rental_booking"
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    res.json({
      success: true,
      data: {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: amount,
        currency: currency,
        status: paymentIntent.status
      }
    });

  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create payment intent"
    });
  }
});

/**
 * Confirm payment status
 * POST /api/stripe/confirm-payment
 */
router.post("/confirm-payment", async (req, res) => {
  try {
    const { payment_intent_id } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: "payment_intent_id is required"
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    res.json({
      success: true,
      data: {
        status: paymentIntent.status,
        payment_details: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert back to dollars
          currency: paymentIntent.currency,
          created: paymentIntent.created,
          metadata: paymentIntent.metadata
        }
      }
    });

  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to confirm payment status"
    });
  }
});

/**
 * Handle Stripe webhooks
 * POST /api/stripe/webhook
 */
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      case "payment_intent.canceled":
        await handlePaymentCanceled(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return 200 response to acknowledge receipt of the webhook
    res.json({ received: true });

  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * Process successful payment
 */
async function handlePaymentSucceeded(paymentIntent) {
  const db = require("../db");
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const rentalId = paymentIntent.metadata.rental_id;

    if (!rentalId) {
      console.log("No rental_id found in payment intent metadata");
      return;
    }

    // Update payment record
    const updatePaymentQuery = `
      UPDATE payment
      SET status = 'completed', payment_date = CURDATE()
      WHERE stripe_payment_intent_id = ?
    `;
    const [paymentResult] = await connection.execute(updatePaymentQuery, [paymentIntent.id]);

    // Update rental status to confirmed
    const updateRentalQuery = `
      UPDATE rental
      SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await connection.execute(updateRentalQuery, [rentalId]);

    await connection.commit();
    console.log(`Payment ${paymentIntent.id} processed successfully for rental ${rentalId}`);

  } catch (error) {
    await connection.rollback();
    console.error("Error processing successful payment:", error);
  } finally {
    connection.release();
  }
}

/**
 * Process failed payment
 */
async function handlePaymentFailed(paymentIntent) {
  const db = require("../db");
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const rentalId = paymentIntent.metadata.rental_id;

    if (!rentalId) {
      console.log("No rental_id found in payment intent metadata");
      return;
    }

    // Update payment record
    const updatePaymentQuery = `
      UPDATE payment
      SET status = 'failed'
      WHERE stripe_payment_intent_id = ?
    `;
    const [paymentResult] = await connection.execute(updatePaymentQuery, [paymentIntent.id]);

    // Update rental status to pending (or could keep as confirmed with payment pending)
    const updateRentalQuery = `
      UPDATE rental
      SET status = 'pending', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await connection.execute(updateRentalQuery, [rentalId]);

    await connection.commit();
    console.log(`Payment ${paymentIntent.id} failed for rental ${rentalId}`);

  } catch (error) {
    await connection.rollback();
    console.error("Error processing failed payment:", error);
  } finally {
    connection.release();
  }
}

/**
 * Process canceled payment
 */
async function handlePaymentCanceled(paymentIntent) {
  const db = require("../db");
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const rentalId = paymentIntent.metadata.rental_id;

    if (!rentalId) {
      console.log("No rental_id found in payment intent metadata");
      return;
    }

    // Update payment record
    const updatePaymentQuery = `
      UPDATE payment
      SET status = 'canceled'
      WHERE stripe_payment_intent_id = ?
    `;
    const [paymentResult] = await connection.execute(updatePaymentQuery, [paymentIntent.id]);

    // Update rental status to canceled
    const updateRentalQuery = `
      UPDATE rental
      SET status = 'canceled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await connection.execute(updateRentalQuery, [rentalId]);

    await connection.commit();
    console.log(`Payment ${paymentIntent.id} canceled for rental ${rentalId}`);

  } catch (error) {
    await connection.rollback();
    console.error("Error processing canceled payment:", error);
  } finally {
    connection.release();
  }
}

/**
 * Refund a payment
 * POST /api/stripe/refund
 */
router.post("/refund", async (req, res) => {
  try {
    const { payment_intent_id, amount } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: "payment_intent_id is required"
      });
    }

    // Create refund
    const refundParams = {
      payment_intent: payment_intent_id
    };

    // Partial refund if amount specified
    if (amount && amount > 0) {
      refundParams.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(refundParams);

    res.json({
      success: true,
      data: {
        refund_id: refund.id,
        amount: refund.amount / 100, // Convert back to dollars
        status: refund.status,
        payment_intent_id: refund.payment_intent
      }
    });

  } catch (error) {
    console.error("Error creating refund:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create refund"
    });
  }
});

/**
 * Get payment method details
 * GET /api/stripe/payment-method/:id
 */
router.get("/payment-method/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const paymentMethod = await stripe.paymentMethods.retrieve(id);

    res.json({
      success: true,
      data: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year
        }
      }
    });

  } catch (error) {
    console.error("Error retrieving payment method:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve payment method"
    });
  }
});

module.exports = router;