// js/pages/inicio.js
// Lógica exclusiva de la página de inicio (simulacros + quiz)
// Requiere: firebase-init.js, auth-guard.js, quizData*.js cargados antes

'use strict';

// ── Variables globales de la página ───────────────────────────────────────
let quizData           = null;
let currentQuestionIndex = 0;
let score              = 0;
let userProgress       = {};
let currentSimulacroId = null;
let simulacrosCatalog  = [];
let userRole           = 'free';
let appUser            = null;
let studyTimer         = null;
let totalTime          = 0;

// ── Catálogo local de respaldo (sin Supabase) ─────────────────────────────
const FALLBACK_CATALOG = [
    {
        id: 'sim_1', numero: 1,
        titulo: 'Simulacro General',
        descripcion: 'Evaluación completa de competencias para el concurso docente.',
        total_preguntas: 0, es_premium: false, activo: true,
        emoji: '📘'
    },
    {
        id: 'sim_2', numero: 2,
        titulo: 'Simulacro Premium',
        descripcion: 'Preguntas avanzadas y casos de estudio específicos.',
        total_preguntas: 0, es_premium: true, activo: true,
        emoji: '🎯'
    },
    {
        id: 'sim_3', numero: 3,
        titulo: 'Simulacro Experto',
        descripcion: 'Preguntas de alta complejidad y análisis curricular profundo.',
        total_preguntas: 0, es_premium: true, activo: true,
        emoji: '🏆'
    }
];

// ── Init ──────────────────────────────────────────────────────────────────
async function inicioInit(user, role) {
    appUser  = user;
    userRole = role;
    window.appUser = user;

    // Sincronizar conteos reales desde los archivos de datos
    if (window.RAW_QUIZ_DATA?.questions)   FALLBACK_CATALOG[0].total_preguntas = window.RAW_QUIZ_DATA.questions.length;
    if (window.RAW_QUIZ_DATA_2?.questions) FALLBACK_CATALOG[1].total_preguntas = window.RAW_QUIZ_DATA_2.questions.length;
    if (window.RAW_QUIZ_DATA_3?.questions) FALLBACK_CATALOG[2].total_preguntas = window.RAW_QUIZ_DATA_3.questions.length;

    // Intentar cargar catálogo desde Firestore
    await loadSimulacrosCatalog(user);

    // Renderizar tarjetas
    renderSimulacroCards();

    // Cargar progreso guardado
    await cargarProgreso(user);
}

// ── Catálogo de simulacros ─────────────────────────────────────────────────
async function loadSimulacrosCatalog(user) {
    try {
        const snap = await window.db.collection('simulacros')
            .where('activo', '==', true)
            .orderBy('numero', 'asc')
            .get();

        if (!snap.empty) {
            simulacrosCatalog = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sincronizar conteos reales
            simulacrosCatalog.forEach((s, i) => {
                const real = FALLBACK_CATALOG[i]?.total_preguntas;
                if (real) s.total_preguntas = real;
            });
            return;
        }
    } catch (err) {
        console.warn('Firestore no disponible, usando catálogo local:', err.message);
    }
    simulacrosCatalog = FALLBACK_CATALOG;
}

