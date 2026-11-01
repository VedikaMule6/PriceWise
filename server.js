const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = require("./db/connection");

// Product routes
const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);

// Database test route
app.get("/api/test-db", async (req, res) => {
    let connection;

    try {
        connection = await pool.getConnection();

        const [result] = await connection.query("SELECT 1 AS test");

        res.json({
            success: true,
            message: "MySQL connected successfully!",
            data: result
        });

    } catch (error) {
        console.error("Database Test Error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed",
            error: error.message,
            code: error.code
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Serve frontend files
app.use(express.static(__dirname, {
    setHeaders: (res, filePath) => {
        const fileName = path.basename(filePath).toLowerCase();

        if (fileName === "index.html" || fileName === "script.js") {
            res.setHeader("Cache-Control", "no-store");
        }
    }
}));

// Home route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "PriceWise server is running"
    });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`PriceWise server running on port ${PORT}`);
});