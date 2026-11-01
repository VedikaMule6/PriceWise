
const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

const { searchAmazonProducts } = require("../services/amazonService");
const { searchFlipkartProducts } = require("../services/flipkartService");

// ==========================================
// 1. SEARCH AMAZON AND FLIPKART JSON PRODUCTS
// ==========================================

router.get("/search", async (req, res) => {
    try {
        const search = String(req.query.search || "").trim();
        const category = String(req.query.category || "").trim();

        const [amazonProducts, flipkartProducts] = await Promise.all([
            searchAmazonProducts(search, category),
            searchFlipkartProducts(search, category)
        ]);

        const products = [...amazonProducts, ...flipkartProducts];

        // Group matching products from both platforms
        const groupedProducts = Object.values(
            products.reduce((groups, product) => {
                if (!groups[product.id]) {
                    groups[product.id] = {
                        id: product.id,
                        productName: product.productName,
                        brand: product.brand,
                        category: product.category,
                        quantity: product.quantity,
                        imageUrl: product.imageUrl,
                        offers: []
                    };
                }

                groups[product.id].offers.push({
                    platform: product.platform,
                    price: Number(product.price),
                    mrp: product.mrp,
                    discountPercent: product.discountPercent,
                    rating: product.rating,
                    reviewCount: product.reviewCount,
                    availability: product.availability,
                    productUrl: product.productUrl,
                    priceSource: product.priceSource
                });

                return groups;
            }, {})
        );

        // Sort offers from lowest to highest price
        groupedProducts.forEach(product => {
            product.offers.sort((a, b) => a.price - b.price);

            product.lowestPrice =
                product.offers[0]?.price ?? null;

            product.cheapestPlatform =
                product.offers[0]?.platform ?? null;
        });

        res.json({
            success: true,
            count: groupedProducts.length,
            products: groupedProducts
        });

    } catch (error) {
        console.error("Mock API Search Error:", error);

        res.status(500).json({
            success: false,
            message: error.message || "Unable to search products"
        });
    }
});

// ==========================================
// 2. GET ALL PRODUCTS FROM MYSQL DATABASE
// ==========================================

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
        console.error("Database Product Error:", error);

        res.status(500).json({
            success: false,
            message: error.message || "Unable to load products"
        });
    }
});

// ==========================================
// 3. GET PRODUCT PRICE COMPARISON FROM MYSQL
// ==========================================

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
        console.error("Product Comparison Error:", error);

        res.status(500).json({
            success: false,
            message: error.message || "Unable to compare prices"
        });
    }
});

module.exports = router;
