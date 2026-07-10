// Safe Initialization of Variables
let quizData = null;
let currentQuestionIndex = 0;
let score = 0;
let userProgress = {};
let totalTime = 0; // State for time tracking
let studyTimer = null; // Timer reference
let supabaseApp = null;
let isProcessingAuth = false; // Flag to prevent loops
let lastAuthUserId = null; // Debounce for auth events
let realtimeChannel = null; // Supabase realtime channel for cross-device sync

// Multi-Simulator System Variables
let userRole = 'free'; // Default role: 'admin', 'free', or 'premium'
let currentSimulacroId = null; // Currently selected simulacro UUID
let simulacrosCatalog = []; // List of available simulacros from database

const SUPABASE_URL = 'https://sqkogiitljnoaxirhrwq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxa29naWl0bGpub2F4aXJocndxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzI1ODksImV4cCI6MjA4MzgwODU4OX0.jeuxanmdeXuSiTiEJ6HYpqmnyIWzDLp9tvrpC_4BDZM';

// Initialize App
async function init() {
    try {
        console.log("ð Iniciando aplicaciÃ³n...");

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
                    console.log(`ð Evento Auth: SIGNED_IN ${email}`);
                    
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
                    
                    await showDashboard(sessionUser);
                    
                    // Temporarily disable these until Firestore migration is complete
                    // await cargarProgreso(sessionUser); 
                    // await setupRealtimeSync(sessionUser); 
                } else {
                    console.log("â SesiÃ³n cerrada / No hay sesiÃ³n");
                    lastAuthUserId = null;
                    showLogin();
                }
            });
        } else {
            console.warn("â  Firebase Auth no cargado. Usando modo local.");
            showLogin();
        }

    } catch (error) {
        console.error('â Error init:', error);
        showLogin();
    }
}

function showLogin() {
    console.log("ð± Mostrando Login");
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('header').classList.add('hidden');
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.add('hidden');
    document.getElementById('docs-view').classList.add('hidden');
    document.getElementById('profile-view').classList.add('hidden');
}

async function showDashboard(user) {
    console.log("ð Mostrando Dashboard para:", user.email);
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('header').classList.remove('hidden');
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.add('hidden');
    document.getElementById('docs-view').classList.add('hidden');
    document.getElementById('profile-view').classList.add('hidden');

    // Update User Info
    const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
    document.getElementById('userName').innerText = displayName;
    document.getElementById('userEmail').innerText = user.email;

    // Avatar logic
    const avatarUrl = user.user_metadata?.avatar_url;
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
    console.log(`â Rol asignado: ${userRole}`);

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
    const message = visitCount === 0 ? 'Â¡Bienvenido! ð' : 'Â¡Hola de nuevo! ð';
    welcomeEl.textContent = message;

    // Increment visit count
    localStorage.setItem(storageKey, (visitCount + 1).toString());
}

