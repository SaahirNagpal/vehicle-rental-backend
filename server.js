// Import dependencies
const express = require("express");
const cors = require("cors");
const db = require("./db"); // MySQL connection

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import route files
const customerRoutes = require("./routes/customer");
const vehicleRoutes = require("./routes/vehicle");
const rentalRoutes = require("./routes/rental");
const paymentRoutes = require("./routes/payment");

// Mount route files
app.use("/api/customers", customerRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/payments", paymentRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.send("Vehicle Rental Management System Backend is Running!");
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



