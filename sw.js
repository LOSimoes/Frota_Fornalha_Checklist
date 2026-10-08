const CACHE='fornalha-driver-v1';
const ASSETS=['/','/index.html','/outbox.js','/driver.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('fornalha-driver-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  // Private pages and API responses must never be cached.
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!ASSETS.includes(url.pathname))return;
  event.respondWith(fetch(event.request).catch(async()=>{
    const cached=await caches.match(url.pathname);if(cached)return cached;
    return new Response('Abra o aplicativo com conexão uma vez antes de usar offline.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }));
});
