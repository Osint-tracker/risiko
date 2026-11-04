import {isNativeApp,isAppleMobile,rotationAssistance} from './platform.ts';
export const webStatus={ready:false,update:false,error:'',supported:false};
let registration:ServiceWorkerRegistration|undefined,installPrompt:any=null,reloadRequested=false;
let notifyStatus:(()=>void)|undefined;
export function redirectForApple(){
 if(typeof window==='undefined'||isNativeApp()||!isAppleMobile()||window.parent!==window||!/^https?:$/.test(location.protocol))return false;
 location.replace(new URL('./pwa.html',location.href));return true;
}
export function initWebApp(changed:()=>void){
 if(typeof window==='undefined'||isNativeApp())return ()=>{};
 if(!/^https?:$/.test(location.protocol)||!('serviceWorker' in navigator)){webStatus.error='La modalità offline richiede HTTPS e un browser aggiornato.';return ()=>{};}
 webStatus.supported=true;let disposed=false;
 const notify=()=>{if(!disposed)changed();};notifyStatus=notify;
 const status=()=>{(navigator.serviceWorker.controller??registration?.active)?.postMessage({type:'RISIKO_CACHE_STATUS'});};
 const controller=()=>{if(reloadRequested){if(window.parent!==window)window.parent.location.reload();else location.reload();}else status();};
 const message=(e:MessageEvent)=>{if(e.data?.type==='RISIKO_CACHE_STATUS'){webStatus.ready=e.data.ready===true;webStatus.update=!!registration?.waiting;notify();}};
 const prompt=(e:Event)=>{e.preventDefault();installPrompt=e;notify();};
 navigator.serviceWorker.addEventListener('controllerchange',controller);navigator.serviceWorker.addEventListener('message',message);window.addEventListener('beforeinstallprompt',prompt);
 void navigator.serviceWorker.register(new URL('./sw.js',document.baseURI),{scope:'./',updateViaCache:'none'}).then(reg=>{
  registration=reg;webStatus.update=!!reg.waiting;status();notify();
  reg.addEventListener('updatefound',()=>{
   const installing=reg.installing;installing?.addEventListener('statechange',()=>{
    if(installing.state==='installed')setTimeout(()=>{webStatus.update=!!reg.waiting&&!!navigator.serviceWorker.controller;notify();status();},0);
   });
  });
  void navigator.serviceWorker.ready.then(()=>status());
 }).catch(()=>{webStatus.error='Download offline non completato. Collegati a Internet e riapri l’app.';notify();});
 return ()=>{disposed=true;if(notifyStatus===notify)notifyStatus=undefined;navigator.serviceWorker.removeEventListener('controllerchange',controller);navigator.serviceWorker.removeEventListener('message',message);window.removeEventListener('beforeinstallprompt',prompt);};
}
export async function installWebApp(){
 if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();}
 try{await navigator.storage?.persist?.();}catch{}
}
export function updateWebApp(){if(webStatus.update&&registration?.waiting){reloadRequested=true;registration.waiting.postMessage({type:'RISIKO_ACTIVATE'});}else void registration?.update().then(()=>{webStatus.update=!!registration?.waiting;notifyStatus?.();}).catch(()=>{});}
export function sendWebOrientation(mode:'portrait'|'landscape'){
 if(typeof window==='undefined'||isNativeApp())return;
 if(window.parent!==window){window.parent.postMessage({type:'RISIKO_ORIENTATION',mode,assisted:rotationAssistance()},location.origin);return;}
 const orientation=globalThis.screen?.orientation as ScreenOrientation&{lock?:(mode:string)=>Promise<void>};
 if(mode==='portrait'){try{orientation?.unlock?.();}catch{}}
 else if(orientation?.lock)void orientation.lock('landscape').catch(()=>{});
}
