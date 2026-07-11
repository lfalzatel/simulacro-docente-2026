import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyACS4UGiV7ceM26lQWp9QSadzjkNMxvYOw",
  authDomain: "evaluaseguro-31c51.firebaseapp.com",
  projectId: "evaluaseguro-31c51",
  storageBucket: "evaluaseguro-31c51.firebasestorage.app",
  messagingSenderId: "95349219387",
  appId: "1:95349219387:web:65bf5c691ebd916b49bc1e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
