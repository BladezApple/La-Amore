import { db } from './firebase-config.js';
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";
import { functions } from './firebase-config.js';
import { getSessionId, loadCartItems } from './cart-display.js';

// Universal size selector script for all product pages

// Product mapping based on URL paths
const productMapping = {
    '/productpages/essential-pullover/': 'ESS-PUL',
    '/productpages/essential-halfzip/': 'ESS-HZP',
    '/productpages/essential-zip/': 'ESS-ZIP',
    '/productpages/essential-oversize/': 'ESS-OVS',
    '/productpages/classic-pullover/': 'CLS-PUL',
    '/productpages/classic-halfzip/': 'CLS-HZP',
    '/productpages/classic-zip/': 'CLS-ZIP',
    '/productpages/classic-oversize/': 'CLS-OVS'
};

// Function to get current product ID from URL
function getCurrentProductId() {
    const currentPath = window.location.pathname;
    return productMapping[currentPath] || null;
}

// Function to get existing product data from localStorage
function getProductData() {
    const data = localStorage.getItem('productData');
    return data ? JSON.parse(data) : {};
}

// Function to save product data to localStorage
function saveProductData(dataObj) {
    localStorage.setItem('productData', JSON.stringify(dataObj));
}

// Legacy functions for backward compatibility
function getProductSizes() {
    const data = getProductData();
    const sizes = {};
    Object.keys(data).forEach(productId => {
        if (data[productId].size) {
            sizes[productId] = data[productId].size;
        }
    });
    return sizes;
}

function saveProductSizes(sizesObj) {
    const data = getProductData();
    Object.keys(sizesObj).forEach(productId => {
        if (!data[productId]) data[productId] = {};
        data[productId].size = sizesObj[productId];
    });
    saveProductData(data);
}

// Function to handle size selection
function selectSize(size) {
    const productId = getCurrentProductId();
    
    if (!productId) {
        console.error('Could not determine product ID from current page');
        return;
    }
    
    // Get existing data
    const productData = getProductData();
    
    // Initialize product data if it doesn't exist
    if (!productData[productId]) {
        productData[productId] = {};
    }
    
    // Update the size for current product
    productData[productId].size = size;
    
    // Save back to localStorage
    saveProductData(productData);
    
    console.log(`Size ${size} selected for product ${productId}`);
    
    // Optional: Add visual feedback for selected button
    updateSizeButtonStates(size);
}

// Function to handle color selection
function selectColor(color) {
    const productId = getCurrentProductId();
    
    if (!productId) {
        console.error('Could not determine product ID from current page');
        return;
    }
    
    // Get existing data
    const productData = getProductData();
    
    // Initialize product data if it doesn't exist
    if (!productData[productId]) {
        productData[productId] = {};
    }
    
    // Update the color for current product
    productData[productId].color = color;
    
    // Save back to localStorage
    saveProductData(productData);
    
    console.log(`Color ${color} selected for product ${productId}`);
    
    // Optional: Add visual feedback for selected button
    updateColorButtonStates(color);
}

// Function to handle quantity changes
function updateQuantity(change) {
    const productId = getCurrentProductId();
    
    if (!productId) {
        console.error('Could not determine product ID from current page');
        return;
    }
    
    const quantityDisplay = document.getElementById('cart-quantity');
    if (!quantityDisplay) return;
    
    // Get existing data
    const productData = getProductData();
    
    // Initialize product data if it doesn't exist
    if (!productData[productId]) {
        productData[productId] = {};
    }
    
    // Get current quantity (from display or saved data)
    let currentQuantity = parseInt(quantityDisplay.textContent) || 1;
    
    // Apply the change
    const newQuantity = currentQuantity + change;
    
    // Enforce limits (1-10)
    if (newQuantity >= 1 && newQuantity <= 10) {
        // Update display
        quantityDisplay.textContent = newQuantity;
        
        // Save to localStorage
        productData[productId].quantity = newQuantity;
        saveProductData(productData);
        
        console.log(`Quantity ${newQuantity} set for product ${productId}`);
    }
}

// Function to load previously selected quantity for current product
function loadSelectedQuantity() {
    const productId = getCurrentProductId();
    
    if (!productId) return;
    
    const productData = getProductData();
    const savedQuantity = productData[productId]?.quantity;
    
    if (savedQuantity) {
        const quantityDisplay = document.getElementById('cart-quantity');
        if (quantityDisplay) {
            quantityDisplay.textContent = savedQuantity;
        }
    }
}

