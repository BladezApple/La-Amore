import { db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { updateCheckoutHeader, getCurrentOrderId } from './order-manager.js';

// Product name mapping for display
const productNames = {
    'ESS-PUL': 'Essentials Pullover Hoodie',
    'ESS-HZP': 'Essentials Half-Zip Hoodie',
    'ESS-ZIP': 'Essentials Zipper Hoodie',
    'ESS-OVS': 'Essentials Oversize Hoodie',
    'CLS-PUL': 'Classic Pullover Hoodie',
    'CLS-HZP': 'Classic Half-Zip Hoodie',
    'CLS-ZIP': 'Classic Zipper Hoodie',
    'CLS-OVS': 'Classic Oversize Hoodie'
};

// Pakistani location detection (copied from main checkout page logic)
const pakistanKeywords = [
    'pakistan', 'pk', 'pak', 'پاکستان', 'islamic republic of pakistan'
];

const pakistaniCities = [
    'karachi', 'lahore', 'islamabad', 'rawalpindi', 'faisalabad', 'multan', 
    'peshawar', 'quetta', 'sialkot', 'gujranwala', 'hyderabad', 'bahawalpur',
    'sargodha', 'sukkur', 'larkana', 'sheikhupura', 'jhang', 'rahimyar khan',
    'gujrat', 'kasur', 'mardan', 'mingora', 'dera ghazi khan', 'sahiwal',
    'nawabshah', 'okara', 'mirpur khas', 'chiniot', 'kamoke', 'sadiqabad',
    'burewala', 'jacobabad', 'muzaffargarh', 'khanewal', 'hafizabad',
    'kohat', 'turbat', 'dera ismail khan', 'wah cantonment', 'jhelum',
    'bannu', 'abbottabad', 'muridke', 'pakpattan', 'khushab', 'chakwal',
    'gojra', 'mandi bahauddin', 'ahmadpur east', 'kamalia', 'vihari'
];

function isPakistanCountry(input) {
    if (!input) return false;
    const normalizedInput = input.toLowerCase().trim();
    return pakistanKeywords.some(keyword => 
        normalizedInput.includes(keyword.toLowerCase())
    );
}

function isPakistaniCity(input) {
    if (!input) return false;
    const normalizedInput = input.toLowerCase().trim();
    return pakistaniCities.some(city => 
        normalizedInput.includes(city.toLowerCase()) || 
        city.toLowerCase().includes(normalizedInput)
    );
}

// Check if location is Pakistani based on form inputs
function isLocalShipping() {
    const countryInput = document.getElementById('country');
    const cityInput = document.getElementById('city');
    
    if (!countryInput || !cityInput) return false;
    
    const countryValue = countryInput.value;
    const cityValue = cityInput.value;
    
    return isPakistanCountry(countryValue) || 
           (cityValue.length >= 3 && isPakistaniCity(cityValue));
}

// Get shipping cost based on location
function getShippingCost() {
    return isLocalShipping() ? 1 : 15;
}

// Get shipping type for display
function getShippingType() {
    return isLocalShipping() ? 'Local' : 'International';
}

// Get session ID from localStorage
function getSessionId() {
    let sessionId = localStorage.getItem('cartSessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cartSessionId', sessionId);
    }
    return sessionId;
}

// Format size display
function formatSize(size) {
    const sizeMap = {
        'small': 'Small',
        'medium': 'Medium',
        'large': 'Large',
        'extra-large': 'Extra Large'
    };
    return sizeMap[size] || size.toUpperCase();
}

// Format color display
function formatColor(color) {
    return color.charAt(0).toUpperCase() + color.slice(1);
}

