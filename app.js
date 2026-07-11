// Safe Initialization of Variables
let quizData = null;
let currentQuestionIndex = 0;
let score = 0;
let userProgress = {};
let totalTime = 0; // State for time tracking
let studyTimer = null; // Timer reference
let isProcessingAuth = false; // Flag to prevent loops
let lastAuthUserId = null; // Debounce for auth events

// Multi-Simulator System Variables
let userRole = 'free'; // Default role: 'admin', 'free', or 'premium'
let currentSimulacroId = null; // Currently selected simulacro UUID
let simulacrosCatalog = []; // List of available simulacros from database


// Initialize App
async function init() {
    try {
        console.log("Ã°ÂÂÂ Iniciando aplicaciÃÂ³n...");

        // Load quiz data FIRST
        if (typeof RAW_QUIZ_DATA !== 'undefined') {
            quizData = RAW_QUIZ_DATA.questions;
            document.getElementById('quiz-title-display').innerText = RAW_QUIZ_DATA.quizTitle || 'Simulador Docente';
            console.log(`â ${quizData.length} preguntas cargadas`);
        } else {
            console.error("â RAW_QUIZ_DATA no definido");
        }

        // Init Firebase Auth Listener
        if (typeof auth !== 'undefined') {
            console.log("â Firebase Auth inicializado");

            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    const email = user.email || '(sin sesiÃ³n)';
                    console.log(`ð Evento Auth: SIGNED_IN ${email}`);
                    
                    if (window.location.hash) {
                        window.history.replaceState(null, '', window.location.pathname);
                    }

                    if (lastAuthUserId === user.uid) {
                        console.log("ð Usuario ya inicializado, omitiendo recarga dashboard.");
                        return;
                    }
                    lastAuthUserId = user.uid;

                    console.log("â SesiÃ³n inicial:", user.email);
                    
                    // Normalize user object for backward compatibility in app.js
                    const sessionUser = { id: user.uid, email: user.email, ...user };

                    // Cargar o crear usuario en Firestore
                    if (window.db) {
                        try {
                            const userRef = window.db.collection('usuarios').doc(user.uid);
                            const userDoc = await userRef.get();
                            if (userDoc.exists) {
                                userRole = userDoc.data().rol || 'free';
                            if (userDoc.data().grupoId) {
                                localStorage.setItem('estudianteGrupo', userDoc.data().grupoId);
                            }
                            } else {
                                userRole = 'free';
                                await userRef.set({
                                    email: user.email,
                                    nombre: user.displayName || '',
                                    rol: userRole,
                                    creadoEn: firebase.firestore.FieldValue.serverTimestamp()
                                });
                                console.log("Usuario creado en Firestore");
                            }
                        } catch (err) {
                            console.error("Error al cargar rol desde Firestore:", err);
                        }
                    }
                    
                    await showDashboard(sessionUser);
                    renderBottomNav(userRole);
                    
                    // Temporarily disable these until Firestore migration is complete
                    await cargarProgreso(sessionUser); 
                    // await setupRealtimeSync(sessionUser); 
                } else {
                    console.log("â SesiÃ³n cerrada / No hay sesiÃ³n");
                    lastAuthUserId = null;
                    showLogin();
                    const bottomNav = document.getElementById('bottomNav');
                    if (bottomNav) bottomNav.classList.add('hidden');
                }
            });
        } else {
            console.warn("â ï¸ Firebase Auth no cargado. Usando modo local.");
            showLogin();
        }

    } catch (error) {
        console.error('Ã¢ÂÂ Error init:', error);
        showLogin();
    }
}

function showLogin() {
    console.log("Ã°ÂÂÂ± Mostrando Login");
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('header').classList.add('hidden');
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.add('hidden');
    document.getElementById('docs-view').classList.add('hidden');
    document.getElementById('profile-view').classList.add('hidden');
}

async function showDashboard(user) {
    console.log("Ã°ÂÂÂ Mostrando Dashboard para:", user.email);
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('header').classList.remove('hidden');
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.add('hidden');
    document.getElementById('docs-view').classList.add('hidden');
    document.getElementById('profile-view').classList.add('hidden');

    // Update User Info
    const displayName = user.displayName || user.email.split('@')[0];
    document.getElementById('userName').innerText = displayName;
    document.getElementById('userFirstName').innerText = displayName.split(' ')[0]; // Perfil cápsula
    document.getElementById('userEmail').innerText = user.email;

    // Avatar logic
    const avatarUrl = user.photoURL;
    if (avatarUrl) {
        document.getElementById('user-avatar').src = avatarUrl;
        document.getElementById('user-avatar').style.display = 'block';
        document.getElementById('user-initials').style.display = 'none';
    } else {
        const initials = displayName.substring(0, 2).toUpperCase();
        document.getElementById('user-initials').innerText = initials;
        document.getElementById('user-initials').style.display = 'block';
        document.getElementById('user-avatar').style.display = 'none';
    }

    // Load user role and render simulator selector
    userRole = await getUserRole(user);
    console.log(`Ã¢ÂÂ Rol asignado: ${userRole}`);

    // Show Admin Menu Item if applicable
    const adminBtn = document.getElementById('admin-menu-item');
    if (adminBtn) {
        adminBtn.style.display = userRole === 'admin' ? 'flex' : 'none';
    }

    await renderSimulacroCards();

    // Ensure selectors are populated and synced
    if (currentSimulacroId) {
        updateAllSimulatorSelectors();
    } else {
        // If no simulator selected yet, maybe default to first one? 
        // Or wait for user interaction. 
        // For dashboard stats, we usually default to Sim 1 or "General"
        updateAllSimulatorSelectors();
    }

    // NOTE: Dashboard stats will be updated by cargarProgreso() after data loads
    // Do NOT call updateDashboardStats() here - userProgress is still empty!

    // Update welcome message based on visit count
    updateWelcomeMessage();
}

// Dynamic welcome message for first-time vs returning users
async function updateWelcomeMessage() {
    const welcomeEl = document.getElementById('welcome-message');
    if (!welcomeEl) return;

    // Scope visit count to current user to prevent cross-user data issues
    const user = supabaseApp?.auth?.getUser ? (await supabaseApp.auth.getUser()).data.user : null;
    const userId = user?.id || 'guest';
    const storageKey = `visitCount_${userId}`;

    const visitCount = parseInt(localStorage.getItem(storageKey) || '0');
    const message = visitCount === 0 ? 'ÃÂ¡Bienvenido! Ã°ÂÂÂ' : 'ÃÂ¡Hola de nuevo! Ã°ÂÂÂ';
    welcomeEl.textContent = message;

    // Increment visit count
    localStorage.setItem(storageKey, (visitCount + 1).toString());
}

async function updateDashboardStats() {
    // Ã°ÂÂÂ¡Ã¯Â¸Â RECALCULATE SCORE from logical source of truth
    let calculatedScore = 0;
    // Filter out metadata keys like safeLastIndex and totalTime
    const answeredCount = Object.keys(userProgress).filter(k => k !== 'safeLastIndex' && k !== 'totalTime').length;

    // Iterate to count correct answers
    Object.values(userProgress).forEach(ans => {
        if (ans && ans.isCorrect) calculatedScore++;
    });

    // Sync global score just in case
    score = calculatedScore;

    const totalQuestions = quizData ? quizData.length : 140;
    const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

    // Update Dashboard Elements
    const scoreEl = document.getElementById('stat-score');
    if (scoreEl) scoreEl.innerText = score > 0 ? score : '-';

    const questionsEl = document.getElementById('stat-questions');
    if (questionsEl) questionsEl.innerText = answeredCount;

    const progressEl = document.getElementById('stat-progress');
    if (progressEl) progressEl.innerText = `${progressPercent}%`;

    // Update Time Stat
    const timeEl = document.getElementById('stat-time');
    if (timeEl) {
        let seconds = userProgress.totalTime || 0;
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        timeEl.innerText = `${h}:${m}:${s}`;
    }

    // Actualizar texto del botÃÂ³n
    const resumeText = document.getElementById('resumeText');
    if (resumeText) {
        if (answeredCount > 0 && answeredCount < totalQuestions) {
            resumeText.innerText = `Continuar Simulacro (${answeredCount}/${totalQuestions})`;
        } else if (answeredCount >= totalQuestions) {
            resumeText.innerText = 'Reiniciar Simulacro';
        } else {
            resumeText.innerText = 'Comenzar Simulacro';
        }
    }

    // Also update Profile Score if it exists
    const profileScoreEl = document.getElementById('profile-total-score');
    if (profileScoreEl) {
        profileScoreEl.innerText = `${score} / ${answeredCount}`;
    }

    // Render Category Stats
    renderCategoryStats();

    // UPDATE SIMULATOR LABEL - REMOVED (Replaced by Selectors)
    // The selectors are updated via updateAllSimulatorSelectors() called in startSimulacro/init
    // But we should double check sync here just in case stats update came from elsewhere
    updateAllSimulatorSelectors();
}

// ==================== ADMIN PANEL LOGIC ====================
let allUsersCache = []; // Local cache for real-time filtering

/**
 * Real-time filter for the admin user list
 */
function handleAdminSearch(query) {
    const listContainer = document.getElementById('admin-user-list');
    if (!listContainer || !allUsersCache) return;

    if (!query) {
        renderUserList(allUsersCache);
        return;
    }

    const q = query.toLowerCase();
    const filtered = allUsersCache.filter(u =>
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q))
    );

    renderUserList(filtered);
}

/**
 * Enhanced user card rendering for the admin list
 */