async function updateDashboardStats() {
    // ð¡ï¸ RECALCULATE SCORE from logical source of truth
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

    // Actualizar texto del botÃ³n
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
                    <span class="detail-icon">ð</span>
                    <span class="detail-text">${user.phone || '<span class="empty-val">Sin telÃ©fono</span>'}</span>
                </div>
                <div class="detail-item" title="Nota de vencimiento o plan">
                    <span class="detail-icon">ð</span>
                    <span class="detail-text">${user.notes || '<span class="empty-val">Pagar plan</span>'}</span>
                </div>
            </div>

            <div class="user-card-actions">
                <select class="role-select-premium" onchange="updateUserRole('${user.user_id}', this.value)">
                    <option value="" disabled selected>Cambiar Rol...</option>
                    <option value="free" ${user.role === 'free' ? 'disabled' : ''}>ð Free</option>
                    <option value="premium" ${user.role === 'premium' ? 'disabled' : ''}>â­ Premium</option>
                    <option value="admin" ${user.role === 'admin' ? 'disabled' : ''}>ð¡ï¸ Admin</option>
                </select>
                <div class="action-buttons-row">
                    <button onclick="editUserMetadata('${user.user_id}')" class="btn-edit-user" title="Editar datos">
                        âï¸ Editar
                    </button>
                    <button onclick="deleteUser('${user.user_id}', '${user.email}')" class="btn-delete-user" title="Eliminar">
                        ðï¸
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
        console.log("ð¥ Cargando lista de usuarios...");
        listContainer.innerHTML = '<div class="loader-container"><div class="dot-loader"></div></div>';

        const { data, error } = await supabaseApp
            .from('user_roles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allUsersCache = data; // Save for local search
        renderUserList(data);
        console.log(`â ${data.length} usuarios cargados`);

    } catch (err) {
        console.error("â Error en loadAllUsers:", err);
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
        title: 'âï¸ Editar Usuario',
        html: `
            <div style="text-align: left; margin-bottom: 0.5rem; font-weight: bold;">TelÃ©fono:</div>
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
        const { error } = await supabaseApp
            .from('user_roles')
            .update({ phone, notes, updated_at: new Date() })
            .eq('user_id', userId);

        if (error) throw error;

        // Update local cache
        const index = allUsersCache.findIndex(u => u.user_id === userId);
        if (index !== -1) {
            allUsersCache[index].phone = phone;
            allUsersCache[index].notes = notes;
        }

        Swal.fire('Â¡Ãxito!', 'Datos actualizados correctamente.', 'success');
        renderUserList(allUsersCache); // Refresh UI

    } catch (err) {
        console.error("Error saving metadata:", err);
        Swal.fire('Error', 'No se pudo guardar la informaciÃ³n.', 'error');
    }
}

async function deleteUser(targetUserId, email) {
    const result = await Swal.fire({
        title: 'Â¿EstÃ¡s seguro?',
        text: `EstÃ¡s a punto de eliminar el acceso de ${email}. Esta acciÃ³n no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'SÃ­, eliminar',
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
            title: 'Â¡Eliminado!',
            text: 'El usuario ha sido removido con Ã©xito.',
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
            title: 'Â¡Rol Actualizado!',
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
        title: 'Â¿EstÃ¡s seguro?',
        text: "Â¡Esto borrarÃ¡ TODO tu progreso en este simulacro! No podrÃ¡s deshacerlo.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'SÃ­, borrar todo',
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
            console.log("ðï¸ Borrando progreso en nube para:", currentSimulacroId);
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
        console.log("ðï¸ Borrando local:", storageKey);
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
        Swal.fire('Error', 'FallÃ³ el restablecimiento. Intenta recargar la pÃ¡gina.', 'error');
    }
}

