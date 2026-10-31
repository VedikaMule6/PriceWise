
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Import product routes
const productRoutes = require("./routes/productRoutes");

// Home route
app.get("/", (req, res) => {
    res.send("Welcome to PriceWise API!");
});

// Database test route
const pool = require("./db/connection");

app.get("/api/test-db", async (req, res) => {
    try {
        const [result] = await pool.query("SELECT 1 AS test");

        res.json({
            message: "MySQL connected successfully!",
            data: result
        });
    } catch (error) {
        res.status(500).json({
            message: "Database connection failed",
            error: error.message
        });
    }
});

// Product API
app.use("/api/products", productRoutes);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`PriceWise server running on http://localhost:${PORT}`);
});


const db = require("./db/connection");

db.getConnection()
    .then(connection => {
        console.log("MySQL Connected Successfully!");
        connection.release();
    })
    .catch(error => {
        console.log("MySQL Connection Failed:", error.message);
    });