function renderUserList(users) {
    const listContainer = document.getElementById('admin-user-list');
    if (!listContainer) return;

    if (!users || users.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No se encontraron usuarios.</div>';
        return;
    }

    listContainer.innerHTML = users.map(user => {
        // Fallback for names: Prefer real name, then email prefix, then 'Usuario'
        const displayName = user.full_name || (user.email ? user.email.split('@')[0] : 'Usuario');

        // Fallback for avatar: Prefer real photo, then app logo
        const avatarImg = user.avatar_url || 'pwa_icon_192.svg';

        return `
        <div class="user-list-card ${user.role === 'premium' ? 'premium-card' : ''}">
            <div class="user-card-header">
                <div class="user-avatar-container">
                    <img src="${avatarImg}" class="admin-user-photo" alt="Foto" onerror="this.onerror=null; this.src='pwa_icon_192.svg';">
                </div>
                <div class="user-main-info">
                    <div class="user-name-row">
                        <span class="admin-user-name">${displayName}</span>
                        <span class="role-badge ${user.role}">${user.role.toUpperCase()}</span>
                    </div>
                    <div class="admin-user-email">${user.email || 'Sin correo'}</div>
                </div>
            </div>

            <div class="user-card-details">
                <div class="detail-item">
                    <span class="detail-icon">Ã°ÂÂÂ</span>
                    <span class="detail-text">${user.phone || '<span class="empty-val">Sin telÃÂ©fono</span>'}</span>
                </div>
                <div class="detail-item" title="Nota de vencimiento o plan">
                    <span class="detail-icon">Ã°ÂÂÂ</span>
                    <span class="detail-text">${user.notes || '<span class="empty-val">Pagar plan</span>'}</span>
                </div>
            </div>

            <div class="user-card-actions">
                <select class="role-select-premium" onchange="updateUserRole('${user.user_id}', this.value)">
                    <option value="" disabled selected>Cambiar Rol...</option>
                    <option value="free" ${user.role === 'free' ? 'disabled' : ''}>Ã°ÂÂÂ Free</option>
                    <option value="premium" ${user.role === 'premium' ? 'disabled' : ''}>Ã¢Â­Â Premium</option>
                    <option value="admin" ${user.role === 'admin' ? 'disabled' : ''}>Ã°ÂÂÂ¡Ã¯Â¸Â Admin</option>
                </select>
                <div class="action-buttons-row">
                    <button onclick="editUserMetadata('${user.user_id}')" class="btn-edit-user" title="Editar datos">
                        Ã¢ÂÂÃ¯Â¸Â Editar
                    </button>
                    <button onclick="deleteUser('${user.user_id}', '${user.email}')" class="btn-delete-user" title="Eliminar">
                        Ã°ÂÂÂÃ¯Â¸Â
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

async function loadAllUsers() {
    const listContainer = document.getElementById('admin-user-list');
    if (!listContainer) return;
    try {
        listContainer.innerHTML = '<div class="loader-container"><div class="dot-loader"></div></div>';
        const snapshot = await window.db.collection('usuarios').orderBy('creadoEn', 'desc').get();
        const data = [];
        snapshot.forEach(doc => data.push({ user_id: doc.id, ...doc.data(), role: doc.data().rol }));
        allUsersCache = data;
        renderUserList(data);
    } catch (err) {
        console.error("Error cargando usuarios:", err);
        listContainer.innerHTML = `<div class="error-msg">Error cargando usuarios: ${err.message}</div>`;
    }
}

/**
 * Edit phone and notes (expiration) via SweetAlert2
 */
async function editUserMetadata(userId) {
    const user = allUsersCache.find(u => u.user_id === userId);
    if (!user) return;

    const { value: formValues } = await Swal.fire({
        title: 'Ã¢ÂÂÃ¯Â¸Â Editar Usuario',
        html: `
            <div style="text-align: left; margin-bottom: 0.5rem; font-weight: bold;">TelÃÂ©fono:</div>
            <input id="swal-phone" class="swal2-input" placeholder="Ej: +57 321..." value="${user.phone || ''}">
            <div style="text-align: left; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: bold;">Plan / Vencimiento / Notas:</div>
            <input id="swal-notes" class="swal2-input" placeholder="Ej: Vence 20-Mar-2024" value="${user.notes || ''}">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar cambios',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            return {
                phone: document.getElementById('swal-phone').value.trim(),
                notes: document.getElementById('swal-notes').value.trim()
            }
        }
    });

    if (formValues) {
        saveUserMetadata(userId, formValues.phone, formValues.notes);
    }
}

async function saveUserMetadata(userId, phone, notes) {
    Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        await window.db.collection('usuarios').doc(userId).update({ phone, notes, updated_at: firebase.firestore.FieldValue.serverTimestamp() });
        const index = allUsersCache.findIndex(u => u.user_id === userId);
        if (index > -1) {
            allUsersCache[index].phone = phone;
            allUsersCache[index].notes = notes;
        }
        Swal.fire('Éxito', 'Datos guardados correctamente', 'success');
        closeUserModal();
        renderUserList(allUsersCache);
    } catch (err) {
        console.error("Error guardando metadatos:", err);
        Swal.fire('Error', err.message, 'error');
    }
}

async function deleteUser(targetUserId, email) {
    const result = await Swal.fire({
        title: 'ÃÂ¿EstÃÂ¡s seguro?',
        text: `EstÃÂ¡s a punto de eliminar el acceso de ${email}. Esta acciÃÂ³n no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'SÃÂ­, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'Eliminando...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const { error } = await supabaseApp
            .from('user_roles')
            .delete()
            .eq('user_id', targetUserId);

        if (error) throw error;

        Swal.fire({
            title: 'ÃÂ¡Eliminado!',
            text: 'El usuario ha sido removido con ÃÂ©xito.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });

        // Hide search result if it was this user
        const resultsContainer = document.getElementById('admin-results-container');
        if (!resultsContainer.classList.contains('hidden')) {
            // Check if search input email matches deleted email
            const searchEmail = document.getElementById('admin-search-input').value.trim();
            if (searchEmail === email) {
                resultsContainer.classList.add('hidden');
            }
        }

        // Refresh list
        loadAllUsers();

    } catch (err) {
        console.error("Error deleting user:", err);
        Swal.fire('Error', 'No se pudo eliminar el usuario. ' + err.message, 'error');
    }
}

async function updateUserRole(targetUserId, newRole) {
    try {
        const { error } = await supabaseApp
            .from('user_roles')
            .update({ role: newRole, updated_at: new Date() })
            .eq('user_id', targetUserId);

        if (error) throw error;

        Swal.fire({
            title: 'ÃÂ¡Rol Actualizado!',
            text: `El usuario ahora es ${newRole.toUpperCase()}.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });

        // Refresh list
        loadAllUsers();

    } catch (err) {
        console.error("Error updating role:", err);
        Swal.fire('Error', 'No se pudo actualizar el rol. Verifica permisos.', 'error');
    }
}

// ==================== PROGRESS RESET LOGIC ====================