async function forceRefresh() {
    Swal.fire({
        title: 'Actualizando...',
        text: 'Limpiando cachÃ© y recargando la aplicaciÃ³n',
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

    // Metadata for sync
    const metadata = {
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        email: user.email,
        updated_at: new Date()
    };

    // ð¡ï¸ SUPER ADMIN BYPASS: Always admin for owner
    if (user.email === 'lfalzatel@gmail.com') {
        console.log("ð Super Admin detectado (Hardcoded)");
        supabaseApp.from('user_roles').upsert({
            user_id: user.id,
            role: 'admin',
            ...metadata
        }).then(({ error }) => {
            if (error) console.error("Error syncing admin metadata:", error);
            else console.log("â Admin metadata synced to DB");
        });

        return 'admin';
    }

    try {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout getting user role')), 4000)
        );

        const fetchPromise = supabaseApp
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

        if (error) {
            console.warn('â ï¸ No role found, creating free role:', error.message);
            await supabaseApp.from('user_roles').insert({
                user_id: user.id,
                role: 'free',
                ...metadata
            });
            return 'free';
        }

        // Sync Metadata for existing users (Background) via RPC
        supabaseApp.rpc('update_user_profile', {
            new_name: metadata.full_name,
            new_avatar: metadata.avatar_url
        }).then(({ error }) => {
            if (error) console.error("Error syncing metadata via RPC:", error);
        });

        return data.role;
    } catch (err) {
        console.error("Error in getUserRole:", err);
        return 'free';
    }
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
            if (res.error) console.error('â ï¸ Supabase error loadSimulacros:', res.error);
        }

        // Fallback if data is missing or empty (Offline support)
        if (!data || data.length === 0) {
            console.warn("â ï¸ Usando catÃ¡logo local de respaldo (Offline/Error)");
            data = [
                {
                    id: 'fixed_sim_1', // Dummy ID for fallback
                    numero: 1,
                    titulo: 'Simulacro General',
                    descripcion: 'EvaluaciÃ³n completa de competencias para el concurso docente.',
                    total_preguntas: 360,
                    es_premium: false,
                    activo: true
                },
                {
                    id: 'fixed_sim_2',
                    numero: 2,
                    titulo: 'Simulacro Premium',
                    descripcion: 'Preguntas avanzadas y casos de estudio especÃ­ficos.',
                    total_preguntas: 35, // Updated to match actual available
                    es_premium: true,
                    activo: true
                },
                {
                    id: 'fixed_sim_3',
                    numero: 3,
                    titulo: 'Simulacro Experto',
                    descripcion: 'Preguntas de alta complejidad y anÃ¡lisis curricular profundo.',
                    total_preguntas: 60,
                    es_premium: true,
                    activo: true
                }
            ];
        }

        simulacrosCatalog = data || [];
        console.log('â Simulacros cargados:', simulacrosCatalog.length);
        return simulacrosCatalog;
    } catch (err) {
        console.error('â Error loading simulacros:', err);
        return [];
    } finally {
        // UPDATE QUESTION COUNTS FROM REAL DATA
        // This fixes the issue where DB/Fallback says 35 but we actually have 95+
        if (typeof RAW_QUIZ_DATA !== 'undefined' && RAW_QUIZ_DATA.questions) {
            const sim1 = simulacrosCatalog.find(s => s.numero === 1);
            if (sim1) {
                sim1.total_preguntas = RAW_QUIZ_DATA.questions.length;
                console.log(`â Sync Sim 1 count: ${sim1.total_preguntas}`);
            }
        }
        if (typeof RAW_QUIZ_DATA_2 !== 'undefined' && RAW_QUIZ_DATA_2.questions) {
            const sim2 = simulacrosCatalog.find(s => s.numero === 2);
            if (sim2) {
                sim2.total_preguntas = RAW_QUIZ_DATA_2.questions.length;
                console.log(`â Sync Sim 2 count: ${sim2.total_preguntas}`);
            }
        }
        if (typeof RAW_QUIZ_DATA_3 !== 'undefined' && RAW_QUIZ_DATA_3.questions) {
            const sim3 = simulacrosCatalog.find(s => s.numero === 3);
            if (sim3) {
                sim3.total_preguntas = RAW_QUIZ_DATA_3.questions.length;
                console.log(`â Sync Sim 3 count: ${sim3.total_preguntas}`);
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
                ${!canAccess ? '<div style="font-size: 1.5rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">ð</div>' : ''}
                ${sim.es_premium ? '<span style="background: linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%); color: #78350F; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">PREMIUM</span>' : '<span style="background: var(--success-bg); color: var(--success-text); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">GRATIS</span>'}
            </div>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5;">
                ${sim.descripcion || 'PrepÃ¡rate con preguntas de alta calidad'}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.85rem; color: var(--text-secondary);">
                    ð ${sim.total_preguntas} preguntas
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
    console.log('ï¿½ Cargando contexto para:', simulacro.titulo);
    currentSimulacroId = simulacro.id;
    window.currentSimulacroNum = simulacro.numero; // Track number for sync logic

    // Cargar datos del quiz correspondiente
    if (simulacro.numero === 1) {
        // Simulacro 1: usa quizData original (360 preguntas)
        window.currentQuizData = window.RAW_QUIZ_DATA;
    } else if (simulacro.numero === 2) {
        // Simulacro 2: usa quizData2 (premium - 95 preguntas)
        if (!window.RAW_QUIZ_DATA_2) {
            console.error('RAW_QUIZ_DATA_2 no estÃ¡ definido');
            alert('Error: No se pudo cargar el simulacro 2. Por favor, recarga la pÃ¡gina.');
            return false;
        }
        window.currentQuizData = window.RAW_QUIZ_DATA_2;
    } else if (simulacro.numero === 3) {
        // Simulacro 3: usa quizData3 (experto - 60 preguntas)
        if (!window.RAW_QUIZ_DATA_3) {
            console.error('RAW_QUIZ_DATA_3 no estÃ¡ definido');
            alert('Error: No se pudo cargar el simulacro 3. Por favor, recarga la pÃ¡gina.');
            return false;
        }
        window.currentQuizData = window.RAW_QUIZ_DATA_3;
    } else {
        alert(`Simulacro ${simulacro.numero} prÃ³ximamente disponible.`);
        return false;
    }

    // Validation
    if (!window.currentQuizData || !window.currentQuizData.questions) {
        console.error('â Error crÃ­tico: Datos del quiz no encontrados', window.currentQuizData);
        alert('Error crÃ­tico: No se pudieron cargar los datos del simulacro. Por favor, intenta de nuevo o recarga la pÃ¡gina.');
        return false;
    }

    console.log('â Quiz data cargado:', window.currentQuizData.questions.length, 'preguntas');

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
    console.log(`ð Cambio de contexto: Cargando datos frescos para Simulacro ${simulacro.numero}...`);
    userProgress = {}; // CRITICAL: Clear memory first

    // Pass current user to ensure we look up the right cloud record
    const user = supabaseApp?.auth?.getUser ? (await supabaseApp.auth.getUser()).data.user : null;
    await cargarProgreso(user);

    return true;
}

async function startSimulacro(simulacro) {
    const loaded = await loadSimulacroContext(simulacro);
    if (!loaded) return;

    // console.log('ð Iniciando simulacro:', simulacro.titulo); // Already logged in loadSimulacroContext


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
                <div style="font-size: 4rem; margin-bottom: 1rem;">ð</div>
                <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
                    Contenido Premium
                </h2>
                <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6;">
                    Este simulacro estÃ¡ disponible solo para usuarios premium. ContÃ¡ctanos para obtener acceso completo a todos los simulacros.
                </p>
            </div>
            
            <div style="background: var(--bg-body-start); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
                <h3 style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.75rem;">
                    Â¿QuÃ© incluye Premium?
                </h3>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="padding: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">
                        â Acceso a todos los simulacros
                    </li>
                    <li style="padding: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">
                        â 500+ preguntas de alta dificultad
                    </li>
                    <li style="padding: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">
                        â Reportes detallados por categorÃ­a
                    </li>
                    <li style="padding: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">
                        â Actualizaciones mensuales
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
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('docs-view').classList.add('hidden');
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.add('hidden');
    document.getElementById('profile-view').classList.add('hidden');
    document.getElementById('reports-view').classList.add('hidden');
    document.getElementById('admin-view').classList.add('hidden');

    if (viewId === 'docs') {
        document.getElementById('docs-view').classList.remove('hidden');
    } else if (viewId === 'dashboard') {
        document.getElementById('dashboard').classList.remove('hidden');
        updateDashboardStats();
    } else if (viewId === 'profile') {
        document.getElementById('profile-view').classList.remove('hidden');
        renderActivityCalendar();
        updateDashboardStats(); // Update stats in profile too
    } else if (viewId === 'reports') {
        document.getElementById('reports-view').classList.remove('hidden');
    } else if (viewId === 'admin') {
        console.log("ð ï¸ Entrando a Panel Admin");
        const adminView = document.getElementById('admin-view');
        if (adminView) {
            adminView.classList.remove('hidden');
            loadAllUsers(); // Auto-load user list
        }
    }

    // Show/hide back arrow in header
    const backBtn = document.getElementById('header-back-btn');
    if (backBtn) {
        if (viewId === 'profile' || viewId === 'reports' || viewId === 'admin') {
            backBtn.style.display = 'flex';
        } else {
            backBtn.style.display = 'none';
        }
    }

    // Always close profile menu when switching views
    const profileMenu = document.getElementById('profileMenu');
    if (profileMenu) profileMenu.classList.remove('active');

    // Handle Timer
    if (viewId === 'quiz-view') {
        startTimer();
    } else {
        stopTimer();
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
window.prevQuestion = prevQuestion; // Nueva funciÃ³n
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
            if (confirm('Â¿Deseas reiniciar el simulacro desde el inicio?')) {
                restartQuiz();
                return;
            }
        }
        console.log("â Continuando desde pregunta:", lastIndex + 1);
        currentQuestionIndex = lastIndex;
    } else {
        console.log("â Iniciando nuevo simulacro");
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
            console.log("â±ï¸ Auto-guardando tiempo...");
            guardarProgresoCompleto(true); // true = silent/background save
        }
    }, 1000);
    console.log("â±ï¸ Timer iniciado");
}

