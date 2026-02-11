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
        console.log("🚀 Iniciando aplicación...");

        // Load quiz data FIRST
        if (typeof RAW_QUIZ_DATA !== 'undefined') {
            quizData = RAW_QUIZ_DATA.questions;
            document.getElementById('quiz-title-display').innerText = RAW_QUIZ_DATA.quizTitle || 'Simulador Docente';
            console.log(`✓ ${quizData.length} preguntas cargadas`);
        } else {
            console.error("❌ RAW_QUIZ_DATA no definido");
        }

        // Init Supabase
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            const { createClient } = window.supabase;
            supabaseApp = createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("✓ Supabase inicializado");

            // Listen for auth changes PRIMERO
            supabaseApp.auth.onAuthStateChange(async (event, session) => {
                const email = session?.user?.email || '(sin sesión)';
                console.log(`🔔 Evento Auth: ${event} ${email}`);

                if (event === 'SIGNED_IN' && session) {
                    console.log("✓ Usuario autenticado:", session.user.email);
                    if (window.location.hash) {
                        window.history.replaceState(null, '', window.location.pathname);
                    }

                    // Debounce: Si es el mismo usuario, ignorar
                    if (lastAuthUserId === session.user.id) {
                        console.log("🔄 Usuario ya inicializado, omitiendo recarga dashboard.");
                        return;
                    }
                    lastAuthUserId = session.user.id;

                    // Solo mostrar dashboard, INITIAL_SESSION cargará los datos
                    console.log("→ Mostrando dashboard, esperando INITIAL_SESSION para datos...");
                    await showDashboard(session.user);

                } else if (event === 'SIGNED_OUT') {
                    console.log("→ Sesión cerrada");

                    // Cleanup realtime channel
                    if (realtimeChannel) {
                        console.log("🔌 Desconectando sincronización en tiempo real...");
                        await supabaseApp.removeChannel(realtimeChannel);
                        realtimeChannel = null;
                    }

                    showLogin();
                } else if (event === 'INITIAL_SESSION') {
                    if (session) {
                        console.log("✓ Sesión inicial:", session.user.email);
                        await showDashboard(session.user);
                        await cargarProgreso(session.user); // Pass user from session
                        await setupRealtimeSync(session.user); // Enable cross-device sync
                    } else {
                        console.log("→ No hay sesión inicial");
                        showLogin();
                    }
                }
            });

            // NOTE: Don't manually check session here - onAuthStateChange will fire INITIAL_SESSION
            // Doing both causes race conditions on reload where session might not be ready yet

        } else {
            console.warn("⚠ Supabase SDK no cargado. Usando modo local.");
            showLogin();
        }

    } catch (error) {
        console.error('❌ Error init:', error);
        showLogin();
    }
}

function showLogin() {
    console.log("📱 Mostrando Login");
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('header').classList.add('hidden');
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.add('hidden');
    document.getElementById('docs-view').classList.add('hidden');
    document.getElementById('profile-view').classList.add('hidden');
}

async function showDashboard(user) {
    console.log("📊 Mostrando Dashboard para:", user.email);
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
    console.log(`✓ Rol asignado: ${userRole}`);
    await renderSimulacroCards();

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
    const message = visitCount === 0 ? '¡Bienvenido! 👋' : '¡Hola de nuevo! 👋';
    welcomeEl.textContent = message;

    // Increment visit count
    localStorage.setItem(storageKey, (visitCount + 1).toString());
}

async function updateDashboardStats() {
    // 🛡️ RECALCULATE SCORE from logical source of truth
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

    // Actualizar texto del botón
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
}

// ==================== MULTI-SIMULATOR SYSTEM ====================