// Function to update size button visual states
function updateSizeButtonStates(selectedSize) {
    const buttons = ['small', 'medium', 'large', 'extra-large'];
    
    buttons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            // Get the hover image for this button
            const hoverImageId = buttonId === 'extra-large' ? 'extralarge-hover' : `${buttonId}-hover`;
            const hoverImage = document.getElementById(hoverImageId);
            
            if (buttonId === selectedSize || 
                (buttonId === 'extra-large' && selectedSize === 'extra-large')) {
                button.classList.add('selected');
                // Show hover image for selected button
                if (hoverImage) {
                    hoverImage.style.opacity = '1';
                }
            } else {
                button.classList.remove('selected');
                // Hide hover image for non-selected buttons
                if (hoverImage) {
                    hoverImage.style.opacity = '0';
                }
            }
        }
    });
}

// Function to update color button visual states
function updateColorButtonStates(selectedColor) {
    const colorButtons = ['blackbutton', 'whitebutton'];
    
    colorButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            if ((buttonId === 'blackbutton' && selectedColor === 'black') ||
                (buttonId === 'whitebutton' && selectedColor === 'white')) {
                button.classList.add('selected');
                // Apply selected styles directly
                button.style.color = 'white';
                button.style.backgroundColor = 'rgb(60, 60, 60)';
                button.style.borderColor = 'white';
                button.style.cursor = 'pointer';
            } else {
                button.classList.remove('selected');
                // Remove selected styles
                button.style.color = '';
                button.style.backgroundColor = '';
                button.style.borderColor = '';
                button.style.cursor = '';
            }
        }
    });
}

// Function to load previously selected size for current product
function loadSelectedSize() {
    const productId = getCurrentProductId();
    
    if (!productId) return;
    
    const productData = getProductData();
    const selectedSize = productData[productId]?.size;
    
    if (selectedSize) {
        updateSizeButtonStates(selectedSize);
    }
}

// Function to load previously selected color for current product
function loadSelectedColor() {
    const productId = getCurrentProductId();
    
    if (!productId) return;
    
    const productData = getProductData();
    const selectedColor = productData[productId]?.color;
    
    if (selectedColor) {
        updateColorButtonStates(selectedColor);
    }
}

// Prevent multiple initializations
let initialized = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (initialized) return;
    initialized = true;
    // Get size buttons
    const smallBtn = document.getElementById('small');
    const mediumBtn = document.getElementById('medium');
    const largeBtn = document.getElementById('large');
    const extraLargeBtn = document.getElementById('extra-large');
    
    // Get quantity buttons
    const minusBtn = document.getElementById('minusbutton');
    const plusBtn = document.getElementById('plusbutton');
    
    // Get color buttons
    const blackBtn = document.getElementById('blackbutton');
    const whiteBtn = document.getElementById('whitebutton');
    
    // Add event listeners for size buttons
    if (smallBtn) {
        smallBtn.addEventListener('click', () => selectSize('small'));
    }
    
    if (mediumBtn) {
        mediumBtn.addEventListener('click', () => selectSize('medium'));
    }
    
    if (largeBtn) {
        largeBtn.addEventListener('click', () => selectSize('large'));
    }
    
    if (extraLargeBtn) {
        extraLargeBtn.addEventListener('click', () => selectSize('extra-large'));
    }
    
    // Add event listeners for color buttons
    if (blackBtn) {
        blackBtn.addEventListener('click', () => selectColor('black'));
    }
    
    if (whiteBtn) {
        whiteBtn.addEventListener('click', () => selectColor('white'));
    }
    
    // Add event listeners for quantity buttons
    if (minusBtn) {
        minusBtn.addEventListener('click', () => updateQuantity(-1));
    }
    
    if (plusBtn) {
        plusBtn.addEventListener('click', () => updateQuantity(1));
    }
    
    // Get add to cart button
    const addToCartBtn = document.getElementById('addtocart');
    
    // Add event listener for add to cart button
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', handleAddToCart);
    }
    
    // Initialize error message to be hidden
    showError(false);
    
    // Load any previously selected size, color, and quantity for this product
    loadSelectedSize();
    loadSelectedColor();
    loadSelectedQuantity();
});

