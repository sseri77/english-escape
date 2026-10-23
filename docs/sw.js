'use strict';
const CACHE='english-escape-static-v3';
const FILES=['./','./index.html','./assets/app.css?v=3','./assets/app.js?v=3','./assets/core.js?v=3','./assets/reading-data.js?v=3','./assets/applications.js?v=3','./assets/curriculum.js?v=3','./assets/icon.svg','./assets/icon-180.png','./assets/icon-192.png','./assets/icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('english-escape-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.location).pathname))return;if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html')));return;}event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));});
