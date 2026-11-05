import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pauseBrowserGame,leaveGameForFixture} from '../scripts/browser-session.mjs';

function ui(race=false){
 let state='playing',first=true;const actions:string[]=[];
 const page={locator:(selector:string)=>({
  isVisible:async()=>selector==='.pause-card'?state==='paused':selector.includes('"pause"')?state==='menu':selector.includes('"close"')?['menu','summary'].includes(state):state==='playing',
  click:async(options:any)=>{
   assert.equal(options.force,undefined);assert.ok(options.timeout<=750);actions.push(selector);
   if(selector.includes('"game-menu"')){
    if(race&&first){first=false;state='summary';throw Object.assign(new Error('Summary intercepted pointer'),{name:'TimeoutError'});}
    assert.equal(state,'playing');state='menu';
   }else if(selector.includes('"pause"')){assert.equal(state,'menu');state='paused';}
   else{assert.equal(state,'summary');state='playing';}
  }
 })};
 return {page,actions,get state(){return state;}};
}
test('browser: cambio fixture attende la navigazione senza tentare Pausa nel turno bot',async()=>{
 const calls:string[]=[];let complete!:()=>void;
 const page={goto:async(url:string)=>{calls.push(url);await new Promise<void>(resolve=>complete=resolve);},locator:()=>{throw Error('Il cambio fixture non deve cliccare il menu');}};
 const transition=leaveGameForFixture(page,'http://localhost/icon.svg').then(()=>calls.push('write fixture'));
 await Promise.resolve();assert.deepEqual(calls,['http://localhost/icon.svg']);complete();await transition;
 assert.deepEqual(calls,['http://localhost/icon.svg','write fixture']);
});
test('browser: Pausa reale apre il menu e conferma senza chiuderlo al giro successivo',async()=>{
 const f=ui();await pauseBrowserGame(f.page);assert.equal(f.state,'paused');assert.equal(f.actions.length,2);
 await pauseBrowserGame(f.page);assert.equal(f.actions.length,2,'Già in pausa: nessun click');
});
test('browser: riepilogo apparso durante click menu viene chiuso prima di ritentare Pausa',async()=>{
 const f=ui(true);await pauseBrowserGame(f.page);assert.equal(f.state,'paused');
 assert.deepEqual(f.actions,['[data-action="game-menu"]','#dialogs [data-action="close"]','[data-action="game-menu"]','#dialogs [data-action="pause"]']);
});
test('browser: errori inattesi e menu inaccessibili non vengono mascherati',async()=>{
 const error=new Error('Page closed');
 const page={locator:()=>({isVisible:async()=>false,click:async()=>{throw error;}})};
 await assert.rejects(pauseBrowserGame(page),e=>e===error);
 await assert.rejects(pauseBrowserGame(page,0),/Pausa non raggiungibile/);
});
