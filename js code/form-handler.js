import { finalizeCurrentOrder, getCurrentOrderId } from './order-manager.js';
import { getCurrentShippingData } from './checkout-display.js';

// Form submission handler
async function handleCheckoutSubmission(event) {
    event.preventDefault();
    
    const submitButton = document.getElementById('submit-button');
    const submitButton2 = document.getElementById('submit-button-1');
    const form = document.getElementById('user-info');
    
    if (!form) {
        console.error('Form not found');
        return;
    }
    
    // Disable submit button and show loading state
    const originalText = submitButton.textContent;
    const originalText2 = submitButton2.textContent;
    submitButton.disabled = true;
    submitButton2.disabled = true;
    submitButton.textContent = 'Processing Order...';
    submitButton2.textContent = 'Processing Order...';
    
    try {
        // Get form data
        const formData = new FormData(form);
        const userDetails = {
            email: formData.get('email'),
            contact: formData.get('contact'),
            city: formData.get('city'),
            country: formData.get('country'),
            firstname: formData.get('firstname'),
            lastname: formData.get('lastname'),
            address: formData.get('address'),
            notes: formData.get('notes')
        };
        
        // Validate required fields
        const requiredFields = ['email', 'city', 'country', 'firstname', 'lastname', 'address'];
        const missingFields = requiredFields.filter(field => !userDetails[field]?.trim());
        
        if (missingFields.length > 0) {
            throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
        }
        
        // Get current Order ID
        const currentOrderId = getCurrentOrderId();
        if (!currentOrderId) {
            throw new Error('No active order found. Please refresh the page and try again.');
        }
        
        // Get current shipping data
        const shippingData = getCurrentShippingData();
        console.log('Including shipping data:', shippingData);
        
        // Add shipping data to user details
        const orderDetails = {
            ...userDetails,
            shipping: {
                cost: shippingData.cost,
                type: shippingData.type,
                isLocal: shippingData.isLocal
            }
        };
        
        console.log('Finalizing order:', currentOrderId, 'with shipping data');
        
        // Finalize the order (sends to Firebase)
        const result = await finalizeCurrentOrder(orderDetails);
        
        if (result.success) {
            // Show success message
            showSuccessMessage(result.orderId);
            console.log('✅ Order processed successfully:', result.orderId);
        } else {
            throw new Error(result.error || 'Failed to process order');
        }
        
    } catch (error) {
        console.error('❌ Error submitting order:', error);
        alert(`Error processing order: ${error.message}`);
        
        // Restore submit button
        submitButton.disabled = false;
        submitButton2.disabled = false;
        submitButton.textContent = originalText;
        submitButton2.textContent = originalText2;
    }
}

// Show success message
function showSuccessMessage(orderId) {
    const checkoutPage = document.getElementById('checkout-page');
    if (checkoutPage) {
        checkoutPage.innerHTML = `
            <div class="checkout-success">
                <div class="success-content">
                    <h2 id="confirmation-header">Order ${orderId} Confirmed!</h2>
                    <p class="success-message">
                        Thank you for your order! We've received your order details and will process it shortly.<br>
                        Please make your payment using the details provided earlier and include your Order ID ${orderId} in the payment note.
                    </p>
                    <div class="success-actions">
                        <a href="/" class="continue-shopping-btn">Continue Shopping</a>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize form handler
function initializeFormHandler() {
    const form = document.getElementById('user-info');
    if (form) {
        form.addEventListener('submit', handleCheckoutSubmission);
        console.log('📝 Checkout form handler initialized (Firebase only)');
    } else {
        console.warn('Checkout form not found');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFormHandler);
} else {
    initializeFormHandler();
}

export { handleCheckoutSubmission, initializeFormHandler };