import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {setTimeout as wait} from 'node:timers/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createGame,applyCommand,assertState} from '../src/engine/RisikoRulesEngine.ts';
await mkdir('artifacts/browser',{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{stdio:'pipe',env:{...process.env,PORT:'4173'}});
let browser,page,logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
try{
 let connected=false;
 for(let i=0;i<100;i++){if(server.exitCode!==null)throw new Error('Server non disponibile: '+logs);try{if((await fetch('http://127.0.0.1:4173')).ok){connected=true;break;}}catch{}await wait(200);}
 assert.ok(connected,'Server non avviato');
 browser=await chromium.launch({headless:true});
 page=await browser.newPage({viewport:{width:844,height:390}});
 const errors=[],external=[];
 await page.context().tracing.start({screenshots:true,snapshots:true});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173')&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url());});
 await page.goto('http://127.0.0.1:4173');
 await page.locator('[data-action="new"]:not([disabled])').waitFor();
 await page.screenshot({path:'artifacts/browser/lobby.png',fullPage:true});
 await page.locator('[data-action="blind-all"]').click();assert.equal(await page.getByText('Bot ? · livello segreto',{exact:true}).count(),3);
 await page.locator('[data-count="3"]').click();await page.locator('[data-action="new"]').click();
 await page.locator('.game-table').waitFor();assert.equal(await page.locator('[data-territory]').count(),42);
 async function completeSetup(expected,territoryCount){
  await page.locator('.game-table[data-phase="SETUP_PLACEMENT"]').waitFor();
  await page.locator('[data-speed="0"]').click();
  let clicks=0;const deadline=Date.now()+60000;
  while(Date.now()<deadline){
   const phase=await page.locator('.game-table').getAttribute('data-phase');if(phase!=='SETUP_PLACEMENT')break;
   const human=await page.locator('.game-table').getAttribute('data-active')==='0';
   if(human&&await page.locator('#effects > *').count()===0){
    assert.equal(await page.locator('.placement-plus').count(),territoryCount);
    const revision=await page.locator('.game-table').getAttribute('data-revision');
    await page.locator('[data-territory][aria-label*="Comandante,"] .territory-hit').first().click({force:true});
    await page.waitForFunction(r=>document.querySelector('.game-table')?.getAttribute('data-revision')!==r,revision);clicks++;
   }else await wait(100);
  }
  assert.equal(clicks,expected,'Devono essere piazzate tutte le armate della riserva iniziale');
  assert.notEqual(await page.locator('.game-table').getAttribute('data-phase'),'SETUP_PLACEMENT');
 }
 await completeSetup(21,14);
 await page.locator('[data-action="pause"]').click();await page.locator('.pause-card').waitFor();
 await page.screenshot({path:'artifacts/browser/table.png',fullPage:true});
 await page.reload();await page.locator('[data-action="resume"]').waitFor();await page.locator('[data-action="resume"]').click();await page.locator('.game-table').waitFor();
 await page.locator('[data-action="objective"]').click();await page.getByText('IL TUO OBIETTIVO',{exact:true}).waitFor();
 await page.screenshot({path:'artifacts/browser/objective.png'});await page.locator('[data-action="close"]').click();
 await page.locator('[data-action="objective-view"]').click();assert.ok(await page.locator('.territory.goal').count()>0);

 // Load through real IndexedDB with the previous game's Worker already gone.
 // Reloading an active game after writing the fixture can trigger visibility
 // PAUSE and overwrite the fixture with the old game's in-memory state.
 async function loadFixture(state){
  assertState(state);
  await page.locator('[data-action="pause"]').click();await page.locator('.pause-card').waitFor();
  await page.goto('http://127.0.0.1:4173/icon.svg');
  const fixture=structuredClone(state);fixture.paused=true;
  const stored=await page.evaluate(state=>new Promise((resolve,reject)=>{
   const req=indexedDB.open('risiko-offline',1);req.onerror=()=>reject(req.error);
   req.onsuccess=()=>{
    const db=req.result,tx=db.transaction('game','readwrite'),store=tx.objectStore('game');
    store.put(state,'current');
    const check=store.get('current');let saved;
    check.onsuccess=()=>{saved=check.result;};
    tx.oncomplete=()=>{db.close();resolve({id:saved.id,phase:saved.phase,players:saved.players.length,remaining:saved.players[0].setupRemaining});};
    tx.onerror=tx.onabort=()=>{db.close();reject(tx.error??new Error('Salvataggio fixture interrotto'));};
   };
  }),fixture);
  assert.deepEqual(stored,{id:fixture.id,phase:fixture.phase,players:fixture.players.length,remaining:fixture.players[0].setupRemaining},'Fixture salvata correttamente prima di avviare il nuovo Worker');
  await page.goto('http://127.0.0.1:4173');
  await page.locator('[data-action="new"]:not([disabled])').waitFor();
  const loaded=await page.evaluate(()=>new Promise((resolve,reject)=>{
   const req=indexedDB.open('risiko-offline',1);req.onerror=()=>reject(req.error);
   req.onsuccess=()=>{
    const db=req.result,tx=db.transaction('game','readonly'),read=tx.objectStore('game').get('current');let saved;
    read.onsuccess=()=>{saved=read.result;};
    tx.oncomplete=()=>{db.close();resolve({id:saved.id,phase:saved.phase,players:saved.players.length,remaining:saved.players[0].setupRemaining});};
    tx.onerror=tx.onabort=()=>{db.close();reject(tx.error??new Error('Lettura fixture interrotta'));};
   };
  }));
  assert.deepEqual(loaded,stored,'Il nuovo Worker deve caricare la fixture, non il salvataggio precedente');
  await page.locator('[data-action="resume"]').click();
  await page.locator(`.game-table[data-phase="${fixture.phase}"]`).waitFor();
  await page.locator('.pause-card').waitFor({state:'detached'});
  assert.equal(await page.locator('.player-card').count(),fixture.players.length);
 }
 for(const n of [4,5]){
  const setup=createGame({players:n,name:'Comandante',difficulties:Array(n-1).fill('medio'),turnSeconds:180,seed:41});
  const owned=setup.board.filter(c=>c.owner===0).length;
  await loadFixture(setup);await completeSetup(setup.players[0].setupRemaining,owned);
 }
 let s=createGame({players:3,name:'Comandante',difficulties:['medio','medio'],turnSeconds:180,seed:17});
 s.round=5;s.active=0;s.phase='ATTACK';s.players.forEach(p=>p.setupRemaining=0);s.board[0]={owner:0,armies:12};s.board[1]={owner:1,armies:1};
 // Select a seed with a conquest on the first roll, without mocking dice in the UI.
 for(let seed=1;seed<1000;seed++){s.rng=seed;if(applyCommand(s,0,{type:'ATTACK',from:0,to:1}).phase==='POST_CONQUEST_MOVE')break;}
 await loadFixture(s);
 await page.locator('[data-territory="0"] .territory-hit').click({force:true});await page.locator('[data-territory="1"] .territory-hit').click({force:true});
 await page.locator('.floating-panel').waitFor();assert.equal(await page.locator('.modal-backdrop').count(),0);
 const panel=await page.locator('.floating-panel').boundingBox();assert.ok(panel.height<=390*.6+1&&panel.width<=360);
 await page.locator('[data-action="roll"]').click();await page.locator('.effects-layer.rolling').waitFor();
 const timer=await page.locator('#timer').innerText();await wait(350);assert.equal(await page.locator('#timer').innerText(),timer);
 assert.equal(await page.locator('.fx-source').count(),1);assert.equal(await page.locator('.fx-target').count(),1);
 await page.screenshot({path:'artifacts/browser/dice-rolling.png'});
 await page.locator('[data-action="confirm-move"]').waitFor();
 await page.screenshot({path:'artifacts/browser/post-conquest.png'});
 await page.locator('[data-action="confirm-move"]').click();
 await page.waitForSelector('.game-table[data-phase="ATTACK"]');
 await page.locator('[data-action="next"]').click();await page.waitForSelector('.game-table[data-phase="FORTIFY"]');
 await page.locator('[data-action="next"]').click();await page.locator('.card-reward').waitFor();await wait(1100);
 await page.screenshot({path:'artifacts/browser/card-reward.png'});
 await page.waitForFunction(()=>!document.querySelector('.card-reward'));
 // Pause is always available; opening cards while paused must still render their real artwork.
 await page.locator('[data-action="pause"]').click();await page.locator('.pause-card').waitFor();
 await page.reload();await page.locator('[data-action="resume"]').waitFor();await page.locator('[data-action="resume"]').click();await page.locator('.game-table').waitFor();
 await page.locator('[data-action="cards"]').click();await page.getByText('LE TUE CARTE',{exact:true}).waitFor();
 assert.equal(await page.locator('.territory-card').count(),1);assert.equal(await page.locator('.territory-card .military-icon').count()>=1,true);
 await page.screenshot({path:'artifacts/browser/cards.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Overflow orizzontale');
 await page.locator('[data-action="close"]').click();
 await page.setViewportSize({width:1365,height:900});await page.screenshot({path:'artifacts/browser/tablet.png'});
 // Interrupt a real roll: persistence already contains its outcome; resume must
 // open the mandatory transfer without replaying dice or losing the result.
 await loadFixture(s);
 await page.locator('[data-territory="0"] .territory-hit').click({force:true});await page.locator('[data-territory="1"] .territory-hit').click({force:true});
 await page.locator('[data-action="roll"]').click();await page.locator('.effects-layer.rolling').waitFor();
 await page.locator('[data-action="pause"]').click();await page.locator('.pause-card').waitFor();
 assert.equal(await page.locator('.battle-window').count(),0);
 await page.reload();await page.locator('[data-action="resume"]').waitFor();await page.locator('[data-action="resume"]').click();
 await page.locator('[data-action="confirm-move"]').waitFor();assert.equal(await page.locator('.battle-window').count(),0);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS: setup 3/4/5 completo via tocchi, IndexedDB/ripresa anche durante i dadi, obiettivo, finestre compatte, dadi, timer sospeso, conquista, spostamento, pesca e carte; telefono/tablet; zero richieste esterne.');
}catch(error){
 await page?.screenshot({path:'artifacts/browser/failure.png',fullPage:true}).catch(()=>{});
 throw error;
}finally{
 if(page)await page.context().tracing.stop({path:'artifacts/browser/trace.zip'}).catch(()=>{});
 await browser?.close();server.kill('SIGTERM');
}
