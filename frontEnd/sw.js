var CACHE_NAME = 'restaurant-cache';
var urlsToCache = [
    '/',
    './index.html',
    './restaurant.html',
    './css/styles.css',
    './js/dbhelper.js',
    './js/idb.js',
    './js/idbhelper.js',
    './js/main.js',
    './js/restaurant_info.js',
    './img/1-800_medium.jpg',
    './img/1-480_small.jpg',
    './img/1.jpg',
    './img/2-800_medium.jpg',
    './img/2-480_small.jpg',
    './img/2.jpg',
    './img/3-800_medium.jpg',
    './img/3-480_small.jpg',
    './img/3.jpg',
    './img/4-800_medium.jpg',
    './img/4-480_small.jpg',
    './img/4.jpg',
    './img/5-800_medium.jpg',
    './img/5-480_small.jpg',
    './img/5.jpg',
    './img/6-800_medium.jpg',
    './img/6-480_small.jpg',
    './img/6.jpg',
    './img/7-800_medium.jpg',
    './img/7-480_small.jpg',
    './img/7.jpg',
    './img/8-800_medium.jpg',
    './img/8-480_small.jpg',
    './img/8.jpg',
    './img/9-800_medium.jpg',
    './img/9-480_small.jpg',
    './img/9.jpg',
    './img/10-800_medium.jpg',
    './img/10-480_small.jpg',
    './img/10.jpg',
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request)
        .then(function (response) {
            // Cache hit - return response
            if (response) {
                return response;
            }

            var fetchRequest = event.request.clone();

            return fetch(fetchRequest).then(
                function (response) {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    var responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then(function (cache) {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }
            );
        })
    );
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    if (cacheName !== CACHE_NAME && cacheName.startsWith("restaurant-cache")) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});