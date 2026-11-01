
app.get("/api/test-db", async (req, res) => {
    let connection;

    try {
        connection = await pool.getConnection();

        const [result] = await connection.query("SELECT 1 AS test");

        res.json({
            success: true,
            message: "TiDB connected successfully!",
            data: result
        });

    } catch (error) {
        console.error("Database Test Error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed",
            error: error.message || String(error),
            code: error.code || "UNKNOWN"
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});
