import {test} from 'node:test';
import assert from 'node:assert/strict';
import {panelPosition} from '../src/gui/effects.ts';
const intersects=(p:{x:number;y:number},w:number,h:number,r:{left:number;top:number;right:number;bottom:number})=>p.x<r.right&&p.x+w>r.left&&p.y<r.bottom&&p.y+h>r.top;
test('pannelli attacco, dadi e conquista non coprono zoom, barra laterale e comandi',()=>{
 for(const [width,height] of [[844,390],[932,430],[667,375]])for(const [w,h] of [[360,220],[290,210],[350,200]]){
  const blocked=[{left:width-200,top:height-128,right:width-80,bottom:height-90},{left:width-76,top:65,right:width-8,bottom:height-90},{left:8,top:height-85,right:width-8,bottom:height-8}];
  // Preferred point reproduces the old bottom-right panel covering the zoom.
  const position=panelPosition({left:0,top:0,right:width,bottom:height},w,h,[{x:150,y:120}],blocked,{x:width-w-66,y:height-h-75});
  assert.ok(blocked.every(r=>!intersects(position,w,h,r)),`${width}/${w}: ${JSON.stringify(position)}`);
  assert.ok(position.x>=8&&position.y>=8&&position.x+w<=width-8&&position.y+h<=height-8);
 }
});
test('posizione manuale libera mantenuta; finestra vincolata allo schermo dopo rotazione/ridimensionamento',()=>{
 const bounds={left:0,top:0,right:844,bottom:390},preferred={x:130,y:90};assert.deepEqual(panelPosition(bounds,290,200,[],[],preferred),preferred);
 const p=panelPosition(bounds,290,200,[],[],{x:900,y:800});assert.ok(p.x+290<=836&&p.y+200<=382);
});
