import {mapFor,objectives} from '../data/mapGraph.ts';
import {owned,border,canAttack,moveBounds,validTris} from '../engine/RisikoRulesEngine.ts';
import {conquestOdds,diceDistribution} from './BotAI.ts';
import type {BotMood} from './BotAI.ts';
import {botPolicy} from './policy.ts';
import type {GameView,Command,Difficulty,BotPolicy} from '../engine/types.ts';
type Estimate={win:number;survivors:number};
const estimates=new Map<string,Estimate>();
/** Exact probability and conditional expected survivors; ties favour the defender. */
export function conquestEstimate(a:number,d:number):Estimate {
 if(d===0)return {win:1,survivors:a};
 const ad=Math.min(3,a-1),dd=Math.min(3,d);
 if(ad<dd||ad<1)return {win:0,survivors:0};
 const key=`${a}:${d}`,cached=estimates.get(key);if(cached)return cached;
 let win=0,moment=0;
 for(const o of diceDistribution(ad,dd)){
  const next=conquestEstimate(a-o.attacker,d-o.defender);
  win+=o.probability*next.win;moment+=o.probability*next.win*next.survivors;
 }
 const result={win,survivors:win?moment/win:0};estimates.set(key,result);return result;
}

function pressure(v:GameView,id:number){const {territories}=mapFor(v);return Math.max(0,...territories[id].neighbors.filter(n=>v.board[n].owner!==v.active).map(n=>Math.max(0,v.board[n].armies-1)));}
function importance(v:GameView,id:number){
 const {territories,continents}=mapFor(v);
 const ci=continents.findIndex(c=>c.id===territories[id].continent),members=territories.filter(t=>t.continent===continents[ci].id).map(t=>t.id);
 const control=members.filter(t=>v.board[t].owner===v.active).length/members.length;
 return 1+continents[ci].bonus*control+(objectives[v.players[v.active].objective!-1].territories.includes(id)?1:0);
}
function reserveTarget(v:GameView,id:number){return border(v,id)?Math.max(2,Math.min(14,Math.ceil(pressure(v,id)*.65)+1)):1;}
function gain(v:GameView,from:number,to:number,p:BotPolicy):number {
 const {territories,continents}=mapFor(v);
 const ownGoal=objectives[v.players[v.active].objective!-1].territories;
 if(ownGoal.every(id=>id===to||v.board[id].owner===v.active))return 10000;
 const ci=continents.findIndex(c=>c.id===territories[to].continent),members=territories.filter(t=>t.continent===continents[ci].id).map(t=>t.id),bonus=continents[ci].bonus;
 const missing=members.filter(id=>v.board[id].owner!==v.active);
 const enemy=v.board[to].owner,enemyMembers=members.filter(id=>v.board[id].owner===enemy).length;
 let value=(ownGoal.includes(to)?territories[to].points*1.4:0)+(v.conquests===0?5:1);
 if(p.weakBorders)value+=Math.max(0,4-v.board[to].armies)*1.1;
 if(p.continents){
  if(missing.length===1)value+=bonus*9;
  else if(missing.length<=3)value+=bonus*4/missing.length;
 }
 if(p.breakBonus&&enemyMembers===members.length)value+=bonus*7;
 if(p.disruptGrowth&&enemyMembers<members.length&&enemyMembers>=members.length-2)value+=bonus*3.5;
 const enemyOwn=owned(v,enemy);
 if(p.eliminate&&enemyOwn.length<=3)value+=(enemyOwn.length===1?12+Math.min(7-v.players[v.active].cardCount,v.players[enemy].cardCount)*3:4/enemyOwn.length);
 if(p.containLeader){
  const power=(id:number)=>v.players[id].totalArmies+v.players[id].nextReinforcements*4+v.players[id].territoryCount;
  const alive=v.players.filter(x=>!x.eliminated),mean=alive.reduce((n,x)=>n+power(x.id),0)/alive.length;
  if(power(enemy)>mean*1.2&&alive.every(x=>power(enemy)>=power(x.id)))value+=5;
 }
 return value;
}
function candidates(v:GameView,p:BotPolicy,level:Difficulty,mood?:BotMood){
 const {territories}=mapFor(v);
 const results:{from:number;to:number;score:number;survivors:number}[]=[];
 const threshold=Math.max(.48,Math.min(.9,(level==='facile'?.7:level==='medio'?.62:.58)+(mood?.riskBias??0)));
 for(const from of owned(v,v.active))for(const to of territories[from].neighbors){
  if(!canAttack(v,from,to))continue;
  const e=conquestEstimate(v.board[from].armies,v.board[to].armies);
  if(e.win<threshold)continue;
  const value=gain(v,from,to,p),loss=v.board[from].armies-e.survivors;
  const remaining=Math.max(1,Math.floor(e.survivors)-(border(v,from)?2:1));
  let score=e.win*value-(1-e.win)*v.board[from].armies*.8-loss*.65;
  if(p.reserve){
   const otherPressure=Math.max(0,...territories[from].neighbors.filter(id=>id!==to&&v.board[id].owner!==v.active).map(id=>v.board[id].armies-1));
   score-=Math.min(5,otherPressure*.3);
   score-=Math.max(0,pressure(v,to)-remaining)*.3;
  }
  if(level==='difficile'){
   const reply=territories[to].neighbors.filter(id=>id!==from&&v.board[id].owner!==v.active).reduce((worst,id)=>Math.max(worst,conquestOdds(v.board[id].armies,remaining)),0);
   score-=reply*(p.reserve?4:1.5);
  }
  if(mood?.reclaim===to)score+=1;
  results.push({from,to,score,survivors:e.survivors});
 }
 return results.sort((a,b)=>b.score-a.score||a.from-b.from||a.to-b.to);
}
export function strategicCommand(v:GameView,level:Difficulty,rng:()=>number,mood?:BotMood):Command {
 const {territories}=mapFor(v);
 const p=botPolicy(v.players[v.active].botPolicy),own=owned(v,v.active);
 if(v.phase==='TRIS_EXCHANGE'){
  const combos=validTris(v,v.active,v.players[v.active].cards??[]).sort((a,b)=>b.value-a.value);
  if(combos.length&&v.players[v.active].totalArmies+v.reinforcements<130)return {type:'EXCHANGE',cards:combos[0].cards};
  return {type:'NEXT'};
 }
 if(v.phase==='SETUP_PLACEMENT'||v.phase==='REINFORCEMENT'){
  const ranked=own.map(id=>{
   const army=v.board[id].armies,threat=pressure(v,id),deficit=Math.max(0,reserveTarget(v,id)-army);
   let score=p.defend?deficit*importance(v,id)*.8:0;
   if(!border(v,id))score-=10;
   if(v.round>p.graceRounds||v.phase==='SETUP_PLACEMENT')for(const to of territories[id].neighbors){
    if(v.board[to].owner===v.active)continue;
    if(v.round<=4&&owned(v,v.board[to].owner).length===1)continue;
    const before=conquestOdds(army,v.board[to].armies),after=conquestOdds(army+1,v.board[to].armies);
    score=Math.max(score,(after-before)*gain(v,id,to,p)*7+after*2+(threat>0?1:0));
   }
   if(level==='facile')score=score*.5+rng()*8;else score+=(rng()-.5)*.15;
   return {id,score};
  }).sort((a,b)=>b.score-a.score||a.id-b.id);
  return {type:'PLACE',territory:ranked[0].id,count:1};
 }
 if(v.phase==='POST_CONQUEST_MOVE'){
  const m=v.pending!,bounds=moveBounds(v,m.from,m.to);
  let best=bounds.min,bestScore=-Infinity;
  for(let count=bounds.min;count<=bounds.max;count++){
   const a=v.board[m.from].armies-count,b=v.board[m.to].armies+count;
   const sourceNeed=p.defend||p.reserve?reserveTarget(v,m.from):1;
   const targetNeed=p.defend?reserveTarget(v,m.to):1;
   const route=territories[m.to].neighbors.filter(id=>v.board[id].owner!==v.active);
   const offensive=route.reduce((n,id)=>Math.max(n,conquestOdds(b,v.board[id].armies)*gain(v,m.to,id,p)),0);
   const score=offensive-Math.max(0,sourceNeed-a)*importance(v,m.from)-Math.max(0,targetNeed-b)*importance(v,m.to)*.7;
   if(score>bestScore){best=count;bestScore=score;}
  }
  return {type:'MOVE',from:m.from,to:m.to,count:best};
 }
 if(v.phase==='ATTACK'){
  if(v.round<=p.graceRounds)return {type:'NEXT'};
  const depth=level==='difficile'?3:level==='medio'?2:1,width=level==='difficile'?8:6,budget=level==='difficile'?256:96;
  const roots=candidates(v,p,level,mood).slice(0,width);
  type Search={view:GameView;root:number;score:number};
  let layer:Search[]=[{view:v,root:-1,score:0}],nodes=0;
  const scores=roots.map(a=>a.score);
  for(let step=0;step<depth&&nodes<budget;step++){
   const next:Search[]=[];
   for(const node of layer){
    const choices=step===0?roots:candidates(node.view,p,level,mood).slice(0,width);
    for(let i=0;i<choices.length&&nodes<budget;i++,nodes++){
     const a=choices[i],root=step===0?i:node.root;
     const score=node.score+a.score*Math.pow(.7,step);
     scores[root]=Math.max(scores[root],score);
     if(a.score < -2||step===depth-1)continue;
     const view={...node.view,board:node.view.board.map(c=>({...c})),conquests:node.view.conquests+1};
     const survivors=Math.max(2,Math.floor(a.survivors)),garrison=Math.min(survivors-1,border(node.view,a.from)?2:1);
     view.board[a.from].armies=garrison;view.board[a.to]={owner:v.active,armies:survivors-garrison};
     next.push({view,root,score});
    }
   }
   layer=next.sort((a,b)=>b.score-a.score||a.root-b.root).slice(0,width);
  }
  const ranked=roots.map((a,i)=>({...a,score:scores[i]+(rng()-.5)*(level==='facile'?5:mood?.variation??.1)})).sort((a,b)=>b.score-a.score||a.from-b.from||a.to-b.to);
  const best=ranked[0];
  return best&&best.score>0?{type:'ATTACK',from:best.from,to:best.to}:{type:'NEXT'};
 }
 if(v.phase==='FORTIFY'){
  let best:{from:number;to:number;count:number;score:number}|null=null;
  for(const from of own)for(const to of territories[from].neighbors){
   if(v.board[to].owner!==v.active)continue;
   const bounds=moveBounds(v,from,to);if(bounds.max<bounds.min)continue;
   const need=p.defend?reserveTarget(v,to):border(v,to)?3:1;
   const safe=p.reserve?Math.max(0,v.board[from].armies-reserveTarget(v,from)):bounds.max;
   const count=Math.min(bounds.max,Math.max(1,Math.min(safe,need-v.board[to].armies)));
   if(safe<1)continue;
   const score=(border(v,to)?importance(v,to):0)*Math.min(count,Math.max(0,need-v.board[to].armies))-(border(v,from)?importance(v,from)*Math.max(0,reserveTarget(v,from)-(v.board[from].armies-count)):0);
   if(score>0&&(!best||score>best.score))best={from,to,count,score};
  }
  return best?{type:'MOVE',from:best.from,to:best.to,count:best.count}:{type:'NEXT'};
 }
 return {type:'NEXT'};
}
