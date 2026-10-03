const CACHE = "hage-study-v170";
const FILES = ["./", "./index.html", "./enhancements.css", "./enhancements.js", "./ai-chat.css", "./auth-client.bundle.js", "./data-sync.bundle.js", "./ai-chat.bundle.js", "./manifest.json", "./pdf-engine.js", "./pdf.worker.min.js", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener("fetch", event => {if(event.request.method!=="GET" || new URL(event.request.url).pathname.startsWith("/api/"))return;event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(response => response || (event.request.mode==="navigate" ? caches.match("./index.html") : Response.error()))));});
self.addEventListener("notificationclick", event => { event.notification.close(); event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(windows => windows[0] ? windows[0].focus() : clients.openWindow("./"))); });
self.addEventListener("push",event=>{
  let data={title:"Hage Study",body:"Waxaad leedahay xusuusin cusub."};
  try{data={...data,...event.data.json()}}catch(e){}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:"icons/icon-192.png",badge:"icons/icon-192.png",tag:data.tag||"shacirka-reminder",renotify:true,vibrate:[180,80,180],data:{url:data.url||"./"}}));
});