async function resetSimulacroProgress() {
    const result = await Swal.fire({
        title: 'ÃÂ¿EstÃÂ¡s seguro?',
        text: "ÃÂ¡Esto borrarÃÂ¡ TODO tu progreso en este simulacro! No podrÃÂ¡s deshacerlo.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'SÃÂ­, borrar todo',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'Restableciendo...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const user = supabaseApp?.auth?.getUser ? (await supabaseApp.auth.getUser()).data.user : null;

        // 1. Clear Cloud Data
        if (user && currentSimulacroId) {
            console.log("Ã°ÂÂÂÃ¯Â¸Â Borrando progreso en nube para:", currentSimulacroId);
            const { error } = await supabaseApp
                .from('simulacro_progress_v2')
                .delete()
                .eq('user_id', user.id)
                .eq('simulacro_id', currentSimulacroId);

            if (error) console.error("Error deleting cloud progress:", error);
        }

        // 2. Clear Local Data
        // CRITICAL: Use the exact same key generation logic as getStorageKey()
        const storageKey = getStorageKey();
        console.log("Ã°ÂÂÂÃ¯Â¸Â Borrando local:", storageKey);
        localStorage.removeItem(storageKey);

        // Also clear potential legacy/migrated keys just in case
        if (user) {
            localStorage.removeItem(`progreso_v2_${user.id}_${currentSimulacroId}`);
            // If Sim 1, also clear non-ID key
            if (!currentSimulacroId || currentSimulacroId === 'd15c2a06-b97f-4349-817b-14e07377a0e6') {
                localStorage.removeItem(`progresoUsuario_${user.id}`);
            }
        }

        // 3. Reset Global Variables
        userProgress = {};
        score = 0;
        currentQuestionIndex = 0;

        // 4. Reload
        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (err) {
        console.error("Error resetting progress:", err);
        Swal.fire('Error', 'FallÃÂ³ el restablecimiento. Intenta recargar la pÃÂ¡gina.', 'error');
    }
}

async function forceRefresh() {
    Swal.fire({
        title: 'Actualizando...',
        text: 'Limpiando cachÃÂ© y recargando la aplicaciÃÂ³n',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // 1. Unregister all Service Workers & Clear all Caches with a Timeout
        const cleanupPromise = (async () => {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (let name of cacheNames) {
                    await caches.delete(name);
                }
            }
        })();

        // Wait for cleanup but force reload after 2000ms if it hangs
        await Promise.race([
            cleanupPromise,
            new Promise(r => setTimeout(r, 2000))
        ]);

        // 3. Clear some specific local storage if needed (optional)
        // localStorage.removeItem('some_cache_key');

        // 4. Hard reload with Cache-Busting
        const currentUrl = window.location.href.split('?')[0];
        window.location.href = currentUrl + '?update=' + new Date().getTime();
    } catch (err) {
        console.error("Error in force refresh:", err);
        const currentUrl = window.location.href.split('?')[0];
        window.location.href = currentUrl + '?error_update=' + new Date().getTime();
    }
}

// Bind functions to window
window.handleAdminSearch = handleAdminSearch;
window.editUserMetadata = editUserMetadata;
window.saveUserMetadata = saveUserMetadata;
window.updateUserRole = updateUserRole;
window.resetSimulacroProgress = resetSimulacroProgress;
window.loadAllUsers = loadAllUsers;
window.forceRefresh = forceRefresh;
window.deleteUser = deleteUser;

async function getUserRole(user) {
    if (!user) return 'free';
    if (user.email === 'lfalzatel@gmail.com') {
        console.log("Super Admin detectado");
        try {
            await window.db.collection('usuarios').doc(user.id).set({ rol: 'admin', email: user.email }, { merge: true });
        } catch(e) {}
        return 'admin';
    }
    try {
        const doc = await window.db.collection('usuarios').doc(user.id).get();
        if (doc.exists) return doc.data().rol || 'free';
    } catch (err) {
        console.error("Error getUserRole:", err);
    }
    return 'free';
}

async function loadSimulacros() {
    try {
        let data = null;
        if (supabaseApp) {
            // Timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout loading simulacros')), 3000)
            );

            // Fetch promise
            const fetchPromise = supabaseApp
                .from('simulacros')
                .select('*')
                .eq('activo', true)
                .order('numero', { ascending: true });

            const res = await Promise.race([fetchPromise, timeoutPromise]);

            data = res.data;
            if (res.error) console.error('Ã¢ÂÂ Ã¯Â¸Â Supabase error loadSimulacros:', res.error);
        }

        // Fallback if data is missing or empty (Offline support)
        if (!data || data.length === 0) {
            console.warn("Ã¢ÂÂ Ã¯Â¸Â Usando catÃÂ¡logo local de respaldo (Offline/Error)");
            data = [
                {
                    id: 'fixed_sim_1', // Dummy ID for fallback
                    numero: 1,
                    titulo: 'Simulacro General',
                    descripcion: 'EvaluaciÃÂ³n completa de competencias para el concurso docente.',
                    total_preguntas: 360,
                    es_premium: false,
                    activo: true
                },
                {
                    id: 'fixed_sim_2',
                    numero: 2,
                    titulo: 'Simulacro Premium',
                    descripcion: 'Preguntas avanzadas y casos de estudio especÃÂ­ficos.',
                    total_preguntas: 35, // Updated to match actual available
                    es_premium: true,
                    activo: true
                },
                {
                    id: 'fixed_sim_3',
                    numero: 3,
                    titulo: 'Simulacro Experto',
                    descripcion: 'Preguntas de alta complejidad y anÃÂ¡lisis curricular profundo.',
                    total_preguntas: 60,
                    es_premium: true,
                    activo: true
                }
            ];
        }

        simulacrosCatalog = data || [];
        console.log('Ã¢ÂÂ Simulacros cargados:', simulacrosCatalog.length);
        return simulacrosCatalog;
    } catch (err) {
        console.error('Ã¢ÂÂ Error loading simulacros:', err);
        return [];
    } finally {
        // UPDATE QUESTION COUNTS FROM REAL DATA
        // This fixes the issue where DB/Fallback says 35 but we actually have 95+
        if (typeof RAW_QUIZ_DATA !== 'undefined' && RAW_QUIZ_DATA.questions) {
            const sim1 = simulacrosCatalog.find(s => s.numero === 1);
            if (sim1) {
                sim1.total_preguntas = RAW_QUIZ_DATA.questions.length;
                console.log(`Ã¢ÂÂ Sync Sim 1 count: ${sim1.total_preguntas}`);
            }
        }
        if (typeof RAW_QUIZ_DATA_2 !== 'undefined' && RAW_QUIZ_DATA_2.questions) {
            const sim2 = simulacrosCatalog.find(s => s.numero === 2);
            if (sim2) {
                sim2.total_preguntas = RAW_QUIZ_DATA_2.questions.length;
                console.log(`Ã¢ÂÂ Sync Sim 2 count: ${sim2.total_preguntas}`);
            }
        }
        if (typeof RAW_QUIZ_DATA_3 !== 'undefined' && RAW_QUIZ_DATA_3.questions) {
            const sim3 = simulacrosCatalog.find(s => s.numero === 3);
            if (sim3) {
                sim3.total_preguntas = RAW_QUIZ_DATA_3.questions.length;
                console.log(`Ã¢ÂÂ Sync Sim 3 count: ${sim3.total_preguntas}`);
            }
        }

        // Always try to sync selectors after loading catalog
        updateAllSimulatorSelectors();
    }
}

function canAccessSimulacro(simulacro) {
    if (userRole === 'admin') return true; // Admin access all

    // RESTORED: Simulacro 1 (Free/Trial) is accessible to everyone
    if (!simulacro.es_premium) return true;

    return false; // Lock everything else (Sim 2+)
}

async function renderSimulacroCards() {
    const container = document.getElementById('simulacro-selector');
    if (!container) return;

    if (simulacrosCatalog.length === 0) {
        await loadSimulacros();
    }

    container.innerHTML = '';

    simulacrosCatalog.forEach(sim => {
        const canAccess = canAccessSimulacro(sim);
        const card = document.createElement('div');
        card.className = 'simulacro-card';
        if (!canAccess) {
            card.classList.add('locked');
        }

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">
                    ${sim.titulo}
                </h3>
                ${!canAccess ? '<div style="font-size: 1.5rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">Ã°ÂÂÂ</div>' : ''}
                ${sim.es_premium ? '<span style="background: linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%); color: #78350F; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">PREMIUM</span>' : '<span style="background: var(--success-bg); color: var(--success-text); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">GRATIS</span>'}
            </div>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5;">
                ${sim.descripcion || 'PrepÃÂ¡rate con preguntas de alta calidad'}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.85rem; color: var(--text-secondary);">
                    Ã°ÂÂÂ ${sim.total_preguntas} preguntas
                </span>
                <button class="start-btn" style="padding: 0.5rem 1.5rem; font-size: 0.9rem;" ${!canAccess ? 'disabled' : ''}>
                    ${canAccess ? 'Iniciar' : 'Bloqueado'}
                </button>
            </div>
        `;

        if (canAccess) {
            card.addEventListener('click', () => startSimulacro(sim));
        } else {
            card.addEventListener('click', () => showUpgradeModal());
        }

        container.appendChild(card);
    });
}

// Helper to load simulator context WITHOUT starting quiz
async function loadSimulacroContext(simulacro) {
    console.log('Ã¯Â¿Â½ Cargando contexto para:', simulacro.titulo);
    currentSimulacroId = simulacro.id;
    window.currentSimulacroNum = simulacro.numero; // Track number for sync logic

    // Cargar datos del quiz correspondiente
    if (simulacro.numero === 1) {
        // Simulacro 1: usa quizData original (360 preguntas)
        window.currentQuizData = window.RAW_QUIZ_DATA;
    } else if (simulacro.numero === 2) {
        // Simulacro 2: usa quizData2 (premium - 95 preguntas)
        if (!window.RAW_QUIZ_DATA_2) {
            console.error('RAW_QUIZ_DATA_2 no estÃÂ¡ definido');
            alert('Error: No se pudo cargar el simulacro 2. Por favor, recarga la pÃÂ¡gina.');
            return false;
        }
        window.currentQuizData = window.RAW_QUIZ_DATA_2;
    } else if (simulacro.numero === 3) {
        // Simulacro 3: usa quizData3 (experto - 60 preguntas)
        if (!window.RAW_QUIZ_DATA_3) {
            console.error('RAW_QUIZ_DATA_3 no estÃÂ¡ definido');
            alert('Error: No se pudo cargar el simulacro 3. Por favor, recarga la pÃÂ¡gina.');
            return false;
        }
        window.currentQuizData = window.RAW_QUIZ_DATA_3;
    } else {
        alert(`Simulacro ${simulacro.numero} prÃÂ³ximamente disponible.`);
        return false;
    }

    // Validation
    if (!window.currentQuizData || !window.currentQuizData.questions) {
        console.error('Ã¢ÂÂ Error crÃÂ­tico: Datos del quiz no encontrados', window.currentQuizData);
        alert('Error crÃÂ­tico: No se pudieron cargar los datos del simulacro. Por favor, intenta de nuevo o recarga la pÃÂ¡gina.');
        return false;
    }

    console.log('Ã¢ÂÂ Quiz data cargado:', window.currentQuizData.questions.length, 'preguntas');

    // Reset global variables for new context
    quizData = JSON.parse(JSON.stringify(window.currentQuizData.questions)); // Deep clone to avoid mutating raw data

    // Randomize Answer Options
    quizData.forEach(q => {
        if (q.answerOptions) {
            // Add originalIndex to maintain compatibility with saved progress
            q.answerOptions = q.answerOptions.map((opt, idx) => ({
                ...opt,
                originalIndex: idx
            }));
            // Shuffle
            shuffleArray(q.answerOptions);
        }
    });

    score = 0;
    currentQuestionIndex = 0;

    // FORCE RELOAD DATA (Fix context bleeding)
    console.log(`Ã°ÂÂÂ Cambio de contexto: Cargando datos frescos para Simulacro ${simulacro.numero}...`);
    userProgress = {}; // CRITICAL: Clear memory first

    // Pass current user to ensure we look up the right cloud record
    const user = supabaseApp?.auth?.getUser ? (await supabaseApp.auth.getUser()).data.user : null;
    await cargarProgreso(user);

    return true;
}

async function startSimulacro(simulacro) {
    const loaded = await loadSimulacroContext(simulacro);
    if (!loaded) return;

    // console.log('Ã°ÂÂÂ Iniciando simulacro:', simulacro.titulo); // Already logged in loadSimulacroContext


    // Add version to menu
    const menuFooter = document.querySelector('.profile-menu .menu-section-label').parentElement;
    const versionDiv = document.createElement('div');
    versionDiv.style.cssText = 'font-size: 0.7rem; color: #666; text-align: center; padding: 10px;';
    versionDiv.innerHTML = 'v70 (Stable Deployment)';
    menuFooter.appendChild(versionDiv);

    // Iniciar quiz con datos cargados
    startQuiz();
}

function showUpgradeModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    modal.innerHTML = `
        <div style="
            background: var(--surface);
            border-radius: 24px;
            padding: 2rem;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        ">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">Ã°ÂÂÂ</div>
                <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
                    Contenido Premium
                </h2>
                <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6;">
                    Este simulacro estÃÂ¡ disponible solo para usuarios premium. ContÃÂ¡ctanos para obtener acceso completo a todos los simulacros.
                </p>
            </div>
            
            <div style="background: var(--bg-body-start); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
                <h3 style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.75rem;">
                    ÃÂ¿QuÃÂ© incluye Premium?
                </h3>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="padding: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">
                        Ã¢ÂÂ Acceso a todos los simulacros
                    </li>
                    <li style="padding: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">
                        Ã¢ÂÂ 500+ preguntas de alta dificultad
                    </li>
                    <li style="padding: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">
                        Ã¢ÂÂ Reportes detallados por categorÃÂ­a
                    </li>
                    <li style="padding: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">
                        Ã¢ÂÂ Actualizaciones mensuales
                    </li>
                </ul>
            </div>
            
            <div style="display: flex; gap: 1rem;">
                <button onclick="this.closest('div[style*=fixed]').remove()" style="
                    flex: 1;
                    padding: 0.75rem 1.5rem;
                    border: 2px solid var(--text-secondary);
                    background: transparent;
                    color: var(--text-primary);
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                ">Cerrar</button>
                <button onclick="window.open('https://wa.me/573174856070?text=Hola!%20Estoy%20interesado%20en%20acceso%20premium%20al%20Simulacro%20Docente', '_blank')" style="
                    flex: 1;
                    padding: 0.75rem 1.5rem;
                    background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                ">Contactar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}


function showReports() {
    switchView('reports');
    renderReportsView();
    // Close profile menu
    const profileMenu = document.getElementById('profileMenu');
    if (profileMenu) profileMenu.classList.remove('active');
}

function switchView(viewId) {
    console.log("Switching view to:", viewId);
    if (!auth.currentUser && viewId !== 'login') {
        showLogin();
        return;
    }

    // Ocultar todas las vistas principales
    document.querySelectorAll('.container > div, .container > header').forEach(el => {
        if (el.id !== 'bottomNav' && el.id !== 'installPrompt' && el.id !== 'toast-container' && !el.classList.contains('glass-modal')) {
            el.classList.add('hidden');
        }
    });

    if (viewId === 'login') {
        document.getElementById('loginPage').classList.remove('hidden');
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) bottomNav.classList.add('hidden');
        return;
    }

    // Mostrar header
    const header = document.getElementById('header');
    if (header) header.classList.remove('hidden');

    // Manejar el botón de regresar del header
    const backBtn = document.getElementById('header-back-btn');
    if (backBtn) {
        backBtn.style.display = (viewId === 'dashboard') ? 'none' : 'block';
    }

    // Mostrar vista objetivo
    let targetViewId = viewId;
    if (viewId === 'admin') {
        targetViewId = 'admin-view';
    }
    const targetView = document.getElementById(targetViewId);
    if (targetView) targetView.classList.remove('hidden');

    // Actualizar nav inferior
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === viewId) btn.classList.add('active');
    });

    // Lógicas específicas
    if (viewId === 'profesor-examenes') {
        const estContainer = document.getElementById('estudiante-mis-examenes-container');
        const docContainer = document.getElementById('docente-mis-examenes-container');
        
        if (userRole === 'admin' || userRole === 'profesor') {
            if (docContainer) docContainer.style.display = 'block';
            if (estContainer) estContainer.style.display = 'none';
            loadProfesorExamenes();
        } else {
            if (docContainer) docContainer.style.display = 'none';
            if (estContainer) estContainer.style.display = 'block';
            renderEstudianteExamenes();
        }
    } else if (viewId === 'dashboard') {
        renderSimulacroCards();
    } else if (viewId === 'admin') {
        loadAllUsers();
    }
}

