import {botPolicy} from '../src/ai/policy.ts';
import {performance} from 'node:perf_hooks';
import {writeFileSync,mkdirSync} from 'node:fs';
import {createGame,applyCommand,project,random,assertState,ranks} from '../src/engine/RisikoRulesEngine.ts';
import {humanDecision} from '../src/ai/HumanBot.ts';
import {humanDecision as legacyDecision} from '../tests/fixtures/LegacyHumanBot.ts';
import {territories,continents} from '../src/data/mapGraph.ts';
const runs=[],limit=Number(process.env.BENCH_GAMES??90);
let maxDecisionMs=0,totalDecisionMs=0,decisions=0;
outer:for(const level of ['medio','difficile'])for(const n of [3,4,5])for(let seed=1;seed<=5;seed++)for(let rotation=0;rotation<3;rotation++){
 if(runs.length>=limit)break outer;
 let s=createGame({players:n,name:'Benchmark',difficulties:Array(n-1).fill(level),turnSeconds:180,seed:13000+n*100+seed,botPolicies:Array.from({length:n-1},(_,i)=>botPolicy({personality:['equilibrato','stratega','incursore','conquistatore'][(i+rotation)%4]}))});
 const candidate=(seed+rotation)%n,contexts={},held=Array(n).fill(0);
 s.players[candidate].botPolicy=botPolicy({personality:['equilibrato','stratega','incursore','conquistatore'][(seed+rotation)%4]});
 let actions=0,turns=0;
 while(s.phase!=='GAME_OVER'&&actions<18000){
  const actor=s.active,r={rng:s.aiRng},view=project(s,actor),begin=performance.now();
  const result=(actor===candidate?humanDecision:legacyDecision)(view,level,()=>random(r),contexts[actor]);
  const elapsed=performance.now()-begin;
  if(actor===candidate){totalDecisionMs+=elapsed;maxDecisionMs=Math.max(maxDecisionMs,elapsed);decisions++;}
  contexts[actor]=result.context;
  const previous=s;s=applyCommand(s,actor,result.command);s.aiRng=r.rng;assertState(s);actions++;
  if(s.active!==previous.active){turns++;for(let p=0;p<n;p++)held[p]+=continents.filter(c=>territories.filter(t=>t.continent===c.id).every(t=>s.board[t.id].owner===p)).length;}
 }
 if(s.phase!=='GAME_OVER')throw Error(`Partita incompleta: ${level}/${n}/${seed}/${rotation}`);
 const rank=ranks(s),own=rank.find(x=>x.player===candidate),opponents=rank.filter(x=>x.player!==candidate);
 runs.push({level,personality:s.players[candidate].botPolicy.personality,players:n,seed,candidate,winner:s.winner,won:s.winner===candidate,points:own.points,opponentPoints:opponents.reduce((a,x)=>a+x.points,0)/(n-1),heldPerTurn:held[candidate]/Math.max(1,turns),opponentHeldPerTurn:held.filter((_,i)=>i!==candidate).reduce((a,b)=>a+b,0)/Math.max(1,turns)/(n-1),actions});
 if(runs.length%5===0)console.log(`${runs.length}/${limit} partite, vittorie nuovi bot: ${runs.filter(x=>x.won).length}`);
}
const groups=['medio','difficile'].map(level=>{const a=runs.filter(x=>x.level===level);const avg=k=>a.reduce((n,x)=>n+x[k],0)/Math.max(1,a.length);return {level,games:a.length,wins:a.filter(x=>x.won).length,expectedEqualWins:a.reduce((n,x)=>n+1/x.players,0),points:avg('points'),opponentPoints:avg('opponentPoints'),heldPerTurn:avg('heldPerTurn'),opponentHeldPerTurn:avg('opponentHeldPerTurn')};});
const report={games:runs.length,groups,decisionMs:{mean:totalDecisionMs/decisions,max:maxDecisionMs,count:decisions},runs};
mkdirSync('artifacts/ai',{recursive:true});writeFileSync('artifacts/ai/benchmark.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,runs:undefined},null,2));
