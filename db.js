// db.js - MySQL Connection Setup
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "blofaxhczvsfkcmzsoxk-mysql.services.clever-cloud.com",       // e.g. bzcwxyz-mysql.services.clever-cloud.com
  user: "uxmbjlh44zfm5brq",       // e.g. ujh1abcdxyz
  password: "KMNdrVO4Qh3Azagy2Mbx",
  database: "blofaxhczvsfkcmzsoxk", // e.g. bzcwxyz
  port: 3306, // usually 3306, but check Clever Cloud
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err.message);
  } else {
    console.log("Connected to MySQL Database!");
  }
});

module.exports = db;
