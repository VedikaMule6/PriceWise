

const API_URL = "/api/products";

// Global variables
let allProducts = [];
let currentProducts = [];
let wishlist = [];
let shoppingList = [];
let recentSearches = [];
let trackedProducts = [];
let currentProduct = null;

// PRICEWISE CUSTOM NOTIFICATION
function showToast(message, type = "success") {

    let toast = document.getElementById("priceWiseToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "priceWiseToast";
        document.body.appendChild(toast);
    }

    toast.className = "pricewise-toast " + type;
    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


// HTML elements
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("search");
const homeProducts = document.getElementById("homeProducts");
const productsContainer = document.getElementById("products");

// 1. LOAD PRODUCTS FROM MYSQL

async function loadProducts() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load products");
        }

        allProducts = data.products || [];

        displayHomeProducts();
        displayRecentSearches();

    } catch (error) {
        console.error("Product loading error:", error);

        if (homeProducts) {
            homeProducts.innerHTML =
                "<p>Unable to load products. Please check your server.</p>";
        }
    }
}

// 2. PAGE NAVIGATION

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.hidden = true;
    });

    const selectedPage = document.getElementById(pageId);

    if (selectedPage) {
        selectedPage.hidden = false;
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function showHome() {
    showPage("homePage");
    displayHomeProducts();
    displayRecentSearches();
}

function showCompare() {
    showPage("comparePage");

    if (currentProducts.length > 0) {
        displayProducts(currentProducts);
    } else {
        productsContainer.innerHTML =
            "<p>Search for a product to compare prices.</p>";
    }
}

function showWishlist() {
    showPage("wishlistPage");
    displayWishlist();
}

function showShoppingList() {
    showPage("shoppingPage");
    displayShoppingList();
}

function showDeals() {
    showPage("dealsPage");
    loadBestDeals();
}



function levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= a.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= b.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;

            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[a.length][b.length];
}

function matchesSearch(product, search) {
    const text = [
        product.product_name,
        product.brand,
        product.category
    ].join(" ").toLowerCase();

    const productWords = text.split(/\s+/);
    const searchWords = search.toLowerCase().trim().split(/\s+/);

    return searchWords.every(searchWord => {
        return productWords.some(productWord => {
            if (productWord.includes(searchWord)) {
                return true;
            }

            if (searchWord.length >= 5 && productWord.length >= 5) {
                return levenshteinDistance(searchWord, productWord) <= 1;
            }

            return false;
        });
    });
}

// ==========================================
// 3. SEARCH PRODUCTS
// ==========================================

searchForm.addEventListener("submit", function(event) {
    event.preventDefault();
    searchProduct();
});

async function searchProduct(searchValue) {

    const search = (
        searchValue || searchInput.value
    ).trim().toLowerCase();

    if (!search) {
        alert("Please enter a product name.");
        return;
    }

    showPage("comparePage");

    productsContainer.innerHTML =
        "<p>Searching products...</p>";

    try {

        // Get latest products from MySQL
        const response = await fetch(API_URL);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Search failed");
        }

        allProducts = data.products || [];

        // Search by product name, brand or category
        currentProducts = allProducts.filter(product =>
        matchesSearch(product, search)
        );

        // Sort exact name matches first
        currentProducts.sort((a, b) => {
            const aExact =
                a.product_name.toLowerCase() === search ? 1 : 0;

            const bExact =
                b.product_name.toLowerCase() === search ? 1 : 0;

            return bExact - aExact;
        });

        if (currentProducts.length === 0) {
            productsContainer.innerHTML =
                "<p>No matching products found.</p>";
            return;
        }

        // Save recent searches in current browser session
        recentSearches = recentSearches.filter(
            item => item.toLowerCase() !== search
        );

        recentSearches.unshift(search);
        recentSearches = recentSearches.slice(0, 8);

        displayRecentSearches();
        displayProducts(currentProducts);

    } catch (error) {
        console.error("Search error:", error);

        productsContainer.innerHTML =
            "<p>Unable to search products. Please try again.</p>";
    }
}

// Category search
function searchCategory(category) {
    searchInput.value = category;
    searchProduct(category);
}

// 4. DISPLAY HOME PRODUCTS

