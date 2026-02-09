// Safe Initialization of Variables
let quizData = null;
let currentQuestionIndex = 0;
let score = 0;
let userProgress = {};
let supabaseApp = null;
let isProcessingAuth = false; // Flag to prevent loops

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
                    isProcessingAuth = false;
                    // Limpiar hash después de login exitoso
                    if (window.location.hash) {
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                    await showDashboard(session.user);
                    await cargarProgreso();
                } else if (event === 'SIGNED_OUT') {
                    console.log("→ Sesión cerrada");
                    showLogin();
                } else if (event === 'INITIAL_SESSION') {
                    // Si estamos procesando auth, NO mostrar login inmediatamente
                    if (isProcessingAuth) {
                        console.log("⏳ Ignorando INITIAL_SESSION vacía (esperando OAuth)...");
                        return;
                    }

                    if (session) {
                        console.log("✓ Sesión inicial:", session.user.email);
                        await showDashboard(session.user);
                        await cargarProgreso();
                    } else {
                        console.log("→ No hay sesión inicial");
                        showLogin();
                    }
                }
            });

            // CRÍTICO: Detectar si hay callback OAuth
            const hash = window.location.hash;
            if (hash && hash.includes('access_token')) {
                console.log("🔐 Detectado callback de OAuth");
                isProcessingAuth = true;

                // INTENTO 1: Establecer sesión MANUALMENTE parseando el hash
                try {
                    const params = new URLSearchParams(hash.substring(1)); // quitar #
                    const access_token = params.get('access_token');
                    const refresh_token = params.get('refresh_token');

                    if (access_token && refresh_token) {
                        console.log("🛠️ Intentando establecer sesión manual...");
                        const { data, error } = await supabaseApp.auth.setSession({
                            access_token,
                            refresh_token,
                        });

                        if (!error && data?.session) {
                            console.log("✅ Sesión manual establecida:", data.session.user.email);
                            isProcessingAuth = false;

                            // Limpiar URL inmediatamente
                            window.history.replaceState(null, '', window.location.pathname);

                            await showDashboard(data.session.user);
                            await cargarProgreso();
                            return; // Éxito total, salir
                        } else {
                            console.warn("⚠️ Falló setSession manual:", error?.message);
                        }
                    }
                } catch (e) {
                    console.error("⚠️ Error parseando hash:", e);
                }

                // INTENTO 2: Fallback loop agresivo (si lo manual falló)
                let attempts = 0;
                const checkInterval = setInterval(async () => {
                    attempts++;
                    console.log(`🔄 Verificando sesión (${attempts}/10)...`);

                    const { data } = await supabaseApp.auth.getSession();
                    if (data?.session) {
                        console.log("✓ Sesión recuperada en intento " + attempts);
                        clearInterval(checkInterval);
                        isProcessingAuth = false;

                        if (window.location.hash) {
                            window.history.replaceState(null, '', window.location.pathname);
                        }

                        await showDashboard(data.session.user);
                        await cargarProgreso();
                    } else if (attempts >= 10) {
                        console.error("❌ Timeout esperando sesión OAuth");
                        clearInterval(checkInterval);
                        isProcessingAuth = false;
                        showLogin();
                    }
                }, 1000);

            } else {
                // Check normal si no hay hash
                const { data: { session }, error } = await supabaseApp.auth.getSession();

                if (session) {
                    console.log("✓ Sesión activa:", session.user.email);
                    await showDashboard(session.user);
                    await cargarProgreso();
                } else {
                    if (!isProcessingAuth) showLogin();
                }
            }

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
}

async function showDashboard(user) {
    console.log("📊 Mostrando Dashboard para:", user.email);
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('header').classList.remove('hidden');
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.add('hidden');
    document.getElementById('docs-view').classList.add('hidden');

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

    // Update dashboard stats
    await updateDashboardStats();
}