function stopTimer() {
    if (studyTimer) {
        clearInterval(studyTimer);
        studyTimer = null;
        console.log("â±ï¸ Timer detenido. Tiempo total:", userProgress.totalTime);
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
    // ð GUARD: Prevent re-answering if already answered
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
        "EvaluaciÃ³n y RetroalimentaciÃ³n": "var(--accent-color)",
        "Estrategias PedagÃ³gicas": "var(--secondary-color)",
        "PlanificaciÃ³n Curricular": "#16a085", // Teal

        // Inclusion & Values
        "InclusiÃ³n y Diversidad": "var(--success-color)",
        "Convivencia y Valores": "#e67e22", // Orange

        // Legal & Management
        "Marco Legal y Normativo": "var(--warning-color)",
        "GestiÃ³n Institucional": "#2c3e50", // Dark Blue

        // Skills & Cognitive
        "Competencias EspecÃ­ficas": "#9b59b6", // Purple
        "Desarrollo Cognitivo": "#2980b9", // Blue
        "Razonamiento LÃ³gico": "#8e44ad", // Deep Purple

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

    // Guardar respuesta con Ã­ndice original y timestamp
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
            rationaleBox.innerText = selectedOpt.rationale || "ExplicaciÃ³n no disponible.";
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
        statusEl.innerHTML = "ð¾ Guardando...";
        statusEl.classList.add('visible');
    }

    console.log(`ð¾ Progreso guardado localmente (${key}): Pregunta ${preguntaIdx + 1}, Score: ${score}`);

    // Flag to track if we are already syncing
    let isSyncing = false;

    // CLOUD SYNC: Only for main simulacro for now
    // Allow logic if no specific ID OR if it is explicitly Sim 1
    const isDefaultSim = !currentSimulacroId || (window.currentSimulacroNum === 1);

    if (supabaseApp && isDefaultSim) {
        if (statusEl) {
            statusEl.innerHTML = "âï¸ Sincronizando...";
            statusEl.classList.add('visible');
        }

        // Prevent concurrent syncs for the same question index if needed, 
        // but here we just want to ensure UI clears.

        try {
            // LEGACY SYNC REMOVED (Table 'simulacro_progress' deleted)
            // We now rely on 'guardarProgresoCompleto' (V2 Unified) which is called periodically
            // or on specific events. 
            console.log("â¹ï¸ Sync V1 omitido (MigraciÃ³n a V2 completa)");

            console.log(`âï¸ Sincronizado a la nube: ${preguntaIdx + 1}/${quizData.length}`);

            if (statusEl) {
                statusEl.innerHTML = "âï¸ Guardado (V2)";
            }
        } catch (error) {
            console.error('â Error al guardar en cloud:', error);
            if (statusEl) {
                statusEl.innerHTML = "â ï¸ Offline (Local OK)";
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
            if (currentSimulacroId) statusEl.innerHTML = "ð¾ Local OK";
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
        statusEl.innerHTML = "ð¾ Guardando...";
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
    if (!silent) console.log(`ð¾ Progreso completo guardado localmente en ${key}`);

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
                    console.error('â Error al guardar progreso V2:', error);
                    if (!silent && statusEl) statusEl.innerHTML = "â ï¸ Error Sync V2";
                } else {
                    if (!silent) {
                        console.log(`âï¸ Progreso V2 (${currentSimulacroId}) sincronizado`);
                        if (statusEl) statusEl.innerHTML = "âï¸ Sincronizado";
                    }
                }
            }
        } catch (error) {
            console.error('â Error al sincronizar V2:', error);
            if (!silent && statusEl) statusEl.innerHTML = "â ï¸ Error Red V2";
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
            statusEl.innerHTML = "ð¾ Guardado (Local)";
            setTimeout(() => { statusEl.classList.remove('visible'); }, 2000);
        }
    }
}