function displayHomeProducts() {

    if (!homeProducts) return;

    homeProducts.innerHTML = "";

    if (allProducts.length === 0) {
        homeProducts.innerHTML =
            "<p>No products available currently.</p>";
        return;
    }

    allProducts.forEach(product => {
        homeProducts.appendChild(createProductCard(product));
    });
}

// 5. CREATE PRODUCT CARD

function createProductCard(product) {

    const card = document.createElement("div");
    card.className = "product-card";

    const image = document.createElement("div");
    image.className = "product-placeholder";
    image.textContent = "🛍️";

    if (product.image_url) {
        const img = document.createElement("img");
        img.src = product.image_url;
        img.alt = product.product_name;
        img.loading = "lazy";

        img.onerror = function() {
            img.replaceWith(image);
        };

        image.replaceWith(img);
    }

    const title = document.createElement("h3");
    title.textContent = product.product_name;

    const brand = document.createElement("p");
    brand.textContent = "Brand: " + (product.brand || "N/A");

    const category = document.createElement("p");
    category.textContent =
        "Category: " + (product.category || "N/A");

    const detailsButton = document.createElement("button");
    detailsButton.textContent = "View Details";
    detailsButton.addEventListener("click", function() {
        showProductDetails(product.id);
    });

    const compareButton = document.createElement("button");
    compareButton.textContent = "Compare Prices";
    compareButton.addEventListener("click", function() {
        comparePrices(product.id);
    });

    const wishlistButton = document.createElement("button");
    wishlistButton.textContent = "❤️ Wishlist";

    wishlistButton.addEventListener("click", function() {
        toggleWishlist(product);
    });

    const shoppingButton = document.createElement("button");
    shoppingButton.textContent = "🛒 Add to List";

    shoppingButton.addEventListener("click", function() {
        addToShoppingList(product);
    });

    card.append(
        image,
        title,
        brand,
        category,
        detailsButton,
        compareButton,
        wishlistButton,
        shoppingButton
    );

    return card;
}

// 6. DISPLAY SEARCH RESULTS

function displayProducts(productList) {

    productsContainer.innerHTML = "";

    if (!productList || productList.length === 0) {
        productsContainer.innerHTML =
            "<p>No products found.</p>";
        return;
    }

    productList.forEach(product => {
        productsContainer.appendChild(
            createProductCard(product)
        );
    });
}

// 7. COMPARE AMAZON AND FLIPKART PRICES

async function comparePrices(productId) {

    try {

        const response = await fetch(
            `${API_URL}/compare/${productId}`
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Unable to compare prices.");
            return;
        }

        showPage("productDetailsPage");

        const container =
            document.getElementById("productDetails");

        container.innerHTML = "";

        const heading = document.createElement("h2");
        heading.textContent = data.product + " - Price Comparison";

        container.appendChild(heading);

        data.prices.forEach(item => {

            const offer = document.createElement("div");
            offer.className = "store-offer";

            const platform = document.createElement("h3");
            platform.textContent = item.platform;

            const price = document.createElement("h2");
            price.textContent = "₹" + Number(item.price).toLocaleString("en-IN");

            const link = document.createElement("a");
            link.href = item.product_url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "Visit Store";

            offer.append(platform, price, link);

            if (item.platform === data.cheapestPlatform) {
                const label = document.createElement("p");
                label.textContent = "🏆 Lowest Price";
                offer.appendChild(label);
            }

            container.appendChild(offer);
        });

        const saving = document.createElement("h3");
        saving.textContent =
            "Cheapest Platform: " + data.cheapestPlatform;

        const lowest = document.createElement("h3");
        lowest.textContent =
            "Lowest Price: ₹" +
            Number(data.lowestPrice).toLocaleString("en-IN");

        container.append(lowest, saving);

    } catch (error) {
        console.error("Comparison error:", error);
        alert("Unable to compare prices.");
    }
}
// 8. PRODUCT DETAILS

async function showProductDetails(productId) {

    const product = allProducts.find(
        item => item.id === productId
    );

    if (!product) return;

    currentProduct = product;

    showPage("productDetailsPage");

    const container =
        document.getElementById("productDetails");

    container.innerHTML = "";

    const heading = document.createElement("h2");
    heading.textContent = product.product_name;

    const brand = document.createElement("p");
    brand.textContent = "Brand: " + (product.brand || "N/A");

    const category = document.createElement("p");
    category.textContent = "Category: " + (product.category || "N/A");

    const button = document.createElement("button");
    button.textContent = "Compare Prices";

    button.addEventListener("click", function() {
        comparePrices(product.id);
    });

    container.append(heading, brand, category, button);
}
// 9. WISHLIST

