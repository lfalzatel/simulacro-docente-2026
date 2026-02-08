const CACHE_NAME = 'simulacro-docente-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './quizData.js',
    './pwa_icon_192.svg',
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Inter:wght@300;400;600&display=swap'
];

// Install Event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
    );
});

// Activate Event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            );
        })
    );
});

// Fetch Event (Offline support)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});
