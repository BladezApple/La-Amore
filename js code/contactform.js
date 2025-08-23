// Initialize contact form when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeContactForm();
});

async function initializeContactForm() {
  const contactForm = document.getElementById('contactform');
  
  if (!contactForm) {
    console.warn('Contact form not found');
    return;
  }

  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const submitButton = this.querySelector('button[type="submit"]');
    
    // Get form values
    const firstName = formData.get('firstname')?.trim();
    const lastName = formData.get('lastname')?.trim();
    const email = formData.get('email')?.trim();
    const message = formData.get('message')?.trim();
    
    // Basic validation
    if (!firstName || !lastName || !email || !message) {
      alert('Please fill in all required fields.');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    // Show loading state
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Sending...';
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
      
      // Get session ID if available (from loader.js)
      const sessionId = window.getCurrentSessionId ? window.getCurrentSessionId() : 'unknown';
      
      // Add contact form data to Firebase collection
      const contactRef = collection(db, 'contact');
      await addDoc(contactRef, {
        firstName: firstName,
        lastName: lastName,
        fullName: `${firstName} ${lastName}`,
        email: email,
        message: message,
        timestamp: serverTimestamp(),
        sessionId: sessionId,
        source: 'contact_form',
        status: 'unread', // For admin management
        userAgent: navigator.userAgent,
        referrer: document.referrer || 'direct'
      });

      // Success feedback
      alert('Thank you for your message! 📧\nWe\'ll get back to you within 24 hours.');
      
      // Clear the form
      contactForm.reset();
      
      console.log('✅ Contact form submission successful:', { email, fullName: `${firstName} ${lastName}` });
      
    } catch (error) {
      console.error('❌ Contact form submission failed:', error);
      
      // User-friendly error messages
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Message could not be sent. Please try again later or contact us directly.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please try again in a few moments.';
      }
      
      alert(errorMessage);
      
    } finally {
      // Restore button state
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    }
  });

  console.log('📝 Contact form initialized with Firebase integration');
}