// New color functions
function getColorForProduct(productId) {
    const data = getDataForProduct(productId);
    return data?.color || null; // No default color
}

// Export function for cart/other pages to retrieve all product data
function getAllProductData() {
    return getProductData();
}

// Export function to get data for specific product
function getDataForProduct(productId) {
    const data = getProductData();
    return data[productId] || null;
}

// Legacy functions for backward compatibility
function getAllProductSizes() {
    return getProductSizes();
}

function getSizeForProduct(productId) {
    const data = getDataForProduct(productId);
    return data?.size || null;
}

// New quantity functions
function getQuantityForProduct(productId) {
    const data = getDataForProduct(productId);
    return data?.quantity || 1; // Default to 1 if no quantity saved
}

// Function to validate if all required details are selected
function validateSelection() {
    const productId = getCurrentProductId();
    if (!productId) return false;
    
    const productData = getProductData();
    const data = productData[productId] || {};
    
    // Check if size and color are selected (quantity has default)
    const hasSize = data.size && data.size !== '';
    const hasColor = data.color && data.color !== '';
    
    return hasSize && hasColor;
}

// Function to show/hide error message
function showError(show) {
    const errorElement = document.getElementById('carterror');
    if (errorElement) {
        errorElement.style.opacity = show ? '1' : '0';
    }
}

// Updated handleAddToCart function for callable functions
async function handleAddToCart() {
  console.log("=== Add to Cart Process Started ===");

  if (validateSelection()) {
    showError(false);

    const productId = getCurrentProductId();
    const productData = getDataForProduct(productId);
    const sessionId = getSessionId();
    localStorage.setItem('sessionId', sessionId);

    console.log('Sending to backend:', {
      productId,
      productData,
      sessionId
    });

    try {
      // Create callable function reference
      const validateOrder = httpsCallable(functions, 'validateOrder');
      
      // Prepare data payload
      const payload = {
        productId: productId,
        size: productData.size,
        color: productData.color,
        quantity: productData.quantity || 1,
        sessionId: sessionId
      };
      
      console.log('Calling validateOrder with payload:', payload);
      
      // Call the function
      const result = await validateOrder(payload);
      
      console.log('Function call successful. Full result:', result);
      console.log('Result data:', result.data);

      // Check if we have valid response data
      if (!result.data) {
        throw new Error('No data returned from function');
      }

      if (!result.data.success) {
        throw new Error(result.data.message || 'Validation failed');
      }

      // Success!
      console.log('Order validated successfully:', result.data);
      
      // Show success message
      alert(`Added to cart! Item Price: $${result.data.validatedPrice}`);

      // Refresh cart display if sidebar is open
      const cartSidebar = document.getElementById('cart-sidebar');
      if (cartSidebar && cartSidebar.classList.contains('active')) {
        console.log('Refreshing cart display...');
        loadCartItems();
      }

      // Clear the current product selection after adding to cart
      clearCurrentProductSelection();

    } catch (error) {
      console.error("Backend validation failed:", error);
      
      // Handle different types of errors
      if (error.code) {
        console.error('Firebase error code:', error.code);
        console.error('Firebase error message:', error.message);
        
        let userMessage = 'Something went wrong. Please try again.';
        
        switch (error.code) {
          case 'functions/invalid-argument':
            userMessage = 'Invalid product selection. Please check your choices and try again.';
            break;
          case 'functions/not-found':
            userMessage = 'Product not found. Please refresh the page and try again.';
            break;
          case 'functions/internal':
            userMessage = 'Server error. Please try again in a moment.';
            break;
          default:
            userMessage = `Error: ${error.message}`;
        }
        
        alert(userMessage);
      } else {
        alert(`Error: ${error.message || 'Network error. Please check your connection and try again.'}`);
      }
    }

  } else {
    showError(true);
    console.log('Missing required details - showing error');
  }
}

// Function to clear current product selection after adding to cart
function clearCurrentProductSelection() {
  const productId = getCurrentProductId();
  if (!productId) return;

  const productData = getProductData();
  if (productData[productId]) {
    delete productData[productId];
    saveProductData(productData);
    
    // Reset UI elements
    updateSizeButtonStates('');
    updateColorButtonStates('');
    
    const quantityDisplay = document.getElementById('cart-quantity');
    if (quantityDisplay) {
      quantityDisplay.textContent = '1';
    }
  }
}