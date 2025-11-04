// Database setup script for Vehicle Rental Management System
const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");

// Database connection
const db = mysql.createConnection({
  host: "blofaxhczvsfkcmzsoxk-mysql.services.clever-cloud.com",
  user: "uxmbjlh44zfm5brq",
  password: "KMNdrVO4Qh3Azagy2Mbx",
  database: "blofaxhczvsfkcmzsoxk",
  port: 3306,
});

// Read SQL file
const sqlFile = fs.readFileSync(path.join(__dirname, "setup-database.sql"), "utf8");

// Split SQL file into individual statements
const statements = sqlFile
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

async function setupDatabase() {
  return new Promise((resolve, reject) => {
    console.log("Setting up database...");

    db.connect((err) => {
      if (err) {
        console.error("Error connecting to database:", err);
        reject(err);
        return;
      }

      console.log("Connected to database successfully!");

      // Execute each statement
      let completed = 0;
      let errors = [];

      statements.forEach((statement, index) => {
        db.query(statement, (err, result) => {
          completed++;

          if (err) {
            // Ignore errors for "IF NOT EXISTS" and "INSERT IGNORE"
            if (!err.message.includes('already exists') &&
                !err.message.includes('Duplicate entry')) {
              console.error(`Error in statement ${index + 1}:`, err.message);
              errors.push(err.message);
            } else {
              console.log(`Statement ${index + 1} executed (item already exists)`);
            }
          } else {
            console.log(`Statement ${index + 1} executed successfully`);
          }

          // Check if all statements are executed
          if (completed === statements.length) {
            console.log("\nDatabase setup completed!");
            if (errors.length > 0) {
              console.log("Errors encountered:", errors);
            }

            // Test the setup by querying vehicles
            db.query('SELECT COUNT(*) as count FROM vehicle', (err, result) => {
              if (err) {
                console.error("Error testing vehicle table:", err);
              } else {
                console.log(`Vehicle table created with ${result[0].count} records`);
              }

              db.query('SELECT COUNT(*) as count FROM customer', (err, result) => {
                if (err) {
                  console.error("Error testing customer table:", err);
                } else {
                  console.log(`Customer table created with ${result[0].count} records`);
                }

                db.end((err) => {
                  if (err) {
                    console.error("Error closing connection:", err);
                  } else {
                    console.log("Database connection closed.");
                  }

                  if (errors.length > 0) {
                    reject(new Error(`Setup completed with ${errors.length} errors`));
                  } else {
                    resolve();
                  }
                });
              });
            });
          }
        });
      });
    });
  });
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log("Database setup successful!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Database setup failed:", err);
    process.exit(1);
  });