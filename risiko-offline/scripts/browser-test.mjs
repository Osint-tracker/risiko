import {spawn} from 'node:child_process';import {mkdir} from 'node:fs/promises';import {setTimeout as wait} from 'node:timers/promises';import assert from 'node:assert/strict';
import {chromium} from 'playwright';
await mkdir('artifacts/browser',{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{stdio:'pipe',env:{...process.env,PORT:'4173'}});
let browser;let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
try{
 let connected=false;for(let i=0;i<100;i++){if(server.exitCode!==null)throw new Error('Server non disponibile: '+logs);try{const r=await fetch('http://127.0.0.1:4173');if(r.ok){connected=true;break;}}catch{}await wait(200);}assert.ok(connected,'Server non avviato');
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1365,height:900}});const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173')&&!r.url().startsWith('data:'))external.push(r.url());});
 await page.goto('http://127.0.0.1:4173');await page.locator('[data-action="new"]:not([disabled])').waitFor();
 await page.screenshot({path:'artifacts/browser/lobby.png',fullPage:true});await page.locator('[data-action="blind-all"]').click();assert.equal(await page.getByText('Bot ? · livello segreto',{exact:true}).count(),3);
 await page.locator('[data-action="new"]').click();await page.locator('.game-table').waitFor();assert.equal(await page.locator('[data-territory]').count(),42);
 await page.locator('[data-speed="0"]').click();
 // Seed the public user's setup via genuine map clicks; the worker plays all bot turns.
 for(let i=0;i<140;i++){
  const text=await page.locator('#instruction').innerText();if(!text.includes('mano')&&!text.includes('pianificando'))break;
  const own=page.locator('[data-territory][aria-label*="Comandante,"]').first();if(text.includes('mano'))await own.click({force:true});await wait(80);
 }
 await page.locator('[data-action="pause"]').click();await page.locator('.pause-card').waitFor();await page.screenshot({path:'artifacts/browser/table.png',fullPage:true});
 // IndexedDB survives page reload; no remote service is needed to resume.
 await page.reload();await page.locator('[data-action="resume"]').waitFor();await page.locator('[data-action="resume"]').click();await page.locator('.game-table').waitFor();
 await page.locator('[data-action="objective"]').click();await page.getByText('RISERVATO AL COMANDANTE',{exact:true}).waitFor();await page.screenshot({path:'artifacts/browser/objective.png'});await page.locator('[data-action="close"]').click();
 await page.locator('[data-action="objective-view"]').click();assert.ok(await page.locator('.territory.goal').count()>0);
 await page.setViewportSize({width:844,height:390});await page.screenshot({path:'artifacts/browser/phone.png'});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,'Overflow orizzontale');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS: lobby, blind, tavolo, setup, pausa, IndexedDB/reload, obiettivo, viewport telefono, zero richieste esterne.');
}finally{await browser?.close();server.kill('SIGTERM');}
