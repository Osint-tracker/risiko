import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createGame,applyCommand,project,random,assertState,ranks,canAttack,moveBounds,owned,border} from '../src/engine/RisikoRulesEngine.ts';
import {strategicCommand as previous} from '../src/ai/LegacyStrategy.ts';
import {humanDecision} from '../src/ai/HumanBot.ts';
import {conquestOdds} from '../src/ai/BotAI.ts';
import {mapFor} from '../src/data/mapGraph.ts';
const runs=[],timings=[],seeds=Number(process.env.BENCH_SEEDS??1),offset=Number(process.env.BENCH_OFFSET??0);
function opportunist(v,rng){
 if(v.phase==='REINFORCEMENT'||v.phase==='SETUP_PLACEMENT'){
  if(v.phase==='REINFORCEMENT'&&!v.reinforcements)return {type:'NEXT'};
  const front=owned(v,v.active).filter(id=>border(v,id)).sort((a,b)=>v.board[b].armies-v.board[a].armies);
  return {type:'PLACE',territory:front[0]??owned(v,v.active)[0],count:1};
 }
 if(v.phase==='ATTACK'){
  const options=owned(v,v.active).flatMap(from=>mapFor(v).territories[from].neighbors.filter(to=>canAttack(v,from,to)).map(to=>({from,to,p:conquestOdds(v.board[from].armies,v.board[to].armies)}))).sort((a,b)=>b.p-a.p||v.board[a.to].armies-v.board[b.to].armies);
  return options[0]?.p>.65?{type:'ATTACK',from:options[0].from,to:options[0].to}:{type:'NEXT'};
 }
 if(v.phase==='POST_CONQUEST_MOVE'){const {from,to}=v.pending;return {type:'MOVE',from,to,count:moveBounds(v,from,to).max};}
 return previous(v,'difficile',rng);
}
for(let seed=1;seed<=seeds;seed++)for(const level of ['medio','difficile','survival'])for(const n of [3,4,5])for(const antarctica of [false,true]){
 const gameSeed=830000+offset+seed*1000+n*10+Number(antarctica),candidate=(seed+n+Number(antarctica))%n;
 let s=createGame({players:n,name:'Benchmark',difficulties:Array(n-1).fill(level),turnSeconds:180,seed:gameSeed,antarctica}),context,actions=0;
 while(s.phase!=='GAME_OVER'&&actions<18000){
  const actor=s.active,view=project(s,actor),r={rng:s.aiRng},rng=()=>random(r);let command;
  if(actor===candidate){const t=performance.now(),d=humanDecision(view,level,rng,context);timings.push(performance.now()-t);context=d.context;command=d.command;}
  else command=actor%3===0?opportunist(view,rng):previous(view,actor%3===1?'medio':'difficile',rng);
  s=applyCommand(s,actor,command);s.aiRng=r.rng;assertState(s);actions++;
 }
 if(s.phase!=='GAME_OVER')throw Error(`Incompleta ${level}/${n}/${antarctica}/${gameSeed}`);
 runs.push({level,players:n,antarctica,seed:gameSeed,candidate,won:s.winner===candidate,points:ranks(s).find(x=>x.player===candidate).points,actions});
 console.log(`${runs.length}/${seeds*18} ${level} ${n} ${antarctica?'Antartide':'classica'}: ${s.winner===candidate?'vittoria':'sconfitta'}`);
}
timings.sort((a,b)=>a-b);
const report={opponents:['v1.4 medio','v1.4 difficile','opportunista concentrato'],games:runs.length,groups:['medio','difficile','survival'].map(level=>{const rows=runs.filter(r=>r.level===level);return {level,games:rows.length,wins:rows.filter(r=>r.won).length,equalStrengthExpectedWins:rows.reduce((a,r)=>a+1/r.players,0),meanPoints:rows.reduce((a,r)=>a+r.points,0)/rows.length};}),decisionMs:{mean:timings.reduce((a,b)=>a+b,0)/timings.length,p95:timings[Math.floor(timings.length*.95)],max:timings.at(-1)},runs};
mkdirSync('artifacts/ai',{recursive:true});writeFileSync(`artifacts/ai/planner-${offset}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,runs:undefined},null,2));
