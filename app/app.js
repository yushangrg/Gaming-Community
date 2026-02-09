// Import express.js
const express = require("express");

// Create express app
const app = express();

// Add static files location
app.use(express.static("static"));

// Import database functions
const db = require("./services/db");

// --------------------------------------------------
// Root route – project identification
// --------------------------------------------------
app.get("/", function (req, res) {
    res.send("Game Tips and Tricks – Community Platform");
});

// --------------------------------------------------
// Database test route (Sprint 1 level)
// --------------------------------------------------
app.get("/db_test", function (req, res) {
    // Simple test query to confirm database connection
    const sql = "SHOW TABLES";
    db.query(sql)
        .then(results => {
            res.send(results);
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Database connection failed");
        });
});

// --------------------------------------------------
// Example route related to project theme
// --------------------------------------------------
app.get("/tips", function (req, res) {
    res.send("Browse and share game tips and tricks");
});

// --------------------------------------------------
// Dynamic route – user example (community focus)
// --------------------------------------------------
app.get("/hello/:username", function (req, res) {
    res.send("Welcome to Game Tips and Tricks, " + req.params.username);
});

// --------------------------------------------------
// Start server
// --------------------------------------------------
app.listen(3000, function () {
    console.log("Game Tips and Tricks running at http://127.0.0.1:3000/");
});
