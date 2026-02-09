const CACHE_NAME = 'simulacro-docente-v3-clean-icon';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './quizData.js',
    './pwa_icon_192.svg',
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Inter:wght@300;400;600&display=swap'
];

self.addEventListener('install', event => {
    // Force new SW to take control immediately
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', event => {
    // Become available to all pages immediately
    event.waitUntil(
        Promise.all([
            clients.claim(),
            caches.keys().then(keys => {
                return Promise.all(keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
                );
            })
        ])
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Network-first strategy for HTML to ensure updates? 
                // Alternatively, stick to Cache-First for assets but handle navigation separately?
                // For this simple app, Cache-falling-back-to-network is fine, as long as version bump clears old cache.
                return response || fetch(event.request);
            })
    );
});
