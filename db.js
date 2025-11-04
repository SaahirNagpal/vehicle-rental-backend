// db.js - MySQL Connection Setup
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "blofaxhczvsfkcmzsoxk-mysql.services.clever-cloud.com",       // e.g. bzcwxyz-mysql.services.clever-cloud.com
  user: "uxmbjlh44zfm5brq",       // e.g. ujh1abcdxyz
  password: "KMNdrVO4Qh3Azagy2Mbx",
  database: "blofaxhczvsfkcmzsoxk", // e.g. bzcwxyz
  port: 3306, // usually 3306, but check Clever Cloud
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log("Connected to MySQL Database!");
    connection.release();
  })
  .catch((err) => {
    console.error("Error connecting to MySQL:", err.message);
  });

module.exports = pool;