function toggleWishlist(product) {

    const exists = wishlist.some(
        item => item.id === product.id
    );

    if (exists) {
        wishlist = wishlist.filter(
            item => item.id !== product.id
        );

        showToast("Removed from wishlist!");
    } else {
        wishlist.push(product);
        showToast("❤️ Added to wishlist!");
    }

    displayWishlist();
}

function displayWishlist() {

    const container =
        document.getElementById("wishlistProducts");

    container.innerHTML = "";

    if (wishlist.length === 0) {
        container.innerHTML = "<p>Your wishlist is empty.</p>";
        return;
    }

    wishlist.forEach(product => {

        const card = createProductCard(product);

        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", function() {
            wishlist = wishlist.filter(
                item => item.id !== product.id
            );
            displayWishlist();
        });

        card.appendChild(removeButton);
        container.appendChild(card);
    });
}

// 10. SHOPPING LIST

function addToShoppingList(product) {

    const exists = shoppingList.some(
        item => item.id === product.id
    );

    if (exists) {
        alert("Product is already in your shopping list.");
        return;
    }

    shoppingList.push(product);

    showToast("🛒 Added to shopping list!");

    displayShoppingList();
}

function displayShoppingList() {

    const container =
        document.getElementById("shoppingProducts");

    const totalElement =
        document.getElementById("shoppingTotal");

    container.innerHTML = "";

    let total = 0;

    if (shoppingList.length === 0) {
        container.innerHTML =
            "<p>Your shopping list is empty.</p>";
    }

    shoppingList.forEach(product => {

        const card = document.createElement("div");
        card.className = "product-card";

        const name = document.createElement("h3");
        name.textContent = product.product_name;

        const remove = document.createElement("button");
        remove.textContent = "Remove";

        remove.addEventListener("click", function() {
            shoppingList = shoppingList.filter(
                item => item.id !== product.id
            );

            displayShoppingList();
        });

        card.append(name, remove);
        container.appendChild(card);
    });

    totalElement.textContent =
        "Estimated Total: ₹" + total.toFixed(2);
}

// 11. BEST DEALS

async function loadBestDeals() {

    const container =
        document.getElementById("dealsProducts");

    container.innerHTML = "<p>Finding best deals...</p>";

    try {

        const deals = await Promise.all(
            allProducts.map(async product => {

                try {

                    const response = await fetch(
                        `${API_URL}/compare/${product.id}`
                    );

                    if (!response.ok) return null;

                    const data = await response.json();

                    return {
                        ...product,
                        lowestPrice: Number(data.lowestPrice),
                        cheapestPlatform: data.cheapestPlatform
                    };

                } catch {
                    return null;
                }
            })
        );

        const validDeals = deals
            .filter(item => item !== null)
            .sort((a, b) => a.lowestPrice - b.lowestPrice);

        container.innerHTML = "";

        if (validDeals.length === 0) {
            container.innerHTML =
                "<p>No price offers available.</p>";
            return;
        }

        validDeals.forEach(product => {

            const card = document.createElement("div");
            card.className = "product-card";

            const name = document.createElement("h3");
            name.textContent = product.product_name;

            const price = document.createElement("h2");
            price.textContent =
                "₹" + product.lowestPrice.toLocaleString("en-IN");

            const store = document.createElement("p");
            store.textContent =
                "Cheapest at: " + product.cheapestPlatform;

            const button = document.createElement("button");
            button.textContent = "View Comparison";

            button.addEventListener("click", function() {
                comparePrices(product.id);
            });

            card.append(name, price, store, button);
            container.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML =
            "<p>Unable to load deals.</p>";
    }
}


// 12. RECENT SEARCHES

function displayRecentSearches() {

    const container =
        document.getElementById("recentSearches");

    if (!container) return;

    container.innerHTML = "";

    if (recentSearches.length === 0) {
        container.innerHTML =
            "<p>No recent searches.</p>";
        return;
    }

    recentSearches.forEach(search => {

        const button = document.createElement("button");
        button.textContent = search;

        button.addEventListener("click", function() {
            searchInput.value = search;
            searchProduct(search);
        });

        container.appendChild(button);
    });
}

// ==========================================
// 13. SMART SHOPPING ASSISTANT
// ==========================================

const assistantForm =
    document.getElementById("assistantForm");

assistantForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const input =
        document.getElementById("assistantInput");

    const message = input.value.trim();

    if (!message) return;

    processAssistantMessage(message);

    input.value = "";
});

