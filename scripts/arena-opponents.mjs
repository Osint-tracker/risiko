// Independent benchmark opponents. No production planner, tactical layer or legacy AI imports.
import {mapFor,objectives} from '../src/data/mapGraph.ts';
import {owned,canAttack,moveBounds,validTris,border} from '../src/engine/RisikoRulesEngine.ts';
import {conquestOdds} from '../src/ai/BotAI.ts';
function targets(v,style,extra=0){
 const map=mapFor(v),goal=objectives[v.players[v.active].objective-1].territories,out=[];
 for(const from of owned(v,v.active))for(const to of map.territories[from].neighbors){
  if(v.board[to].owner===v.active)continue;
  if(v.round<=4&&owned(v,v.board[to].owner).length===1)continue;
  const a=v.board[from].armies+extra,d=v.board[to].armies,p=conquestOdds(a,d);
  const c=map.continents.find(c=>c.id===map.territories[to].continent),ids=map.territories.filter(t=>t.continent===c.id).map(t=>t.id);
  const own=ids.filter(id=>v.board[id].owner===v.active).length,enemy=ids.every(id=>v.board[id].owner===v.board[to].owner);
  let gain=2+(v.conquests===0?5:0)+(goal.includes(to)?map.territories[to].points*(style==='finisher'?3:1):0);
  if(style==='builder')gain+=c.bonus*(own===ids.length-1?14:own/ids.length*7);
  if(enemy)gain+=c.bonus*(style==='raider'?15:6);
  if(owned(v,v.board[to].owner).length===1)gain+=12+v.players[v.board[to].owner].cardCount*5;
  if(goal.every(id=>id===to||v.board[id].owner===v.active))gain+=10000;
  const score=p*gain-(1-p)*(a-1)-d*.5;
  out.push({from,to,score,p});
 }
 return out.sort((a,b)=>b.score-a.score||a.from-b.from||a.to-b.to);
}
export function arenaCommand(v,style){
 const map=mapFor(v),own=owned(v,v.active);
 if(v.phase==='TRIS_EXCHANGE'){const best=validTris(v,v.active,v.players[v.active].cards??[]).sort((a,b)=>b.value-a.value)[0];return best&&v.players[v.active].totalArmies+v.reinforcements<130?{type:'EXCHANGE',cards:best.cards}:{type:'NEXT'};}
 if(v.phase==='SETUP_PLACEMENT'||v.phase==='REINFORCEMENT'){
  const reserve=v.phase==='SETUP_PLACEMENT'?Math.min(v.setupBatch,v.players[v.active].setupRemaining):v.reinforcements;if(!reserve)return {type:'NEXT'};
  const urgent=own.filter(id=>v.board[id].armies<3&&map.territories[id].neighbors.some(n=>v.board[n].owner!==v.active&&v.board[n].armies>=5)).sort((a,b)=>v.board[a].armies-v.board[b].armies);
  if(urgent.length&&style!=='raider')return {type:'PLACE',territory:urgent[0],count:1};
  const best=targets(v,style,reserve)[0];return {type:'PLACE',territory:best?.from??own[0],count:1};
 }
 if(v.phase==='ATTACK'){const a=targets(v,style).find(a=>canAttack(v,a.from,a.to)&&a.p>(style==='raider'?.6:.7)&&a.score>0);return a?{type:'ATTACK',from:a.from,to:a.to}:{type:'NEXT'};}
 if(v.phase==='POST_CONQUEST_MOVE'){const {from,to}=v.pending,b=moveBounds(v,from,to),threat=Math.max(0,...map.territories[from].neighbors.filter(id=>v.board[id].owner!==v.active).map(id=>v.board[id].armies));return {type:'MOVE',from,to,count:Math.max(b.min,Math.min(b.max,v.board[from].armies-(threat?Math.max(3,Math.ceil(threat*.7)):1)))};}
 if(v.phase==='FORTIFY'){
  const distance=v.board.map(()=>99),queue=own.filter(id=>border(v,id));queue.forEach(id=>distance[id]=0);
  for(let i=0;i<queue.length;i++)for(const n of map.territories[queue[i]].neighbors)if(v.board[n].owner===v.active&&distance[n]>distance[queue[i]]+1){distance[n]=distance[queue[i]]+1;queue.push(n);}
  const moves=[];for(const from of own)for(const to of map.territories[from].neighbors){const b=moveBounds(v,from,to);if(b.max>=b.min&&distance[to]<distance[from])moves.push({from,to,count:b.max});}
  moves.sort((a,b)=>b.count-a.count);return moves[0]?{type:'MOVE',...moves[0]}:{type:'NEXT'};
 }
 return {type:'NEXT'};
}
