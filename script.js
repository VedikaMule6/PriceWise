
const API_URL = "/api/products/search";

// ==========================================
// 1. GLOBAL VARIABLES
// ==========================================

let allProducts = [];
let currentProducts = [];
let wishlist = [];
let shoppingList = [];
let recentSearches = [];
let trackedProducts = [];
let currentProduct = null;

// ==========================================
// 2. NORMALIZE API PRODUCT DATA
// ==========================================

function normalizeProduct(product) {
    return {
        ...product,

        id: product.id,

        product_name:
            product.productName || product.product_name || "",

        brand: product.brand || "",

        category: product.category || "",

        quantity: product.quantity || "",

        image_url:
            product.imageUrl || product.image_url || "",

        offers: product.offers || [],

        lowestPrice: Number(product.lowestPrice || 0),

        cheapestPlatform: product.cheapestPlatform || ""
    };
}

// ==========================================
// 3. CUSTOM NOTIFICATION
// ==========================================

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

// ==========================================
// 4. HTML ELEMENTS
// ==========================================

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("search");
const homeProducts = document.getElementById("homeProducts");
const productsContainer = document.getElementById("products");

// ==========================================
// 5. LOAD PRODUCTS FROM BACKEND API
// ==========================================

async function loadProducts() {

    try {

        if (homeProducts) {
            homeProducts.innerHTML = "<p>Loading products...</p>";
        }

        const response = await fetch(API_URL);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load products");
        }

        allProducts = (data.products || []).map(normalizeProduct);

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

// ==========================================
// 6. PAGE NAVIGATION
// ==========================================

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
    } else if (productsContainer) {
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

// ==========================================
// 7. SEARCH HELPER FUNCTIONS
// ==========================================

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

                return levenshteinDistance(
                    searchWord,
                    productWord
                ) <= 1;
            }

            return false;
        });
    });
}

// ==========================================
// 8. SEARCH PRODUCTS USING BACKEND API
// ==========================================

if (searchForm) {

    searchForm.addEventListener("submit", function(event) {

        event.preventDefault();

        searchProduct();
    });
}

