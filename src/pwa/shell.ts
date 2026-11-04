import {isAppleMobile,assistedFrame,rotationAssistance} from './platform.ts';
const stage=document.getElementById('web-stage')!,frame=document.getElementById('game-frame') as HTMLIFrameElement;
let mode='portrait',enabled=rotationAssistance();
// Non-Apple browsers use their own orientation/fullscreen APIs, without an iframe.
if(!isAppleMobile())location.replace(new URL('./index.html',location.href));
function fit(){
 const layout=assistedFrame(mode,stage.clientWidth,stage.clientHeight,enabled);
 stage.classList.toggle('assisted',layout.rotated);
 stage.style.setProperty('--frame-width',`${layout.width}px`);stage.style.setProperty('--frame-height',`${layout.height}px`);
}
addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='RISIKO_ORIENTATION')return;
 if(!['portrait','landscape'].includes(event.data.mode))return;
 mode=event.data.mode;enabled=event.data.assisted!==false;fit();
});
addEventListener('resize',fit);visualViewport?.addEventListener('resize',fit);new ResizeObserver(fit).observe(stage);fit();