async function updateDashboardStats() {
    // Calcular estadísticas del progreso
    const answeredCount = Object.keys(userProgress).filter(k => k !== 'safeLastIndex').length;
    const totalQuestions = quizData ? quizData.length : 140;
    const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

    document.getElementById('stat-score').innerText = score > 0 ? score : '-';
    document.getElementById('stat-questions').innerText = answeredCount;
    document.getElementById('stat-progress').innerText = `${progressPercent}%`;

    // Actualizar texto del botón si hay progreso
    if (answeredCount > 0 && answeredCount < totalQuestions) {
        document.getElementById('resumeText').innerText = `Continuar Simulacro (${answeredCount}/${totalQuestions})`;
    } else if (answeredCount >= totalQuestions) {
        document.getElementById('resumeText').innerText = 'Reiniciar Simulacro';
    } else {
        document.getElementById('resumeText').innerText = 'Comenzar Simulacro';
    }
}

function switchView(viewId) {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('docs-view').classList.add('hidden');
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.add('hidden');

    if (viewId === 'docs') {
        document.getElementById('docs-view').classList.remove('hidden');
    } else if (viewId === 'dashboard') {
        document.getElementById('dashboard').classList.remove('hidden');
        updateDashboardStats();
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
}

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
    const prevBtn = document.getElementById('prev-btn'); // Nuevo botón
    const hintText = document.getElementById('hint-text');
    const hintTrigger = document.getElementById('hint-trigger');

    rationaleBox.style.display = 'none';
    nextBtn.style.display = 'none';

    // Mostrar botón anterior si no es la primera pregunta
    if (currentQuestionIndex > 0) {
        prevBtn.style.display = 'block';
    } else {
        prevBtn.style.display = 'none';
    }

    hintText.style.display = 'none';
    hintTrigger.style.display = q.hint ? 'block' : 'none';
    hintText.innerText = q.hint || '';

    qText.innerText = q.question;
    questionCount.innerText = `Pregunta ${currentQuestionIndex + 1} de ${quizData.length}`;

    const pct = ((currentQuestionIndex + 1) / quizData.length) * 100;
    progressBar.style.width = `${pct}%`;

    optionsContainer.innerHTML = '';
    q.answerOptions.forEach((opt, idx) => {
        const optDiv = document.createElement('div');
        optDiv.className = 'option';
        optDiv.innerText = opt.text;
        optDiv.onclick = () => selectOption(optDiv, opt.isCorrect, opt.rationale, q.answerOptions);
        optionsContainer.appendChild(optDiv);
    });
}

function selectOption(el, isCorrect, rationale, allOptions) {
    if (document.getElementById('next-btn').style.display === 'block') return;

    const options = document.querySelectorAll('.option');
    options.forEach(opt => {
        opt.style.cursor = 'default';
        opt.onclick = null;
    });

    const rationaleBox = document.getElementById('rationale-box');
    rationaleBox.style.display = 'block';
    rationaleBox.innerText = rationale;

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

    guardarRespuesta(currentQuestionIndex, isCorrect);

    const nextBtn = document.getElementById('next-btn');
    nextBtn.style.display = 'block';

    // AUTO-SCROLL: Bajar suavemente hacia la explicación y el botón siguiente
    setTimeout(() => {
        nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function toggleHint() {
    const h = document.getElementById('hint-text');
    h.style.display = h.style.display === 'none' ? 'block' : 'none';
}

function nextQuestion() {
    currentQuestionIndex++;
    updateUI();
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        updateUI();
    }
}

function showResults() {
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.remove('hidden');

    const percentage = Math.round((score / quizData.length) * 100);
    document.getElementById('final-score').innerText = `${percentage}%`;

    let message = "";
    if (percentage >= 90) message = "¡Excelente! Estás totalmente preparado para el concurso.";
    else if (percentage >= 70) message = "¡Buen trabajo! Tienes un conocimiento sólido.";
    else if (percentage >= 50) message = "Aceptable. Se recomienda reforzar algunos temas.";
    else message = "Necesitas estudiar más. No te rindas, la práctica hace al maestro.";

    document.getElementById('results-text').innerText = `Lograste ${score} de ${quizData.length} puntos. ${message}`;

    guardarProgresoCompleto();
}

async function guardarRespuesta(preguntaIdx, esCorrecta) {
    userProgress[preguntaIdx] = esCorrecta;
    userProgress.safeLastIndex = preguntaIdx;

    // Update Local
    localStorage.setItem('progresoUsuario', JSON.stringify({
        lastIndex: preguntaIdx,
        score: score,
        answers: userProgress,
        timestamp: new Date().toISOString()
    }));

    // Update UI Status
    const statusEl = document.getElementById('save-status');
    if (statusEl) statusEl.innerText = "💾 Guardando...";

    console.log(`💾 Progreso guardado localmente: Pregunta ${preguntaIdx + 1}, Score: ${score}`);

    if (supabaseApp) {
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
                    statusEl.innerText = "☁️ Guardado";
                    setTimeout(() => { if (statusEl) statusEl.innerText = ""; }, 2000);
                }
            }
        } catch (error) {
            console.error('❌ Error al guardar en cloud:', error);
            if (statusEl) statusEl.innerText = "⚠️ Offline (Local OK)";
        }
    }
}

