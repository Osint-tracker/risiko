import {mapFor,objectives} from '../data/mapGraph.ts';
import {owned,canAttack} from '../engine/RisikoRulesEngine.ts';
import {conquestOdds} from './BotAI.ts';
import {botPolicy} from './policy.ts';
import {profileOf,truceScale} from './Profile.ts';
import {threatOf} from './Threat.ts';
import type {GameView,BotPolicy} from '../engine/types.ts';
export function hostileNeighbors(v:GameView,id:number,actor=v.active){return mapFor(v).territories[id].neighbors.filter(n=>v.board[n].owner!==actor);}
export function controlledBonus(v:GameView,id:number,owner:number){
 const map=mapFor(v),continent=map.continents.find(c=>c.id===map.territories[id].continent)!;
 return map.territories.filter(t=>t.continent===continent.id).every(t=>v.board[t.id].owner===owner)?continent.bonus:0;
}
export function criticalGarrison(v:GameView,id:number,p:BotPolicy){
 return p.defend&&controlledBonus(v,id,v.active)>0&&hostileNeighbors(v,id).some(n=>v.board[n].armies>=4)?3:1;
}
/** Protect continental gateways before committing the remaining reserve to a campaign. */
export function defensiveCommitments(v:GameView):number[]{
 const p=botPolicy(v.players[v.active].botPolicy);
 if(!p.defend||v.phase!=='REINFORCEMENT')return [];
 const w={...v,board:v.board.map(c=>({...c}))},plan:number[]=[];
 const gateways=owned(w,w.active).filter(id=>controlledBonus(w,id,w.active)>0&&hostileNeighbors(w,id).some(n=>w.board[n].armies>=4));
 const budget=Math.min(v.reinforcements,Math.max(Math.ceil(v.reinforcements*.65),gateways.reduce((n,id)=>n+Math.max(0,3-w.board[id].armies),0)));
 while(plan.length<budget){
  let best=-1,value=0;
  for(const id of gateways){
   const army=w.board[id].armies,threat=Math.max(...hostileNeighbors(w,id).map(n=>w.board[n].armies));
   const risk=conquestOdds(threat,army);if(risk<=.4)continue;
   const after=conquestOdds(threat,army+1),bonus=controlledBonus(w,id,w.active);
   const score=(army<3?8:0)+(risk-after)*(bonus*8+4);
   if(score>value){value=score;best=id;}
  }
  if(best<0)break;plan.push(best);w.board[best].armies++;
 }
 return plan;
}
export type TacticalAttack={from:number;to:number;score:number;win:number;reason:'risiko'|'complete-continent'|'break-continent'|'eliminate'};
/** Immediate public-board opportunities cannot be vetoed by hypothetical future opponent hands. */
export function forcingAttacks(v:GameView):TacticalAttack[]{
 const p=botPolicy(v.players[v.active].botPolicy),map=mapFor(v),ownGoal=objectives[v.players[v.active].objective!-1].territories;
 if(v.round<=p.graceRounds)return [];
 const attacks:TacticalAttack[]=[];
 for(const from of owned(v,v.active))for(const to of map.territories[from].neighbors){
  if(!canAttack(v,from,to))continue;
  const a=v.board[from].armies,d=v.board[to].armies,win=conquestOdds(a,d);
  const immediate=ownGoal.every(id=>id===to||v.board[id].owner===v.active);
  const c=map.continents.find(c=>c.id===map.territories[to].continent)!;
  const completes=p.continents&&map.territories.filter(t=>t.continent===c.id).every(t=>t.id===to||v.board[t.id].owner===v.active);
  const owner=v.board[to].owner,th=threatOf(v),bystander=th.leader>=0&&owner!==th.leader&&th.level*truceScale()>=.4;
  // Breaking the runaway leader's bonus is basic play; breaking a fellow underdog's is not.
  const breaks=(p.breakBonus||owner===th.leader)&&!bystander&&controlledBonus(v,to,owner)>0;
  const eliminates=p.eliminate&&!(bystander&&th.level>=.6)&&owned(v,owner).length===1;
  if(!immediate&&!completes&&!breaks&&!eliminates)continue;
  // Raiders and builders accept riskier forcing attacks for THEIR reason.
  const f=profileOf(p),bold=(breaks&&f.breaker>=2)||(completes&&f.continent>=2)||(eliminates&&f.hunter>=2);
  const raid=breaks&&f.breaker>=3;
  if(win<(immediate?.55:raid?.5:bold?.6:.9)||(!immediate&&d>(raid?8:bold?6:3)))continue;
  const sourceAfter=Math.max(1,a-Math.min(3,a-1)-Math.ceil(d*.8));
  const beforeRisk=Math.max(0,...hostileNeighbors(v,from).filter(n=>n!==to).map(n=>conquestOdds(v.board[n].armies,a)));
  const afterRisk=Math.max(0,...hostileNeighbors(v,from).filter(n=>n!==to).map(n=>conquestOdds(v.board[n].armies,sourceAfter)));
  const sourceCost=(afterRisk-beforeRisk)*(controlledBonus(v,from,v.active)*9+3);
  const value=immediate?10000:(completes?c.bonus*9*f.continent:0)+(breaks?c.bonus*7*Math.max(f.breaker,owner===th.leader?1:0)*(owner===th.leader?1+th.level:1):0)+(eliminates?(12+v.players[v.board[to].owner].cardCount*3)*f.hunter:0);
  if(!immediate&&value*win<=sourceCost+2)continue;
  attacks.push({from,to,win,score:value*win-sourceCost,reason:immediate?'risiko':completes?'complete-continent':breaks?'break-continent':'eliminate'});
 }
 return attacks.sort((a,b)=>b.score-a.score||a.from-b.from||a.to-b.to);
}
