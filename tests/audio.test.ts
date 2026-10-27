import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../src/gui/AudioService.ts';
test('audio: sblocco dal gesto, un impatto per volta, mute, preferenze e rilascio',async()=>{
 const original={context:globalThis.AudioContext,fetch:globalThis.fetch,storage:globalThis.localStorage};
 let resumed=0,started=0,stopped=0,closed=0,saved='{}';
 class Context{
  state='suspended';currentTime=0;destination={};
  async resume(){resumed++;this.state='running';}
  async decodeAudioData(){return {};}
  createGain(){return {gain:{value:0},connect(){},disconnect(){}};}
  createBufferSource(){return {buffer:null,onended:null,connect(){},disconnect(){},start(){started++;},stop(){stopped++;}};}
  async close(){closed++;}
 }
 Object.assign(globalThis,{AudioContext:Context,localStorage:{getItem:()=>saved,setItem:(_key:string,value:string)=>{saved=value;}},fetch:async()=>{assert.equal(resumed,1);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(10)};}});
 try{
  const audio=new GameAudio();assert.equal(audio.ready,false);const ready=audio.unlock();assert.equal(resumed,1);await ready;assert.equal(audio.ready,true);
  audio.clash();audio.clash();assert.equal(started,2);assert.equal(stopped,1);
  audio.muted=true;audio.clash();assert.equal(started,2);
  audio.volume=.4;audio.save();const restored=new GameAudio();assert.equal(restored.muted,true);assert.equal(restored.volume,.4);
  audio.dispose();assert.equal(stopped,2);assert.equal(closed,1);
 }finally{Object.assign(globalThis,{AudioContext:original.context,fetch:original.fetch,localStorage:original.storage});}
});

test('audio procedurale senza campioni: effetti, mute, aptica opt-in e cancellazione dei suoni programmati',async()=>{
 const originals={context:globalThis.AudioContext,fetch:globalThis.fetch,storage:globalThis.localStorage,navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator')};
 let starts=0,stops=0,closed=0;const vibrations:unknown[]=[];
 const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
 class Context{
  state='running';currentTime=5;destination={};
  createGain(){return {gain:param(),connect(){},disconnect(){}};}
  createOscillator(){return {frequency:param(),onended:null,connect(){},disconnect(){},start(){starts++;},stop(){stops++;}};}
  async close(){closed++;}
 }
 Object.assign(globalThis,{AudioContext:Context,localStorage:{getItem:()=>null,setItem(){}},fetch:async()=>{throw Error('campione non disponibile');}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{vibrate:(pattern:unknown)=>{vibrations.push(pattern);return true;}}});
 try{
  const audio=new GameAudio();await audio.unlock();assert.equal(audio.ready,false);
  audio.playDeploy();audio.playDiceRoll();audio.playConquest();audio.playCardDraw();audio.playCardTrade();audio.playTurnStart();
  assert.equal(starts,24);assert.equal(vibrations.length,0);
  audio.haptics=true;audio.playDiceRoll();assert.deepEqual(vibrations,[[12,28,12]]);
  const before=starts;audio.muted=true;audio.playDeploy();audio.playCardTrade();audio.playTurnStart();assert.equal(starts,before);
  const scheduledStops=stops;audio.stop();assert.equal(stops,scheduledStops+starts);
  audio.dispose();assert.equal(closed,1);
 }finally{
  Object.assign(globalThis,{AudioContext:originals.context,fetch:originals.fetch,localStorage:originals.storage});
  if(originals.navigator)Object.defineProperty(globalThis,'navigator',originals.navigator);else delete (globalThis as any).navigator;
 }
});