// Nueva funciÃ³n para sincronizar manualmente
async function sincronizarDatos() {
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
        statusEl.innerHTML = "ð Sincronizando...";
        statusEl.classList.add('visible');
    }

    await cargarProgreso();
    updateDashboardStats(); // Refresh UI with new data

    if (statusEl) {
        statusEl.innerHTML = "â Datos actualizados";
        setTimeout(() => {
            statusEl.classList.remove('visible');
        }, 2000);
    }
}

// Bind to window
window.sincronizarDatos = sincronizarDatos;
async function cargarProgreso(user = null) {
    console.log("ð Cargando progreso...", user ? `(user: ${user.email})` : "(sin user)");
    const statusEl = document.getElementById('save-status');

    // Sim 1 -> simulacro_progress (Legacy) BUT we are migrating to V2
    // Sim 2+ -> simulacro_progress_v2
    const isSim1 = !window.currentSimulacroNum || window.currentSimulacroNum === 1;

    // Force Sim 1 ID if not set (Migration Logic)
    if (isSim1 && !currentSimulacroId) {
        currentSimulacroId = 'd15c2a06-b97f-4349-817b-14e07377a0e6';
        console.log("â ï¸ Set fallback ID for Sim 1:", currentSimulacroId);
    }

    if (supabaseApp && user) {
        try {
            console.log("â Usuario provisto:", user.email);

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Supabase query timeout (5s)')), 5000)
            );

            // ALWAYS try V2 first (Unified Architecture)
            console.log(`â Consultando progreso Sim ${window.currentSimulacroNum || 1} (simulacro_progress_v2)...`);

            let queryPromise = supabaseApp
                .from('simulacro_progress_v2')
                .select('*')
                .eq('user_id', user.id)
                .eq('simulacro_id', currentSimulacroId)
                .eq('user_id', user.id)
                .eq('simulacro_id', currentSimulacroId)
                .maybeSingle(); // Use maybeSingle to avoid 406 error if empty

            let { data, error } = await Promise.race([queryPromise, timeoutPromise]);

            // Legacy Table (simulacro_progress) is DELETED. 
            // Removed fallback to prevent 404 errors in console.

            if (data && !error) {
                console.log(`âï¸ Datos encontrados para Sim ${window.currentSimulacroNum || 1}`);

                // Normalise data structure
                // Sim 1: root object IS the record (data.score, data.progress_data, etc.)
                // Sim 2: root object IS the record too, same structure mostly.

                const cloudProgress = data.progress_data || {};
                const cloudTime = new Date(data.updated_at || 0).getTime();

                // Get Local Data for comparison
                const key = getStorageKey();
                const saved = localStorage.getItem(key);
                const localData = saved ? JSON.parse(saved) : null;
                const localTime = new Date(localData ? (localData.timestamp || 0) : 0).getTime();
                const localAnswerCount = localData ? Object.keys(localData.answers || {}).length : 0;
                const cloudAnswerCount = Object.keys(cloudProgress).length;

                console.log(`ï¿½ Comparando: Nube (${cloudAnswerCount} resp, ${new Date(cloudTime).toLocaleTimeString()}) vs Local (${localAnswerCount} resp, ${new Date(localTime).toLocaleTimeString()})`);
                console.log(` Comparando: Nube (${cloudAnswerCount} resp, ${new Date(cloudTime).toLocaleTimeString()}) vs Local (${localAnswerCount} resp, ${new Date(localTime).toLocaleTimeString()})`);

                // DECISION LOGIC: CLOUD AUTHORITY (Requested by User)
                // We trust cloud data as the single source of truth.
                // If cloud data exists, we use it and overwrite local.
                let useCloud = true;
                let syncReason = 'Prioridad Nube (Forzada)';

                /* LEGACY LOGIC - DISABLED
                if (Math.abs(cloudTime - localTime) > 10000) {
                    if (cloudTime > localTime) {
                        useCloud = true;
                        syncReason = 'nube es mÃ¡s reciente (>10s)';
                    } else {
                        useCloud = false;
                        syncReason = 'local es mÃ¡s reciente (>10s)';
                    }
                } else {
                    if (cloudAnswerCount >= localAnswerCount) {
                        useCloud = true;
                    } else {
                        useCloud = false;
                    }
                }
                */

                console.log(`ð DecisiÃ³n final: ${useCloud ? 'NUBE âï¸' : 'LOCAL ð¾'} (${syncReason})`);

                if (useCloud) {
                    // USE CLOUD DATA
                    userProgress = { ...cloudProgress };
                    score = data.score || Object.values(userProgress).filter(a => a && a.isCorrect).length;

                    // Handle 'last_index'
                    userProgress.safeLastIndex = (data.last_index !== undefined) ? data.last_index : (userProgress.safeLastIndex || 0);

                    // Restore other fields
                    currentQuestionIndex = userProgress.safeLastIndex;

                    // FORCE OVERWRITE LOCAL STORAGE
                    localStorage.setItem(key, JSON.stringify({
                        lastIndex: userProgress.safeLastIndex,
                        score: score,
                        answers: userProgress,
                        timestamp: data.updated_at,
                        totalTime: userProgress.totalTime || cloudProgress.totalTime || 0
                    }));

                    console.log(`âï¸ USANDO NUBE: ${Object.keys(userProgress).length} respuestas, Score: ${score}`);
                    if (statusEl) {
                        statusEl.innerHTML = "âï¸ Restaurado";
                        statusEl.classList.add('visible');
                        setTimeout(() => {
                            if (statusEl) statusEl.classList.remove('visible');
                        }, 2000);
                    }
                }

            } else if (error && error.code !== 'PGRST116') {
                console.warn("â ï¸ Error obteniendo progreso nube", error.message);
                cargarProgresoLocal();
            } else {
                // No cloud data (PGRST116 or empty)
                console.log("ð Sin datos en nube para este simulacro.");

                // Special check for Migration (only relevant for Sim 1 primarily, but let's leave it safe)
                // Only try migration if we really have nothing locally either
                const key = getStorageKey();
                if (!localStorage.getItem(key) && isSim1) {
                    // ... Migration logic remains same or can be simplified ...
                    // For conciseness, I'll just call local load which handles default init
                    cargarProgresoLocal();
                } else {
                    cargarProgresoLocal();
                }
            }
        } catch (error) {
            console.error('â Error al cargar de cloud:', error);
            cargarProgresoLocal();
            if (statusEl) {
                statusEl.classList.remove('visible');
            }
        }
    } else {
        // No Supabase or No User
        console.log("â ï¸ Carga local (Sin usuario/Supabase o Sim Offline)");
        cargarProgresoLocal();
    }

    // Force dashboard update
    console.log("ð Actualizando dashboard con datos cargados...");
    await updateDashboardStats();

    // Sync UI if quiz is active
    if (!document.getElementById('quiz-view').classList.contains('hidden') && userProgress && userProgress.safeLastIndex > 0) {
        // Basic jump to last index
        if (currentQuestionIndex === 0 && (!userProgress[0] || Object.keys(userProgress).length > 0)) {
            console.log("â Saltando a pregunta guardada:", userProgress.safeLastIndex + 1);
            currentQuestionIndex = userProgress.safeLastIndex;
            updateUI();

            // Show toast
            if (statusEl) {
                statusEl.innerHTML = "ð Progreso restaurado";
                statusEl.classList.add('visible');
                setTimeout(() => statusEl.classList.remove('visible'), 2000);
            }
        }
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
        "EvaluaciÃ³n y RetroalimentaciÃ³n": "var(--accent-color)",
        "Estrategias PedagÃ³gicas": "var(--secondary-color)",
        "PlanificaciÃ³n Curricular": "#16a085", // Teal

        // Inclusion & Values
        "InclusiÃ³n y Diversidad": "var(--success-color)",
        "Convivencia y Valores": "#e67e22", // Orange

        // Legal & Management
        "Marco Legal y Normativo": "var(--warning-color)",
        "GestiÃ³n Institucional": "#2c3e50", // Dark Blue

        // Skills & Cognitive
        "Competencias EspecÃ­ficas": "#9b59b6", // Purple
        "Desarrollo Cognitivo": "#2980b9", // Blue
        "Razonamiento LÃ³gico": "#8e44ad", // Deep Purple

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
        "EvaluaciÃ³n y RetroalimentaciÃ³n": "var(--accent-color)",
        "Estrategias PedagÃ³gicas": "var(--secondary-color)",
        "PlanificaciÃ³n Curricular": "#16a085",
        "InclusiÃ³n y Diversidad": "var(--success-color)",
        "Convivencia y Valores": "#e67e22",
        "Marco Legal y Normativo": "var(--warning-color)",
        "GestiÃ³n Institucional": "#2c3e50",
        "Competencias EspecÃ­ficas": "#9b59b6",
        "Desarrollo Cognitivo": "#2980b9",
        "Razonamiento LÃ³gico": "#8e44ad",
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
                             <span>â ${data.correct}</span>
                             <span>â ${data.incorrect}</span>
                             <span>â³ ${data.unanswered}</span>
                        </div>
                        <div style="color: var(--text-primary); font-weight: 500;">
                            ${answered > 0 ? `PrecisiÃ³n: ${accuracyVal}%` : 'Sin actividad'}
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
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">ð¯</div>
                    <div style="font-weight: 700;">Â¡Rendimiento Excelente!</div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">EstÃ¡s dominando todas las categorÃ­as actuales de este simulacro.</div>
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
                            ${answered > 0 ? `Tu precisiÃ³n es del ${accuracyVal}%.` : 'AÃºn no has practicado este tema.'} 
                            Se recomienda repasar los conceptos clave de esta Ã¡rea para mejorar tu puntaje global.
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
    // Si estamos en otro simulacro (2, 3, etc), sÃ­ usamos el ID Ãºnico
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
    console.log(`ð Cargando local desde: ${key}`);
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
            console.log(`â Progreso local (${key}): ${answerCount} respuestas, Score: ${score}`);
        } catch (e) {
            console.error('â Error al parsear progreso local:', e);
        }
    } else {
        console.log(`â¹ï¸ No hay progreso local en ${key}`);
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
async function setupRealtimeSync(user) {
    if (!supabaseApp || !user) {
        console.log("â ï¸ No se puede configurar realtime: falta Supabase o usuario");
        return;
    }

    // Cleanup existing channel if any
    if (realtimeChannel) {
        console.log("ð Desconectando canal anterior...");
        await supabaseApp.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }

    // Subscribe to changes on this user's progress
    console.log("ð¡ Configurando sincronizaciÃ³n en tiempo real...");
    realtimeChannel = supabaseApp
        .channel(`progress-${user.id}`)
        .on('postgres_changes', {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'simulacro_progress',
            filter: `user_id=eq.${user.id}`
        }, async (payload) => {
            console.log('â¨ Cambio detectado desde otro dispositivo');
            console.log('   Tipo:', payload.eventType);

            // Reload progress silently
            await cargarProgreso(user);
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('ð SincronizaciÃ³n en tiempo real activada');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('â Error en canal de sincronizaciÃ³n');
            } else if (status === 'TIMED_OUT') {
                console.warn('â±ï¸ Timeout en canal de sincronizaciÃ³n');
            }
        });
}

