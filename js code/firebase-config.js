import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getFunctions, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

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
const functions = getFunctions(app);

export { app, db, functions };
