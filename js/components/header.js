// header.js — Header universal para todas las páginas
// Inyecta el header en el <body> y gestiona el dropdown y los temas.
// Requiere: firebase-init.js y auth-guard.js cargados antes.

(function () {

    // ── 1. HTML del Header ─────────────────────────────────────────────────
    const headerHTML = `
    <header class="app-header glass" id="app-header">
        <div class="header-left">
            <button id="header-back-btn" class="back-btn" style="display:none;" title="Volver">←</button>
            <a href="/pages/inicio.html" class="header-logo">
                <img src="/assets/icon-192-sq.png" alt="EvaluaSeguro" class="header-logo-img">
                <span class="header-logo-text">Evalua<span class="logo-accent">Seguro</span></span>
            </a>
        </div>

        <div class="header-right">
            <!-- Campanita de notificaciones -->
            <button class="header-icon-btn" id="notif-btn" aria-label="Notificaciones">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span class="notif-badge hidden" id="notif-badge">0</span>
            </button>

            <!-- Botón de perfil -->
            <button class="header-profile-btn" id="header-profile-btn" aria-label="Menú de usuario">
                <div class="header-avatar" id="header-avatar-wrap">
                    <img id="header-avatar-img" src="" alt="Foto" style="display:none;">
                    <span id="header-avatar-initials" style="display:none;"></span>
                </div>
                <span id="header-username" class="header-username">Usuario</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>

            <!-- Dropdown -->
            <div class="header-dropdown glass" id="header-dropdown">

                <!-- Info del usuario -->
                <div class="dropdown-user-info" onclick="window.location.href='perfil.html'" style="cursor:pointer;">
                    <div class="dropdown-avatar-wrap" id="dropdown-avatar-wrap">
                        <img id="dropdown-avatar-img" src="" alt="Foto" style="display:none;">
                        <span id="dropdown-avatar-initials" style="display:none;"></span>
                    </div>
                    <div class="dropdown-user-text">
                        <div class="dropdown-name" id="dropdown-name">Usuario</div>
                        <div class="dropdown-email" id="dropdown-email">correo@correo.com</div>
                        <span class="dropdown-role-badge" id="dropdown-role">FREE</span>
                    </div>
                </div>

                <div class="dropdown-divider"></div>

                <!-- Selector de Tema -->
                <div class="dropdown-section-label">Tema</div>
                <div class="dropdown-themes">
                    <button class="theme-pill" onclick="setAppTheme('default')" data-theme="default">
                        <span class="theme-icon">☀️</span><span class="theme-name">Día</span>
                    </button>
                    <button class="theme-pill" onclick="setAppTheme('deep')" data-theme="deep">
                        <span class="theme-icon">🧠</span><span class="theme-name">Deep</span>
                    </button>
                    <button class="theme-pill" onclick="setAppTheme('night')" data-theme="night">
                        <span class="theme-icon">🌙</span><span class="theme-name">Noche</span>
                    </button>
                    <button class="theme-pill" onclick="setAppTheme('desktop')" data-theme="desktop">
                        <span class="theme-icon">🖥️</span><span class="theme-name">PC</span>
                    </button>
                </div>

                <div class="dropdown-divider"></div>

                <!-- Menú de acciones -->
                <nav class="dropdown-nav">
                    <a class="dropdown-item" href="/pages/perfil.html">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span>Mi perfil</span>
                    </a>
                    <button class="dropdown-item installAppBtn" id="header-install-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00cec9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span style="color:#00cec9;">Instalar app</span>
                    </button>
                    <button class="dropdown-item" onclick="shareApp()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                        <span>Compartir app</span>
                    </button>
                    <button class="dropdown-item" onclick="openNotifications()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        <span>Notificaciones</span>
                    </button>
                    <a class="dropdown-item" href="/pages/menu.html#config">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"></path></svg>
                        <span>Configuración</span>
                    </a>
                    <button class="dropdown-item" onclick="addAccount()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>Añadir Cuenta</span>
                    </button>
                </nav>

                <div class="dropdown-divider"></div>

                <button class="dropdown-item dropdown-logout" onclick="headerLogout()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    <span>Cerrar sesión</span>
                </button>
            </div>
        </div>
    </header>`;

    // ── 2. Inyectar en el body ─────────────────────────────────────────────
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    // ── 3. Toggle del dropdown ─────────────────────────────────────────────
    const profileBtn  = document.getElementById('header-profile-btn');
    const dropdown    = document.getElementById('header-dropdown');

    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== profileBtn) {
            dropdown.classList.remove('open');
        }
    });

    // ── 4. Poblar datos del usuario cuando esté listo ─────────────────────
    window.populateHeader = function (user, role) {
        const displayName = user.displayName || user.email.split('@')[0];
        const initials    = displayName.substring(0, 2).toUpperCase();

        // Header pill
        document.getElementById('header-username').textContent = displayName.split(' ')[0];

        // Dropdown info
        document.getElementById('dropdown-name').textContent  = displayName;
        document.getElementById('dropdown-email').textContent = user.email;
        document.getElementById('dropdown-role').textContent  = (role || 'FREE').toUpperCase();

        // Avatar (header + dropdown)
        ['header', 'dropdown'].forEach(prefix => {
            const img  = document.getElementById(`${prefix}-avatar-img`);
            const init = document.getElementById(`${prefix}-avatar-initials`);
            if (user.photoURL) {
                img.src = user.photoURL;
                img.style.display = 'block';
                init.style.display = 'none';
            } else {
                init.textContent = initials;
                init.style.display = 'flex';
                img.style.display  = 'none';
            }
        });

        // Aplicar tema guardado
        const savedTheme = localStorage.getItem('appTheme') || 'default';
        setAppTheme(savedTheme, false);
    };

    // ── 5. Tema ────────────────────────────────────────────────────────────
    const themes = {
        default: {
            '--bg-body'        : '#f4f1eb',
            '--bg-card'        : '#ffffff',
            '--text-primary'   : '#2d3436',
            '--text-secondary' : '#636e72',
            '--accent-color'   : '#00cec9',
            '--border'         : 'rgba(0,0,0,0.08)',
            '--primary-color'  : '#8B9A7E',
        },
        deep: {
            '--bg-body'        : '#0f1117',
            '--bg-card'        : '#1a1d2e',
            '--text-primary'   : '#e8eaf6',
            '--text-secondary' : '#9fa8da',
            '--accent-color'   : '#7c4dff',
            '--border'         : 'rgba(255,255,255,0.08)',
            '--primary-color'  : '#7c4dff',
        },
        night: {
            '--bg-body'        : '#1a1a2e',
            '--bg-card'        : '#16213e',
            '--text-primary'   : '#e2e8f0',
            '--text-secondary' : '#94a3b8',
            '--accent-color'   : '#f59e0b',
            '--border'         : 'rgba(255,255,255,0.08)',
            '--primary-color'  : '#f59e0b',
        },
        desktop: {
            '--bg-body'        : '#e8ecf0',
            '--bg-card'        : '#ffffff',
            '--text-primary'   : '#1a202c',
            '--text-secondary' : '#4a5568',
            '--accent-color'   : '#3182ce',
            '--border'         : 'rgba(0,0,0,0.1)',
            '--primary-color'  : '#3182ce',
        }
    };

    window.setAppTheme = function (themeKey, save = true) {
        const vars = themes[themeKey] || themes['default'];
        const root = document.documentElement;
        Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));

        // Marcar botón activo
        document.querySelectorAll('.theme-pill').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === themeKey);
        });

        if (save) localStorage.setItem('appTheme', themeKey);
    };

    // ── 6. Acciones del dropdown ───────────────────────────────────────────
    window.shareApp = function () {
        if (navigator.share) {
            navigator.share({
                title: 'EvaluaSeguro',
                text: '¡Prepárate para el concurso docente 2026!',
                url: 'https://evaluaseguro-31c51.web.app/'
            });
        } else {
            navigator.clipboard.writeText('https://evaluaseguro-31c51.web.app/');
            alert('¡Enlace copiado al portapapeles!');
        }
    };

    window.openNotifications = function () {
        // Placeholder — se puede conectar a Firestore en el futuro
        alert('Notificaciones próximamente.');
    };

    window.addAccount = function () {
        alert('Función de múltiples cuentas próximamente.');
    };

    window.headerLogout = function () {
        auth.signOut().then(() => {
            sessionStorage.clear();
            window.location.href = '/pages/login.html';
        });
    };

    // ── 7. PWA Install prompt ──────────────────────────────────────────────
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const btn = document.getElementById('header-install-btn');
        if (btn) btn.style.display = 'flex';
    });

    document.getElementById('header-install-btn').addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('PWA install:', outcome);
        deferredPrompt = null;
    });

})();
