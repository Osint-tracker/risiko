import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setGameOrientation} from '../src/gui/orientation.ts';
test('orientamento nativo: menu verticale, tavolo orizzontale, nessuna richiesta duplicata',async()=>{
 const calls:unknown[]=[];
 Object.assign(globalThis,{Capacitor:{isNativePlatform:()=>true,nativePromise:async(plugin:string,method:string,options:unknown)=>{calls.push({plugin,method,options});}}});
 try{
  setGameOrientation('portrait');setGameOrientation('portrait');setGameOrientation('landscape');setGameOrientation('portrait');
  assert.deepEqual(calls.map((c:any)=>c.options.mode),['portrait','landscape','portrait']);
  assert.ok(calls.every((c:any)=>c.plugin==='GameOrientation'&&c.method==='set'));
 }finally{delete (globalThis as any).Capacitor;}
});