async function getUserRole(user) {
    if (!user) return 'free';

    // 🛡️ SUPER ADMIN BYPASS: Always admin for owner
    if (user.email === 'lfalzatel@gmail.com') {
        console.log("👑 Super Admin detectado (Hardcoded)");
        return 'admin';
    }

    try {
        // Timeout promise
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout getting user role')), 3000)
        );

        // Fetch promise
        const fetchPromise = supabaseApp
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

        if (error) {
            console.warn('⚠️ No role found, creating free role:', error.message);
            // Auto-create free role for new users
            await supabaseApp.from('user_roles').insert({
                user_id: user.id,
                role: 'free'
            });
            return 'free';
        }

        return data?.role || 'free';
    } catch (err) {
        console.error('❌ Error getting user role:', err);
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
            if (res.error) console.error('⚠️ Supabase error loadSimulacros:', res.error);
        }

        // Fallback if data is missing or empty (Offline support)
        if (!data || data.length === 0) {
            console.warn("⚠️ Usando catálogo local de respaldo (Offline/Error)");
            data = [
                {
                    id: 'fixed_sim_1', // Dummy ID for fallback
                    numero: 1,
                    titulo: 'Simulacro General',
                    descripcion: 'Evaluación completa de competencias para el concurso docente.',
                    total_preguntas: 360,
                    es_premium: false,
                    activo: true
                },
                {
                    id: 'fixed_sim_2',
                    numero: 2,
                    titulo: 'Simulacro Premium',
                    descripcion: 'Preguntas avanzadas y casos de estudio específicos.',
                    total_preguntas: 35, // Updated to match actual available
                    es_premium: true,
                    activo: true
                }
            ];
        }

        simulacrosCatalog = data || [];
        console.log('✓ Simulacros cargados:', simulacrosCatalog.length);
        return simulacrosCatalog;
    } catch (err) {
        console.error('❌ Error loading simulacros:', err);
        return [];
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
                ${!canAccess ? '<div style="font-size: 1.5rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🔒</div>' : ''}
                ${sim.es_premium ? '<span style="background: linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%); color: #78350F; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">PREMIUM</span>' : '<span style="background: var(--success-bg); color: var(--success-text); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">GRATIS</span>'}
            </div>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5;">
                ${sim.descripcion || 'Prepárate con preguntas de alta calidad'}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.85rem; color: var(--text-secondary);">
                    📝 ${sim.total_preguntas} preguntas
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

async function startSimulacro(simulacro) {
    console.log('🚀 Iniciando simulacro:', simulacro.titulo);
    currentSimulacroId = simulacro.id;
    window.currentSimulacroNum = simulacro.numero; // Track number for sync logic

    // Cargar datos del quiz correspondiente
    if (simulacro.numero === 1) {
        // Simulacro 1: usa quizData original (360 preguntas)
        window.currentQuizData = window.RAW_QUIZ_DATA;
    } else if (simulacro.numero === 2) {
        // Simulacro 2: usa quizData2 (premium - 35 preguntas)
        if (!window.RAW_QUIZ_DATA_2) {
            alert('Error: No se pudo cargar el simulacro 2. Por favor, recarga la página.');
            console.error('RAW_QUIZ_DATA_2 no está definido');
            return;
        }
        window.currentQuizData = window.RAW_QUIZ_DATA_2;
    } else {
        alert(`Simulacro ${simulacro.numero} próximamente disponible.`);
        return;
    }

    // Validation
    if (!window.currentQuizData || !window.currentQuizData.questions) {
        console.error('❌ Error crítico: Datos del quiz no encontrados', window.currentQuizData);
        alert('Error crítico: No se pudieron cargar los datos del simulacro. Por favor, intenta de nuevo o recarga la página.');
        return;
    }

    console.log('✅ Quiz data cargado:', window.currentQuizData.questions.length, 'preguntas');

    // Reset global variables for new context
    quizData = window.currentQuizData.questions;
    score = 0;
    currentQuestionIndex = 0;

    // SMART LOAD: If Sim 1 and dashboard already loaded valid data, reuse it!
    if (simulacro.numero === 1 && userProgress && Object.keys(userProgress).length > 0) {
        console.log("♻️ Reusando progreso cargado en dashboard para Sim 1");
        // Update score just in case
        score = Object.values(userProgress).filter(a => a && a.isCorrect).length;
    } else {
        userProgress = {}; // Clear previous progress for other sims or clean state
        console.log('🔄 Cargando progreso local para simulacro:', simulacro.numero);
        cargarProgresoLocal();
    }

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
                <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
                <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
                    Contenido Premium
                </h2>
                <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6;">
                    Este simulacro está disponible solo para usuarios premium. Contáctanos para obtener acceso completo a todos los simulacros.
                </p>
            </div>
            
            <div style="background: var(--bg-body-start); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
                <h3 style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.75rem;">
                    ¿Qué incluye Premium?
                </h3>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="padding: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">
                        ✅ Acceso a todos los simulacros
                    </li>
                    <li style="padding: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">
                        ✅ 500+ preguntas de alta dificultad
                    </li>
                    <li style="padding: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">
                        ✅ Reportes detallados por categoría
                    </li>
                    <li style="padding: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">
                        ✅ Actualizaciones mensuales
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
    }

    // Show/hide back arrow in header
    const backBtn = document.getElementById('header-back-btn');
    if (backBtn) {
        if (viewId === 'profile' || viewId === 'reports') {
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
window.prevQuestion = prevQuestion; // Nueva función
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
            if (confirm('¿Deseas reiniciar el simulacro desde el inicio?')) {
                restartQuiz();
                return;
            }
        }
        console.log("→ Continuando desde pregunta:", lastIndex + 1);
        currentQuestionIndex = lastIndex;
    } else {
        console.log("→ Iniciando nuevo simulacro");
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
            console.log("⏱️ Auto-guardando tiempo...");
            guardarProgresoCompleto(true); // true = silent/background save
        }
    }, 1000);
    console.log("⏱️ Timer iniciado");
}

