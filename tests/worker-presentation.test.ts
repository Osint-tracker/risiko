import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StorageService} from '../src/services/StorageService.ts';
import {createGame} from '../src/engine/RisikoRulesEngine.ts';
import type {GameState} from '../src/engine/types.ts';

test('Worker: salvataggio prima degli effetti, timer fermo, ACK, pausa e watchdog',async()=>{
 const original={save:StorageService.prototype.save,load:StorageService.prototype.load,profile:StorageService.prototype.profile,setName:StorageService.prototype.setName,interval:globalThis.setInterval,performance:globalThis.performance,self:globalThis.self};
 let now=0,tick:()=>void=()=>{},durable:GameState=createGame({players:3,name:'Test',difficulties:['medio','medio'],turnSeconds:180,seed:2,endMode:'countdown'});
 durable.phase='REINFORCEMENT';durable.round=5;durable.active=0;durable.reinforcements=10;durable.players.forEach(p=>p.setupRemaining=0);durable.board[0]={owner:0,armies:5};
 const messages:any[]=[];
 const ctx:{postMessage:(m:any)=>void;onmessage?:Function}={postMessage:m=>{if(m.type==='TRANSITION')assert.equal(durable.revision,m.transition.after.revision);messages.push(structuredClone(m));}};
 StorageService.prototype.save=async s=>{durable=structuredClone(s);};StorageService.prototype.load=async()=>structuredClone(durable);
 StorageService.prototype.profile=async()=>({name:'Test',results:[]});StorageService.prototype.setName=async()=>{};
 Object.assign(globalThis,{self:ctx,performance:{now:()=>now}});
 globalThis.setInterval=((fn:()=>void)=>{tick=fn;return 0;}) as never;
 const drain=()=>new Promise<void>(r=>setTimeout(r,10));
 const send=async(data:unknown)=>{ctx.onmessage!({data});await drain();};
 const latest=()=>{const view=structuredClone(messages.filter(m=>m.type==='STATE').at(-1).state);const clock=messages.filter(m=>m.type==='CLOCK'&&m.id===view.id&&m.revision===view.revision).at(-1);return clock?{...view,remainingMs:clock.remainingMs,matchRemainingMs:clock.matchRemainingMs}:view;};
 try{
  await import('../src/engine/server.worker.ts?presentation');
  await send({type:'INIT',presentation:true});await send({type:'RESUME'});
  const initialMs=latest().remainingMs,initialMatchMs=latest().matchRemainingMs;
  await send({type:'COMMAND',revision:0,id:'a',command:{type:'PLACE',territory:0,count:1}});
  const tr=messages.find(m=>m.type==='TRANSITION').transition;
  assert.equal(latest().board[0].armies,5);assert.equal(durable.board[0].armies,6);
  now=4000;tick();await drain();assert.equal(durable.remainingMs,initialMs);assert.equal(durable.matchRemainingMs,initialMatchMs);
  await send({type:'PRESENTED',id:'stale'});assert.equal(latest().board[0].armies,5);
  await send({type:'PRESENTED',id:tr.id});assert.equal(latest().board[0].armies,6);
  await send({type:'PRESENTED',id:tr.id});assert.equal(durable.revision,1);
  now+=1000;tick();await drain();assert.equal(latest().remainingMs,initialMs-1000);assert.equal(latest().matchRemainingMs,initialMatchMs-1000);
  await send({type:'COMMAND',revision:1,id:'b',command:{type:'PLACE',territory:0,count:1}});
  now+=2000;await send({type:'PAUSE'});assert.equal(latest().paused,true);assert.equal(latest().board[0].armies,7);assert.equal(latest().remainingMs,initialMs-1000);assert.equal(latest().matchRemainingMs,initialMatchMs-1000);
  const transitions=messages.filter(m=>m.type==='TRANSITION').length;
  await send({type:'RESUME'});assert.equal(messages.filter(m=>m.type==='TRANSITION').length,transitions);
  await send({type:'COMMAND',revision:2,id:'c',command:{type:'PLACE',territory:0,count:1}});
  now+=10001;tick();await drain();assert.equal(latest().board[0].armies,8);assert.equal(latest().remainingMs,initialMs-1000);assert.equal(latest().matchRemainingMs,initialMatchMs-1000);
  assert.equal(messages.filter(m=>m.type==='ERROR').length,0);
  assert.ok(messages.some(m=>m.type==='CLOCK'));
  assert.ok(messages.filter(m=>m.type==='CLOCK').every(m=>!('board' in m)&&!('log' in m)));
 }finally{
  StorageService.prototype.save=original.save;StorageService.prototype.load=original.load;StorageService.prototype.profile=original.profile;StorageService.prototype.setName=original.setName;
  globalThis.setInterval=original.interval;Object.assign(globalThis,{performance:original.performance,self:original.self});
 }
});