// Login con Google usando Firebase
async function loginWithGoogle() {
    if (typeof auth === 'undefined') {
        alert("Sistema de autenticaciÃ³n no disponible. Por favor recarga la pÃ¡gina.");
        return;
    }

    console.log("ð Iniciando login con Google (Firebase)...");

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // PWA recommendation: use signInWithRedirect on mobile
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://');
            
        if (isStandalone || window.innerWidth < 768) {
             await auth.signInWithRedirect(provider);
        } else {
             await auth.signInWithPopup(provider);
        }
    } catch (error) {
        console.error("â Error inesperado:", error);
        alert("Error inesperado: " + error.message);
    }
}

async function logout() {
    console.log("ð±ï¸ Logout click! Forzando salida local...");

    try {
        // 1. LIMPIEZA LOCAL INMEDIATA (Prioridad Usuario)
        // localStorage.removeItem('progresoUsuario'); // â ï¸ DISABLED to prevent data loss of legacy data
        userProgress = {};
        score = 0;
        currentQuestionIndex = 0;

        // 2. Mostrar Login YA MISMO
        showLogin();
        console.log("â UI limpia y reseteada");

        // 3. Intentar cerrar sesiÃ³n en servidor (Background - No bloqueante)
        if (typeof auth !== 'undefined') {
            console.log("ð¡ Enviando signOut a Firebase (Background)...");
            auth.signOut().then(() => {
                 console.log("â SesiÃ³n cerrada en servidor");
            }).catch((error) => {
                 console.warn("â ï¸ Error en signOut servidor:", error.message);
            });
        }
    } catch (error) {
        console.error("â Error crÃ­tico en logout:", error);
        // Fallback final: Recargar pÃ¡gina para asegurar limpieza
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
            alert('Para instalar:\n- Android/Chrome: MenÃº (â®) > Instalar app o Agregar a inicio.\n- iOS/Safari: Compartir (cuaadrito con flecha) > Agregar a inicio.');
        }
    });
});

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show the install buttons when the browser is ready to prompt
    installBtns.forEach(btn => btn.style.display = 'block');
    console.log("ð± PWA install prompt is ready and button is visible.");
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
            if (!canAccess) label = `ð ${label}`;
            // if (sim.es_premium) label = `â­ ${label}`;

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
        console.warn(Infraccion detectada: Cambio de pestana/app (/));

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
