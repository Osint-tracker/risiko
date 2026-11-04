import {makeBackup,parseBackup} from '../src/services/Backup.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StorageService} from '../src/services/StorageService.ts';
import {createGame,owned} from '../src/engine/RisikoRulesEngine.ts';
import type {GameState} from '../src/engine/types.ts';

test('Worker integration: persist before publish, private projection, duplicate requests and save failure',async()=>{
 const original={save:StorageService.prototype.save,load:StorageService.prototype.load,profile:StorageService.prototype.profile,setName:StorageService.prototype.setName,restore:StorageService.prototype.restoreBackup,interval:globalThis.setInterval};
 let durable:GameState|null=null,fail=false,writes=0,currentProfile={name:'Test',results:[]};
 const messages:any[]=[];
 const ctx:{postMessage:(v:any)=>void;onmessage?:Function}={postMessage:(v:any)=>{if(v.type==='STATE'||v.type==='LOCAL_SAVE')assert.ok(durable,'State published before durable write');messages.push(structuredClone(v));}};
 StorageService.prototype.save=async function(s){if(fail)throw new Error('Quota simulata');durable=structuredClone(s);writes++;};
 StorageService.prototype.load=async()=>durable;
 StorageService.prototype.profile=async()=>currentProfile;
 StorageService.prototype.restoreBackup=async b=>{if(fail)throw Error('Quota import');durable=b.game?{...structuredClone(b.game),paused:true}:null;currentProfile=structuredClone(b.profile) as typeof currentProfile;};
 StorageService.prototype.setName=async()=>{};
 Object.assign(globalThis,{self:ctx});
 globalThis.setInterval=(()=>0) as never;
 const drain=()=>new Promise<void>(resolve=>setTimeout(resolve,10));
 try{
  await import('../src/engine/server.worker.ts');globalThis.setInterval=original.interval;
  ctx.onmessage!({data:{type:'INIT'}});await drain();assert.ok(messages.some(m=>m.type==='READY'));
  let seed=1;while(createGame({players:3,name:'Test',difficulties:['casuale','casuale'],turnSeconds:180,seed}).active!==0)seed++;
  ctx.onmessage!({data:{type:'NEW',config:{players:3,name:'Test',difficulties:['casuale','casuale'],turnSeconds:180,seed}}});await drain();
  let view=messages.filter(m=>m.type==='STATE').at(-1).state;assert.ok(!('rng'in view));assert.equal(view.players[1].difficulty,'?');assert.equal(view.players[1].cards,undefined);
  assert.ok(messages.some(m=>m.type==='onGameStateUpdate'));
  assert.deepEqual(messages.filter(m=>m.type==='LOCAL_SAVE').at(-1).state,durable);
  const t=owned(view,0)[0],previous=view.board[t].armies;
  const packet={type:'COMMAND',command:{type:'PLACE',territory:t,count:1},revision:view.revision,id:'request-1'};
  ctx.onmessage!({data:packet});await drain();view=messages.filter(m=>m.type==='STATE').at(-1).state;assert.equal(view.board[t].armies,previous+1);const beforeWrites=writes;
  ctx.onmessage!({data:packet});await drain();assert.equal(writes,beforeWrites);
  fail=true;ctx.onmessage!({data:{...packet,id:'request-2',revision:view.revision}});await drain();assert.ok(messages.some(m=>m.type==='ERROR'&&m.message==='Quota simulata'));assert.equal(durable!.board[t].armies,previous+1);
  fail=false;ctx.onmessage!({data:{type:'EXPORT_BACKUP'}});await drain();
  assert.ok(messages.some(m=>m.type==='BACKUP_FILE'),JSON.stringify(messages.filter(m=>m.type==='ERROR')));
  const exported=parseBackup(messages.filter(m=>m.type==='BACKUP_FILE').at(-1).text);assert.deepEqual(exported.game,durable);assert.ok(exported.game!.deck.length);
  const replacement=createGame({players:4,name:'Imported',difficulties:['medio','medio','survival'],turnSeconds:180,seed:71,antarctica:true});
  const imported=makeBackup(replacement,{name:'Imported',results:[]});
  ctx.onmessage!({data:{type:'IMPORT_BACKUP',text:JSON.stringify(imported)}});await drain();
  const restored=messages.filter(m=>m.type==='BACKUP_RESTORED').at(-1);assert.equal(restored.state.id,replacement.id);assert.equal(restored.state.paused,true);assert.equal(restored.state.rng,undefined);assert.equal(restored.state.players[1].cards,undefined);assert.equal(currentProfile.name,'Imported');
  const durableBefore=structuredClone(durable),ackCount=messages.filter(m=>m.type==='BACKUP_RESTORED').length;
  fail=true;ctx.onmessage!({data:{type:'IMPORT_BACKUP',text:JSON.stringify(exported)}});await drain();assert.deepEqual(durable,durableBefore);assert.equal(messages.filter(m=>m.type==='BACKUP_RESTORED').length,ackCount);
 }finally{StorageService.prototype.save=original.save;StorageService.prototype.load=original.load;StorageService.prototype.profile=original.profile;StorageService.prototype.setName=original.setName;StorageService.prototype.restoreBackup=original.restore;globalThis.setInterval=original.interval;}
});
