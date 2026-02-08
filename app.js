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
            if (session) {
                console.log("Sesión encontrada:", session.user.email);
                showDashboard(session.user);
                cargarProgreso();
            } else {
                console.log("No hay sesión activa");
                showLogin();
            }

            // Listen for auth changes
            supabaseApp.auth.onAuthStateChange((event, session) => {
                console.log("Evento Auth:", event);
                if (event === 'SIGNED_IN') showDashboard(session.user);
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
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard-screen').style.display = 'none';
}

function showDashboard(user) {
    console.log("Mostrando Dashboard para:", user.email);
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'block';

    // Update User Info
    document.getElementById('user-name').innerText = user.email.split('@')[0];
    document.getElementById('user-avatar').src = user.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=random`;
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');

    if (tabId === 'home-tab') document.getElementById('tab-home').classList.add('active');
    if (tabId === 'docs-tab') document.getElementById('tab-docs').classList.add('active');
}

// Bind to window to fix 'not defined' errors
window.startQuiz = startQuiz;
window.switchTab = switchTab;

function startQuiz() {
    if (!quizData) return alert("Cargando datos...");
    document.getElementById('start-view').style.display = 'none';
    document.getElementById('quiz-view').style.display = 'block';

    currentQuestionIndex = 0;
    score = 0;
    updateUI();
}

function updateUI() {
    const q = quizData[currentQuestionIndex];
    const qText = document.getElementById('q-text');
    const optionsContainer = document.getElementById('options');
    const progress = document.getElementById('progress-bar');
    const questionCount = document.getElementById('question-count');
    const rationaleBox = document.getElementById('rationale-box');
    const nextBtn = document.getElementById('next-btn');
    const hintText = document.getElementById('hint-text');

    rationaleBox.style.display = 'none';
    nextBtn.style.display = 'none';
    hintText.style.display = 'none';
    document.getElementById('hint-trigger').style.display = q.hint ? 'block' : 'none';
    hintText.innerText = q.hint || '';

    qText.innerText = `${q.question}`;
    questionCount.innerText = `Pregunta ${currentQuestionIndex + 1} de ${quizData.length}`;
    progress.style.width = `${((currentQuestionIndex + 1) / quizData.length) * 100}%`;
    document.getElementById('score-display').innerText = `Puntaje: ${score}`;

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
        document.getElementById('score-display').innerText = `Puntaje: ${score}`;
    } else {
        el.classList.add('wrong');
        const q = quizData[currentQuestionIndex];
        const correctIdx = q.answerOptions.findIndex(o => o.isCorrect);
        options[correctIdx].classList.add('correct');
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
    document.getElementById('quiz-view').style.display = 'none';
    document.getElementById('results-view').style.display = 'block';
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
    }

    if (supabaseApp) {
        const { data: { user } } = await supabaseApp.auth.getUser();
        if (user) {
            const { data } = await supabaseApp.from('simulacro_progress').select('*').eq('user_id', user.id).single();
            if (data) {
                userProgress = data.progress_data || {};
                score = data.score || 0;
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

window.logout = async function () {
    await supabaseApp.auth.signOut();
    window.location.reload();
}

// PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado'))
            .catch(err => console.log('Error al registrar Service Worker', err));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    const loginBtn = document.getElementById('login-btn-main');
    if (loginBtn) loginBtn.onclick = loginWithGoogle;
});
