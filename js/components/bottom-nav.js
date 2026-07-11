// bottom-nav.js — Menú inferior universal para todas las páginas
// Inyecta el nav flotante con efecto glass según la página actual y el rol del usuario.
// Requiere: firebase-init.js y auth-guard.js cargados antes.

(function () {

    // ── 1. Definición de botones ──────────────────────────────────────────
    // visible: array de roles que pueden ver este botón ('all' = todos)
    const NAV_ITEMS = [
        {
            id   : 'nav-inicio',
            icon : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
            label: 'Inicio',
            href : '/pages/inicio.html',
            roles: 'all',
        },
        {
            id   : 'nav-examenes',
            icon : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
            label: 'Exámenes',
            href : '/pages/examenes.html',
            roles: ['estudiante', 'profesor', 'admin'],
        },
        {
            id   : 'nav-estudiantes',
            icon : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
            label: 'Gestión',
            href : '/pages/estudiantes.html',
            roles: ['profesor', 'admin'],
        },
        {
            id   : 'nav-reportes',
            icon : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
            label: 'Reportes',
            href : '/pages/reportes.html',
            roles: 'all',
        },

        {
            id   : 'nav-menu',
            icon : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>`,
            label: 'Menú',
            href : '/pages/menu.html',
            roles: 'all',
        },
    ];

    // ── 2. Construir HTML ─────────────────────────────────────────────────
    function buildNav(role, currentPage) {
        const items = NAV_ITEMS.filter(item => {
            if (item.roles === 'all') return true;
            return item.roles.includes(role);
        });

        const buttons = items.map(item => {
            const isActive = currentPage && item.href.endsWith(currentPage);
            return `
            <a href="${item.href}" class="bottom-nav-item ${isActive ? 'active' : ''}" id="${item.id}" title="${item.label}">
                <span class="nav-icon">${item.icon}</span>
                <span class="nav-label">${item.label}</span>
            </a>`;
        }).join('');

        return `<nav class="bottom-nav glass" id="bottom-nav">${buttons}</nav>`;
    }

    // ── 3. Inyectar en el body ─────────────────────────────────────────────
    window.renderBottomNav = function (role) {
        // Eliminar nav previo si existe
        const existing = document.getElementById('bottom-nav');
        if (existing) existing.remove();

        const currentPage = window.location.pathname.split('/').pop() || 'inicio.html';
        document.body.insertAdjacentHTML('beforeend', buildNav(role || 'free', currentPage));
    };

})();
