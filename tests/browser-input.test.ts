import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clickTerritory} from '../scripts/browser-input.mjs';

async function fixture(hit:(x:number,y:number)=>boolean,check:(page:any,clicks:any[])=>Promise<void>){
 const previous={document:globalThis.document,width:globalThis.innerWidth,height:globalThis.innerHeight};
 const clicks:any[]=[];
 const element={getBoundingClientRect:()=>({x:100,y:40,left:100,top:40,right:180,bottom:100}),querySelector:()=>({getBoundingClientRect:()=>({x:120,y:40,width:20,height:20})})};
 Object.assign(globalThis,{innerWidth:844,innerHeight:390,document:{elementFromPoint:(x:number,y:number)=>({closest:()=>hit(x,y)?element:null})}});
 const page={locator:(selector:string)=>{assert.equal(selector,'[data-territory="1"]');return {evaluate:async(fn:any)=>fn(element),click:async(options:any)=>{clicks.push(options);}};}};
 try{await check(page,clicks);}finally{Object.assign(globalThis,{document:previous.document,innerWidth:previous.width,innerHeight:previous.height});}
}
test('tocchi browser: centro libero, click normale senza forzare sovrapposizioni',async()=>{
 await fixture(()=>true,async(page,clicks)=>{
  await clickTerritory(page,1);assert.equal(clicks.length,1);assert.deepEqual(clicks[0].position,{x:30,y:10});assert.equal(clicks[0].force,undefined);
 });
});
test('tocchi browser: centro sotto HUD, seleziona un punto libero dello stesso territorio',async()=>{
 await fixture((_x,y)=>y>65,async(page,clicks)=>{
  await clickTerritory(page,1);assert.equal(clicks.length,1);assert.ok(clicks[0].position.y+40>65);assert.equal(clicks[0].force,undefined);
 });
});
test('tocchi browser: territorio completamente coperto, errore esplicito senza click falso',async()=>{
 await fixture(()=>false,async(page,clicks)=>{
  await assert.rejects(clickTerritory(page,1),/Territorio 1: nessun punto raggiungibile/);assert.equal(clicks.length,0);
 });
});
