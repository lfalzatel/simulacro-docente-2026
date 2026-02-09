// Safe Initialization of Variables to avoid re-declaration errors
let quizData = null;
let currentQuestionIndex = 0;
let score = 0;
let userProgress = {};
// Rename to avoid collision with CDN's 'supabase' global
let supabaseApp = null;

const SUPABASE_URL = 'https://sqkogiitljnoaxirhrwq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jFflJbJ4ujbrc-rgM4XQFA_TwKNSmC9';

// Initialize App
async function init() {
    try {
        console.log("Iniciando aplicación...");

        // Init Supabase
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            const { createClient } = window.supabase;
            supabaseApp = createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("Supabase inicializado");

            // Check Session
            const { data: { session } } = await supabaseApp.auth.getSession();

            // Fix: Only redirect if NO session and NOT handling an auth callback
            const isAuthCallback = window.location.hash && window.location.hash.includes('access_token');

            if (session) {
                console.log("Sesión encontrada:", session.user.email);
                showDashboard(session.user);
                cargarProgreso();
            } else if (!isAuthCallback) {
                console.log("No hay sesión activa y no es callback");
                showLogin();
            } else {
                console.log("Procesando callback de Auth...");
            }

            // Listen for auth changes
            supabaseApp.auth.onAuthStateChange((event, session) => {
                console.log("Evento Auth:", event);
                if (event === 'SIGNED_IN' && session) showDashboard(session.user);
                if (event === 'SIGNED_OUT') showLogin();
            });

        } else {
            console.warn("Supabase SDK no cargado.");
            showLogin();
        }

        if (typeof RAW_QUIZ_DATA !== 'undefined') {
            quizData = RAW_QUIZ_DATA.questions;
            document.getElementById('quiz-title-display').innerText = RAW_QUIZ_DATA.quizTitle || 'Simulador Docente';
        } else {
            console.error("RAW_QUIZ_DATA no definido");
        }
    } catch (error) {
        console.error('Error init:', error);
    }
}

function showLogin() {
    console.log("Mostrando Login");
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('header').classList.add('hidden');
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.add('hidden');
}

function showDashboard(user) {
    console.log("Mostrando Dashboard para:", user.email);
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('header').classList.remove('hidden');
    document.getElementById('quiz-view').classList.add('hidden');
    document.getElementById('results-view').classList.add('hidden');

    // Update User Info
    document.getElementById('userName').innerText = user.email.split('@')[0];
    document.getElementById('userEmail').innerText = user.email;

    // Avatar logic
    const avatarUrl = user.user_metadata.avatar_url;
    if (avatarUrl) {
        document.getElementById('user-avatar').src = avatarUrl;
        document.getElementById('user-avatar').style.display = 'block';
        document.getElementById('user-initials').style.display = 'none';
    } else {
        document.getElementById('user-initials').style.display = 'block';
    }
}

// Replaced switchTab with generic switchView
function switchView(viewId) {
    // Hide all main views
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('docs-view').classList.add('hidden'); // Ensure docs-view exists in HTML or handle error
    document.getElementById('quiz-view').classList.add('hidden');

    // Show target
    const target = document.getElementById(viewId === 'docs' ? 'docs-view' : 'dashboard');
    if (target) target.classList.remove('hidden');
}


// Bind to window to fix 'not defined' errors
window.startQuiz = startQuiz;
window.switchView = switchView;
window.logout = logout;
window.toggleHint = toggleHint;
window.nextQuestion = nextQuestion;

function startQuiz() {
    if (!quizData) return alert("Cargando datos...");
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('quiz-view').classList.remove('hidden');
    document.getElementById('header').classList.remove('hidden'); // Ensure header stays

    // Resume Logic
    if (userProgress && typeof userProgress.safeLastIndex !== 'undefined') {
        currentQuestionIndex = userProgress.safeLastIndex;
        // If finished, reset? No, let them see results or reset manually?
        // For now, resume. If >= length, it will trigger results.
    } else {
        currentQuestionIndex = 0;
        score = 0;
    }

    updateUI();
}

