/* Generated into sw.js by the build. Asset paths and revision are local to this deployment. */
const FILES=__PRECACHE_FILES__,VERSION=__PRECACHE_VERSION__;
const ROOT=new URL(self.registration.scope),PREFIX='risiko-pwa:'+ROOT.pathname+':',CACHE=PREFIX+VERSION;
const urls=FILES.map(file=>new URL(file,ROOT).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 try{const cache=await caches.open(CACHE);await cache.addAll(urls.map(url=>new Request(url,{cache:'reload'})));}
 catch(error){await caches.delete(CACHE);throw error;}
 // Keep an existing match running on its current code until the user updates.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='RISIKO_ACTIVATE')event.waitUntil(self.skipWaiting());
 if(event.data?.type==='RISIKO_CACHE_STATUS')event.waitUntil((async()=>{
  const cache=await caches.open(CACHE),ready=(await Promise.all(urls.map(url=>cache.match(url)))).every(Boolean);
  event.source?.postMessage({type:'RISIKO_CACHE_STATUS',ready,version:VERSION});
 })());
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);if(url.origin!==ROOT.origin)return;
 if(url.pathname===ROOT.pathname)url.pathname+='index.html';
 url.search='';url.hash='';if(!urls.includes(url.href))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),stored=await cache.match(url.href);if(stored)return stored;
  const response=await fetch(event.request);
  if(response.ok)await cache.put(url.href,response.clone());
  return response;
 })());
});
