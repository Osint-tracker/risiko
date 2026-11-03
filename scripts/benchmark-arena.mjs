import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createGame,applyCommand,advanceClock,project,random,assertState,ranks,canAttack} from '../src/engine/RisikoRulesEngine.ts';
import {humanDecision,decisionDelay} from '../src/ai/HumanBot.ts';
import {mapFor} from '../src/data/mapGraph.ts';
import {arenaCommand} from './arena-opponents.mjs';
const runs=[],timings=[],failures=[],offset=Number(process.env.ARENA_OFFSET??0),maxGames=Number(process.env.ARENA_GAMES??18);
outer:for(const level of ['medio','difficile','survival'])for(const n of [3,4,5])for(const antarctica of [false,true]){
 if(runs.length>=maxGames)break outer;
 const seed=971011+offset+n*57+Number(antarctica),candidate=(n+Number(antarctica)+1)%n;
 let s=createGame({players:n,name:'Arena',difficulties:Array(n-1).fill(level),turnSeconds:180,seed,antarctica}),context,actions=0,timeouts=0,missed=0,decisions=0,previous=null;
 const timingRng={rng:seed+7123};
 while(s.phase!=='GAME_OVER'&&actions<18000){
  const actor=s.active,view=project(s,actor),r={rng:s.aiRng},begin=performance.now();let command,nextContext;
  if(actor===candidate){const result=humanDecision(view,level,()=>random(r),context);command=result.command;nextContext=result.context;decisions++;}
  else command=arenaCommand(view,['builder','raider','finisher'][actor%3]);
  const compute=performance.now()-begin;if(actor===candidate)timings.push(compute);
  if(actor===candidate&&view.phase==='ATTACK'&&command.type==='NEXT'){
   const map=mapFor(view),opportunities=[];
   for(const t of map.territories)if(view.board[t.id].owner===actor&&view.board[t.id].armies>=8)for(const to of t.neighbors){
    const enemy=view.board[to].owner,c=map.territories[to].continent;
    if(canAttack(view,t.id,to)&&view.board[to].armies<=2&&map.territories.filter(x=>x.continent===c).every(x=>view.board[x.id].owner===enemy))opportunities.push({from:t.id,to});
   }
   if(opportunities.length){missed++;if(failures.length<30)failures.push({level,seed,opportunities,view});}
  }
  const delay=actor===candidate?decisionDelay(view,command,previous?.actor===actor?previous.command:null,1,()=>random(timingRng),level):700;
  const timed=advanceClock(s,Math.max(50,Math.ceil(compute)+delay));
  if(timed.revision!==s.revision){if(actor===candidate)timeouts++;s=timed;actions++;assertState(s);continue;}
  s=applyCommand(timed,actor,command);s.aiRng=r.rng;if(actor===candidate)context=nextContext;
  previous={actor,command};actions++;assertState(s);
 }
 if(s.phase!=='GAME_OVER')throw Error(`Arena incompleta: ${level}/${n}/${antarctica}`);
 runs.push({level,n,antarctica,seed,candidate,won:s.winner===candidate,points:ranks(s).find(x=>x.player===candidate).points,actions,timeouts,missedCheapBonusBreaks:missed,decisions});
 console.log(`${runs.length}/${maxGames} ${level} ${n}${antarctica?' Antartide':''}: ${s.winner===candidate?'vittoria':'sconfitta'}; timeout ${timeouts}; opportunità ignorate ${missed}`);
}
timings.sort((a,b)=>a-b);
const report={note:'Arena con tempo di turno reale simulato, avversari indipendenti builder/raider/finisher. Le vittorie non certificano la forza contro umani. I casi tattici sono testati separatamente.',runs,decisionMs:{mean:timings.reduce((a,b)=>a+b,0)/timings.length,p95:timings[Math.floor(timings.length*.95)],max:timings.at(-1)}};
mkdirSync('artifacts/ai',{recursive:true});writeFileSync(`artifacts/ai/arena-${offset}.json`,JSON.stringify(report,null,2));writeFileSync(`artifacts/ai/arena-missed-${offset}.json`,JSON.stringify(failures,null,2));console.log(JSON.stringify(report.decisionMs));
