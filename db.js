const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",        // your MySQL host
  user: "root",             // your MySQL username
  password: "1234",         // your MySQL password
  database: "vehiclerentaldb" // your database name
});

// connect to MySQL
db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err.message);
  } else {
    console.log("Connected to MySQL Database!");
  }
});

module.exports = db;
