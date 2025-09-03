// -------- Session ID Generation (Early Initialization) --------
function getOrCreateSessionId() {
    let sessionId = localStorage.getItem('cartSessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cartSessionId', sessionId);
        console.log('🆔 Generated new session ID:', sessionId);
    } else {
        console.log('🆔 Using existing session ID:', sessionId);
    }
    return sessionId;
}

// Initialize session ID immediately when script loads
const currentSessionId = getOrCreateSessionId();

// Load reusable components
fetch("/pages/header.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("header").innerHTML = data;
    initializeHeader();
  });

fetch("/pages/navigation.html")
  .then(res => res.text())
  .then(data => document.getElementById("navigation").innerHTML = data);

fetch("/pages/footer.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("footer").innerHTML = data;
    initializeNewsletter();
  });

import { loadCartItems } from './cart-display.js';

// ---------------- Newsletter Firebase Integration ----------------

async function initializeNewsletter() {
  const newsletterForm = document.getElementById('newsletter');
  
  if (!newsletterForm) {
    console.warn('Newsletter form not found');
    return;
  }

  newsletterForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const emailInput = this.querySelector('input[name="email"]');
    const submitButton = this.querySelector('button[type="submit"]');
    const email = emailInput.value.trim();
    
    if (!email) {
      alert('Please enter a valid email address.');
      return;
    }

    // Disable button and show loading state
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';
    submitButton.disabled = true;

    try {
      // Dynamically import Firebase modules
      const { getFirestore, collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
      
      // Firebase configuration
      const firebaseConfig = {
        apiKey: "AIzaSyCyDsOjZNezvR2JKECPcCW45XOcPxBqa20",
        authDomain: "la-amore.firebaseapp.com",
        projectId: "la-amore",
        storageBucket: "la-amore.appspot.com",
        messagingSenderId: "1046548218807",
        appId: "1:1046548218807:web:75be1cfca552235df79e32",
        measurementId: "G-S6GHNQ1J79"
      };

      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      
      // Add email to Firebase collection
      const emailsRef = collection(db, 'emails');
      await addDoc(emailsRef, {
        email: email,
        timestamp: serverTimestamp(),
        sessionId: currentSessionId,
        source: 'newsletter_footer'
      });

      // Success feedback
      alert('Thank you for subscribing to our Newsletter! 🎉');
      emailInput.value = ''; // Clear the input
      
      console.log('✅ Newsletter subscription successful:', email);
      
    } catch (error) {
      console.error('❌ Newsletter subscription failed:', error);
      
      // User-friendly error message
      if (error.code === 'permission-denied') {
        alert('Subscription failed. Please try again later.');
      } else if (error.message.includes('network')) {
        alert('Network error. Please check your connection and try again.');
      } else {
        alert('Something went wrong. Please try again.');
      }
    } finally {
      // Restore button state
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    }
  });

  console.log('📧 Newsletter form initialized');
}

// ---------------- Main Header Initialization ----------------

function initializeHeader() {
  let clickCount = 0;

  window.toggleMenu = function () {
    clickCount++;
    console.log('toggleMenu called!', clickCount);

    const sidebar = document.getElementById("sidebar");
    const cartMenu = document.getElementById("cart-sidebar");
    console.log('Sidebar element:', sidebar);

    if (sidebar) {
      sidebar.classList.toggle("active");
      cartMenu.classList.remove("active");
      console.log('Sidebar classes after toggle:', sidebar.className);
    } else {
      console.error('Sidebar element not found!');
    }
  };

  window.toggleDropdown = function (dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    const toggle = dropdown.previousElementSibling;

    dropdown.classList.toggle('active');
    toggle.classList.toggle('active');
  };

  const sidebar = document.getElementById("sidebar");
  const button = document.getElementById("menubutton");

  console.log('Header initialized. Sidebar:', sidebar, 'Button:', button);

  // --- Cart Sidebar Logic ---
  const cartButton = document.getElementById('cart-button');
  const cartSidebar = document.getElementById('cart-sidebar');

  if (cartButton && cartSidebar) {
    console.log('Cart elements found, initializing cart functionality');

    cartButton.addEventListener('click', function (e) {
      e.stopPropagation();

      const sidebar = document.getElementById("sidebar");

      cartSidebar.classList.toggle('active');
      sidebar.classList.remove('active');
      loadCartItems();

      document.body.classList.toggle('active');
      document.querySelector('header').classList.toggle('active');
      document.querySelector('nav').classList.toggle('active');

      if (cartSidebar.classList.contains('active') && window.cartDisplayModule) {
        window.cartDisplayModule.loadCartItems();
      }

      console.log('Cart toggled:', cartSidebar.classList.contains('active'));
    });

    cartSidebar.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    if (window.cartDisplayModule) {
      window.cartDisplayModule.initializeCartDisplay();
    }
  } else {
    console.error('Cart elements not found. Button:', cartButton, 'Sidebar:', cartSidebar);
  }

  // Close sidebars when clicking outside
  document.addEventListener('click', function (e) {
    const menu = document.getElementById("sidebar");
    const menuButton = document.getElementById("menubutton");
    const cartMenu = document.getElementById("cart-sidebar");
    const cartBtn = document.getElementById("cart-button");

    if (menu && menuButton && !menu.contains(e.target) && !menuButton.contains(e.target)) {
      menu.classList.remove("active");
    }

    if (cartMenu && cartBtn && !cartMenu.contains(e.target) && !cartBtn.contains(e.target)) {
      cartMenu.classList.remove("active");
      document.body.classList.remove("active");
      document.querySelector('header').classList.remove("active");
      document.querySelector('nav').classList.remove("active");
    }
  });

  const cartCloseButton = document.getElementById("cart-close");

  cartCloseButton.addEventListener("click", function() {
    const cartMenu = document.getElementById("cart-sidebar");

    cartMenu.classList.remove("active");
    document.body.classList.remove("active");
    document.querySelector('header').classList.remove("active");
    document.querySelector('nav').classList.remove("active");
  });

  // --- Initialize Real-time Checkout Button Logic ---
  initializeRealtimeCheckout();
}

