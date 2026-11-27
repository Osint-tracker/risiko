import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapFor} from '../src/data/mapGraph.ts';
import {canAttack} from '../src/engine/RisikoRulesEngine.ts';

// Read the actual rendered SVG (including the hand-drawn Antarctic curves).
// A common point is not a border. Ignore bends of zero length at junctions.
function boundary(path:string){
 const edges=new Map<string,number>();
 let start='',prev='';
 function add(end:string,control=''){
  const [ax,ay]=prev.split(' ').map(Number),[bx,by]=end.split(' ').map(Number);
  const length=Math.hypot(ax-bx,ay-by);
  if(length)edges.set([prev,end].sort().join('/')+'|'+control,length);
  prev=end;
 }
 for(const [,op,args] of path.matchAll(/([MLQZ])([^MLQZ]*)/g)){
  const values=args.trim().split(/\s+/);
  if(op==='M'){start=prev=values.join(' ');}
  else if(op==='Q')add(values.slice(2).join(' '),values.slice(0,2).join(' '));
  else add(op==='Z'?start:values.join(' '));
 }
 return edges;
}
for(const antarctica of [false,true])test('Confini SVG, rotte e attacchi in entrambe le direzioni · '+(antarctica?'Antartide':'classica'),()=>{
 const {territories,seaLinks}=mapFor({antarctica});
 const paths=territories.map(t=>boundary(t.path));
 for(const a of territories){
  const board=territories.map(t=>({owner:t.id===a.id?0:1,armies:t.id===a.id?4:1}));
  for(const b of territories){
   if(a===b)continue;
   let shared=0;
   for(const [edge,length] of paths[a.id])if(paths[b.id].has(edge))shared+=length;
   const routes=seaLinks.filter(pair=>pair.includes(a.id)&&pair.includes(b.id)).length;
   const description=a.name+' → '+b.name;
   assert.equal(Number(shared>=4)+routes,Number(a.neighbors.includes(b.id)),description);
   assert.equal(canAttack({board,round:5,active:0},a.id,b.id),shared>=4||routes===1,description);
  }
 }
});
