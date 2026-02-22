const CACHE_NAME = 'simulacro-v91';
const ASSETS_VERSION = 'v91';
// Matches index.html version
const ASSETS = [
    './',
    './index.html?v=91',
    './style.css?v=91',
    './app.js?v=91',
    './sw.js?v=91',
    './quizData.js?v=86',
    './quizData2.js?v=86',
    './quizData3.js?v=86'
];

self.addEventListener('install', (event) => {
    // Force new SW to take control immediately
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(ASSETS);
            })
    );
});

self.addEventListener('activate', (event) => {
    // Become available to all pages immediately
    event.waitUntil(clients.claim());

    // Clean old caches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});