// --- Checkout Button Real-time Enable Logic ---
let checkoutListener = null; // Store the listener for cleanup

function initializeRealtimeCheckout() {
  const checkoutBtn = document.getElementById('checkout');
  // Use the session ID we already generated
  const sessionId = currentSessionId;

  if (!checkoutBtn || !sessionId) {
    console.warn("Checkout button or sessionId missing.", checkoutBtn, sessionId);
    return;
  }

  console.log("⏳ Setting up real-time listener for order with sessionId:", sessionId);

  import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js")
    .then(({ getFirestore, collection, query, where, onSnapshot }) => {
      const db = getFirestore();
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("sessionId", "==", sessionId));

      // Clean up any existing listener
      if (checkoutListener) {
        checkoutListener();
      }

      // Set up real-time listener
      checkoutListener = onSnapshot(q, (querySnapshot) => {
        const orderCount = querySnapshot.size;
        
        if (orderCount > 0) {
          // Orders exist - enable checkout
          console.log(`✅ ${orderCount} order(s) found, enabling checkout.`);
          enableCheckoutButton();
        } else {
          // No orders at all - disable checkout
          console.warn("❌ No orders for this session. Checkout blocked.");
          disableCheckoutButton();
        }
      }, (error) => {
        console.error("⚠️ Error in real-time listener:", error);
        // On error, disable checkout as a safety measure
        disableCheckoutButton();
      });

    })
    .catch((error) => {
      console.error("Failed to load Firebase modules:", error);
      disableCheckoutButton();
    });
}

function enableCheckoutButton() {
  const checkoutBtn = document.getElementById('checkout');
  if (!checkoutBtn) return;
  
  checkoutBtn.disabled = false;
  checkoutBtn.style.opacity = 1;
  checkoutBtn.style.cursor = "pointer";
  
  // Remove any existing click listeners to avoid duplicates
  const newCheckoutBtn = checkoutBtn.cloneNode(true);
  checkoutBtn.parentNode.replaceChild(newCheckoutBtn, checkoutBtn);
  
  // Get the new element reference and add listener
  const updatedBtn = document.getElementById('checkout');
  updatedBtn.addEventListener('click', () => {
    window.location.href = "/pages/checkout/";
  });
}

function disableCheckoutButton() {
  const checkoutBtn = document.getElementById('checkout');
  if (!checkoutBtn) return;
  
  checkoutBtn.disabled = true;
  checkoutBtn.style.opacity = 0.5;
  checkoutBtn.style.cursor = "not-allowed";
  
  // Remove click listeners by replacing the element
  const newCheckoutBtn = checkoutBtn.cloneNode(true);
  checkoutBtn.parentNode.replaceChild(newCheckoutBtn, checkoutBtn);
}

// Cleanup function to detach listener when needed
function cleanupCheckoutListener() {
  if (checkoutListener) {
    checkoutListener();
    checkoutListener = null;
    console.log("🧹 Checkout listener cleaned up");
  }
}

// -------- Hide All Dropdowns Initially --------
document.addEventListener('DOMContentLoaded', function () {
  const allDropdowns = document.querySelectorAll('.dropdown-content2');
  allDropdowns.forEach(dropdown => {
    dropdown.style.display = 'none';
  });
});

// Clean up listener when navigating away from the page
window.addEventListener('beforeunload', cleanupCheckoutListener);

// Export session ID utility for other modules that might need it
window.getCurrentSessionId = function() {
  return localStorage.getItem('cartSessionId');
};