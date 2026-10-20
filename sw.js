/* Service worker (public build): makes the site installable and usable offline after the first visit.
   - pages: network first (so updates arrive when online), cache fallback; falls back to cache after 4s on a slow network
   - same-origin files: cache first
   - Google Fonts: stale-while-revalidate
   - version.json and weather requests are never cached (update notice and live weather need the network) */
const CACHE='tm-1.4.5', FONTS='tm-fonts';
const SHELL=['./','index.html','author.html','manifest.webmanifest','icon-192.png','icon-512.png','og.jpg'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==FONTS).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin===location.origin){
    if(url.pathname.endsWith('version.json')) return;
    if(req.mode==='navigate'){
      const key=url.pathname.endsWith('author.html')?'author.html':'index.html';
      const net=fetch(req).then(r=>{ if(r.ok){ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(key,cp)); } return r; });
      const slow=new Promise(res=>setTimeout(()=>res(null),4000));
      e.respondWith(Promise.race([net.catch(()=>null),slow]).then(async r=>r||(await caches.match(key))||net));
      return;
    }
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(n=>{ if(n.ok){ const cp=n.clone(); caches.open(CACHE).then(c=>c.put(req,cp)); } return n; })));
    return;
  }
  if(/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(caches.open(FONTS).then(c=>c.match(req).then(hit=>{
      const net=fetch(req).then(n=>{ if(n.ok||n.type==='opaque') c.put(req,n.clone()); return n; }).catch(()=>hit);
      return hit||net; })));
  }
});
