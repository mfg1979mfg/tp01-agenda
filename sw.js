
/* PRACTICO 11 - SERVICE WORKER DE MI AGENDA */

const VERSION = "v1";
const CACHE_NAME = "mi-agenda-" + VERSION;

const ARCHIVOS = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./manifest.json",
    "./icono-192.png",
    "./icono-512.png"
];

// Guardar los archivos para usarlos sin internet
self.addEventListener("install", function(evento) {
    evento.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ARCHIVOS);
        })
    );
});

// Eliminar versiones antiguas
self.addEventListener("activate", function(evento) {
    evento.waitUntil(
        caches.keys().then(function(nombres) {
            return Promise.all(
                nombres
                    .filter(function(nombre) {
                        return nombre.startsWith("mi-agenda-") &&
                               nombre !== CACHE_NAME;
                    })
                    .map(function(nombre) {
                        return caches.delete(nombre);
                    })
            );
        })
    );
});

// Usar los archivos guardados cuando sea posible
self.addEventListener("fetch", function(evento) {
    if (evento.request.method !== "GET") return;

    evento.respondWith(
        caches.match(evento.request).then(function(respuesta) {
            return respuesta || fetch(evento.request);
        })
    );
});
