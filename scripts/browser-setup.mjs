import assert from 'node:assert/strict';
import {clickTerritory} from './browser-input.mjs';

// One browser task: phase, actor, revision, effects and hitboxes all belong to
// the same render. Never combine locators read across an instant bot turn.
export async function readSetupSnapshot(page){
 return page.evaluate(()=>{
  const table=document.querySelector('.game-table');if(!table)return null;
  const placeable=table.querySelector('.territory.placeable');
  const id=placeable?.getAttribute('data-territory');
  const hit=table.querySelector('.placement-plus-hit')?.getBoundingClientRect();
  return {phase:table.getAttribute('data-phase'),active:table.getAttribute('data-active'),revision:Number(table.getAttribute('data-revision')),
   effects:document.querySelector('#effects')?.childElementCount??0,
   paused:!!document.querySelector('.pause-card'),closing:!!document.querySelector('#dialogs .dialog-leaving'),
   plusCount:table.querySelectorAll('.placement-plus').length,
   hit:hit?{width:hit.width,height:hit.height}:null,
   id:id==null?null:Number(id),armies:id==null?null:Number(table.querySelector(`[data-token="${id}"] .tank-number`)?.textContent)};
 });
}

export function setupAction(snapshot,territoryCount){
 assert.ok(snapshot,'Plancia assente durante il piazzamento iniziale');
 // Evaluate the phase FIRST: zero + buttons is correct after setup finishes.
 if(snapshot.phase!=='SETUP_PLACEMENT')return 'done';
 if(snapshot.active!=='0'||snapshot.effects||snapshot.paused||snapshot.closing)return 'wait';
 const context=`Piazzamento umano, revisione ${snapshot.revision}`;
 assert.equal(snapshot.plusCount,territoryCount,`${context}: numero pulsanti +`);
 assert.ok(snapshot.hit&&snapshot.hit.width>=43.9&&snapshot.hit.height>=43.9,`${context}: area touch + almeno 44 px`);
 assert.ok(Number.isInteger(snapshot.id)&&snapshot.id>=0,`${context}: territorio piazzabile assente`);
 assert.ok(Number.isInteger(snapshot.armies)&&snapshot.armies>=1,`${context}: conteggio carri non valido`);
 return 'place';
}

export async function completeBrowserSetup(page,expected,territoryCount,click=clickTerritory){
 let clicks=0,finished=false,last=null;const deadline=Date.now()+60000;
 while(Date.now()<deadline){
  last=await readSetupSnapshot(page);
  const action=setupAction(last,territoryCount);
  if(action==='done'){finished=true;break;}
  if(action==='wait'){await page.waitForTimeout(50);continue;}
  const {revision,id,armies:before}=last;
  await click(page,id);
  await page.waitForFunction(({revision,id,before})=>{
   const table=document.querySelector('.game-table'),number=document.querySelector(`[data-token="${id}"] .tank-number`);
   return table&&Number(table.getAttribute('data-revision'))>revision&&Number(number?.textContent)===before+1;
  },{revision,id,before},{timeout:5000});
  clicks++;
 }
 assert.ok(finished,`Piazzamento non concluso entro 60s: ${JSON.stringify(last)}`);
 assert.equal(clicks,expected,'Devono essere piazzate tutte le armate della riserva iniziale');
 return clicks;
}
