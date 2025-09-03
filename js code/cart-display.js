import { db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";
import { functions } from './firebase-config.js';

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

const cartButton = document.getElementById('cart-button');
if (cartButton) {
    cartButton.addEventListener('click', function() {
        console.log('Cart button clicked!');
        loadCartItems();
    });
    console.log('✅ Cart button click handler added');
} else {
    console.log('❌ Cart button not found');
}

const ERROR_TOTAL = 2;

function getSessionId() {
    let sessionId = localStorage.getItem('cartSessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cartSessionId', sessionId);
    }
    return sessionId;
}

// Product image path
function getProductImage(productId) {
    return `/images/${productId}.webp`;
}

// Fallback image path
function getFallbackImage() {
    return '/images/fallback.png';
}

// Format size display
function formatSize(size) {
    const sizeMap = {
        'small': 'S',
        'medium': 'M',
        'large': 'L',
        'extra-large': 'XL'
    };
    return sizeMap[size] || size.toUpperCase();
}

// Format color display
function formatColor(color) {
    return color.charAt(0).toUpperCase() + color.slice(1);
}

// Cart item HTML
function createCartItemHTML(orderData, orderId) {
    const productName = productNames[orderData.productId] || orderData.productId;
    const imagePath = getProductImage(orderData.productId);
    const fallbackPath = getFallbackImage();
    
    return `
        <div class="cart-item" data-order-id="${orderId}">
            <div class="cart-item-image">
                <img src="${imagePath}" 
                     alt="${productName}" 
                     onerror="this.src='${fallbackPath}'"
                     loading="lazy">
            </div>
            <div class="cart-item-details">
                <div class="cart-item-name">${productName}</div>
                <div class="cart-item-specs">
                    <span class="cart-item-color">${formatColor(orderData.color)}</span> • 
                    <span class="cart-item-size">${formatSize(orderData.size)}</span>
                </div>
                <div class="cart-item-quantity">Qty: ${orderData.quantity}</div>
                <div class="cart-item-price">$${orderData.validatedPrice || 'Loading...'}</div>
            </div>
            <div class="cart-item-actions">
                <img src="/images/trash.svg" 
                     alt="Remove" 
                     class="cart-remove-btn"
                     onclick="removeCartItem('${orderId}')"
                     onerror="this.style.display='none'">
            </div>
        </div>
    `;
}

// Load and display cart items
async function loadCartItems() {
    try {
        const sessionId = getSessionId();
        const cartItemsContainer = document.getElementById('cart-items');
        
        if (!cartItemsContainer) {
            console.warn('Cart items container not found');
            return;
        }
        
        // Show loading state
        cartItemsContainer.innerHTML = '<div class="cart-loading">Loading cart items...</div>';
        
        // Query orders for this session
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('sessionId', '==', sessionId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            cartItemsContainer.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
        } else {
            let cartHTML = '';
            
            querySnapshot.forEach((doc) => {
                const orderData = doc.data();
                cartHTML += createCartItemHTML(orderData, doc.id);
            });
            
            cartItemsContainer.innerHTML = cartHTML;
        }
        
        // Update cart item count
        updateCartItemCount(querySnapshot.size);
        
        // Update secure cart total
        await updateSecureCartTotal();
        
    } catch (error) {
        console.error('Error loading cart items:', error);
        const cartItemsContainer = document.getElementById('cart-items');
        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = '<div class="cart-error">Error loading cart items</div>';
        }
    }
}

// Update cart item count in the UI
function updateCartItemCount(count) {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = count;
        cartCountElement.style.display = count > 0 ? 'block' : 'none';
    }
}

