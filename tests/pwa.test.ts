import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {assistedFrame} from '../src/pwa/platform.ts';
import {initWebApp,redirectForApple,sendWebOrientation} from '../src/pwa/client.ts';
function serviceWorker(version='one',stores=new Map<string,Map<string,Response>>()){
 const listeners=new Map<string,Function>(),messages:any[]=[],network:string[]=[];let fail='',offline=false,skip=0,claims=0;
 const cacheApi={async keys(){return [...stores.keys()];},async delete(key:string){return stores.delete(key);},async open(key:string){
  if(!stores.has(key))stores.set(key,new Map());const store=stores.get(key)!;
  return {async addAll(requests:Request[]){const loaded=[];for(const request of requests){if(request.url===fail)throw Error('Download fallito');loaded.push([request.url,new Response(version+request.url)] as const);}for(const [url,response] of loaded)store.set(url,response);},async match(url:string){return store.get(url)?.clone();},async put(url:string,response:Response){store.set(url,response);}};
 }};
 const self={registration:{scope:'https://example.org/risiko/'},addEventListener(type:string,fn:Function){listeners.set(type,fn);},clients:{async claim(){claims++;}},async skipWaiting(){skip++;}};
 const code=readFileSync('public/sw-template.js','utf8').replace('__PRECACHE_FILES__',JSON.stringify(['index.html','pwa.html','assets/app.js','assets/server.worker.js','audio/clash.wav'])).replace('__PRECACHE_VERSION__',JSON.stringify(version));
 runInNewContext(code,{self,caches:cacheApi,URL,Request,fetch:async(req:Request)=>{if(offline)throw Error('Offline');network.push(req.url);return new Response('network');}});
 async function emit(type:string,extra:any={}){let pending:Promise<any>|undefined;listeners.get(type)!({waitUntil(p:Promise<any>){pending=p;},respondWith(p:Promise<any>){pending=p;},source:{postMessage(m:any){messages.push(m);}},...extra});return pending;}
 return {emit,stores,messages,network,get skip(){return skip;},get claims(){return claims;},setFail(url:string){fail=url;},goOffline(){offline=true;}};
}
test('PWA: cache completa e avvio offline sotto /risiko/, compresi Worker, audio e pagina iPhone',async()=>{
 const sw=serviceWorker();await sw.emit('install');assert.equal(sw.skip,0);await sw.emit('activate');sw.goOffline();
 for(const path of ['', 'index.html?webapp=1','pwa.html','assets/server.worker.js','audio/clash.wav']){
  const response=await sw.emit('fetch',{request:new Request('https://example.org/risiko/'+path)});assert.ok(response);assert.equal(response.status,200);
 }
 await sw.emit('message',{data:{type:'RISIKO_CACHE_STATUS'}});assert.equal(sw.messages.at(-1).ready,true);
 assert.equal(sw.network.length,0);
 assert.equal(await sw.emit('fetch',{request:new Request('https://elsewhere.org/data')}),undefined);
 assert.equal(await sw.emit('fetch',{request:new Request('https://example.org/risiko/private-backup.json')}),undefined);
});
test('PWA: download incompleto non viene dichiarato pronto; aggiornamento non interrompe la versione attiva',async()=>{
 const stores=new Map<string,Map<string,Response>>();stores.set('risiko-pwa:/altro/:old',new Map());
 const old=serviceWorker('old',stores);await old.emit('install');
 const bad=serviceWorker('bad',stores);bad.setFail('https://example.org/risiko/audio/clash.wav');await assert.rejects(bad.emit('install'));
 assert.equal(stores.has('risiko-pwa:/risiko/:bad'),false);assert.equal(stores.has('risiko-pwa:/risiko/:old'),true);
 const next=serviceWorker('next',stores);await next.emit('install');assert.equal(next.skip,0);assert.equal(stores.has('risiko-pwa:/risiko/:old'),true);
 await next.emit('message',{data:{type:'RISIKO_ACTIVATE'}});assert.equal(next.skip,1);await next.emit('activate');
 assert.equal(stores.has('risiko-pwa:/risiko/:old'),false);assert.equal(stores.has('risiko-pwa:/altro/:old'),true);
 stores.get('risiko-pwa:/risiko/:next')!.delete('https://example.org/risiko/audio/clash.wav');
 await next.emit('message',{data:{type:'RISIKO_CACHE_STATUS'}});assert.equal(next.messages.at(-1).ready,false);
});
test('iPhone: la vista assistita scambia dimensioni solo sul tavolo verticale; menu e landscape reale invariati',()=>{
 assert.deepEqual(assistedFrame('landscape',390,844),{rotated:true,width:844,height:390});
 assert.deepEqual(assistedFrame('portrait',390,844),{rotated:false,width:390,height:844});
 assert.deepEqual(assistedFrame('landscape',844,390),{rotated:false,width:844,height:390});
 assert.deepEqual(assistedFrame('landscape',390,844,false),{rotated:false,width:390,height:844});
});
test('Android/iOS nativi: nessun Service Worker, redirect, iframe o rotazione web',()=>{
 const old={window:(globalThis as any).window,Capacitor:(globalThis as any).Capacitor};
 Object.assign(globalThis,{window:{},Capacitor:{isNativePlatform:()=>true}});
 try{assert.equal(redirectForApple(),false);assert.doesNotThrow(()=>initWebApp(()=>{throw Error('Web UI in native app');})());assert.doesNotThrow(()=>sendWebOrientation('landscape'));}
 finally{if(old.window===undefined)delete (globalThis as any).window;else (globalThis as any).window=old.window;if(old.Capacitor===undefined)delete (globalThis as any).Capacitor;else (globalThis as any).Capacitor=old.Capacitor;}
});
