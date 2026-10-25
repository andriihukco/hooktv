// HOOK TV service worker. It exists so the browser treats the site as installable.
// Nothing is cached and every request goes to the network as usual, so a new deploy
// is never hidden behind an old copy of the app.
self.addEventListener('install', function(){ self.skipWaiting() })

self.addEventListener('activate', function(event){ event.waitUntil(self.clients.claim()) })

self.addEventListener('fetch', function(){})
