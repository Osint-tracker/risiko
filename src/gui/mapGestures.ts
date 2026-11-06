type Point={x:number;y:number};
type Actions={pick:(x:number,y:number)=>number|null;tap:(id:number)=>void;inspect:(id:number)=>void;pan:(dx:number,dy:number)=>void;zoom:(factor:number)=>void;end:()=>void};
/** Own pointer lifetime, independently from game updates and the SVG renderer. */
export function bindMapGestures(svg:SVGSVGElement,actions:Actions){
 const pointers=new Map<number,Point>();let moved=false,travel=0,start:number|null=null,distance=0;
 let press:ReturnType<typeof setTimeout>|null=null;
 const clearPress=()=>{if(press!==null)clearTimeout(press);press=null;};
 const release=(id:number)=>{try{if(svg.hasPointerCapture(id))svg.releasePointerCapture(id);}catch{/* Pointer already cancelled by the browser. */}};
 function reset(){
  const ids=[...pointers.keys()];pointers.clear();clearPress();start=null;distance=0;travel=0;moved=false;
  ids.forEach(release);actions.end();
 }
 const down=(e:PointerEvent)=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  // The first contact in a new browser gesture cannot inherit an old finger.
  if(e.isPrimary&&pointers.size)reset();
  const first=pointers.size===0;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  clearPress();
  if(first){moved=false;travel=0;distance=0;start=actions.pick(e.clientX,e.clientY);
   if(start!==null){const id=start;press=setTimeout(()=>{press=null;if(!svg.isConnected||pointers.size!==1||moved)return;moved=true;actions.inspect(id);},450);}
  }else{moved=true;start=null;}
  if(pointers.size===2){const [a,b]=[...pointers.values()];distance=Math.hypot(a.x-b.x,a.y-b.y);}
  try{svg.setPointerCapture(e.pointerId);}catch{reset();}
 };
 const move=(e:PointerEvent)=>{
  const old=pointers.get(e.pointerId);if(!old)return;
  if(e.pointerType==='mouse'&&e.buttons===0){reset();return;}
  const dx=e.clientX-old.x,dy=e.clientY-old.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  travel+=Math.abs(dx)+Math.abs(dy);if(travel>6){moved=true;clearPress();}
  if(pointers.size===2){
   const [a,b]=[...pointers.values()],next=Math.hypot(a.x-b.x,a.y-b.y);
   if(distance>2&&next>2)actions.zoom(distance/next);
   distance=next;moved=true;start=null;
  }else if(pointers.size===1&&moved)actions.pan(dx,dy);
 };
 const up=(e:PointerEvent)=>{
  if(!pointers.has(e.pointerId))return;
  const id=start,clicked=!moved&&pointers.size===1;
  pointers.delete(e.pointerId);clearPress();distance=0;start=null;
  // Remove bookkeeping before release: lostpointercapture may fire immediately.
  release(e.pointerId);
  if(!pointers.size){moved=false;travel=0;actions.end();}
  else moved=true; // Remaining finger pans; it must never place after a pinch.
  if(clicked&&id!==null)actions.tap(id);
 };
 const cancel=(e:PointerEvent)=>{if(pointers.has(e.pointerId))reset();};
 const wheel=(e:WheelEvent)=>{e.preventDefault();actions.zoom(e.deltaY>0?1.12:.88);};
 svg.addEventListener('pointerdown',down);svg.addEventListener('pointermove',move);svg.addEventListener('pointerup',up);
 svg.addEventListener('pointercancel',cancel);svg.addEventListener('lostpointercapture',cancel);svg.addEventListener('wheel',wheel,{passive:false});
 return {get active(){return pointers.size>0;},reset,dispose(){
  svg.removeEventListener('pointerdown',down);svg.removeEventListener('pointermove',move);svg.removeEventListener('pointerup',up);
  svg.removeEventListener('pointercancel',cancel);svg.removeEventListener('lostpointercapture',cancel);svg.removeEventListener('wheel',wheel);reset();
 }};
}
