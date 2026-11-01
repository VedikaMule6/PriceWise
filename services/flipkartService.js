
const fs = require("fs");
const path = require("path");

// Load Flipkart mock products from JSON file
const filePath = path.join(
    __dirname,
    "../data/flipkart_products.json"
);

const flipkartProducts = JSON.parse(
    fs.readFileSync(filePath, "utf-8")
);

// Search Flipkart products
async function searchFlipkartProducts(search = "", category = "") {
    let products = flipkartProducts;

    if (search.trim()) {
        const query = search.toLowerCase().trim();

        products = products.filter(product =>
            product.productName.toLowerCase().includes(query) ||
            product.brand.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query)
        );
    }

    if (category.trim()) {
        products = products.filter(product =>
            product.category.toLowerCase() === category.toLowerCase()
        );
    }

    return products;
}

module.exports = {
    searchFlipkartProducts
};