function renderActivityCalendar() {
    const calendarEl = document.getElementById('activity-calendar');
    if (!calendarEl) return;
    calendarEl.innerHTML = '';

    // Process Data
    const activityMap = {};
    Object.values(userProgress).forEach(entry => {
        // Handle both new object format and old format (just in case)
        if (entry && typeof entry === 'object' && entry.timestamp) {
            const date = entry.timestamp.split('T')[0];
            activityMap[date] = (activityMap[date] || 0) + 1;
        }
    });

    // Generate last 35 days (5 weeks)
    const today = new Date();
    // Align end date to today

    for (let i = 34; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = activityMap[dateStr] || 0;

        let level = 0;
        if (count > 0) level = 1;
        if (count >= 5) level = 2;
        if (count >= 10) level = 3;
        if (count >= 20) level = 4;

        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day level-${level}`;

        // Show Day and Count
        const dayNum = d.getDate();
        const monthShort = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');

        dayEl.innerHTML = `
            <div class="cal-date">${dayNum} <small>${monthShort}</small></div>
            <div class="cal-count">${count > 0 ? count : '-'}</div>
        `;

        dayEl.title = `${d.toLocaleDateString()} - ${count} respuestas`;
        calendarEl.appendChild(dayEl);
    }
}

// Bind to window
window.startQuiz = startQuiz;
window.switchView = switchView;
window.logout = logout;
window.toggleHint = toggleHint;
window.nextQuestion = nextQuestion;
window.prevQuestion = prevQuestion; // Nueva funciÃÂ³n
window.restartQuiz = restartQuiz;

function startQuiz() {
    if (!quizData) {
        alert("Cargando datos del cuestionario...");
        return;
    }

    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('quiz-view').classList.remove('hidden');
    document.getElementById('header').classList.remove('hidden');

    // SAFETY UNLOCK: Ensure options are clickable
    document.getElementById('options').style.pointerEvents = 'auto';

    if (userProgress && typeof userProgress.safeLastIndex !== 'undefined' && userProgress.safeLastIndex >= 0) {
        const lastIndex = userProgress.safeLastIndex;
        if (lastIndex >= quizData.length - 1) {
            if (confirm('ÃÂ¿Deseas reiniciar el simulacro desde el inicio?')) {
                restartQuiz();
                return;
            }
        }
        console.log("Ã¢ÂÂ Continuando desde pregunta:", lastIndex + 1);
        currentQuestionIndex = lastIndex;
    } else {
        console.log("Ã¢ÂÂ Iniciando nuevo simulacro");
        currentQuestionIndex = 0;
    }

    updateUI();
    startTimer(); // Ensure timer starts
}

function startTimer() {
    stopTimer(); // Clear existing
    studyTimer = setInterval(() => {
        if (!userProgress.totalTime) userProgress.totalTime = 0;
        userProgress.totalTime++;

        // Save every 30 seconds to cloud/local to prevent data loss
        if (userProgress.totalTime % 30 === 0) {
            console.log("Ã¢ÂÂ±Ã¯Â¸Â Auto-guardando tiempo...");
            guardarProgresoCompleto(true); // true = silent/background save
        }
    }, 1000);
    console.log("Ã¢ÂÂ±Ã¯Â¸Â Timer iniciado");
}

function stopTimer() {
    if (studyTimer) {
        clearInterval(studyTimer);
        studyTimer = null;
        console.log("Ã¢ÂÂ±Ã¯Â¸Â Timer detenido. Tiempo total:", userProgress.totalTime);
        // Save time when stopping (changing view)
        guardarProgresoCompleto();
    }
}

// Save on close
window.addEventListener('beforeunload', () => {
    if (studyTimer) {
        guardarProgresoCompleto();
    }
});

function restartQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    userProgress = {};
    localStorage.removeItem('progresoUsuario');

    if (supabaseApp) {
        guardarProgresoCompleto();
    }

    startQuiz();
}

function selectOption(el, isCorrect, rationale, allOptions, optionIndex) {
    // Ã°ÂÂÂ GUARD: Prevent re-answering if already answered
    if (userProgress[currentQuestionIndex] !== undefined) return;

    if (document.getElementById('next-btn').style.display === 'block') return;

    // Bloquear todas las opciones
    const options = document.querySelectorAll('.option');
    options.forEach(opt => {
        opt.style.cursor = 'default';
        opt.onclick = null;
    });
    // Color Mapping (Unified for Sim 1 & 2)
    const categoryColors = {
        // Core Pedagogical & Evaluation
        "EvaluaciÃÂ³n y RetroalimentaciÃÂ³n": "var(--accent-color)",
        "Estrategias PedagÃÂ³gicas": "var(--secondary-color)",
        "PlanificaciÃÂ³n Curricular": "#16a085", // Teal

        // Inclusion & Values
        "InclusiÃÂ³n y Diversidad": "var(--success-color)",
        "Convivencia y Valores": "#e67e22", // Orange

        // Legal & Management
        "Marco Legal y Normativo": "var(--warning-color)",
        "GestiÃÂ³n Institucional": "#2c3e50", // Dark Blue

        // Skills & Cognitive
        "Competencias EspecÃÂ­ficas": "#9b59b6", // Purple
        "Desarrollo Cognitivo": "#2980b9", // Blue
        "Razonamiento LÃÂ³gico": "#8e44ad", // Deep Purple

        "General": "var(--text-secondary)"
    };

    const rationaleBox = document.getElementById('rationale-box');
    rationaleBox.style.display = 'block';
    rationaleBox.innerText = rationale;

    // Visual feedback
    if (isCorrect) {
        el.classList.add('correct');
        score++;
    } else {
        el.classList.add('wrong');
        const correctOpt = allOptions.find(o => o.isCorrect);
        const correctIndex = allOptions.indexOf(correctOpt);
        if (options[correctIndex]) {
            options[correctIndex].classList.add('correct');
        }
    }

    // Guardar respuesta con ÃÂ­ndice original y timestamp
    guardarRespuesta(currentQuestionIndex, isCorrect, optionIndex);

    const nextBtn = document.getElementById('next-btn');
    nextBtn.style.display = 'block';

    // AUTO-SCROLL
    setTimeout(() => {
        nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function updateUI() {
    if (!quizData || currentQuestionIndex >= quizData.length) {
        showResults();
        return;
    }

    const q = quizData[currentQuestionIndex];
    const qText = document.getElementById('q-text');
    const optionsContainer = document.getElementById('options');
    const progressBar = document.getElementById('progress-bar');
    const questionCount = document.getElementById('question-count');
    const rationaleBox = document.getElementById('rationale-box');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const hintText = document.getElementById('hint-text');
    const hintTrigger = document.getElementById('hint-trigger');

    // Reset default state
    rationaleBox.style.display = 'none';
    nextBtn.style.display = 'none';
    prevBtn.style.display = currentQuestionIndex > 0 ? 'block' : 'none';

    hintText.style.display = 'none';
    hintTrigger.style.display = q.hint ? 'block' : 'none';
    hintText.innerText = q.hint || '';

    qText.innerText = q.question;
    questionCount.innerText = `Pregunta ${currentQuestionIndex + 1} de ${quizData.length}`;

    const pct = ((currentQuestionIndex + 1) / quizData.length) * 100;
    progressBar.style.width = `${pct}%`;

    // Check if check has been answered previously
    const savedAnswer = userProgress[currentQuestionIndex];
    const isAnswered = savedAnswer !== undefined;

    optionsContainer.innerHTML = '';
    q.answerOptions.forEach((opt) => {
        const optDiv = document.createElement('div');
        optDiv.className = 'option';
        optDiv.innerText = opt.text;

        // If answered, apply styles immediately
        if (isAnswered) {
            optDiv.style.cursor = 'default';
            // Re-apply visual state using originalIndex
            if (savedAnswer.selectedOptionIndex === opt.originalIndex) {
                optDiv.classList.add(savedAnswer.isCorrect ? 'correct' : 'wrong');
            }
            if (!savedAnswer.isCorrect && opt.isCorrect) {
                optDiv.classList.add('correct');
            }
        } else {
            // Normal interaction - pass originalIndex
            optDiv.onclick = () => selectOption(optDiv, opt.isCorrect, opt.rationale, q.answerOptions, opt.originalIndex);
        }

        optionsContainer.appendChild(optDiv);
    });

    // Handle rationale and next button if already answered
    if (isAnswered) {
        const selectedOpt = q.answerOptions.find(opt => opt.originalIndex === savedAnswer.selectedOptionIndex);
        if (selectedOpt) {
            rationaleBox.style.display = 'block';
            rationaleBox.innerText = selectedOpt.rationale || "ExplicaciÃÂ³n no disponible.";
        }
        nextBtn.style.display = 'block';
        hintTrigger.style.display = 'none'; // Hide hint if answered
    }
}

/**
 * Fisher-Yates Shuffle Algorithm
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Navigation Functions
function nextQuestion() {
    if (currentQuestionIndex < quizData.length - 1) {
        currentQuestionIndex++;
        updateUI();
        window.scrollTo(0, 0); // Scroll to top
    } else {
        showResults();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        updateUI();
        window.scrollTo(0, 0); // Scroll to top
    }
}

function toggleHint() {
    const hintText = document.getElementById('hint-text');
    if (hintText.style.display === 'none') {
        hintText.style.display = 'block';
    } else {
        hintText.style.display = 'none';
    }
}

async function guardarRespuesta(preguntaIdx, esCorrecta, opcionIdx) {
    // Save detailed object
    userProgress[preguntaIdx] = {
        isCorrect: esCorrecta,
        selectedOptionIndex: opcionIdx,
        timestamp: new Date().toISOString()
    };
    userProgress.safeLastIndex = preguntaIdx;

    // Update Local
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify({
        lastIndex: preguntaIdx,
        score: score,
        answers: userProgress,
        timestamp: new Date().toISOString()
    }));

    // Update UI Status
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
        statusEl.innerHTML = "Ã°ÂÂÂ¾ Guardando...";
        statusEl.classList.add('visible');
    }

    console.log(`Ã°ÂÂÂ¾ Progreso guardado localmente (${key}): Pregunta ${preguntaIdx + 1}, Score: ${score}`);

    // Flag to track if we are already syncing
    let isSyncing = false;

    // CLOUD SYNC: Only for main simulacro for now
    // Allow logic if no specific ID OR if it is explicitly Sim 1
    const isDefaultSim = !currentSimulacroId || (window.currentSimulacroNum === 1);

    if (supabaseApp && isDefaultSim) {
        if (statusEl) {
            statusEl.innerHTML = "Ã¢ÂÂÃ¯Â¸Â Sincronizando...";
            statusEl.classList.add('visible');
        }

        // Prevent concurrent syncs for the same question index if needed, 
        // but here we just want to ensure UI clears.

        try {
            // LEGACY SYNC REMOVED (Table 'simulacro_progress' deleted)
            // We now rely on 'guardarProgresoCompleto' (V2 Unified) which is called periodically
            // or on specific events. 
            console.log("Ã¢ÂÂ¹Ã¯Â¸Â Sync V1 omitido (MigraciÃÂ³n a V2 completa)");

            console.log(`Ã¢ÂÂÃ¯Â¸Â Sincronizado a la nube: ${preguntaIdx + 1}/${quizData.length}`);

            if (statusEl) {
                statusEl.innerHTML = "Ã¢ÂÂÃ¯Â¸Â Guardado (V2)";
            }
        } catch (error) {
            console.error('Ã¢ÂÂ Error al guardar en cloud:', error);
            if (statusEl) {
                statusEl.innerHTML = "Ã¢ÂÂ Ã¯Â¸Â Offline (Local OK)";
            }
        } finally {
            // ALWAYS Clear Status after delay
            if (statusEl) {
                setTimeout(() => {
                    statusEl.classList.remove('visible');
                    // Optional: clear text after hidden transition
                }, 2000);
            }
        }
    } else {
        // If no supabase or secondary sim, clear immediately after short delay
        if (statusEl) {
            if (currentSimulacroId) statusEl.innerHTML = "Ã°ÂÂÂ¾ Local OK";
            setTimeout(() => {
                statusEl.classList.remove('visible');
                statusEl.innerHTML = ""; // Clear text too
            }, 1500);
        }
    }
}

async function guardarProgresoCompleto(silent = false) {
    const statusEl = document.getElementById('save-status');
    if (!silent && statusEl) {
        statusEl.innerHTML = "Ã°ÂÂÂ¾ Guardando...";
        statusEl.classList.add('visible');
    }

    const progressData = {
        lastIndex: currentQuestionIndex,
        score: score,
        answers: userProgress,
        timestamp: new Date().toISOString(),
        totalTime: userProgress.totalTime || 0
    };

    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(progressData));
    if (!silent) console.log(`Ã°ÂÂÂ¾ Progreso completo guardado localmente en ${key}`);

    // CLOUD SYNC: Unified V2 for ALL simulators
    // Legacy simulacro_progress is deprecated for writes.
    const isDefaultSim = !currentSimulacroId || (window.currentSimulacroNum === 1);

    // Force Sim 1 ID for Save
    if (isDefaultSim && !currentSimulacroId) {
        currentSimulacroId = 'd15c2a06-b97f-4349-817b-14e07377a0e6';
    }

    if (supabaseApp) {
        try {
            const { data: { user } } = await supabaseApp.auth.getUser();
            if (user) {
                // Upsert to V2 table including simulacro_id
                const { error } = await supabaseApp.from('simulacro_progress_v2').upsert({
                    user_id: user.id,
                    simulacro_id: currentSimulacroId, // Critical: Distinguish exams
                    progress_data: userProgress,
                    score: score,
                    last_index: currentQuestionIndex,
                    total_correctas: Object.values(userProgress).filter(a => a.isCorrect).length, // Add explicit counters
                    total_incorrectas: Object.values(userProgress).filter(a => !a.isCorrect).length,
                    total_respondidas: Object.values(userProgress).length,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, simulacro_id' }); // Relies on unique constraint

                if (error) {
                    console.error('Ã¢ÂÂ Error al guardar progreso V2:', error);
                    if (!silent && statusEl) statusEl.innerHTML = "Ã¢ÂÂ Ã¯Â¸Â Error Sync V2";
                } else {
                    if (!silent) {
                        console.log(`Ã¢ÂÂÃ¯Â¸Â Progreso V2 (${currentSimulacroId}) sincronizado`);
                        if (statusEl) statusEl.innerHTML = "Ã¢ÂÂÃ¯Â¸Â Sincronizado";
                    }
                }
            }
        } catch (error) {
            console.error('Ã¢ÂÂ Error al sincronizar V2:', error);
            if (!silent && statusEl) statusEl.innerHTML = "Ã¢ÂÂ Ã¯Â¸Â Error Red V2";
        } finally {
            if (!silent && statusEl) {
                setTimeout(() => {
                    statusEl.classList.remove('visible');
                }, 2000);
            }
        }
    } else {
        // Fallback local if no supabase
        if (!silent && statusEl) {
            statusEl.innerHTML = "Ã°ÂÂÂ¾ Guardado (Local)";
            setTimeout(() => { statusEl.classList.remove('visible'); }, 2000);
        }
    }
}

// Nueva funciÃÂ³n para sincronizar manualmente
async function sincronizarDatos() {
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
        statusEl.innerHTML = "Ã°ÂÂÂ Sincronizando...";
        statusEl.classList.add('visible');
    }

    await cargarProgreso();
    updateDashboardStats(); // Refresh UI with new data

    if (statusEl) {
        statusEl.innerHTML = "Ã¢ÂÂ Datos actualizados";
        setTimeout(() => {
            statusEl.classList.remove('visible');
        }, 2000);
    }
}

// Bind to window
window.sincronizarDatos = sincronizarDatos;
async function cargarProgreso(user = null) {
    console.log("Cargando progreso...", user ? `(user: ${user.email})` : "(sin user)");
    const statusEl = document.getElementById('save-status');

    const isSim1 = !window.currentSimulacroNum || window.currentSimulacroNum === 1;
    if (isSim1 && !currentSimulacroId) {
        currentSimulacroId = 'd15c2a06-b97f-4349-817b-14e07377a0e6';
    }

    if (window.db && user) {
        try {
            console.log("Consultando progreso en Firestore...");
            const docRef = window.db.collection('usuarios').doc(user.uid).collection('simulacros_progreso').doc(currentSimulacroId);
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                const data = docSnap.data();
                console.log("Progreso encontrado en Firestore");
                
                const localKey = getStorageKey();
                const localDataStr = localStorage.getItem(localKey);
                let localTimestamp = 0;
                if (localDataStr) {
                    try {
                        const localData = JSON.parse(localDataStr);
                        if (localData.timestamp) localTimestamp = new Date(localData.timestamp).getTime();
                    } catch(e) {}
                }

                const cloudTimestamp = data.updated_at ? data.updated_at.toMillis() : 0;

                if (cloudTimestamp > localTimestamp) {
                    console.log("Datos de la nube son más recientes. Sobrescribiendo local...");
                    const progressData = {
                        lastIndex: data.last_index,
                        score: data.score,
                        answers: data.progress_data || {},
                        timestamp: new Date(cloudTimestamp).toISOString(),
                        totalTime: 0
                    };
                    localStorage.setItem(localKey, JSON.stringify(progressData));
                    cargarProgresoLocal();
                } else {
                    console.log("Datos locales son más recientes o iguales. Usando local.");
                    cargarProgresoLocal();
                }
            } else {
                console.log("No hay progreso en Firestore, intentando local.");
                cargarProgresoLocal();
            }
        } catch (error) {
            console.error('Error al cargar progreso de Firestore:', error);
            cargarProgresoLocal();
        }
    } else {
        console.log("Carga local (Sin usuario/Firestore)");
        cargarProgresoLocal();
    }
}

/* -------------------------------------------------------------------------- */
/*                        Category Reports Logic                              */
/* -------------------------------------------------------------------------- */

function renderCategoryStats() {
    const container = document.getElementById('category-stats-container');
    if (!container) return;

    // Use current data or fallbacks
    const activeQuizData = window.currentQuizData ? window.currentQuizData.questions : (quizData || []);

    if (!activeQuizData || activeQuizData.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 1rem;">No hay datos disponibles.</div>';
        return;
    }

    // 1. Calculate Stats by Category
    const stats = {};
    const defaultCategory = "General";

    activeQuizData.forEach((q, index) => {
        // Normalize category
        let cat = q.category || defaultCategory;
        if (!cat || cat.trim() === '') cat = defaultCategory;

        if (!stats[cat]) {
            stats[cat] = { total: 0, correct: 0, incorrect: 0, unanswered: 0 };
        }

        stats[cat].total++;

        // Check user progress for this question index
        // userProgress is global object { index: { isCorrect: bool, ... } }
        const answer = userProgress[index];

        if (answer) {
            if (answer.isCorrect) {
                stats[cat].correct++;
            } else {
                stats[cat].incorrect++;
            }
        } else {
            stats[cat].unanswered++;
        }
    });

    // 2. Sort categories (optional: by name or by activity volume)
    // Let's sort by name for consistency
    const categories = Object.keys(stats).sort();

    // Color Mapping (Unified for Sim 1 & 2)
    const categoryColors = {
        // Core Pedagogical & Evaluation
        "EvaluaciÃÂ³n y RetroalimentaciÃÂ³n": "var(--accent-color)",
        "Estrategias PedagÃÂ³gicas": "var(--secondary-color)",
        "PlanificaciÃÂ³n Curricular": "#16a085", // Teal

        // Inclusion & Values
        "InclusiÃÂ³n y Diversidad": "var(--success-color)",
        "Convivencia y Valores": "#e67e22", // Orange

        // Legal & Management
        "Marco Legal y Normativo": "var(--warning-color)",
        "GestiÃÂ³n Institucional": "#2c3e50", // Dark Blue

        // Skills & Cognitive
        "Competencias EspecÃÂ­ficas": "#9b59b6", // Purple
        "Desarrollo Cognitivo": "#2980b9", // Blue
        "Razonamiento LÃÂ³gico": "#8e44ad", // Deep Purple

        "General": "var(--text-secondary)"
    };

    // 3. Render HTML
    container.innerHTML = '';

    categories.forEach(cat => {
        const data = stats[cat];
        const correctPct = (data.correct / data.total) * 100;
        const incorrectPct = (data.incorrect / data.total) * 100;
        // Unanswered is the remaining space automatically due to flex/width logic

        const color = categoryColors[cat] || categoryColors["General"];

        const html = `
            <div class="category-stat-item" style="border-left: 4px solid ${color};">
                <div class="cat-header">
                    <span style="color: ${color}; font-weight: bold;">${cat}</span>
                    <span>${data.correct + data.incorrect} / ${data.total}</span>
                </div>
                <div class="cat-progress-track">
                    <div class="cat-bar-correct" style="width: ${correctPct}%" title="Correctas: ${data.correct}"></div>
                    <div class="cat-bar-incorrect" style="width: ${incorrectPct}%" title="Incorrectas: ${data.incorrect}"></div>
                </div>
                <div class="cat-legend">
                    <span class="cat-legend-item">
                        <span class="cat-legend-dot" style="background: var(--success-text);"></span> ${data.correct} Correctas
                    </span>
                    <span class="cat-legend-item">
                        <span class="cat-legend-dot" style="background: var(--error-text);"></span> ${data.incorrect} Incorrectas
                    </span>
                     <span class="cat-legend-item">
                        <span class="cat-legend-dot" style="background: #e5e7eb;"></span> ${data.unanswered} Pendientes
                    </span>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}


/* -------------------------------------------------------------------------- */
/*                              Reports View Logic                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                              Reports View Logic                            */
/* -------------------------------------------------------------------------- */

function renderReportsView() {
    const activeQuizData = window.currentQuizData ? window.currentQuizData.questions : (quizData || []);
    if (!activeQuizData || activeQuizData.length === 0) return;

    // Calculate overall statistics
    let totalQuestionsAnswered = 0, correctAnswers = 0, incorrectAnswers = 0;
    Object.values(userProgress).forEach(answer => {
        if (answer && typeof answer === 'object') {
            totalQuestionsAnswered++;
            answer.isCorrect ? correctAnswers++ : incorrectAnswers++;
        }
    });

    const accuracy = totalQuestionsAnswered > 0 ? ((correctAnswers / totalQuestionsAnswered) * 100).toFixed(1) : 0;

    // Update overall stats
    const totalPossibleQuestions = activeQuizData.length;
    document.getElementById('report-total-questions').textContent = totalQuestionsAnswered; // This shows answered in the ID, maybe clarify label in HTML later
    document.getElementById('report-correct').textContent = correctAnswers;
    document.getElementById('report-incorrect').textContent = incorrectAnswers;
    document.getElementById('report-accuracy').textContent = accuracy + '%';

    // Calculate stats by category
    const stats = {}, defaultCategory = "General";
    activeQuizData.forEach((q, index) => {
        let cat = q.category || defaultCategory;
        if (!cat || cat.trim() === '') cat = defaultCategory;
        if (!stats[cat]) stats[cat] = { total: 0, correct: 0, incorrect: 0, unanswered: 0, accuracy: 0 };
        stats[cat].total++;

        const answer = userProgress[index];
        if (answer) {
            answer.isCorrect ? stats[cat].correct++ : stats[cat].incorrect++;
        } else {
            stats[cat].unanswered++;
        }
    });

    // Category Color Mapping (Reused/Standardized)
    const categoryColors = {
        "EvaluaciÃÂ³n y RetroalimentaciÃÂ³n": "var(--accent-color)",
        "Estrategias PedagÃÂ³gicas": "var(--secondary-color)",
        "PlanificaciÃÂ³n Curricular": "#16a085",
        "InclusiÃÂ³n y Diversidad": "var(--success-color)",
        "Convivencia y Valores": "#e67e22",
        "Marco Legal y Normativo": "var(--warning-color)",
        "GestiÃÂ³n Institucional": "#2c3e50",
        "Competencias EspecÃÂ­ficas": "#9b59b6",
        "Desarrollo Cognitivo": "#2980b9",
        "Razonamiento LÃÂ³gico": "#8e44ad",
        "General": "var(--text-secondary)"
    };

    // Sort categories (by score coverage, lowest first)
    const categoriesSorted = Object.keys(stats).sort((a, b) => {
        const scoreA = stats[a].total > 0 ? (stats[a].correct / stats[a].total) : 0;
        const scoreB = stats[b].total > 0 ? (stats[b].correct / stats[b].total) : 0;
        return scoreA - scoreB;
    });

    // Render category stats
    const categoryContainer = document.getElementById('reports-category-stats-container');
    if (categoryContainer) {
        categoryContainer.innerHTML = '';
        categoriesSorted.forEach(cat => {
            const data = stats[cat];
            const answered = data.correct + data.incorrect;
            const score = data.total > 0 ? ((data.correct / data.total) * 100).toFixed(0) : 0;
            const accuracyVal = answered > 0 ? ((data.correct / answered) * 100).toFixed(0) : 0;

            const correctPct = (data.correct / data.total) * 100;
            const incorrectPct = (data.incorrect / data.total) * 100;
            const color = categoryColors[cat] || categoryColors["General"];

            const html = `
                <div class="category-stat-item" style="border-left: 4px solid ${color}; padding: 1.25rem; background: var(--bg-card); border-radius: 12px; margin-bottom: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                        <div style="max-width: 70%;">
                            <div style="font-weight: 700; color: ${color}; font-size: 1rem; line-height: 1.2;">${cat}</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
                                ${data.correct} Correctas de ${data.total}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.25rem; font-weight: 800; color: ${score >= 70 ? 'var(--success-text)' : score >= 50 ? 'var(--accent-secondary)' : 'var(--error-text)'};">
                                ${score}%
                            </div>
                            <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Puntaje</div>
                        </div>
                    </div>
                    
                    <div class="cat-progress-track" style="height: 10px; background: var(--bg-body-start); border-radius: 5px; overflow: hidden; display: flex; margin-bottom: 0.75rem;">
                        <div style="width: ${correctPct}%; background: var(--success-text);" title="Correctas: ${data.correct}"></div>
                        <div style="width: ${incorrectPct}%; background: var(--error-text);" title="Incorrectas: ${data.incorrect}"></div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                        <div style="display: flex; gap: 0.75rem; color: var(--text-secondary);">
                             <span>Ã¢ÂÂ ${data.correct}</span>
                             <span>Ã¢ÂÂ ${data.incorrect}</span>
                             <span>Ã¢ÂÂ³ ${data.unanswered}</span>
                        </div>
                        <div style="color: var(--text-primary); font-weight: 500;">
                            ${answered > 0 ? `PrecisiÃÂ³n: ${accuracyVal}%` : 'Sin actividad'}
                        </div>
                    </div>
                </div>
            `;
            categoryContainer.insertAdjacentHTML('beforeend', html);
        });
    }

    // Generate recommendations
    const recommendationsContainer = document.getElementById('recommendations-container');
    if (recommendationsContainer) {
        recommendationsContainer.innerHTML = '';
        const weakCategories = categoriesSorted.filter(cat => {
            const data = stats[cat], answered = data.correct + data.incorrect;
            const accuracyVal = answered > 0 ? (data.correct / answered) * 100 : 0;
            return (answered > 0 && accuracyVal < 70) || (data.total > 0 && (data.correct / data.total) < 0.4);
        }).slice(0, 4);

        if (weakCategories.length === 0) {
            recommendationsContainer.innerHTML = `
                <div style="padding: 1.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 12px; color: var(--success-text); text-align: center; border: 1px dashed var(--success-color);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">Ã°ÂÂÂ¯</div>
                    <div style="font-weight: 700;">ÃÂ¡Rendimiento Excelente!</div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">EstÃÂ¡s dominando todas las categorÃÂ­as actuales de este simulacro.</div>
                </div>
            `;
        } else {
            weakCategories.forEach(cat => {
                const data = stats[cat];
                const answered = data.correct + data.incorrect;
                const accuracyVal = answered > 0 ? ((data.correct / answered) * 100).toFixed(0) : 0;
                const color = categoryColors[cat] || categoryColors["General"];

                recommendationsContainer.insertAdjacentHTML('beforeend', `
                    <div style="padding: 1rem; background: var(--bg-card); border-left: 4px solid ${color}; border-radius: 8px; box-shadow: var(--shadow-sm);">
                        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">${cat}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
                            ${answered > 0 ? `Tu precisiÃÂ³n es del ${accuracyVal}%.` : 'AÃÂºn no has practicado este tema.'} 
                            Se recomienda repasar los conceptos clave de esta ÃÂ¡rea para mejorar tu puntaje global.
                        </div>
                    </div>
                `);
            });
        }
    }
}


/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

// Helper to get storage key based on current simulator
// Helper to get storage key based on current simulator
function getStorageKey() {
    // v67: SECURITY FIX - Isolate data per user
    // If we have an authenticated user, append their ID to the key.
    // This prevents "User B" from seeing "User A's" local data.

    let baseKey = 'progresoUsuario';

    // Compatibilidad: Si es el simulacro 1, NO agregar ID para mantener compatibilidad con datos viejos
    // Si estamos en otro simulacro (2, 3, etc), sÃÂ­ usamos el ID ÃÂºnico
    if (currentSimulacroId && window.currentSimulacroNum !== 1) {
        baseKey += `_${currentSimulacroId}`;
    }

    // CRITICAL: Append User ID if logged in
    if (lastAuthUserId) {
        baseKey += `_${lastAuthUserId}`;
    }

    return baseKey;
}

// Helper function to load from localStorage only
function cargarProgresoLocal() {
    const key = getStorageKey();
    console.log(`Ã°ÂÂÂ Cargando local desde: ${key}`);
    const saved = localStorage.getItem(key);

    // If not found and we are in default/null state, try legacy
    if (!saved && !currentSimulacroId) {
        // Fallback is already 'progresoUsuario'
    }

    if (saved) {
        try {
            const data = JSON.parse(saved);
            userProgress = data.answers || {};
            score = Object.values(userProgress).filter(a => a && a.isCorrect).length;
            userProgress.safeLastIndex = data.lastIndex || 0;
            currentQuestionIndex = userProgress.safeLastIndex;

            if (data.answers && data.answers.totalTime) {
                userProgress.totalTime = data.answers.totalTime;
            } else if (data.totalTime) {
                userProgress.totalTime = data.totalTime;
            }

            const answerCount = Object.keys(userProgress).filter(k => k !== 'totalTime' && k !== 'safeLastIndex').length;
            console.log(`Ã¢ÂœÂ“ Progreso local (${key}): ${answerCount} respuestas, Score: ${score}`);
        } catch (e) {
            console.error('Ã¢Â ÂŒ Error al parsear progreso local:', e);
        }
    } else {
        console.log(`Ã¢Â„Â¹Ã¯Â¸Â  No hay progreso local en ${key}`);
        // Reset if starting fresh simulator
        if (currentSimulacroId) {
            userProgress = {};
            score = 0;
            currentQuestionIndex = 0;
            userProgress.totalTime = 0;
        }
    }
}

// Real-Time Sync - Listen for changes from other devices
async function setupRealtimeSync(user) {}

// Login con Google usando Firebase
async function loginWithGoogle() {
    if (typeof auth === 'undefined') {
        alert("Sistema de autenticación no disponible. Por favor recarga la página.");
        return;
    }
    console.log("Iniciando login con Google (Firebase)...");
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error("Ã¢ÂÂ Error inesperado:", error);
        alert("Error inesperado: " + error.message);
    }
}