// ── Renderizar tarjetas de simulacro ──────────────────────────────────────
function renderSimulacroCards() {
    const container = document.getElementById('simulacro-selector');
    if (!container) return;
    container.innerHTML = '';

    simulacrosCatalog.forEach(sim => {
        const canAccess = userRole === 'admin' || userRole === 'profesor' || !sim.es_premium;

        const card = document.createElement('div');
        card.className = 'simulacro-card';
        if (!canAccess) card.classList.add('locked');

        // Calcular progreso local
        const storageKey = `progreso_${appUser?.uid || appUser?.id || 'guest'}_${sim.id}`;
        let savedProgress = {};
        try { savedProgress = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch(e) {}
        const answered = Object.keys(savedProgress).filter(k => k !== 'safeLastIndex' && k !== 'totalTime').length;
        const total    = sim.total_preguntas || 1;
        const pct      = Math.min(100, Math.round((answered / total) * 100));

        card.innerHTML = `
            <div class="simulacro-card-left">
                <div class="simulacro-card-emoji">${sim.emoji || '📋'}</div>
                <div class="simulacro-card-title">${sim.titulo}</div>
                <div class="simulacro-card-desc">${sim.descripcion || ''}</div>
                <div class="simulacro-card-desc" style="margin-top:0.35rem; font-size:0.72rem;">
                    📝 ${sim.total_preguntas || '?'} preguntas
                    ${sim.es_premium ? ' · <span style="color:#f59e0b; font-weight:700;">PREMIUM</span>' : ' · <span style="color:#00b894; font-weight:700;">GRATIS</span>'}
                </div>
            </div>
            <div class="simulacro-card-progress">
                <div class="progress-ring-text">${pct}%</div>
                <div class="progress-bar-mini">
                    <div class="progress-bar-mini-fill" style="width:${pct}%"></div>
                </div>
                ${canAccess
                    ? `<button class="start-btn" onclick="startSimulacro(event,'${sim.id}',${sim.numero})">${answered > 0 ? 'Continuar' : 'Iniciar'}</button>`
                    : `<button class="start-btn" style="background:#b2bec3; cursor:not-allowed;" disabled>🔒 Premium</button>`
                }
            </div>
        `;

        container.appendChild(card);
    });

    // Poblar selector de análisis
    populateSimSelector();
}

// ── Selector de análisis de progreso ─────────────────────────────────────
function populateSimSelector() {
    const sel = document.getElementById('dashboard-sim-selector');
    if (!sel) return;
    sel.innerHTML = simulacrosCatalog.map(s =>
        `<option value="${s.id}">${s.titulo}</option>`
    ).join('');
    if (simulacrosCatalog.length > 0) {
        currentSimulacroId = simulacrosCatalog[0].id;
        sel.value = currentSimulacroId;
    }
}

// ── Iniciar simulacro ──────────────────────────────────────────────────────
async function startSimulacro(e, simId, simNum) {
    e.stopPropagation();

    const sim = simulacrosCatalog.find(s => s.id === simId);
    if (!sim) return;

    // Cargar datos del quiz correspondiente
    let rawData = null;
    if (simNum === 1)      rawData = window.RAW_QUIZ_DATA;
    else if (simNum === 2) rawData = window.RAW_QUIZ_DATA_2;
    else if (simNum === 3) rawData = window.RAW_QUIZ_DATA_3;

    if (!rawData?.questions) {
        alert('No se pudieron cargar las preguntas. Intenta recargar la página.');
        return;
    }

    currentSimulacroId   = simId;
    quizData             = JSON.parse(JSON.stringify(rawData.questions));
    score                = 0;
    currentQuestionIndex = 0;

    // Cargar progreso guardado para este simulacro
    await cargarProgreso(appUser);

    // Mostrar vista del quiz
    document.getElementById('page-content').style.display = 'none';
    document.getElementById('quiz-view').classList.remove('hidden');

    document.getElementById('quiz-title-display').textContent = sim.titulo;

    // Restaurar posición si había progreso
    const savedIdx = userProgress.safeLastIndex || 0;
    currentQuestionIndex = savedIdx;

    renderQuestion();
    startTimer();
}

// ── Quiz ────────────────────────────────────────────────────────────────────
function renderQuestion() {
    if (!quizData || currentQuestionIndex >= quizData.length) return;

    const q     = quizData[currentQuestionIndex];
    const total = quizData.length;

    document.getElementById('question-count').textContent = `Pregunta ${currentQuestionIndex + 1} de ${total}`;
    document.getElementById('progress-bar').style.width   = `${((currentQuestionIndex + 1) / total) * 100}%`;
    document.getElementById('q-text').textContent         = q.question || q.questionText || '';

    const saved = userProgress[currentQuestionIndex];
    const optionsEl = document.getElementById('options');
    optionsEl.innerHTML = '';

    (q.answerOptions || []).forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt.answerText || opt.text || opt;

        if (saved !== undefined) {
            btn.disabled = true;
            if (i === saved.selectedIndex) btn.classList.add(saved.isCorrect ? 'correct' : 'incorrect');
            if (opt.isCorrect || opt.correct) btn.classList.add('correct');
        }

        btn.addEventListener('click', () => selectAnswer(i, opt.isCorrect || opt.correct || false, q));
        optionsEl.appendChild(btn);
    });

    // Botones de navegación
    document.getElementById('prev-btn').style.display = currentQuestionIndex > 0 ? 'inline-flex' : 'none';
    document.getElementById('next-btn').style.display = saved !== undefined ? 'inline-flex' : 'none';
    document.getElementById('hint-trigger').style.display = q.hint ? 'inline-flex' : 'none';

    // Retroalimentación si ya respondió
    const rationaleBox = document.getElementById('rationale-box');
    if (saved && q.rationale) {
        rationaleBox.textContent = q.rationale;
        rationaleBox.style.display = 'block';
    } else {
        rationaleBox.style.display = 'none';
    }
}