// Updated getSecureCartTotal function for callable functions
async function getSecureCartTotal() {
    try {
        const sessionId = getSessionId();
        console.log('Getting cart total for session:', sessionId);
        
        // Use Firebase callable function
        const getCartTotal = httpsCallable(functions, 'getCartTotal');
        
        const result = await getCartTotal({
            sessionId: sessionId
        });

        console.log('Cart total response:', result.data);
        
        if (result.data && result.data.success) {
            return {
                total: result.data.totalPrice,
                isError: result.data.isError || false
            };
        } else {
            console.error('Error fetching cart total:', result.data?.error);
            return {
                total: 0,
                isError: true
            };
        }
    } catch (error) {
        console.error('Error calling getCartTotal:', error);
        
        if (error.code) {
            console.error('Firebase error code:', error.code);
            console.error('Firebase error message:', error.message);
        }
        
        return {
            total: 0,
            isError: true
        };
    }
}

// Simplified cart total update
async function updateSecureCartTotal() {
    const totalResult = await getSecureCartTotal();
    const totalElement = document.getElementById('cart-total-amount');
    
    if (totalElement) {
        if (totalResult.isError) {
            totalElement.textContent = 'Error';
            totalElement.style.color = '#e74c3c';
            totalElement.setAttribute('data-error', 'true');
        } else {
            totalElement.textContent = totalResult.total.toFixed(2);
            totalElement.style.color = '#333';
            totalElement.removeAttribute('data-error');
        }
    }
}

// Poll for updates when needed
function setupCartTotalUpdates() {
    // Update cart total every 30 seconds when cart is open
    let updateInterval;
    
    const startUpdates = () => {
        // Clear any existing interval
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        
        // Update immediately
        updateSecureCartTotal();
        
        // Then update every 30 seconds
        updateInterval = setInterval(() => {
            updateSecureCartTotal();
        }, 30000);
    };
    
    const stopUpdates = () => {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    };
    
    // Start updates when cart is opened
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isActive = cartSidebar.classList.contains('active');
                    if (isActive) {
                        startUpdates();
                    } else {
                        stopUpdates();
                    }
                }
            });
        });
        
        observer.observe(cartSidebar, { attributes: true });
        
        // Check initial state
        if (cartSidebar.classList.contains('active')) {
            startUpdates();
        }
    }
    
    return { startUpdates, stopUpdates };
}

// Remove item from cart
async function removeCartItem(orderId) {
    try {
        // Show loading state for this item
        const itemElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (itemElement) {
            itemElement.style.opacity = '0.5';
            itemElement.style.pointerEvents = 'none';
        }
        
        // Delete from Firebase
        await deleteDoc(doc(db, 'orders', orderId));
        
        // Remove from localStorage if it exists
        const productData = JSON.parse(localStorage.getItem('productData') || '{}');
        
        // Refresh cart display
        await loadCartItems();
        
        console.log('Item removed from cart:', orderId);
        
    } catch (error) {
        console.error('Error removing cart item:', error);
        alert('Error removing item from cart. Please try again.');
        
        // Restore item appearance on error
        const itemElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (itemElement) {
            itemElement.style.opacity = '1';
            itemElement.style.pointerEvents = 'auto';
        }
    }
}

function setupCartListener() {
    // This function is kept for backward compatibility but doesn't use Firestore listeners
    console.log('Cart listener setup - using manual refresh approach');
}

// Initialize cart display
function initializeCartDisplay() {
    // Load cart items when cart is first opened
    loadCartItems();
    
    // Set up cart total updates (polling approach)
    setupCartTotalUpdates();
    
    // Keep the setupCartListener call for backward compatibility
    setupCartListener();
}

// Enhanced cart toggle function that loads items when opened
function enhancedCartToggle() {
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
        const isOpening = !cartSidebar.classList.contains('active');
        
        if (isOpening) {
            // Load cart items when opening
            loadCartItems();
        }
    }
}

// Make functions globally available
window.removeCartItem = removeCartItem;
window.loadCartItems = loadCartItems;
window.initializeCartDisplay = initializeCartDisplay;
window.enhancedCartToggle = enhancedCartToggle;

// Export functions for use in other modules
export { 
    loadCartItems, 
    removeCartItem, 
    initializeCartDisplay,
    getSessionId,
    enhancedCartToggle
};