async function logout() {
    console.log("Ã°ÂÂÂ±Ã¯Â¸Â Logout click! Forzando salida local...");

    try {
        // 1. LIMPIEZA LOCAL INMEDIATA (Prioridad Usuario)
        // localStorage.removeItem('progresoUsuario'); // Ã¢ÂÂ Ã¯Â¸Â DISABLED to prevent data loss of legacy data
        userProgress = {};
        score = 0;
        currentQuestionIndex = 0;

        // 2. Mostrar Login YA MISMO
        showLogin();
        console.log("Ã¢ÂÂ UI limpia y reseteada");

        // 3. Intentar cerrar sesiÃÂ³n en servidor (Background - No bloqueante)
        if (typeof auth !== 'undefined') {
            console.log("Ã°ÂÂÂ¡ Enviando signOut a Firebase (Background)...");
            auth.signOut().then(() => {
                 console.log("Ã¢ÂÂ SesiÃÂ³n cerrada en servidor");
            }).catch((error) => {
                 console.warn("Ã¢ÂÂ Ã¯Â¸Â Error en signOut servidor:", error.message);
            });
        }
    } catch (error) {
        console.error("Ã¢ÂÂ Error crÃÂ­tico en logout:", error);
        // Fallback final: Recargar pÃÂ¡gina para asegurar limpieza
        window.location.reload();
    }
}