function selectAnswer(selectedIndex, isCorrect, q) {
    if (userProgress[currentQuestionIndex] !== undefined) return; // ya respondida

    userProgress[currentQuestionIndex] = { selectedIndex, isCorrect };
    if (isCorrect) score++;

    // Marcar botones
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach((btn, i) => {
        btn.disabled = true;
        const opt = (q.answerOptions || [])[i];
        if (i === selectedIndex) btn.classList.add(isCorrect ? 'correct' : 'incorrect');
        if (opt?.isCorrect || opt?.correct) btn.classList.add('correct');
    });

    // Mostrar retroalimentación
    const rationaleBox = document.getElementById('rationale-box');
    if (q.rationale) {
        rationaleBox.textContent = q.rationale;
        rationaleBox.style.display = 'block';
    }

    document.getElementById('next-btn').style.display = 'inline-flex';

    // Guardar progreso
    guardarProgreso();
    updateStats();
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex >= quizData.length) {
        showResults();
    } else {
        renderQuestion();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

function toggleHint() {
    const hint = document.getElementById('hint-text');
    const q = quizData?.[currentQuestionIndex];
    if (!q?.hint) return;
    hint.textContent = q.hint;
    hint.style.display = hint.style.display === 'none' ? 'block' : 'none';
}

function showResults() {
    const total    = quizData.length;
    const answered = Object.keys(userProgress).filter(k => k !== 'safeLastIndex' && k !== 'totalTime').length;
    const pct      = Math.round((score / total) * 100);

    stopTimer();
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.remove('hidden');
    document.getElementById('final-score').textContent = `${pct}%`;
    document.getElementById('results-text').textContent =
        `Respondiste ${answered} de ${total} preguntas. Aciertos: ${score}.`;
}

function restartQuiz() {
    userProgress = {};
    score = 0;
    currentQuestionIndex = 0;
    renderQuestion();
    document.getElementById('results-view').classList.add('hidden');
    document.getElementById('quiz-view').classList.remove('hidden');
}

function exitQuiz() {
    stopTimer();
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.add('hidden');
    document.getElementById('page-content').style.display = 'block';
}

// ── Timer ──────────────────────────────────────────────────────────────────
function startTimer() {
    if (studyTimer) clearInterval(studyTimer);
    studyTimer = setInterval(() => {
        totalTime++;
        const h = String(Math.floor(totalTime / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalTime % 3600) / 60)).padStart(2, '0');
        const s = String(totalTime % 60).padStart(2, '0');
        const el = document.getElementById('stat-time');
        if (el) el.textContent = `${h}:${m}:${s}`;
    }, 1000);
}

function stopTimer() {
    if (studyTimer) { clearInterval(studyTimer); studyTimer = null; }
}

// ── Stats dashboard ────────────────────────────────────────────────────────
function updateStats() {
    const answered = Object.keys(userProgress).filter(k => k !== 'safeLastIndex' && k !== 'totalTime').length;
    const total    = quizData?.length || 1;
    const pct      = Math.round((answered / total) * 100);

    const scoreEl = document.getElementById('stat-score');
    if (scoreEl) scoreEl.textContent = score > 0 ? score : '-';

    const qEl = document.getElementById('stat-questions');
    if (qEl) qEl.textContent = answered;

    const pEl = document.getElementById('stat-progress');
    if (pEl) pEl.textContent = `${pct}%`;
}

// ── Progreso local (localStorage) ─────────────────────────────────────────
function getStorageKey() {
    return `progreso_${appUser?.uid || 'guest'}_${currentSimulacroId || 'sim1'}`;
}

function guardarProgreso() {
    const key = getStorageKey();
    const data = { ...userProgress, safeLastIndex: currentQuestionIndex, totalTime };
    localStorage.setItem(key, JSON.stringify(data));
}

async function cargarProgreso(user) {
    const key = getStorageKey();
    try {
        const saved = JSON.parse(localStorage.getItem(key) || '{}');
        if (Object.keys(saved).length > 0) {
            totalTime    = saved.totalTime || 0;
            userProgress = saved;
            score = Object.values(saved).filter(v => v?.isCorrect).length;
        }
    } catch (e) { console.warn('cargarProgreso error:', e); }
    updateStats();
}

// Selector change handler
function onSelectorChange(simId) {
    const sim = simulacrosCatalog.find(s => s.id === simId);
    if (!sim) return;
    currentSimulacroId = simId;
    cargarProgreso(appUser);
}

// Exponer funciones al scope global (llamadas desde HTML onclick)
window.startSimulacro   = startSimulacro;
window.nextQuestion     = nextQuestion;
window.prevQuestion     = prevQuestion;
window.toggleHint       = toggleHint;
window.restartQuiz      = restartQuiz;
window.exitQuiz         = exitQuiz;
window.onSelectorChange = onSelectorChange;