// Create checkout item HTML
function createCheckoutItemHTML(orderData, orderId) {
    const productName = productNames[orderData.productId] || orderData.productId;
    const imagePath = `/images/${orderData.productId}.webp`;
    const fallbackPath = '/images/fallback.png';
    
    return `
        <div class="checkout-item" data-order-id="${orderId}">
            <div class="checkout-item-image">
                <img src="${imagePath}" 
                     alt="${productName}" 
                     onerror="this.src='${fallbackPath}'"
                     loading="lazy">
            </div>
            <div class="checkout-item-details">
                <div class="checkout-item-name">${productName}</div>
                <div class="checkout-item-specs">
                    <span class="checkout-item-color">${formatColor(orderData.color)}</span> -
                    <span class="checkout-item-size">${formatSize(orderData.size)}</span> -
                    <span class="checkout-item-quantity">${orderData.quantity} Piece</span>
                    <div class="checkout-price-amount">$${orderData.validatedPrice || '0.00'}</div>
                </div>
            </div>
            <div class="checkout-item-actions">
                <button class="checkout-remove-btn" onclick="removeCheckoutItem('${orderId}')">
                    <img class="delete-icon" src="/images/trash.svg" alt="Remove">
                </button>
            </div>
        </div>
    `;
}

// Calculate and display total price with dynamic shipping
function calculateAndDisplayTotal(querySnapshot) {
    let total = 0;
    let itemCount = 0;
    
    querySnapshot.forEach((doc) => {
        const orderData = doc.data();
        const price = parseFloat(orderData.validatedPrice) || 0;
        const quantity = parseInt(orderData.quantity) || 1;
        total += price;
        itemCount += quantity;
    });
    
    const shippingCost = getShippingCost();
    const grandTotal = total + shippingCost;
    
    return {
        subtotal: total,
        shipping: shippingCost,
        shippingType: getShippingType(),
        total: grandTotal,
        itemCount: itemCount
    };
}

// Update shipping display when location changes
function updateShippingDisplay() {
    const shippingCost = getShippingCost();
    const shippingType = getShippingType();
    const shippingElement = document.querySelector('.checkout-summary-row.shipping .separate-2');
    const totalElements = document.querySelectorAll('.checkout-summary-row.total .separate-3');
    
    if (shippingElement) {
        shippingElement.textContent = `$${shippingCost.toFixed(2)}`;
    }
    
    // Update shipping type display if exists
    const shippingTypeElement = document.querySelector('.shipping-type-display');
    if (shippingTypeElement) {
        shippingTypeElement.textContent = `(${shippingType} Shipping)`;
    }
    
    // Recalculate and update total
    const subtotalElement = document.querySelector('.checkout-summary-row.subtotal .separate-1');
    if (subtotalElement && totalElements.length > 0) {
        const subtotalText = subtotalElement.textContent.replace('$', '');
        const subtotal = parseFloat(subtotalText) || 0;
        const newTotal = subtotal + shippingCost;
        
        totalElements.forEach(element => {
            element.textContent = `$${newTotal.toFixed(2)}`;
        });
    }
    
    // Store shipping data for later use in order finalization
    window.currentShippingData = {
        cost: shippingCost,
        type: shippingType,
        isLocal: isLocalShipping()
    };
    
    console.log('Shipping data updated:', window.currentShippingData);
}

// Get current shipping data for order finalization
function getCurrentShippingData() {
    const shippingCost = getShippingCost();
    const shippingType = getShippingType();
    
    return {
        cost: shippingCost,
        type: shippingType,
        isLocal: isLocalShipping()
    };
}

