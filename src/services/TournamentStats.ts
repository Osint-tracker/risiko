import type {GameState} from '../engine/types.ts';
import type {ResultRecord} from './StorageService.ts';
export function diceHistogram(state: Pick<GameState,'log'>,player=0):number[]{
 const counts=Array(6).fill(0);
 for(const e of state.log){
  if(e.type!=='onDiceRolled')continue;
  const dice=e.player===player?e.attack:e.defender===player?e.defense:undefined;
  for(const n of dice??[])if(n>=1&&n<=6)counts[n-1]++;
 }
 return counts;
}
export function tournamentStats(rows:ResultRecord[]){
 const wins=rows.filter(r=>r.rank===1),played=rows.length;
 return {played,wins:wins.length,winRate:played?Math.round(wins.length/played*100):0,
  average:played?Math.round(rows.reduce((n,r)=>n+r.points,0)/played):0,
  risiko:wins.filter(r=>r.reason==='risiko').length,sdadata:wins.filter(r=>r.reason==='sdadata').length,
  dice:Array.from({length:6},(_,i)=>rows.reduce((n,r)=>n+(r.dice?.[i]??0),0))};
}
