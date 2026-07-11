// auth-guard.js — Protección de rutas y carga del rol del usuario
// Importar DESPUÉS de firebase-init.js en cada página protegida.
// Redirige a index.html si no hay sesión activa.

window.appUser = null;
window.appRole = 'free';

let isFirstCall = true;

function authGuard(onReady) {
    // 1. Renderizado optimista (Evitar parpadeo blanco)
    const cachedUser = sessionStorage.getItem('cachedUser');
    const cachedRole = sessionStorage.getItem('appRole');
    
    if (cachedUser && cachedRole && typeof onReady === 'function') {
        try {
            const userObj = JSON.parse(cachedUser);
            window.appUser = userObj;
            window.appRole = cachedRole;
            onReady(userObj, cachedRole);
            isFirstCall = false; // Ya no bloqueará la UI
        } catch (e) {
            console.error("Cache inválido", e);
        }
    }

    // 2. Verificación real en background con Firebase
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            sessionStorage.removeItem('cachedUser');
            sessionStorage.removeItem('appRole');
            window.location.href = '/pages/login.html';
            return;
        }

        // Guardamos los datos básicos para la próxima carga rápida
        sessionStorage.setItem('cachedUser', JSON.stringify({ 
            uid: user.uid, 
            email: user.email, 
            displayName: user.displayName 
        }));
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
                // Actualizar foto silenciosamente si el usuario de Auth tiene foto pero no está en BD
                if (user.photoURL && userDoc.data().foto !== user.photoURL) {
                    userRef.update({ foto: user.photoURL }).catch(()=>console.log("No se pudo actualizar foto"));
                }
            } else {
                // Primer ingreso: crear registro
                window.appRole = 'free';
                await userRef.set({
                    email: user.email,
                    nombre: user.displayName || '',
                    rol: 'free',
                    foto: user.photoURL || null,
                    creadoEn: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (err) {
            console.error("Error cargando rol:", err);
            window.appRole = 'free';
        }

        sessionStorage.setItem('appRole', window.appRole);

        // Si es la primera vez que se resuelve (porque no había caché)
        if (isFirstCall && typeof onReady === 'function') {
            onReady(user, window.appRole);
        }
    });
}
