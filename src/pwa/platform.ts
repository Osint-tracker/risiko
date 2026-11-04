export function isNativeApp(){return !!(globalThis as typeof globalThis&{Capacitor?:{isNativePlatform?:()=>boolean}}).Capacitor?.isNativePlatform?.();}
export function isAppleMobile(){return typeof navigator!=='undefined'&&(/iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
export function assistedFrame(mode:string,width:number,height:number,enabled=true){
 const rotated=enabled&&mode==='landscape'&&height>width;
 return {rotated,width:rotated?height:width,height:rotated?width:height};
}
export function rotationAssistance(){try{return localStorage.getItem('risiko-web-rotation')!=='off';}catch{return true;}}
