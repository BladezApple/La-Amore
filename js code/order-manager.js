import { functions } from './firebase-config.js';
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './firebase-config.js';

// Initialize cloud functions
const getOrderId = httpsCallable(functions, 'getOrderId');
const finalizeOrder = httpsCallable(functions, 'finalizeOrder');

// Get session ID from localStorage
function getSessionId() {
    let sessionId = localStorage.getItem('cartSessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cartSessionId', sessionId);
    }
    return sessionId;
}

// Get or create Order ID
async function getOrCreateOrderId() {
    try {
        const sessionId = getSessionId();
        
        // Check localStorage first
        const existingOrderId = localStorage.getItem('currentOrderId');
        if (existingOrderId) {
            console.log('Using existing Order ID from localStorage:', existingOrderId);
            return existingOrderId;
        }

        // Call cloud function to get or create Order ID
        const result = await getOrderId({ sessionId });
        const orderId = result.data.orderId;
        
        // Save to localStorage
        localStorage.setItem('currentOrderId', orderId);
        
        console.log(result.data.isNew ? 'Generated new Order ID:' : 'Retrieved existing Order ID:', orderId);
        return orderId;
        
    } catch (error) {
        console.error('Error getting/creating Order ID:', error);
        
        // Fallback: generate Order ID locally if cloud function fails
        const fallbackOrderId = generateFallbackOrderId();
        localStorage.setItem('currentOrderId', fallbackOrderId);
        console.log('Using fallback Order ID:', fallbackOrderId);
        return fallbackOrderId;
    }
}

// Fallback Order ID generation
function generateFallbackOrderId() {
    const chars = '0123456789ABCDEF';
    let result = '#';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Calculate total price from cart items
async function calculateTotalPrice() {
    try {
        const sessionId = getSessionId();
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('sessionId', '==', sessionId));
        const querySnapshot = await getDocs(q);
        
        let total = 0;
        querySnapshot.forEach((doc) => {
            const orderData = doc.data();
            const price = parseFloat(orderData.validatedPrice) || 0;
            const quantity = parseInt(orderData.quantity) || 1;
            total += price * quantity;
        });
        
        return total.toFixed(2);
    } catch (error) {
        console.error('Error calculating total price:', error);
        return '0.00';
    }
}

// Get cart items for order finalization
async function getCartItems() {
    try {
        const sessionId = getSessionId();
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('sessionId', '==', sessionId));
        const querySnapshot = await getDocs(q);
        
        const items = [];
        querySnapshot.forEach((doc) => {
            const orderData = doc.data();
            items.push({
                id: doc.id,
                productId: orderData.productId,
                color: orderData.color,
                size: orderData.size,
                quantity: orderData.quantity,
                price: orderData.validatedPrice
            });
        });
        
        return items;
    } catch (error) {
        console.error('Error getting cart items:', error);
        return [];
    }
}

// Finalize order when form is submitted
async function finalizeCurrentOrder(userDetails) {
    try {
        const sessionId = getSessionId();
        const orderId = localStorage.getItem('currentOrderId');
        
        if (!orderId) {
            throw new Error('No active Order ID found');
        }

        const totalPrice = await calculateTotalPrice();
        const orderItems = await getCartItems();

        // Call cloud function to finalize order
        const result = await finalizeOrder({
            sessionId: sessionId,
            orderId: orderId,
            totalPrice: parseFloat(totalPrice),
            orderItems: orderItems,
            userDetails: userDetails
        });

        if (result.data.success) {
            // Clear Order ID from localStorage
            localStorage.removeItem('currentOrderId');
            console.log('Order finalized successfully:', orderId);
            return { success: true, orderId: orderId };
        } else {
            throw new Error('Failed to finalize order');
        }
        
    } catch (error) {
        console.error('Error finalizing order:', error);
        return { success: false, error: error.message };
    }
}

// Update checkout header with Order ID
async function updateCheckoutHeader() {
    try {
        const orderId = await getOrCreateOrderId();
        const headerElement = document.querySelector('.checkout-items-header h2');
        
        if (headerElement) {
            headerElement.textContent = `Order ${orderId}`;
        }
        
        return orderId;
    } catch (error) {
        console.error('Error updating checkout header:', error);
        return null;
    }
}

// Clear current order (for testing or manual cleanup)
function clearCurrentOrder() {
    localStorage.removeItem('currentOrderId');
    console.log('Current Order ID cleared from localStorage');
}

// Get current Order ID without creating new one
function getCurrentOrderId() {
    return localStorage.getItem('currentOrderId');
}

// Export functions
export {
    getOrCreateOrderId,
    updateCheckoutHeader,
    finalizeCurrentOrder,
    clearCurrentOrder,
    getCurrentOrderId,
    calculateTotalPrice,
    getCartItems
};