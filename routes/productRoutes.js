
const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

// GET all products
router.get("/", async (req, res) => {
    try {
        const [products] = await pool.query(
            "SELECT * FROM products ORDER BY id DESC"
        );

        res.json({
            success: true,
            count: products.length,
            products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET product prices for comparison
router.get("/compare/:id", async (req, res) => {
    try {
        const productId = req.params.id;

        const [results] = await pool.query(
            `SELECT
                p.id,
                p.product_name,
                p.brand,
                p.category,
                pp.platform,
                pp.price,
                pp.product_url
            FROM products p
            JOIN product_prices pp
            ON p.id = pp.product_id
            WHERE p.id = ?
            ORDER BY pp.price ASC`,
            [productId]
        );

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product or prices not found"
            });
        }

        res.json({
            success: true,
            product: results[0].product_name,
            prices: results,
            lowestPrice: results[0].price,
            cheapestPlatform: results[0].platform
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
