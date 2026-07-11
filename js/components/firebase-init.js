// firebase-init.js — Inicialización compartida de Firebase
// Importar este archivo ANTES que cualquier otro script de la app

(function () {
    const firebaseConfig = {
        apiKey: "AIzaSyACS4UGiV7ceM26lQWp9QSadzjkNMxvYOw",
        authDomain: "evaluaseguro-31c51.firebaseapp.com",
        projectId: "evaluaseguro-31c51",
        storageBucket: "evaluaseguro-31c51.firebasestorage.app",
        messagingSenderId: "95349219387",
        appId: "1:95349219387:web:65bf5c691ebd916b49bc1e",
    };

    // Evitar doble inicialización si ya está inicializado
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    window.db   = firebase.firestore();
    window.auth = firebase.auth();

    console.log("✅ Firebase inicializado");
})();
