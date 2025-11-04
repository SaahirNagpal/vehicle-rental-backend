// Simple database setup script
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "blofaxhczvsfkcmzsoxk-mysql.services.clever-cloud.com",
  user: "uxmbjlh44zfm5brq",
  password: "KMNdrVO4Qh3Azagy2Mbx",
  database: "blofaxhczvsfkcmzsoxk",
  port: 3306,
});

async function createTables() {
  return new Promise((resolve, reject) => {
    db.connect((err) => {
      if (err) {
        console.error("Error connecting:", err);
        reject(err);
        return;
      }

      console.log("Creating tables...");

      // Create customer table
      const createCustomer = `CREATE TABLE IF NOT EXISTS customer (
        Customer_id INT AUTO_INCREMENT PRIMARY KEY,
        Name VARCHAR(255) NOT NULL,
        Phone_number VARCHAR(20) NOT NULL,
        Email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;

      // Create vehicle table
      const createVehicle = `CREATE TABLE IF NOT EXISTS vehicle (
        id INT AUTO_INCREMENT PRIMARY KEY,
        model VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        rent_per_day DECIMAL(10, 2) NOT NULL,
        availability BOOLEAN DEFAULT TRUE,
        features JSON NULL,
        seats INT NULL,
        transmission VARCHAR(20) NULL,
        fuel_type VARCHAR(20) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;

      // Create rental table
      const createRental = `CREATE TABLE IF NOT EXISTS rental (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        vehicle_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;

      // Create payment table
      const createPayment = `CREATE TABLE IF NOT EXISTS payment (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rental_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_date DATE,
        payment_method VARCHAR(50),
        stripe_payment_intent_id VARCHAR(255) NULL,
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;

      let tablesCreated = 0;

      db.query(createCustomer, (err) => {
        if (err) console.log("Customer table error:", err.message);
        else console.log("✓ Customer table created");
        tablesCreated++;
        if (tablesCreated === 4) finishSetup();
      });

      db.query(createVehicle, (err) => {
        if (err) console.log("Vehicle table error:", err.message);
        else console.log("✓ Vehicle table created");
        tablesCreated++;
        if (tablesCreated === 4) finishSetup();
      });

      db.query(createRental, (err) => {
        if (err) console.log("Rental table error:", err.message);
        else console.log("✓ Rental table created");
        tablesCreated++;
        if (tablesCreated === 4) finishSetup();
      });

      db.query(createPayment, (err) => {
        if (err) console.log("Payment table error:", err.message);
        else console.log("✓ Payment table created");
        tablesCreated++;
        if (tablesCreated === 4) finishSetup();
      });

      function finishSetup() {
        console.log("\nAdding sample data...");

        // Add sample vehicles
        const sampleVehicles = [
          ['Toyota Camry', 'Sedan', 45.00, true, '["Automatic", "5 Seats", "AC"]', 5, 'Automatic', 'Gasoline'],
          ['Honda Accord', 'Sedan', 50.00, true, '["Automatic", "5 Seats", "Leather"]', 5, 'Automatic', 'Gasoline'],
          ['Ford Explorer', 'SUV', 75.00, true, '["Automatic", "7 Seats", "4WD"]', 7, 'Automatic', 'Gasoline'],
          ['BMW 3 Series', 'Luxury', 120.00, true, '["Automatic", "5 Seats", "Premium"]', 5, 'Automatic', 'Gasoline']
        ];

        let vehiclesAdded = 0;
        sampleVehicles.forEach(vehicle => {
          db.query('INSERT IGNORE INTO vehicle (model, type, rent_per_day, availability, features, seats, transmission, fuel_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', vehicle, (err) => {
            if (err) console.log("Vehicle insert error:", err.message);
            else vehiclesAdded++;
            if (vehiclesAdded === sampleVehicles.length) {
              console.log(`Added ${vehiclesAdded} sample vehicles`);
              db.end((err) => {
                if (err) console.error("Error closing:", err);
                else console.log("Setup completed successfully!");
                resolve();
              });
            }
          });
        });
      }
    });
  });
}

createTables().catch(console.error);