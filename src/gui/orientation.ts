import {sendWebOrientation} from '../pwa/client.ts';
type Mode='portrait'|'landscape';
type NativeBridge={isNativePlatform?:()=>boolean;nativePromise?:(plugin:string,method:string,options:{mode:Mode})=>Promise<unknown>};
let lastMode='';
/** Capacitor's injected bridge also works with the dependency-free offline build. */
export function setGameOrientation(mode:Mode){
 const bridge=(globalThis as typeof globalThis&{Capacitor?:NativeBridge}).Capacitor;
 if(!bridge?.isNativePlatform?.()){sendWebOrientation(mode);return;}
 if(!bridge.nativePromise||mode===lastMode)return;
 lastMode=mode;
 void bridge.nativePromise('GameOrientation','set',{mode}).catch(()=>{if(lastMode===mode)lastMode='';});
}