// Theme Logic
window.setTheme = function (theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const themeMap = { 'default': 0, 'deep': 1, 'night': 2, 'desktop': 3 };
    const themeButtons = document.querySelectorAll('.theme-btn');
    if (themeButtons[themeMap[theme]]) {
        themeButtons[themeMap[theme]].classList.add('active');
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'default';
    window.setTheme(savedTheme);
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    initTheme();

    const loginBtn = document.getElementById('googleLoginBtn');
    if (loginBtn) loginBtn.onclick = loginWithGoogle;

    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');

    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            profileMenu.classList.remove('active');
        });

        profileMenu.addEventListener('click', (e) => {
            // Allow clicks to bubble up so document listener closes menu if needed,
            // OR if valid link is clicked, it works.
            // e.stopPropagation(); // REMOVED to fix "menu stays open"
        });
    }
});

// SW registration is handled in index.html with versioning
// Removed duplicate registration to prevent loops

let deferredPrompt;
const installBtns = document.querySelectorAll('.installAppBtn');

if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    installBtns.forEach(btn => btn.style.display = 'none');
}

window.addEventListener('appinstalled', () => {
    installBtns.forEach(btn => btn.style.display = 'none');
});

installBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => {
                deferredPrompt = null;
            });
        } else {
            alert('Para instalar:\n- Android/Chrome: MenÃÂº (Ã¢ÂÂ®) > Instalar app o Agregar a inicio.\n- iOS/Safari: Compartir (cuaadrito con flecha) > Agregar a inicio.');
        }
    });
});

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show the install buttons when the browser is ready to prompt
    installBtns.forEach(btn => btn.style.display = 'block');
    console.log("Ã°ÂÂÂ± PWA install prompt is ready and button is visible.");
});

