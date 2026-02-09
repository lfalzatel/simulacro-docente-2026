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

                    // BLOCK UI: Mostrar "Sincronizando..." antes de permitir nada
                    document.getElementById('save-status').innerText = "☁️ Sincronizando...";
                    document.getElementById('options').style.pointerEvents = 'none'; // Bloquear clicks

                    await showDashboard(session.user);
                    await cargarProgreso();

                    // UNBLOCK UI
                    document.getElementById('save-status').innerText = "";
                    document.getElementById('options').style.pointerEvents = 'auto';

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

                        // BLOCK UI
                        document.getElementById('save-status').innerText = "☁️ Sincronizando...";
                        document.getElementById('options').style.pointerEvents = 'none';

                        await showDashboard(session.user);
                        await cargarProgreso();

                        // UNBLOCK UI
                        document.getElementById('save-status').innerText = "";
                        document.getElementById('options').style.pointerEvents = 'auto';
                    } else {
                        console.log("→ No hay sesión inicial");
                        showLogin();
                    }
                }
            });

            // Check session normally (Supabase handles hash automatically)
            const { data: { session }, error } = await supabaseApp.auth.getSession();

            if (session) {
                console.log("✓ Sesión activa:", session.user.email);
                await showDashboard(session.user);
                await cargarProgreso();
            } else {
                console.log("→ No hay sesión activa inicial");
                if (!isProcessingAuth) showLogin();
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

    // Update dashboard stats
    await updateDashboardStats();
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
}

function switchView(viewId) {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('docs-view').classList.add('hidden');
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.add('hidden');
    document.getElementById('profile-view').classList.add('hidden'); // Ensure profile is hidden initially

    if (viewId === 'docs') {
        document.getElementById('docs-view').classList.remove('hidden');
    } else if (viewId === 'dashboard') {
        document.getElementById('dashboard').classList.remove('hidden');
        updateDashboardStats();
    } else if (viewId === 'profile') {
        document.getElementById('profile-view').classList.remove('hidden');
        renderActivityCalendar();
        updateDashboardStats(); // Update stats in profile too
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
    localStorage.setItem('progresoUsuario', JSON.stringify({
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

    console.log(`💾 Progreso guardado localmente: Pregunta ${preguntaIdx + 1}, Score: ${score}`);

    // Flag to track if we are already syncing
    let isSyncing = false;

    if (supabaseApp) {
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
        // If no supabase, clear immediately after short delay
        if (statusEl) {
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

    localStorage.setItem('progresoUsuario', JSON.stringify(progressData));
    if (!silent) console.log(`💾 Progreso completo guardado localmente`);

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

async function cargarProgreso() {
    console.log("📂 Cargando progreso...");

    const saved = localStorage.getItem('progresoUsuario');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            userProgress = data.answers || {};
            // Ensure totalTime is restored
            if (data.answers && data.answers.totalTime) {
                userProgress.totalTime = data.answers.totalTime;
            } else if (data.totalTime) {
                // Legacy support just in case
                userProgress.totalTime = data.totalTime;
            }

            // RECALCULATE SCORE to ensure consistency
            score = Object.values(userProgress).filter(a => a && a.isCorrect).length;
            userProgress.safeLastIndex = data.lastIndex || 0;
            console.log(`✓ Progreso local: ${Object.keys(userProgress).length - 1} respuestas, Score: ${score}`);
        } catch (e) {
            console.error('❌ Error al parsear progreso local:', e);
        }
    }

    // Update UI Status
    const statusEl = document.getElementById('save-status');

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
                    // SMART SYNC: Compare actual progress, not just timestamps
                    const cloudProgress = data.progress_data || {};
                    const cloudAnswerCount = Object.keys(cloudProgress).filter(k => k !== 'totalTime' && k !== 'safeLastIndex').length;

                    const localData = saved ? JSON.parse(saved) : null;
                    const localProgress = localData ? (localData.answers || {}) : {};
                    const localAnswerCount = Object.keys(localProgress).filter(k => k !== 'totalTime' && k !== 'safeLastIndex').length;

                    const cloudTimestamp = new Date(data.updated_at);
                    const localTimestamp = localData ? new Date(localData.timestamp) : new Date(0);

                    let useCloud = false;
                    let syncReason = '';

                    // Decision logic: prioritize progress over timestamp
                    if (cloudAnswerCount > localAnswerCount) {
                        useCloud = true;
                        syncReason = `nube tiene más respuestas (${cloudAnswerCount} vs ${localAnswerCount})`;
                    } else if (localAnswerCount > cloudAnswerCount) {
                        useCloud = false;
                        syncReason = `local tiene más respuestas (${localAnswerCount} vs ${cloudAnswerCount})`;
                    } else if (cloudTimestamp > localTimestamp) {
                        useCloud = true;
                        syncReason = 'timestamps iguales pero nube más reciente';
                    } else {
                        syncReason = 'local más reciente o igual';
                    }

                    console.log(`🔄 Decisión de sincronización: ${syncReason}`);

                    if (useCloud) {
                        userProgress = cloudProgress;
                        score = Object.values(userProgress).filter(a => a && a.isCorrect).length;
                        userProgress.safeLastIndex = data.last_index || 0;
                        currentQuestionIndex = userProgress.safeLastIndex;

                        // FORCE LOCAL UPDATE
                        localStorage.setItem('progresoUsuario', JSON.stringify({
                            lastIndex: data.last_index,
                            score: score,
                            answers: cloudProgress,
                            timestamp: data.updated_at,
                            totalTime: cloudProgress.totalTime || 0
                        }));

                        console.log(`☁️ RESTAURADO DE LA NUBE: ${cloudAnswerCount} respuestas, Score: ${score}`);
                        if (statusEl) {
                            statusEl.innerHTML = "☁️ Progreso Restaurado";
                            statusEl.classList.add('visible');
                            setTimeout(() => {
                                if (statusEl) statusEl.classList.remove('visible');
                            }, 3000);
                        }
                    } else {
                        console.log(`✓ Usando progreso local: ${localAnswerCount} respuestas`);
                    }
                } else if (error && error.code !== 'PGRST116') {
                    console.warn("⚠️ Error obteniendo progreso nube (puede ser usuario nuevo)", error.message);
                }
            }
        } catch (error) {
            console.error('❌ Error al cargar de cloud:', error);
            if (statusEl) {
                statusEl.classList.remove('visible'); // Clear stuck notification
            }
        }
    }

    // Force dashboard update after load completes
    updateDashboardStats();
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