
require("dotenv").config();

const pool = require("./db/connection");

async function testConnection() {
    try {
        const connection = await pool.getConnection();

        console.log("MySQL Connected Successfully!");

        connection.release();
        await pool.end();

    } catch (error) {
        console.log("MySQL Connection Failed:", error.message);
    }
}

testConnection();