async function searchProduct(searchValue) {

    const search = (
        searchValue || (searchInput ? searchInput.value : "")
    ).trim().toLowerCase();

    if (!search) {
        alert("Please enter a product name.");
        return;
    }

    showPage("comparePage");

    if (productsContainer) {
        productsContainer.innerHTML =
            "<p>Searching products...</p>";
    }

    try {

        const response = await fetch(
            `${API_URL}?search=${encodeURIComponent(search)}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Search failed");
        }

        currentProducts = (data.products || []).map(normalizeProduct);

        if (currentProducts.length === 0) {

            productsContainer.innerHTML =
                "<p>No matching products found.</p>";

            return;
        }

        // Sort exact product name matches first

        currentProducts.sort((a, b) => {

            const aExact =
                a.product_name.toLowerCase() === search ? 1 : 0;

            const bExact =
                b.product_name.toLowerCase() === search ? 1 : 0;

            return bExact - aExact;
        });

        // Save recent searches

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

    if (searchInput) {
        searchInput.value = category;
    }

    searchProduct(category);
}

// ==========================================
// 9. DISPLAY HOME PRODUCTS
// ==========================================

function displayHomeProducts() {

    if (!homeProducts) return;

    homeProducts.innerHTML = "";

    if (allProducts.length === 0) {

        homeProducts.innerHTML =
            "<p>No products available currently.</p>";

        return;
    }

    allProducts.forEach(product => {

        homeProducts.appendChild(
            createProductCard(product)
        );
    });
}

// ==========================================
// 10. CREATE PRODUCT CARD
// ==========================================

function createProductCard(product) {

    const card = document.createElement("div");

    card.className = "product-card";

    // Product image

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

    // Product name

    const title = document.createElement("h3");

    title.textContent = product.product_name;

    // Brand

    const brand = document.createElement("p");

    brand.textContent = "Brand: " + (product.brand || "N/A");

    // Category

    const category = document.createElement("p");

    category.textContent =
        "Category: " + (product.category || "N/A");

    // Quantity

    const quantity = document.createElement("p");

    quantity.textContent =
        "Quantity: " + (product.quantity || "N/A");

    // Retailer prices

    const offersContainer = document.createElement("div");

    offersContainer.className = "product-offers";

    if (product.offers && product.offers.length > 0) {

        const lowestHeading = document.createElement("h4");

        lowestHeading.textContent =
            "Lowest Price: ₹" +
            Number(product.lowestPrice).toLocaleString("en-IN");

        offersContainer.appendChild(lowestHeading);

        product.offers.forEach(offer => {

            const offerText = document.createElement("p");

            offerText.textContent =
                offer.platform + ": ₹" +
                Number(offer.price).toLocaleString("en-IN");

            offersContainer.appendChild(offerText);
        });

        const cheapest = document.createElement("p");

        cheapest.textContent =
            "Best Price: " + product.cheapestPlatform;

        offersContainer.appendChild(cheapest);

    } else {

        offersContainer.textContent = "No price offers available.";
    }

    // Product details button

    const detailsButton = document.createElement("button");

    detailsButton.textContent = "View Details";

    detailsButton.addEventListener("click", function() {

        showProductDetails(product.id);
    });

    // Compare button

    const compareButton = document.createElement("button");

    compareButton.textContent = "Compare Prices";

    compareButton.addEventListener("click", function() {

        comparePrices(product.id);
    });

    // Wishlist button

    const wishlistButton = document.createElement("button");

    wishlistButton.textContent = "❤️ Wishlist";

    wishlistButton.addEventListener("click", function() {

        toggleWishlist(product);
    });

    // Shopping list button

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
        quantity,
        offersContainer,
        detailsButton,
        compareButton,
        wishlistButton,
        shoppingButton
    );

    return card;
}

// ==========================================
// 11. DISPLAY SEARCH RESULTS
// ==========================================

function displayProducts(productList) {

    if (!productsContainer) return;

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

// ==========================================
// 12. COMPARE AMAZON AND FLIPKART PRICES
// ==========================================

function comparePrices(productId) {

    const product = [...allProducts, ...currentProducts].find(
        item => String(item.id) === String(productId)
    );

    if (!product) {

        showToast("Product not found!", "error");

        return;
    }

    if (!product.offers || product.offers.length === 0) {

        showToast("No price offers available!", "error");

        return;
    }

    currentProduct = product;

    showPage("productDetailsPage");

    const container =
        document.getElementById("productDetails");

    if (!container) return;

    container.innerHTML = "";

    // Heading

    const heading = document.createElement("h2");

    heading.textContent =
        product.product_name + " - Price Comparison";

    container.appendChild(heading);

    // Product information

    const brand = document.createElement("p");

    brand.textContent = "Brand: " + product.brand;

    const category = document.createElement("p");

    category.textContent = "Category: " + product.category;

    container.append(brand, category);

    // Offers

    product.offers.forEach(item => {

        const offer = document.createElement("div");

        offer.className = "store-offer";

        const platform = document.createElement("h3");

        platform.textContent = item.platform;

        const price = document.createElement("h2");

        price.textContent =
            "₹" + Number(item.price).toLocaleString("en-IN");

        const discount = document.createElement("p");

        discount.textContent =
            "Discount: " + (item.discountPercent || 0) + "%";

        const rating = document.createElement("p");

        rating.textContent =
            "Rating: " + (item.rating || "N/A");

        const availability = document.createElement("p");

        availability.textContent =
            "Availability: " + (item.availability || "Unknown");

        const link = document.createElement("a");

        link.href = item.productUrl || "#";

        link.target = "_blank";

        link.rel = "noopener noreferrer";

        link.textContent = "Visit Store";

        offer.append(
            platform,
            price,
            discount,
            rating,
            availability,
            link
        );

        if (item.platform === product.cheapestPlatform) {

            const label = document.createElement("p");

            label.textContent = "🏆 Lowest Price";

            offer.appendChild(label);
        }

        // Clearly identify demo prices

        if (item.priceSource && item.priceSource.type === "simulated") {

            const note = document.createElement("small");

            note.textContent = "Demo price - Not a live retailer price.";

            offer.appendChild(note);
        }

        container.appendChild(offer);
    });

    // Lowest price

    const lowest = document.createElement("h3");

    lowest.textContent =
        "Lowest Price: ₹" +
        Number(product.lowestPrice).toLocaleString("en-IN");

    // Cheapest platform

    const cheapest = document.createElement("h3");

    cheapest.textContent =
        "Cheapest Platform: " + product.cheapestPlatform;

    container.append(lowest, cheapest);
}

// ==========================================
// 13. PRODUCT DETAILS
// ==========================================

function showProductDetails(productId) {

    const product = [...allProducts, ...currentProducts].find(
        item => String(item.id) === String(productId)
    );

    if (!product) return;

    currentProduct = product;

    showPage("productDetailsPage");

    const container =
        document.getElementById("productDetails");

    if (!container) return;

    container.innerHTML = "";

    const heading = document.createElement("h2");

    heading.textContent = product.product_name;

    const brand = document.createElement("p");

    brand.textContent = "Brand: " + (product.brand || "N/A");

    const category = document.createElement("p");

    category.textContent =
        "Category: " + (product.category || "N/A");

    const quantity = document.createElement("p");

    quantity.textContent =
        "Quantity: " + (product.quantity || "N/A");

    container.append(heading, brand, category, quantity);

    if (product.image_url) {

        const image = document.createElement("img");

        image.src = product.image_url;

        image.alt = product.product_name;

        image.style.maxWidth = "200px";

        image.onerror = function() {
            image.remove();
        };

        container.appendChild(image);
    }

    const compareButton = document.createElement("button");

    compareButton.textContent = "Compare Prices";

    compareButton.addEventListener("click", function() {

        comparePrices(product.id);
    });

    container.appendChild(compareButton);
}

// ==========================================
// 14. WISHLIST
// ==========================================

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

    if (!container) return;

    container.innerHTML = "";

    if (wishlist.length === 0) {

        container.innerHTML =
            "<p>Your wishlist is empty.</p>";

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

// ==========================================
// 15. SHOPPING LIST
// ==========================================

function addToShoppingList(product) {

    const exists = shoppingList.some(
        item => item.id === product.id
    );

    if (exists) {

        showToast("Product already in shopping list!", "error");

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

    if (!container || !totalElement) return;

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

        const price = document.createElement("p");

        const productPrice = Number(product.lowestPrice || 0);

        price.textContent =
            "Lowest Price: ₹" +
            productPrice.toLocaleString("en-IN");

        total += productPrice;

        const remove = document.createElement("button");

        remove.textContent = "Remove";

        remove.addEventListener("click", function() {

            shoppingList = shoppingList.filter(
                item => item.id !== product.id
            );

            displayShoppingList();
        });

        card.append(name, price, remove);

        container.appendChild(card);
    });

    totalElement.textContent =
        "Estimated Total: ₹" + total.toLocaleString("en-IN");
}

// ==========================================
// 16. BEST DEALS
// ==========================================

async function loadBestDeals() {

    const container =
        document.getElementById("dealsProducts");

    if (!container) return;

    container.innerHTML = "<p>Finding best deals...</p>";

    try {

        // Use already loaded API data.
        // No need to call the old /compare endpoint.

        const validDeals = allProducts
            .filter(product =>
                product.offers &&
                product.offers.length > 0 &&
                Number(product.lowestPrice) > 0
            )
            .sort((a, b) =>
                Number(a.lowestPrice) - Number(b.lowestPrice)
            );

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
                "₹" + Number(product.lowestPrice).toLocaleString("en-IN");

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

        console.error("Best deals error:", error);

        container.innerHTML =
            "<p>Unable to load deals.</p>";
    }
}

// ==========================================
// 17. RECENT SEARCHES
// ==========================================

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

            if (searchInput) {
                searchInput.value = search;
            }

            searchProduct(search);
        });

        container.appendChild(button);
    });
}

// ==========================================
// 18. SMART SHOPPING ASSISTANT
// ==========================================

const assistantForm =
    document.getElementById("assistantForm");

if (assistantForm) {

    assistantForm.addEventListener("submit", function(event) {

        event.preventDefault();

        const input =
            document.getElementById("assistantInput");

        const message = input.value.trim();

        if (!message) return;

        processAssistantMessage(message);

        input.value = "";
    });
}

function useAssistantSuggestion(message) {

    processAssistantMessage(message);
}

function processAssistantMessage(message) {

    const container =
        document.getElementById("assistantMessages");

    if (!container) return;

    const userMessage = document.createElement("div");

    userMessage.className = "assistant-message user-message";

    userMessage.textContent = message;

    container.appendChild(userMessage);

    const text = message.toLowerCase();

    let reply = "";

    if (text.includes("under")) {

        const match = text.match(
            /under\s*(?:₹|rs\.?\s*)?(\d+)/
        );

        if (match) {

            const budget = Number(match[1]);

            const matching = allProducts.filter(product => {

                const price = Number(product.lowestPrice || 0);

                return price > 0 && price <= budget;
            });

            reply = matching.length
                ? "Products within your budget: " +
                  matching.map(p => p.product_name).join(", ")
                : "No matching products within your budget were found.";

        } else {

            reply =
                "Please mention your budget, for example: under 300.";
        }

    } else if (
        text.includes("cheapest") ||
        text.includes("compare")
    ) {

        const searchWords = text
            .replace(/cheapest|compare|price|prices|of|the|show|me/gi, "")
            .trim();

        const matching = allProducts.filter(product =>
            matchesSearch(product, searchWords)
        );

        if (matching.length > 0) {

            reply =
                "I found these products: " +
                matching.map(p => p.product_name).join(", ") +
                ". Open Compare Prices to see retailer offers.";

        } else {

            reply =
                "Please search for a product name such as rice, milk or Samsung.";
        }

    } else if (text.includes("save")) {

        reply =
            "Compare Amazon and Flipkart prices before buying. " +
            "Choose the lowest listed price and check delivery charges.";

    } else {

        reply =
            "I can help you find products, compare Amazon and Flipkart prices, " +
            "and find products within your budget.";
    }

    const botMessage = document.createElement("div");

    botMessage.className = "assistant-message bot-message";

    botMessage.textContent = reply;

    container.appendChild(botMessage);

    container.scrollTop = container.scrollHeight;
}

// ==========================================
// 19. PRICE TRACKER
// ==========================================

const trackerForm =
    document.getElementById("priceTrackerForm");

if (trackerForm) {

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
}

function displayTrackedPrices() {

    const container =
        document.getElementById("trackedProducts");

    if (!container) return;

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
// 20. THEME
// ==========================================

let darkMode = false;

function toggleTheme() {

    darkMode = !darkMode;

    document.body.classList.toggle("dark-mode", darkMode);
}

// ==========================================
// 21. INITIALIZE PRICEWISE
// ==========================================

async function initializePriceWise() {

    await loadProducts();

    showHome();

    displayWishlist();

    displayShoppingList();

    displayTrackedPrices();
}

initializePriceWise();
