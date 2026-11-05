import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readSetupSnapshot,setupAction,completeBrowserSetup} from '../scripts/browser-setup.mjs';
const ready=()=>({phase:'SETUP_PLACEMENT',active:'0',revision:60,effects:0,paused:false,closing:false,plusCount:14,hit:{width:44,height:44},id:1,armies:1});

test('setup: TRIS_EXCHANGE a revisione 63 con zero + è fine setup, non 0 !== 14',()=>{
 assert.equal(setupAction({...ready(),phase:'TRIS_EXCHANGE',revision:63,plusCount:0,hit:null,id:null,armies:null},14),'done');
});
test('setup: bot, effetti e chiusura dialogo aspettano; errori reali sui + falliscono',()=>{
 for(const change of [{active:'2'},{effects:1},{closing:true},{paused:true}])assert.equal(setupAction({...ready(),...change,plusCount:0},14),'wait');
 assert.throws(()=>setupAction({...ready(),plusCount:0},14),/numero pulsanti/);
 assert.throws(()=>setupAction({...ready(),hit:{width:20,height:20}},14),/44 px/);
 assert.throws(()=>setupAction(null,14),/Plancia assente/);
});
test('setup: lettura atomica non mescola fase del bot e pulsanti del turno successivo',async()=>{
 const before=globalThis.document;let evaluations=0;
 const table={getAttribute:(key:string)=>({'data-phase':'SETUP_PLACEMENT','data-active':'2','data-revision':'62'}[key]),querySelector:()=>null,querySelectorAll:()=>[]};
 Object.assign(globalThis,{document:{querySelector:(s:string)=>s==='.game-table'?table:null}});
 const page={evaluate:async(fn:Function)=>{evaluations++;const snapshot=fn();Object.assign(globalThis,{document:{querySelector:()=>{throw Error('Il DOM è già passato a TRIS_EXCHANGE');}}});return snapshot;},locator:()=>{throw Error('Niente letture DOM separate');}};
 try{const snapshot=await readSetupSnapshot(page);assert.equal(evaluations,1);assert.equal(snapshot.revision,62);assert.equal(setupAction(snapshot,14),'wait');}finally{Object.assign(globalThis,{document:before});}
});

for(const [territoryCount,expected] of [[14,21],[11,19],[9,16],[15,20],[11,19],[9,16]])test(`setup: completa ${expected} piazzamenti su ${territoryCount} territori, controllando ogni incremento`,async()=>{
 let clicks=0,acks=0,revision=0,bot=false;const checks:any[]=[];
 const page={evaluate:async()=>{
  if(bot){bot=false;return {...ready(),active:'1',revision,plusCount:0};}
  return clicks===expected?{...ready(),phase:'TRIS_EXCHANGE',revision,plusCount:0,hit:null}:{...ready(),revision,plusCount:territoryCount,armies:clicks+1};
 },waitForTimeout:async()=>{},waitForFunction:async(fn:Function,args:any,options:any)=>{
  checks.push(args);assert.equal(args.before,clicks);assert.ok(revision>args.revision);assert.equal(options.timeout,5000);acks++;
  // Exercise the real acknowledgement predicate, not just its call count.
  const old=globalThis.document;Object.assign(globalThis,{document:{querySelector:(s:string)=>s==='.game-table'?{getAttribute:()=>String(revision)}:{textContent:String(clicks+1)}}});
  try{assert.ok(fn(args));}finally{Object.assign(globalThis,{document:old});}
 }};
 const n=await completeBrowserSetup(page,expected,territoryCount,async(_page:any,id:number)=>{assert.equal(id,1);clicks++;revision++;bot=clicks%3===0;});
 assert.equal(n,expected);assert.equal(acks,expected);assert.equal(checks.length,expected);
});
test('setup: raggiungere una fase successiva non nasconde armate mancanti',async()=>{
 const page={evaluate:async()=>({...ready(),phase:'TRIS_EXCHANGE',plusCount:0})};
 await assert.rejects(completeBrowserSetup(page,21,14),/tutte le armate/);
});