// ==================== UNIVERSAL SIMULATOR SELECTOR ====================

// Helper to start simulacro from selector ID
async function handleSimulatorChange(simId) {
    if (!simId) return;

    // Find the simulacro object
    const simulacro = simulacrosCatalog.find(s => s.id === simId);
    if (!simulacro) {
        console.error("Simulacro not found:", simId);
        return;
    }

    // LOAD CONTEXT ONLY (Do NOT start quiz)
    // This allows user to switch stats view without forcing them into quiz mode
    const loaded = await loadSimulacroContext(simulacro);
    if (!loaded) return;

    // Refresh UI based on current view
    // Since we are in SPA, we need to know what view is active
    const dashboardVisible = !document.getElementById('dashboard').classList.contains('hidden');
    const profileVisible = !document.getElementById('profile-view').classList.contains('hidden');
    const reportsVisible = !document.getElementById('reports-view').classList.contains('hidden');

    if (dashboardVisible) {
        updateDashboardStats();
    } else if (profileVisible) {
        renderActivityCalendar();
        // Profile might also use dashboard stats logic so run it too
        updateDashboardStats();
    } else if (reportsVisible) {
        renderReportsView();
    }

    // Sync all selectors to show new state
    updateAllSimulatorSelectors();
}

// Helper to populate and sync all 3 selectors (Dashboard, Reports, Profile)
function updateAllSimulatorSelectors() {
    const selectors = [
        document.getElementById('dashboard-sim-selector'),
        document.getElementById('reports-sim-selector'),
        document.getElementById('profile-sim-selector')
    ];

    selectors.forEach(select => {
        if (!select) return;

        // Save current selection before wipe
        // But if currentSimulacroId is set, that overrides local state
        const targetValue = currentSimulacroId || (simulacrosCatalog.length > 0 ? simulacrosCatalog[0].id : '');

        // Clear options
        select.innerHTML = '';

        if (simulacrosCatalog.length === 0) {
            const option = document.createElement('option');
            option.textContent = "Cargando...";
            select.appendChild(option);
            return;
        }

        // Add options from catalog
        simulacrosCatalog.forEach(sim => {
            const option = document.createElement('option');
            option.value = sim.id;

            // Logic for locked/premium visualization
            const canAccess = canAccessSimulacro(sim);
            let label = sim.titulo;
            if (!canAccess) label = `Ã°ÂÂÂ ${label}`;
            // if (sim.es_premium) label = `Ã¢Â­Â ${label}`;

            option.textContent = label;

            select.appendChild(option);
        });

        // Set active value
        if (targetValue) {
            select.value = targetValue;
        }
    });

}



