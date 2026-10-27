import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,project,applyCommand,moveBounds,assertState} from '../src/engine/RisikoRulesEngine.ts';
import {humanDecision} from '../src/ai/HumanBot.ts';
import {strategicCommand,conquestEstimate} from '../src/ai/Strategy.ts';
import {conquestOdds} from '../src/ai/BotAI.ts';
import {botPolicy,policyOptions} from '../src/ai/policy.ts';
import type {BotContext} from '../src/engine/types.ts';
function fixture(territoryCount=8,received=2){
 const s=createGame({players:3,name:'Test',difficulties:['medio','difficile'],turnSeconds:180,seed:17});
 s.phase='ATTACK';s.round=5;s.active=0;s.turnReinforcements=received;
 s.board.forEach((c,id)=>{c.owner=id<territoryCount?0:1+id%2;c.armies=1;});
 // Alaska attacks Kamchatka even with the first eight territories owned.
 s.board[0].armies=8;
 s.players.forEach(p=>{p.setupRemaining=0;p.botPolicy=botPolicy();});return s;
}
const context=():BotContext=>({temperament:0,round:5,turns:8,lastEpisode:0,previousArmies:15,cautious:false,lostTerritory:null,logIndex:0,episode:null,sortieChecked:false});
test('sortite: solo <=8 territori e <3 rinforzi; soglie 6/3/2%',()=>{
 for(const [level,chance] of [['facile',.06],['medio',.03],['difficile',.02]] as const){
  for(const [territories,received,eligible] of [[8,2,true],[9,2,false],[8,3,false],[8,12,false],[3,0,true]] as const){
   const v=project(fixture(territories,received));
   const yes=humanDecision(v,level,()=>chance-.001,context());assert.equal(!!yes.context.episode,eligible,`${level}/${territories}/${received}`);
   const no=humanDecision(v,level,()=>chance,context());assert.equal(no.context.episode,null);
  }
 }
});
test('sortita controllata dopo i tris e prima del piazzamento; bersaglio scelto dopo i rinforzi',()=>{
 const s=fixture();s.phase='TRIS_EXCHANGE';s.reinforcements=2;
 let result=humanDecision(project(s),'medio',()=>0,context());assert.equal(result.context.sortieChecked,false);
 s.phase='REINFORCEMENT';result=humanDecision(project(s),'medio',()=>0,result.context);
 assert.equal(result.context.sortiePending,true);assert.equal(result.context.episode,null);
 s.phase='ATTACK';s.board[0].armies+=2;
 result=humanDecision(project(s),'medio',()=>0,result.context);
 assert.equal(result.context.episode?.initialArmies,10);
 const resumed=humanDecision(project(s),'medio',()=>1,JSON.parse(JSON.stringify(result.context)));
 assert.equal(resumed.context.episode?.rolls,2);
});
test('sortite: tentativo fallito non ripetuto, cooldown e stop a metà forze',()=>{
 const s=fixture(),v=project(s);
 const failed=humanDecision(v,'difficile',()=>1,context());assert.equal(failed.context.episode,null);
 assert.equal(humanDecision(v,'difficile',()=>0,failed.context).context.episode,null);
 const recent=context();recent.lastEpisode=7;assert.equal(humanDecision(v,'medio',()=>0,recent).context.episode,null);
 const attack=humanDecision(v,'medio',()=>0,context());const from=attack.context.episode!.from;
 v.board[from].armies=4;
 assert.equal(humanDecision(v,'medio',()=>0,attack.context).context.episode,null);
});
test('tregua per bot: nessun attacco prima della scadenza, altre fasi consentite',()=>{
 const s=fixture();s.round=2;s.players[0].botPolicy=botPolicy({graceRounds:2});
 assert.equal(strategicCommand(project(s),'medio',()=>.5).type,'NEXT');
 s.phase='REINFORCEMENT';s.reinforcements=2;assert.equal(strategicCommand(project(s),'medio',()=>.5).type,'PLACE');
 s.phase='ATTACK';s.round=3;assert.equal(strategicCommand(project(s),'medio',()=>.5).type,'ATTACK');
});
test('stima esatta conserva probabilità e superstiti plausibili',()=>{
 for(const [a,d] of [[2,1],[4,3],[9,4],[16,8]]){
  const e=conquestEstimate(a,d);assert.ok(Math.abs(e.win-conquestOdds(a,d))<1e-10);assert.ok(e.survivors>=2&&e.survivors<=a);
 }
});
test('ogni preferenza disattivata produce comunque comandi legali',()=>{
 for(const [key] of policyOptions)for(const level of ['medio','difficile'] as const){
  const s=fixture();s.players[0].botPolicy=botPolicy({[key]:false});
  for(const phase of ['ATTACK','REINFORCEMENT','FORTIFY'] as const){
   s.phase=phase;s.reinforcements=2;const cmd=strategicCommand(project(s),level,()=>.5);
   assertState(applyCommand(s,0,cmd));
  }
 }
});
test('difficile sfrutta il bersaglio debole e rifiuta un attacco senza probabilità di successo',()=>{
 const s=fixture();s.board[29].armies=1;
 const cmd=strategicCommand(project(s),'difficile',()=>.5);assert.deepEqual(cmd,{type:'ATTACK',from:0,to:29});
 s.board[0].armies=2;s.board[29].armies=3;assert.equal(strategicCommand(project(s),'difficile',()=>.5).type,'NEXT');
});
