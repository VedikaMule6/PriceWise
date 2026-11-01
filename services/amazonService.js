
const fs = require("fs");
const path = require("path");

// Load Amazon mock products from JSON file
const filePath = path.join(
    __dirname,
    "../data/amazon_products.json"
);

const amazonProducts = JSON.parse(
    fs.readFileSync(filePath, "utf-8")
);

// Search Amazon products
async function searchAmazonProducts(search = "", category = "") {
    let products = amazonProducts;

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
    searchAmazonProducts
};