// Load and display checkout items with dynamic shipping
async function loadCheckoutItems() {
    try {
        const sessionId = getSessionId();
        const checkoutContainer = document.getElementById('cart-details');
        
        if (!checkoutContainer) {
            console.warn('Checkout container not found');
            return;
        }
        
        // Show loading state
        checkoutContainer.innerHTML = '<div class="checkout-loading">Loading cart items...</div>';
        
        // Query orders for this session
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('sessionId', '==', sessionId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            checkoutContainer.innerHTML = `
                <div class="checkout-empty">
                    <h3>Your cart is empty</h3>
                    <p>Add some items to your cart before checking out.</p>
                    <a href="/" class="continue-shopping-btn">Continue Shopping</a>
                </div>
            `;
        } else {
            // Update header with Order ID
            const currentOrderId = await updateCheckoutHeader();
            
            // Calculate totals with dynamic shipping
            const { subtotal, shipping, shippingType, total, itemCount } = calculateAndDisplayTotal(querySnapshot);
            
            // Build checkout HTML
            let checkoutHTML = `
                <div class="checkout-items-header">
                    <h2>Order <span id="order-id">${currentOrderId || 'Summary'}</span></h2>
                </div>
            `;
            
            checkoutHTML += '<div class="checkout-items-list">';
            
            querySnapshot.forEach((doc) => {
                const orderData = doc.data();
                checkoutHTML += createCheckoutItemHTML(orderData, doc.id);
            });
            
            checkoutHTML += '</div>';
            
            // Add order summary with dynamic shipping
            checkoutHTML += `
                <div class="checkout-summary">
                    <div class="checkout-summary-row subtotal">
                        <span>Subtotal (${itemCount})</span>
                        <span class="separate-1">$${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="checkout-summary-row shipping">
                        <span>Shipping <span class="shipping-type-display">(${shippingType} Shipping)</span></span>
                        <span class="separate-2">$${shipping.toFixed(2)}</span>
                    </div>
                    <div class="checkout-summary-row total">
                        <span>Total</span>
                        <span class="separate-3">$${total.toFixed(2)}</span>
                    </div>
                    <p id="summary-note">Note: Pakistani Customers are requested to order through our Social
                    Pages!</p>
                </div>
            `;
            
            checkoutContainer.innerHTML = checkoutHTML;
            
            // Initialize shipping data
            updateShippingDisplay();
        }
        
    } catch (error) {
        console.error('Error loading checkout items:', error);
        const checkoutContainer = document.getElementById('cart-details');
        if (checkoutContainer) {
            checkoutContainer.innerHTML = `
                <div class="checkout-error">
                    <h3>Error loading cart items</h3>
                    <p>Please refresh the page and try again.</p>
                    <button onclick="loadCheckoutItems()" class="retry-btn">Retry</button>
                </div>
            `;
        }
    }
}

// Remove item from checkout
async function removeCheckoutItem(orderId) {
    try {
        // Show loading state for this item
        const itemElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (itemElement) {
            itemElement.style.opacity = '0.5';
            itemElement.style.pointerEvents = 'none';
            
            const removeBtn = itemElement.querySelector('.checkout-remove-btn');
            if (removeBtn) {
                removeBtn.textContent = 'Removing...';
                removeBtn.disabled = true;
            }
        }
        
        // Delete from Firebase
        await deleteDoc(doc(db, 'orders', orderId));
        
        // Refresh checkout display
        await loadCheckoutItems();
        
        console.log('Item removed from checkout:', orderId);
        
    } catch (error) {
        console.error('Error removing checkout item:', error);
        
        // Restore item appearance on error
        const itemElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (itemElement) {
            itemElement.style.opacity = '1';
            itemElement.style.pointerEvents = 'auto';
            
            const removeBtn = itemElement.querySelector('.checkout-remove-btn');
            if (removeBtn) {
                removeBtn.textContent = 'Remove';
                removeBtn.disabled = false;
            }
        }
        
        alert('Error removing item. Please try again.');
    }
}

// Initialize checkout display with dynamic shipping
async function initializeCheckoutDisplay() {
    // Load checkout items
    await loadCheckoutItems();
    
    // Set up event listeners for location changes
    const countryInput = document.getElementById('country');
    const cityInput = document.getElementById('city');
    
    if (countryInput && cityInput) {
        countryInput.addEventListener('input', updateShippingDisplay);
        cityInput.addEventListener('input', updateShippingDisplay);
        
        // Also listen for change events (for dropdowns/autocomplete)
        countryInput.addEventListener('change', updateShippingDisplay);
        cityInput.addEventListener('change', updateShippingDisplay);
    }
    
    // Display current Order ID in console for debugging
    const currentOrderId = getCurrentOrderId();
    console.log('Current Order ID:', currentOrderId);
}

// Make functions globally available
window.removeCheckoutItem = removeCheckoutItem;
window.loadCheckoutItems = loadCheckoutItems;
window.initializeCheckoutDisplay = initializeCheckoutDisplay;
window.updateShippingDisplay = updateShippingDisplay;
window.getCurrentShippingData = getCurrentShippingData;

// Export for module use
export { 
    loadCheckoutItems, 
    removeCheckoutItem, 
    initializeCheckoutDisplay,
    updateShippingDisplay,
    getCurrentShippingData,
    getSessionId
};