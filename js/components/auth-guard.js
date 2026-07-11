// auth-guard.js — Protección de rutas y carga del rol del usuario
// Importar DESPUÉS de firebase-init.js en cada página protegida.
// Redirige a index.html si no hay sesión activa.

window.appUser = null;
window.appRole = 'free';

function authGuard(onReady) {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Sin sesión → login
            window.location.href = '/pages/login.html';
            return;
        }

        window.appUser = user;

        // Cargar rol desde Firestore
        try {
            const userRef = db.collection('usuarios').doc(user.uid);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                window.appRole = userDoc.data().rol || 'free';
                if (userDoc.data().grupoId) {
                    sessionStorage.setItem('estudianteGrupo', userDoc.data().grupoId);
                }
            } else {
                // Primer ingreso: crear registro
                window.appRole = 'free';
                await userRef.set({
                    email: user.email,
                    nombre: user.displayName || '',
                    rol: 'free',
                    creadoEn: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (err) {
            console.error("Error cargando rol:", err);
            window.appRole = 'free';
        }

        sessionStorage.setItem('appRole', window.appRole);

        // Llamar al callback de la página con el usuario y rol listos
        if (typeof onReady === 'function') {
            onReady(user, window.appRole);
        }
    });
}