function stopTimer() {
    if (studyTimer) {
        clearInterval(studyTimer);
        studyTimer = null;
        console.log("⏱️ Timer detenido. Tiempo total:", userProgress.totalTime);
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
    // 🔒 GUARD: Prevent re-answering if already answered
    if (userProgress[currentQuestionIndex] !== undefined) return;

    if (document.getElementById('next-btn').style.display === 'block') return;

    // Bloquear todas las opciones
    const options = document.querySelectorAll('.option');
    options.forEach(opt => {
        opt.style.cursor = 'default';
        opt.onclick = null;
    });

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

    // Guardar respuesta con índice y timestamp
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
    q.answerOptions.forEach((opt, idx) => {
        const optDiv = document.createElement('div');
        optDiv.className = 'option';
        optDiv.innerText = opt.text;

        // If answered, apply styles immediately
        if (isAnswered) {
            optDiv.style.cursor = 'default';
            // Don't attach onclick

            // Re-apply visual state
            if (savedAnswer.selectedOptionIndex === idx) {
                optDiv.classList.add(savedAnswer.isCorrect ? 'correct' : 'wrong');
            }
            if (!savedAnswer.isCorrect && opt.isCorrect) {
                optDiv.classList.add('correct');
            }
        } else {
            // Normal interaction
            optDiv.onclick = () => selectOption(optDiv, opt.isCorrect, opt.rationale, q.answerOptions, idx);
        }

        optionsContainer.appendChild(optDiv);
    });

    // If answered, show rationale and next button
    if (isAnswered) {
        // Find rationale from options if not saved explicitly (assuming implicit from question)
        // Since we don't save rationale text, we pick it from the correct option or the selected one?
        // Code originally passed `opt.rationale` specific to the option? 
        // Looking at data, usually rationale is per question or correct option.
        // Let's use the selected option's rationale logic from before.

        // Find the option we selected to get its rationale, OR the correct one. 
        // Original code passed `opt.rationale` on click.
        const selectedOpt = q.answerOptions[savedAnswer.selectedOptionIndex];
        if (selectedOpt) {
            rationaleBox.style.display = 'block';
            rationaleBox.innerText = selectedOpt.rationale || "Explicación no disponible.";
        }

        nextBtn.style.display = 'block';
        hintTrigger.style.display = 'none'; // Hide hint if answered
    }
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
        statusEl.innerHTML = "💾 Guardando...";
        statusEl.classList.add('visible');
    }

    console.log(`💾 Progreso guardado localmente (${key}): Pregunta ${preguntaIdx + 1}, Score: ${score}`);

    // Flag to track if we are already syncing
    let isSyncing = false;

    // CLOUD SYNC: Only for main simulacro for now
    // Allow logic if no specific ID OR if it is explicitly Sim 1
    const isDefaultSim = !currentSimulacroId || (window.currentSimulacroNum === 1);

    if (supabaseApp && isDefaultSim) {
        if (statusEl) {
            statusEl.innerHTML = "☁️ Sincronizando...";
            statusEl.classList.add('visible');
        }

        // Prevent concurrent syncs for the same question index if needed, 
        // but here we just want to ensure UI clears.

        try {
            const { data: { user } } = await supabaseApp.auth.getUser();
            if (user) {
                await supabaseApp.from('simulacro_progress').upsert({
                    user_id: user.id,
                    progress_data: userProgress,
                    score: score,
                    last_index: preguntaIdx,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
                console.log(`☁️ Sincronizado a la nube: ${preguntaIdx + 1}/${quizData.length}`);

                if (statusEl) {
                    statusEl.innerHTML = "☁️ Guardado";
                }
            }
        } catch (error) {
            console.error('❌ Error al guardar en cloud:', error);
            if (statusEl) {
                statusEl.innerHTML = "⚠️ Offline (Local OK)";
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
            if (currentSimulacroId) statusEl.innerHTML = "💾 Local OK";
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
        statusEl.innerHTML = "💾 Guardando...";
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
    if (!silent) console.log(`💾 Progreso completo guardado localmente en ${key}`);

    // CLOUD SYNC: Only for default simulator (Simon 1)
    // to avoid mixing data in the single-row database table.
    const isDefaultSim = !currentSimulacroId || (window.currentSimulacroNum === 1);

    if (supabaseApp && isDefaultSim) {
        try {
            const { data: { user } } = await supabaseApp.auth.getUser();
            if (user) {
                const { error } = await supabaseApp.from('simulacro_progress').upsert({
                    user_id: user.id,
                    progress_data: userProgress,
                    score: score,
                    last_index: currentQuestionIndex,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

                if (error) {
                    console.error('❌ Error al guardar progreso:', error);
                    if (!silent && statusEl) statusEl.innerHTML = "⚠️ Error Sync";
                } else {
                    if (!silent) {
                        console.log(`☁️ Progreso completo sincronizado`);
                        if (statusEl) statusEl.innerHTML = "☁️ Sincronizado";
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error al sincronizar:', error);
            if (!silent && statusEl) statusEl.innerHTML = "⚠️ Error Red";
        } finally {
            // ALWAYS Clear Status after delay if interaction was not silent
            if (!silent && statusEl) {
                setTimeout(() => {
                    statusEl.classList.remove('visible');
                    // Optional: clear text after hidden transition
                }, 2000);
            }
        }
    } else if (currentSimulacroId) {
        // For other simulacros, just local save for now
        if (!silent && statusEl) {
            statusEl.innerHTML = "💾 Guardado (Local)";
            setTimeout(() => { statusEl.classList.remove('visible'); }, 2000);
        }
    }
}

// Nueva función para sincronizar manualmente
async function sincronizarDatos() {
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
        statusEl.innerHTML = "🔄 Sincronizando...";
        statusEl.classList.add('visible');
    }

    await cargarProgreso();
    updateDashboardStats(); // Refresh UI with new data

    if (statusEl) {
        statusEl.innerHTML = "✅ Datos actualizados";
        setTimeout(() => {
            statusEl.classList.remove('visible');
        }, 2000);
    }
}

// Bind to window
window.sincronizarDatos = sincronizarDatos;

async function cargarProgreso(user = null) {
    console.log("📂 Cargando progreso...", user ? `(user: ${user.email})` : "(sin user)");
    const statusEl = document.getElementById('save-status');

    // ALWAYS fetch from cloud FIRST if authenticated AND if we are in main simulacro
    // Cloud sync currently only supports single progress (main exam)
    const isDefaultSim = !currentSimulacroId || (window.currentSimulacroNum === 1);

    if (supabaseApp && user && isDefaultSim) {
        try {
            console.log("✓ Usuario provisto desde auth listener:", user.email);
            console.log("✓ Consultando progreso en Supabase...");
            console.log("   - user_id:", user.id);
            console.log("   - tabla: simulacro_progress");

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Supabase query timeout (5s)')), 5000)
            );

            const queryPromise = supabaseApp
                .from('simulacro_progress')
                .select('*')
                .eq('user_id', user.id)
                .single();

            console.log("⏳ Esperando respuesta de Supabase...");
            const { data, error } = await Promise.race([queryPromise, timeoutPromise])
                .catch(err => {
                    console.error("❌ Error en consulta Supabase:", err.message);
                    return { data: null, error: err };
                });

            console.log("📦 Respuesta Supabase:", { hasData: !!data, hasError: !!error, errorCode: error?.code, errorMsg: error?.message });

            if (data && !error) {
                console.log("☁️ Datos de nube encontrados:", {
                    respuestas: Object.keys(data.progress_data || {}).filter(k => k !== 'totalTime' && k !== 'safeLastIndex').length,
                    timestamp: data.updated_at
                });

                // Get local data for comparison
                const key = getStorageKey();
                const saved = localStorage.getItem(key);
                const localData = saved ? JSON.parse(saved) : null;
                const localProgress = localData ? (localData.answers || {}) : {};

                const cloudProgress = data.progress_data || {};
                const cloudAnswerCount = Object.keys(cloudProgress).filter(k => k !== 'totalTime' && k !== 'safeLastIndex').length;
                const localAnswerCount = Object.keys(localProgress).filter(k => k !== 'totalTime' && k !== 'safeLastIndex').length;

                const cloudTime = new Date(data.updated_at || 0).getTime();
                const localTime = new Date(localData ? (localData.timestamp || 0) : 0).getTime();

                console.log("🔍 Comparando:", {
                    nube: { count: cloudAnswerCount, time: new Date(cloudTime).toLocaleTimeString() },
                    local: { count: localAnswerCount, time: new Date(localTime).toLocaleTimeString() }
                });

                // DECISION LOGIC: 
                // 1. Prioritize Valid Timestamps (if difference > 10 seconds)
                // 2. Fallback to Quantity if time is close/invalid

                let useCloud = true;
                let syncReason = '';

                // Threshold to ignore minor clock skew (10 seconds)
                const TIME_THRESHOLD = 10000;

                if (cloudTime > localTime + TIME_THRESHOLD) {
                    useCloud = true;
                    syncReason = 'nube es más reciente (Timestamp)';
                } else if (localTime > cloudTime + TIME_THRESHOLD) {
                    useCloud = false;
                    syncReason = 'local es más reciente (Timestamp)';
                } else {
                    // Timestamps close or invalid: Use Quantity
                    if (cloudAnswerCount >= localAnswerCount) {
                        useCloud = true;
                        syncReason = 'nube tiene igual o más respuestas (Cantidad)';
                    } else {
                        useCloud = false;
                        syncReason = 'local tiene más respuestas (Cantidad)';
                    }
                }

                console.log(`🔄 Decisión final: ${useCloud ? 'NUBE ☁️' : 'LOCAL 💾'} (${syncReason})`);

                if (useCloud) {
                    // USE CLOUD DATA
                    userProgress = { ...cloudProgress };
                    score = Object.values(userProgress).filter(a => a && a.isCorrect).length;
                    userProgress.safeLastIndex = data.last_index || 0;
                    currentQuestionIndex = userProgress.safeLastIndex;

                    // Update localStorage with cloud data
                    localStorage.setItem(key, JSON.stringify({
                        lastIndex: data.last_index,
                        score: score,
                        answers: cloudProgress,
                        timestamp: data.updated_at,
                        totalTime: cloudProgress.totalTime || 0
                    }));

                    console.log(`☁️ USANDO NUBE: ${cloudAnswerCount} respuestas, Score: ${score}`);
                    if (statusEl) {
                        statusEl.innerHTML = "☁️ Progreso Sincronizado";
                        statusEl.classList.add('visible');
                        setTimeout(() => {
                            if (statusEl) statusEl.classList.remove('visible');
                        }, 2000);
                    }
                } else {
                    // USE LOCAL DATA (it has more)
                    const localData = JSON.parse(saved);
                    userProgress = localData.answers || {};
                    score = Object.values(userProgress).filter(a => a && a.isCorrect).length;
                    userProgress.safeLastIndex = localData.lastIndex || 0;
                    currentQuestionIndex = userProgress.safeLastIndex;
                    console.log(`💾 USANDO LOCAL: ${localAnswerCount} respuestas, Score: ${score}`);
                }

            } else if (error && error.code !== 'PGRST116') {
                console.warn("⚠️ Error obteniendo progreso nube", error.message);
                // Fallback to local
                cargarProgresoLocal();
            } else {
                // No cloud data, use local
                console.log("🆕 Sin datos en nube, usando local");
                cargarProgresoLocal();
            }
        } catch (error) {
            console.error('❌ Error al cargar de cloud:', error);
            cargarProgresoLocal();
            if (statusEl) {
                statusEl.classList.remove('visible');
            }
        }
    } else if (supabaseApp && !user) {
        // No user provided, fallback to local
        console.log("⚠️ cargarProgreso() sin usuario - usando solo datos locales");
        cargarProgresoLocal();
    } else {
        // No Supabase, use local only
        console.log("⚠️ Supabase no disponible - usando solo datos locales");
        cargarProgresoLocal();
    }

    // CRITICAL: Force dashboard update after load completes
    console.log("📈 Actualizando dashboard con datos cargados...");
    await updateDashboardStats();
    console.log("✓ Dashboard actualizado");

    // FIX: If we are already in the quiz view (race condition where user clicked start before load finished)
    // Update the question index if we are still at the beginning and have better data
    if (!document.getElementById('quiz-view').classList.contains('hidden') && userProgress && userProgress.safeLastIndex > 0) {
        console.log("⚠️ Datos llegaron tarde - Sincronizando Quiz en tiempo real");

        // Only jump if we are at Q1 (don't disrupt if user already answered Q1)
        // But allow jump if Q1 hasn't been answered yet (just viewed)
        if (currentQuestionIndex === 0 && !userProgress[0]) {
            console.log("→ Saltando a pregunta guardada:", userProgress.safeLastIndex + 1);
            currentQuestionIndex = userProgress.safeLastIndex;
            updateUI();

            // Show toast
            const statusEl = document.getElementById('save-status');
            if (statusEl) {
                statusEl.innerHTML = "🔄 Progreso restaurado";
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

    // 3. Render HTML
    container.innerHTML = '';

    categories.forEach(cat => {
        const data = stats[cat];
        const correctPct = (data.correct / data.total) * 100;
        const incorrectPct = (data.incorrect / data.total) * 100;
        // Unanswered is the remaining space automatically due to flex/width logic

        const html = `
            <div class="category-stat-item">
                <div class="cat-header">
                    <span>${cat}</span>
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

function renderReportsView() {
    const activeQuizData = window.currentQuizData ? window.currentQuizData.questions : (quizData || []);
    if (!activeQuizData || activeQuizData.length === 0) return;

    // Calculate overall statistics
    let totalQuestions = 0, correctAnswers = 0, incorrectAnswers = 0;
    Object.values(userProgress).forEach(answer => {
        totalQuestions++;
        answer.isCorrect ? correctAnswers++ : incorrectAnswers++;
    });
    const accuracy = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(1) : 0;

    // Update overall stats
    document.getElementById('report-total-questions').textContent = totalQuestions;
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
        if (answer) answer.isCorrect ? stats[cat].correct++ : stats[cat].incorrect++;
        else stats[cat].unanswered++;
    });

    // Calculate accuracy for each category
    Object.keys(stats).forEach(cat => {
        const data = stats[cat], answered = data.correct + data.incorrect;
        data.accuracy = answered > 0 ? ((data.correct / answered) * 100).toFixed(1) : 0;
    });

    // Sort categories by accuracy (lowest first) - Changed to sort by score (lowest coverage first)
    // To prioritize weak areas where score is low (either low accuracy or low participation)
    const categories = Object.keys(stats).sort((a, b) => {
        const scoreA = (stats[a].correct / stats[a].total);
        const scoreB = (stats[b].correct / stats[b].total);
        return scoreA - scoreB;
    });

    // Render category stats
    const categoryContainer = document.getElementById('reports-category-stats-container');
    if (categoryContainer) {
        categoryContainer.innerHTML = '';
        categories.forEach(cat => {
            const data = stats[cat], answered = data.correct + data.incorrect;

            // Percentage of TOTAL questions (Coverage/Score)
            const correctPct = (data.correct / data.total) * 100;
            const incorrectPct = (data.incorrect / data.total) * 100;
            const unansweredPct = 100 - correctPct - incorrectPct;

            // Accuracy of answered questions (Qualitative)
            const accuracy = answered > 0 ? ((data.correct / answered) * 100).toFixed(0) : 0;
            const score = ((data.correct / data.total) * 100).toFixed(0);

            const html = `
                <div style="padding: 1rem; background: var(--success-bg); border-radius: 8px; border: 1px solid var(--border); background-color: var(--bg-card);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <div style="font-weight: 600; color: var(--text-primary); max-width: 60%;">${cat}</div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end;">
                            <span style="font-size: 1.1rem; font-weight: bold; color: ${score >= 70 ? 'var(--success-text)' : score >= 50 ? 'var(--accent-secondary)' : 'var(--error-text)'};">${score}%</span>
                            <span style="font-size: 0.75rem; color: var(--text-secondary);">Puntaje Global</span>
                        </div>
                    </div>
                    
                    <div style="height: 12px; background: var(--bg-body-start); border-radius: 6px; overflow: hidden; display: flex; margin-bottom: 0.5rem; border: 1px solid var(--border-color);">
                        <div style="width: ${correctPct}%; background: var(--success-text);" title="Correctas: ${data.correct}"></div>
                        <div style="width: ${incorrectPct}%; background: var(--error-text);" title="Incorrectas: ${data.incorrect}"></div>
                         <!-- Implicit gray space for unanswered -->
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-secondary);">
                        <div style="display: flex; gap: 1rem;">
                            <span>✅ ${data.correct}</span>
                            <span>❌ ${data.incorrect}</span>
                            <span>⏳ ${data.unanswered}</span>
                        </div>
                        <div>
                             ${answered > 0 ? `Precisión: <b>${accuracy}%</b>` : 'Sin actividad'}
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
        const weakCategories = categories.filter(cat => {
            const data = stats[cat], answered = data.correct + data.incorrect;
            return answered > 0 && data.accuracy < 70;
        }).slice(0, 5);

        if (weakCategories.length === 0) {
            recommendationsContainer.innerHTML = '<div style="padding: 1rem; background: var(--success-bg); border-radius: 8px; color: var(--success-text); text-align: center;">🎉 ¡Excelente trabajo! Tienes un rendimiento sólido en todas las categorías.</div>';
        } else {
            weakCategories.forEach(cat => {
                const data = stats[cat];
                recommendationsContainer.insertAdjacentHTML('beforeend', `
                    <div style="padding: 0.75rem; background: var(--bg-body-start); border-left: 3px solid var(--accent-secondary); border-radius: 4px;">
                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${cat}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">
                            Precisión: ${data.accuracy}% - Refuerza este tema con preguntas adicionales y repaso de conceptos clave.
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
    // Si estamos en otro simulacro (2, 3, etc), sí usamos el ID único
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
    console.log(`📂 Cargando local desde: ${key}`);
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
            console.log(`✓ Progreso local (${key}): ${answerCount} respuestas, Score: ${score}`);
        } catch (e) {
            console.error('❌ Error al parsear progreso local:', e);
        }
    } else {
        console.log(`ℹ️ No hay progreso local en ${key}`);
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
        console.log("⚠️ No se puede configurar realtime: falta Supabase o usuario");
        return;
    }

    // Cleanup existing channel if any
    if (realtimeChannel) {
        console.log("🔌 Desconectando canal anterior...");
        await supabaseApp.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }

    // Subscribe to changes on this user's progress
    console.log("📡 Configurando sincronización en tiempo real...");
    realtimeChannel = supabaseApp
        .channel(`progress-${user.id}`)
        .on('postgres_changes', {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'simulacro_progress',
            filter: `user_id=eq.${user.id}`
        }, async (payload) => {
            console.log('✨ Cambio detectado desde otro dispositivo');
            console.log('   Tipo:', payload.eventType);

            // Reload progress silently
            await cargarProgreso(user);
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('🔔 Sincronización en tiempo real activada');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Error en canal de sincronización');
            } else if (status === 'TIMED_OUT') {
                console.warn('⏱️ Timeout en canal de sincronización');
            }
        });
}

// Login con Google - CORREGIDO para PWA
async function loginWithGoogle() {
    if (!supabaseApp) {
        alert("Sistema de autenticación no disponible. Por favor recarga la página.");
        return;
    }

    console.log("🔐 Iniciando login con Google...");

    try {
        // Detect if running as installed PWA
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://');

        console.log(`📱 Modo: ${isStandalone ? 'PWA Instalada' : 'Navegador'}`);

        // Use full page redirect for PWA, popup for browser
        const redirectUrl = `${window.location.origin}${window.location.pathname}`;
        console.log("🔗 Redirect URL:", redirectUrl);

        const { data, error } = await supabaseApp.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: false, // Always use browser redirect (works in PWA)
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        });

        if (error) {
            console.error("❌ Error de login:", error);
            alert("Error al iniciar sesión: " + error.message);
        } else {
            console.log("✓ Redirigiendo a Google...");
            // The redirect happens automatically
        }
    } catch (error) {
        console.error("❌ Error inesperado:", error);
        alert("Error inesperado. Por favor intenta de nuevo.");
    }
}

async function logout() {
    console.log("🖱️ Logout click! Forzando salida local...");

    try {
        // 1. LIMPIEZA LOCAL INMEDIATA (Prioridad Usuario)
        localStorage.removeItem('progresoUsuario');
        userProgress = {};
        score = 0;
        currentQuestionIndex = 0;

        // 2. Mostrar Login YA MISMO
        showLogin();
        console.log("✓ UI limpia y reseteada");

        // 3. Intentar cerrar sesión en servidor (Background - No bloqueante)
        if (supabaseApp) {
            console.log("📡 Enviando signOut a Supabase (Background)...");
            supabaseApp.auth.signOut().then(({ error }) => {
                if (error) console.warn("⚠️ Error en signOut servidor:", error.message);
                else console.log("✓ Sesión cerrada en servidor");
            });
        }
    } catch (error) {
        console.error("❌ Error crítico en logout:", error);
        // Fallback final: Recargar página para asegurar limpieza
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
const installBtn = document.getElementById('installAppBtn');

if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    if (installBtn) installBtn.style.display = 'none';
}

window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.style.display = 'none';
});

if (installBtn) {
    installBtn.addEventListener('click', () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => {
                deferredPrompt = null;
            });
        } else {
            alert('Para instalar: Chrome/Edge: Menú > Instalar app. Safari: Compartir > Agregar a inicio.');
        }
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});