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