function updateUI() {
    const q = quizData[currentQuestionIndex];
    const qText = document.getElementById('q-text');
    const optionsContainer = document.getElementById('options');
    // Progress bar update
    const progressBar = document.getElementById('progress-bar');

    const questionCount = document.getElementById('question-count');
    const rationaleBox = document.getElementById('rationale-box');
    const nextBtn = document.getElementById('next-btn');
    const hintText = document.getElementById('hint-text');
    const hintTrigger = document.getElementById('hint-trigger');

    rationaleBox.style.display = 'none';
    nextBtn.style.display = 'none';
    hintText.style.display = 'none';
    hintTrigger.style.display = q.hint ? 'block' : 'none';
    hintText.innerText = q.hint || '';

    qText.innerText = `${q.question}`;
    questionCount.innerText = `Pregunta ${currentQuestionIndex + 1} de ${quizData.length}`;

    // Fix progress width logic
    const pct = ((currentQuestionIndex + 1) / quizData.length) * 100;
    progressBar.style.width = `${pct}%`;

    optionsContainer.innerHTML = '';
    q.answerOptions.forEach((opt, idx) => {
        const optDiv = document.createElement('div');
        optDiv.className = 'option';
        optDiv.innerText = opt.text;
        optDiv.onclick = () => selectOption(optDiv, opt.isCorrect, opt.rationale);
        optionsContainer.appendChild(optDiv);
    });
}

function selectOption(el, isCorrect, rationale) {
    if (document.getElementById('next-btn').style.display === 'block') return;

    const options = document.querySelectorAll('.option');
    options.forEach(opt => opt.style.cursor = 'default');

    const rationaleBox = document.getElementById('rationale-box');
    rationaleBox.style.display = 'block';
    rationaleBox.innerText = rationale;

    if (isCorrect) {
        el.classList.add('correct');
        score++;
    } else {
        el.classList.add('wrong');
        const q = quizData[currentQuestionIndex];
        const correctIdx = q.answerOptions.findIndex(o => o.isCorrect);
        if (options[correctIdx]) options[correctIdx].classList.add('correct');
    }

    guardarRespuesta(currentQuestionIndex, isCorrect);
    document.getElementById('next-btn').style.display = 'block';
}

function toggleHint() {
    const h = document.getElementById('hint-text');
    h.style.display = h.style.display === 'none' ? 'block' : 'none';
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizData.length) {
        updateUI();
    } else {
        showResults();
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
    else if (percentage >= 50) message = "Aceptable. Se recomienda reforzar.";
    else message = "Necesitas estudiar más.";

    document.getElementById('results-text').innerText = `Lograste ${score} de ${quizData.length} puntos. ${message}`;
}

// Global scope cloud persistence
async function guardarRespuesta(preguntaIdx, esCorrecta) {
    userProgress[preguntaIdx] = esCorrecta;
    localStorage.setItem('progresoUsuario', JSON.stringify({
        lastIndex: preguntaIdx, score: score, answers: userProgress
    }));

    if (supabaseApp) {
        const { data: { user } } = await supabaseApp.auth.getUser();
        if (user) {
            await supabaseApp.from('simulacro_progress').upsert({
                user_id: user.id,
                progress_data: userProgress,
                score: score,
                last_index: preguntaIdx,
                updated_at: new Date()
            }, { onConflict: 'user_id' });
        }
    }
}

async function cargarProgreso() {
    const saved = localStorage.getItem('progresoUsuario');
    if (saved) {
        const data = JSON.parse(saved);
        userProgress = data.answers || {};
        score = data.score || 0;
        userProgress.safeLastIndex = data.lastIndex || 0;
    }

    if (supabaseApp) {
        const { data: { user } } = await supabaseApp.auth.getUser();
        if (user) {
            const { data } = await supabaseApp.from('simulacro_progress').select('*').eq('user_id', user.id).single();
            if (data) {
                userProgress = data.progress_data || {};
                score = data.score || 0;
                userProgress.safeLastIndex = data.last_index || 0; // Store for resume

                localStorage.setItem('progresoUsuario', JSON.stringify({
                    lastIndex: data.last_index, score: score, answers: userProgress
                }));
            }
        }
    }
}

async function loginWithGoogle() {
    const { error } = await supabaseApp.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
    });
    if (error) alert("Error: " + error.message);
}

async function logout() {
    await supabaseApp.auth.signOut();
    window.location.reload();
}

// Theme Logic
window.setTheme = function (theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update active state
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${theme}'`)) {
            btn.classList.add('active');
        }
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'default';
    if (savedTheme) window.setTheme(savedTheme);
}

// Handle Profile Menu Toggle
document.addEventListener('DOMContentLoaded', () => {
    init();
    initTheme();

    // Login Button
    const loginBtn = document.getElementById('googleLoginBtn');
    if (loginBtn) loginBtn.onclick = loginWithGoogle;

    // Profile Menu Toggle
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

// PWA: Check Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado'))
            .catch(err => console.log('Error al registrar Service Worker', err));
    });
}

// PWA: Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.onclick = () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((result) => {
                if (result.outcome === 'accepted') {
                    console.log('Usuario aceptó instalar');
                }
                deferredPrompt = null;
                installBtn.classList.add('hidden');
            });
        };
    }
});