async function guardarProgresoCompleto() {
    const progressData = {
        lastIndex: currentQuestionIndex,
        score: score,
        answers: userProgress,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('progresoUsuario', JSON.stringify(progressData));
    console.log(`💾 Progreso completo guardado localmente`);

    if (supabaseApp) {
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
                } else {
                    console.log(`☁️ Progreso completo sincronizado`);
                }
            }
        } catch (error) {
            console.error('❌ Error al sincronizar:', error);
        }
    }
}

async function cargarProgreso() {
    console.log("📂 Cargando progreso...");

    const saved = localStorage.getItem('progresoUsuario');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            userProgress = data.answers || {};
            score = data.score || 0;
            userProgress.safeLastIndex = data.lastIndex || 0;
            console.log(`✓ Progreso local: ${Object.keys(userProgress).length - 1} respuestas, Score: ${score}`);
        } catch (e) {
            console.error('❌ Error al parsear progreso local:', e);
        }
    }

    if (supabaseApp) {
        try {
            const { data: { user } } = await supabaseApp.auth.getUser();
            if (user) {
                const { data, error } = await supabaseApp
                    .from('simulacro_progress')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (data && !error) {
                    const cloudTimestamp = new Date(data.updated_at);
                    const localData = saved ? JSON.parse(saved) : null;
                    const localTimestamp = localData ? new Date(localData.timestamp) : new Date(0);

                    if (cloudTimestamp > localTimestamp) {
                        userProgress = data.progress_data || {};
                        score = data.score || 0;
                        userProgress.safeLastIndex = data.last_index || 0;

                        localStorage.setItem('progresoUsuario', JSON.stringify({
                            lastIndex: data.last_index,
                            score: data.score,
                            answers: data.progress_data,
                            timestamp: data.updated_at
                        }));

                        console.log(`☁️ Progreso cloud (más reciente): ${Object.keys(userProgress).length - 1} respuestas`);
                    } else {
                        console.log(`✓ Usando progreso local (más reciente)`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error al cargar de cloud:', error);
        }
    }

    await updateDashboardStats();
}

// Login con Google - CORREGIDO
async function loginWithGoogle() {
    if (!supabaseApp) {
        alert("Sistema de autenticación no disponible. Por favor recarga la página.");
        return;
    }

    console.log("🔐 Iniciando login con Google...");

    try {
        // Usar la URL actual sin parámetros extra
        const redirectUrl = `${window.location.origin}${window.location.pathname}`;
        console.log("🔗 Redirect URL:", redirectUrl);

        const { data, error } = await supabaseApp.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
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
            e.stopPropagation();
        });
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✓ Service Worker registrado'))
            .catch(err => console.log('❌ Error SW:', err));
    });
}

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