// === SISTEMA ANTI-FRAUDE (PROCTORING) ===
let infracciones = 0;
const MAX_INFRACCIONES = 2;

document.addEventListener('visibilitychange', () => {
    // Solo actuar si hay una sesion activa y un examen en curso
    if (document.visibilityState === 'hidden' && !document.getElementById('quiz-view').classList.contains('hidden')) {
        infracciones++;
        console.warn("Infraccion detectada: Cambio de pestana/app (", infracciones, "/", MAX_INFRACCIONES, ")");

        if (infracciones >= MAX_INFRACCIONES) {
            Swal.fire({
                icon: 'error',
                title: 'Examen Anulado',
                text: 'Has superado el limite de salidas de la aplicacion. Tu intento ha sido anulado por motivos de seguridad.',
                confirmButtonText: 'Entendido',
                allowOutsideClick: false
            }).then(() => {
                switchView('dashboard');
                infracciones = 0;
            });
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Advertencia Anti-Fraude',
                text: 'Has salido de la aplicacion durante el examen. Una vez mas y el examen sera anulado automaticamente.',
                confirmButtonText: 'Continuar Examen',
                allowOutsideClick: false
            });
        }
    }
});

// Bloquear clic derecho y menu de copiar en moviles
document.addEventListener('contextmenu', (e) => {
    if (!document.getElementById('quiz-view').classList.contains('hidden')) {
        e.preventDefault();
    }
});

document.addEventListener('copy', (e) => {
    if (!document.getElementById('quiz-view').classList.contains('hidden')) {
        e.preventDefault();
        Swal.fire('Atencion', 'No esta permitido copiar texto durante el examen.', 'warning');
    }
});
 
// ==========================================
// RENDER BOTTOM NAV (FASE 6)
// ==========================================
function renderBottomNav(role) {
    const bottomNav = document.getElementById('bottomNav');
    if (!bottomNav) return;
    
    // Solo mostrar el menú si estamos logueados
    bottomNav.classList.remove('hidden');

    document.querySelectorAll('.nav-profesor')
        .forEach(el => el.style.display = (role === 'profesor' || role === 'admin') ? 'flex' : 'none');
}





// ==========================================
// FASE 3: PANEL DEL PROFESOR (EXÁMENES)
// ==========================================

function openCreateExamenModal() {
    document.getElementById('create-examen-modal').classList.remove('hidden');
}

function closeCreateExamenModal() {
    document.getElementById('create-examen-modal').classList.add('hidden');
    document.getElementById('form-crear-examen').reset();
}

async function submitCrearExamen() {
    if (!window.db || typeof auth === 'undefined' || !auth.currentUser) return;
    
    const titulo = document.getElementById('new-examen-title').value.trim();
    const grupoId = document.getElementById('new-examen-grupo').value;
    const bancoPreguntas = document.getElementById('new-examen-banco').value;
    const numPreguntasRaw = document.getElementById('new-examen-num-preg').value;
    const duracionRaw = document.getElementById('new-examen-duracion').value;
    
    const numPreguntas = numPreguntasRaw ? parseInt(numPreguntasRaw) : null;
    const duracionMinutos = duracionRaw ? parseInt(duracionRaw) : null;
    
    try {
        Swal.fire({ title: 'Creando examen...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        await window.db.collection('examenes').add({
            titulo: titulo,
            grupoId: grupoId,
            profesorId: auth.currentUser.uid,
            bancoPreguntas: bancoPreguntas,
            numPreguntas: numPreguntas,
            duracionMinutos: duracionMinutos,
            estado: 'inactivo',
            creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
            activadoEn: null
        });
        
        Swal.fire('Éxito', 'Examen creado correctamente', 'success');
        closeCreateExamenModal();
        renderProfesorExamenes();
    } catch (err) {
        console.error("Error creando examen:", err);
        Swal.fire('Error', 'No se pudo crear el examen: ' + err.message, 'error');
    }
}

async function renderProfesorExamenes() {
    const listContainer = document.getElementById('profesor-examenes-list');
    if (!listContainer || !window.db || typeof auth === 'undefined' || !auth.currentUser) return;
    
    const filtroGrupo = document.getElementById('filtroGrupo').value;
    listContainer.innerHTML = '<div class="loader-container"><div class="dot-loader"></div></div>';
    
    try {
        let query = window.db.collection('examenes')
            .where('profesorId', '==', auth.currentUser.uid)
            .orderBy('creadoEn', 'desc');
            
        const snapshot = await query.get();
        let examenes = [];
        snapshot.forEach(doc => examenes.push({ id: doc.id, ...doc.data() }));
        
        if (filtroGrupo !== 'todos') {
            examenes = examenes.filter(ex => ex.grupoId === filtroGrupo);
        }
        
        if (examenes.length === 0) {
            listContainer.innerHTML = '<p class="empty-state" style="text-align:center; color:var(--text-secondary);">No hay exámenes para este grupo.</p>';
            return;
        }
        
        let html = '';
        examenes.forEach(ex => {
            const isChecked = ex.estado === 'activo' ? 'checked' : '';
            const numPreg = ex.numPreguntas ? `${ex.numPreguntas} preg.` : 'Todas las preg.';
            const tiempo = ex.duracionMinutos ? `${ex.duracionMinutos} min` : 'Sin límite';
            
            html += `
                <div class="examen-card">
                    <div class="examen-card-header">
                        <div>
                            <div class="examen-title">${ex.titulo}</div>
                            <span class="examen-group-badge">${ex.grupoId}</span>
                        </div>
                        <label class="switch">
                          <input type="checkbox" ${isChecked} onchange="toggleEstadoExamen('${ex.id}', this.checked)">
                          <span class="slider"></span>
                        </label>
                    </div>
                    <div class="examen-meta">
                        <span>📚 ${ex.bancoPreguntas}</span>
                        <span>⏱️ ${tiempo}</span>
                        <span>📝 ${numPreg}</span>
                    </div>
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
        
    } catch (err) {
        console.error("Error cargando exámenes:", err);
        listContainer.innerHTML = `<div class="error-msg">Error cargando exámenes: ${err.message}</div>`;
    }
}

async function toggleEstadoExamen(examenId, isActive) {
    if (!window.db) return;
    try {
        const nuevoEstado = isActive ? 'activo' : 'inactivo';
        const updateData = { estado: nuevoEstado };
        if (isActive) {
            updateData.activadoEn = firebase.firestore.FieldValue.serverTimestamp();
        }
        await window.db.collection('examenes').doc(examenId).update(updateData);
        // console.log(`Examen ${examenId} cambiado a ${nuevoEstado}`);
    } catch (err) {
        console.error("Error cambiando estado:", err);
        Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
        renderProfesorExamenes(); // revert toggle visually
    }
}

async function renderEstudianteExamenes() {
    const container = document.getElementById('estudiante-examenes-list');
    if (!container) return;
    
    const grupoId = localStorage.getItem('estudianteGrupo');
    if (!grupoId) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No tienes un grupo asignado.</div>';
        return;
    }

    try {
        const snapshot = await window.db.collection('simulacros')
            .where('asignadoA', 'array-contains', grupoId)
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No hay exámenes asignados a tu grupo.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const examId = doc.id;
            html += `
                <div class="simulacro-card ${data.bloqueado ? 'locked' : ''}">
                    <div class="simulacro-header">
                        <h3>${data.titulo || 'Examen'}</h3>
                        ${data.bloqueado ? '<span class="status-badge" style="background:#ff7675;">Bloqueado</span>' : '<span class="status-badge" style="background:#00b894;">Activo</span>'}
                    </div>
                    <div class="simulacro-info" style="margin-top: 1rem;">
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">${data.descripcion || 'Sin descripción'}</p>
                        ${!data.bloqueado ? `<button class="btn-start" onclick="iniciarExamen('${examId}')" style="width: 100%; margin-top: 0.5rem;">Ingresar</button>` : ''}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        console.error("Error cargando exámenes del estudiante:", error);
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #d63031;">Error al cargar exámenes.</div>';
    }
}