function useAssistantSuggestion(message) {
    processAssistantMessage(message);
}

function processAssistantMessage(message) {

    const container =
        document.getElementById("assistantMessages");

    const userMessage = document.createElement("div");
    userMessage.className = "assistant-message user-message";
    userMessage.textContent = message;

    container.appendChild(userMessage);

    const text = message.toLowerCase();

    let reply = "";

    if (text.includes("under")) {

        const match = text.match(/under\s*(?:₹|rs\.?\s*)?(\d+)/);

        if (match) {

            const budget = Number(match[1]);

            const matching = allProducts.filter(
                product => {
                    const price = Number(product.price || 0);
                    return price > 0 && price <= budget;
                }
            );

            reply = matching.length
                ? "Products within your budget: " +
                  matching.map(p => p.product_name).join(", ")
                : "No matching products with known prices were found.";
        } else {
            reply = "Please mention your budget, for example: under 300.";
        }

    } else if (text.includes("cheapest") || text.includes("compare")) {

        const word = text.includes("rice") ? "rice" :
                     text.includes("milk") ? "milk" : "";

        if (word) {

            const matching = allProducts.filter(
                product =>
                    product.product_name.toLowerCase().includes(word)
            );

            reply = matching.length
                ? "I found: " +
                  matching.map(p => p.product_name).join(", ") +
                  ". Open Compare Prices to see their available offers."
                : "No matching products are currently available.";

        } else {
            reply = "Search for a product to compare its available prices.";
        }

    } else if (text.includes("save")) {

        reply =
            "Compare Amazon and Flipkart prices before buying. " +
            "Choose the lowest listed price and check delivery charges.";

    } else {

        reply =
            "I can help you find products, compare prices and check products within a budget.";
    }

    const botMessage = document.createElement("div");
    botMessage.className = "assistant-message bot-message";
    botMessage.textContent = reply;

    container.appendChild(botMessage);

    container.scrollTop = container.scrollHeight;
}

// ==========================================
// 14. PRICE TRACKER
// ==========================================

const trackerForm =
    document.getElementById("priceTrackerForm");

trackerForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const name =
        document.getElementById("trackerProductName").value.trim();

    const target =
        Number(document.getElementById("trackerTargetPrice").value);

    if (!name || target <= 0) {
        alert("Enter a valid product name and target price.");
        return;
    }

    const exists = trackedProducts.some(
        item => item.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
        alert("This product is already being tracked.");
        return;
    }

    trackedProducts.push({
        id: Date.now(),
        name: name,
        targetPrice: target
    });

    trackerForm.reset();

    displayTrackedPrices();

    alert("Product added to price tracker!");
});

function displayTrackedPrices() {

    const container =
        document.getElementById("trackedProducts");

    container.innerHTML = "";

    if (trackedProducts.length === 0) {
        container.innerHTML =
            "<p>Your tracked products will appear here.</p>";
        return;
    }

    trackedProducts.forEach(item => {

        const card = document.createElement("div");
        card.className = "product-card";

        const heading = document.createElement("h3");
        heading.textContent = item.name;

        const target = document.createElement("p");
        target.textContent =
            "Target Price: ₹" + item.targetPrice.toFixed(2);

        const remove = document.createElement("button");
        remove.textContent = "Remove";

        remove.addEventListener("click", function() {
            trackedProducts = trackedProducts.filter(
                product => product.id !== item.id
            );

            displayTrackedPrices();
        });

        card.append(heading, target, remove);
        container.appendChild(card);
    });
}

// ==========================================
// 15. THEME
// ==========================================

let darkMode = false;

function toggleTheme() {

    darkMode = !darkMode;

    document.body.classList.toggle("dark-mode", darkMode);
}

// ==========================================
// 16. INITIALIZE PRICEWISE
// ==========================================

loadProducts();

showHome();

displayWishlist();

displayShoppingList();

displayTrackedPrices();

