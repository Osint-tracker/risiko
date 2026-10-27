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
