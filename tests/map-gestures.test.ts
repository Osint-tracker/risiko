import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindMapGestures} from '../src/gui/mapGestures.ts';
import {createGame,applyCommand,owned} from '../src/engine/RisikoRulesEngine.ts';

class MapSurface extends EventTarget {
 isConnected=true;
 captures=new Set<number>();
 setPointerCapture(id:number){this.captures.add(id);}
 hasPointerCapture(id:number){return this.captures.has(id);}
 releasePointerCapture(id:number){
  if(this.captures.delete(id))this.pointer('lostpointercapture',id);
 }
 pointer(type:string,id:number,x=100,y=100,extra:Record<string,unknown>={}){
  this.dispatchEvent(Object.assign(new Event(type),{pointerId:id,clientX:x,clientY:y,pointerType:'touch',isPrimary:id===1,button:0,buttons:1,...extra}));
 }
}
function fixture(){
 const svg=new MapSurface(),taps:number[]=[],inspections:number[]=[],pans:number[][]=[],zooms:number[]=[];
 let ended=0;
 const controls=bindMapGestures(svg as unknown as SVGSVGElement,{
  pick:()=>7,tap:id=>taps.push(id),inspect:id=>inspections.push(id),
  pan:(x,y)=>pans.push([x,y]),zoom:n=>zooms.push(n),end:()=>ended++
 });
 return {svg,controls,taps,inspections,pans,zooms,ended:()=>ended};
}
test('mappa: un dito trascina senza zoom; un tocco successivo seleziona una sola volta',()=>{
 const f=fixture();
 f.svg.pointer('pointerdown',1);f.svg.pointer('pointermove',1,120,112);f.svg.pointer('pointerup',1,120,112);
 assert.deepEqual(f.pans,[[20,12]]);assert.deepEqual(f.zooms,[]);assert.deepEqual(f.taps,[]);
 f.svg.pointer('pointerdown',1);f.svg.pointer('pointerup',1);
 assert.deepEqual(f.taps,[7]);assert.equal(f.controls.active,false);assert.equal(f.svg.captures.size,0);f.controls.dispose();
});
test('mappa: pinch con due dita, poi trascinamento con il dito rimasto senza piazzamenti involontari',()=>{
 const f=fixture();
 f.svg.pointer('pointerdown',1,100,100);f.svg.pointer('pointerdown',2,200,100);
 f.svg.pointer('pointermove',2,250,100);assert.deepEqual(f.zooms,[100/150]);
 f.svg.pointer('pointerup',1);f.svg.pointer('pointermove',2,275,120);f.svg.pointer('pointerup',2,275,120);
 assert.deepEqual(f.pans,[[25,20]]);assert.equal(f.zooms.length,1);assert.deepEqual(f.taps,[]);
 f.svg.pointer('pointerdown',1);f.svg.pointer('pointerup',1);assert.deepEqual(f.taps,[7]);f.controls.dispose();
});
for(const event of ['lostpointercapture','pointercancel'])test(`mappa: ${event} elimina tutti i tocchi pendenti, anche durante il pinch`,()=>{
 const f=fixture();
 f.svg.pointer('pointerdown',1);f.svg.pointer('pointerdown',2,200,100);f.svg.pointer(event,2);
 assert.equal(f.controls.active,false);assert.equal(f.svg.captures.size,0);
 f.svg.pointer('pointermove',1,150,100);f.svg.pointer('pointerup',1);
 assert.deepEqual(f.taps,[]);assert.deepEqual(f.zooms,[]);
 f.svg.pointer('pointerdown',1);f.svg.pointer('pointerup',1);assert.deepEqual(f.taps,[7]);f.controls.dispose();
});
test('mappa: nuovo contatto primario recupera un pointerup mancante senza tornare alla Home',()=>{
 const f=fixture();f.svg.pointer('pointerdown',9,100,100,{isPrimary:true});
 f.svg.pointer('pointerdown',11,100,100,{isPrimary:true});f.svg.pointer('pointerup',11);
 assert.deepEqual(f.taps,[7]);assert.equal(f.svg.captures.size,0);f.controls.dispose();
});
test('mappa: reset per pausa/rotazione cancella la pressione lunga e dispose rimuove gli eventi',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=fixture();
 f.svg.pointer('pointerdown',1);f.controls.reset();t.mock.timers.tick(500);
 assert.deepEqual(f.inspections,[]);assert.equal(f.controls.active,false);
 f.svg.pointer('pointerdown',1);t.mock.timers.tick(451);f.svg.pointer('pointerup',1);
 assert.deepEqual(f.inspections,[7]);assert.deepEqual(f.taps,[]);
 f.controls.dispose();f.svg.pointer('pointerdown',1);f.svg.pointer('pointerup',1);
 assert.deepEqual(f.taps,[]);assert.equal(f.controls.active,false);
});
test('mappa: mouse senza tasto premuto recupera una cattura persa; tasto destro ignorato',()=>{
 const f=fixture();f.svg.pointer('pointerdown',1,100,100,{pointerType:'mouse',button:2});assert.equal(f.controls.active,false);
 f.svg.pointer('pointerdown',1,100,100,{pointerType:'mouse'});
 f.svg.pointer('pointermove',1,110,100,{pointerType:'mouse',buttons:0});
 assert.equal(f.controls.active,false);assert.deepEqual(f.pans,[]);assert.deepEqual(f.taps,[]);f.controls.dispose();
});
test('rinforzi: eventi del controller continuano a inviare PLACE dopo ripetute cancellazioni',()=>{
 let s=createGame({players:3,name:'Test',difficulties:['medio','medio'],turnSeconds:180,seed:17,manualReinforcement:true});
 s.active=0;s.phase='REINFORCEMENT';s.round=5;s.reinforcements=6;s.players.forEach(p=>p.setupRemaining=0);
 const id=owned(s,0)[0],before=s.board[id].armies,svg=new MapSurface();
 const controls=bindMapGestures(svg as unknown as SVGSVGElement,{
  pick:()=>id,tap:territory=>{s=applyCommand(s,0,{type:'PLACE',territory,count:1});},
  inspect:()=>assert.fail('Nessuna ispezione'),pan:()=>{},zoom:()=>assert.fail('Nessun pinch con un dito'),end:()=>{}
 });
 for(let i=0;i<6;i++){
  svg.pointer('pointerdown',1);svg.pointer(i%2?'pointercancel':'lostpointercapture',1);
  svg.pointer('pointerdown',1);svg.pointer('pointerup',1);
  assert.equal(s.board[id].armies,before+i+1);assert.equal(s.reinforcements,5-i);
 }
 controls.dispose();
});
