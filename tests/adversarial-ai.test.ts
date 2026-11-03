import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,project,applyCommand,assertState,validTris} from '../src/engine/RisikoRulesEngine.ts';
import {mapFor} from '../src/data/mapGraph.ts';
import {botPolicy} from '../src/ai/policy.ts';
import {strategicCommand,reinforcementPlan} from '../src/ai/Strategy.ts';
import {humanDecision,decisionDelay} from '../src/ai/HumanBot.ts';
import type {Difficulty} from '../src/engine/types.ts';
function board(n=3,antarctica=false){
 const s=createGame({players:n,name:'Human',difficulties:Array(n-1).fill('survival'),turnSeconds:180,seed:100+n,antarctica});
 s.active=1;s.round=6;s.phase='ATTACK';s.players.forEach(p=>{p.setupRemaining=0;p.botPolicy=botPolicy();});
 s.board.forEach((c,id)=>{c.owner=id%n;c.armies=2;});return s;
}
const levels:Difficulty[]=['medio','difficile','survival'];
for(const [continent,from,to,polar] of [['an',12,42,true],['an',24,43,true],['an',41,43,true],['oc',37,38,false],['eu',2,13,false],['eu',26,19,false],['eu',20,16,false],['eu',34,18,false]] as const){
 test(`occasione ignorata: rompe ${continent}, accesso ${from}→${to}, 3/4/5 giocatori`,()=>{
  for(const n of [3,4,5])for(const level of levels)for(const [attacker,defender] of [[8,1],[12,2],[15,3]]){
   const s=board(n,polar),map=mapFor(s);
   for(const t of map.territories)if(t.continent===continent)s.board[t.id]={owner:0,armies:3};
   s.board[from]={owner:1,armies:attacker};s.board[to].armies=defender;assertState(s);
   const result=humanDecision(project(s,1),level,()=>.5);
   assert.deepEqual(result.command,{type:'ATTACK',from,to},`${level}/${n}/${attacker}:${defender}`);
   assertState(applyCommand(s,1,result.command));
  }
 });
}
test('Europa del bot: otto rinforzi mettono almeno tre difensori sui quattro accessi contro stack umani da dodici',()=>{
 for(const level of levels){
  const s=board();s.phase='REINFORCEMENT';s.reinforcements=8;
  for(const t of mapFor(s).territories)if(t.continent==='eu')s.board[t.id]={owner:1,armies:1};
  for(const id of [2,20,26,34])s.board[id]={owner:0,armies:12};assertState(s);
  const plan=reinforcementPlan(project(s,1),level);assert.equal(plan.length,8);
  for(const id of plan)s.board[id].armies++;
  for(const id of [13,16,18,19])assert.ok(s.board[id].armies>=3,`${level}: accesso ${id} lasciato sguarnito`);
 }
});
test('tris: sette carte utilizzabili vengono scambiate prima dei piazzamenti, nei limiti delle 130 armate',()=>{
 for(const level of levels){
  let s=board();s.phase='TRIS_EXCHANGE';s.reinforcements=4;s.players[1].cards=[0,1,2,3,4,5,6];
  // Move fixture cards out of the deck, preserving engine invariants.
  s.deck=s.deck.filter(id=>!s.players[1].cards.includes(id));assertState(s);
  const best=validTris(s,1,s.players[1].cards).sort((a,b)=>b.value-a.value)[0];
  const cmd=strategicCommand(project(s,1),level,()=>.5);assert.equal(cmd.type,'EXCHANGE');
  if(cmd.type==='EXCHANGE')assert.equal(validTris(s,1,cmd.cards)[0].value,best.value);
  s=applyCommand(s,1,cmd);assert.equal(s.players[1].cards.length,4);assert.ok(s.reinforcements>4);assertState(s);
 }
});
test('occupazione: sposta la forza verso il nuovo fronte se il territorio di origine è ormai interno',()=>{
 const s=board();s.phase='POST_CONQUEST_MOVE';s.pending={from:0,to:1,min:3,transferred:3};
 for(const id of [0,1,3,29])s.board[id]={owner:1,armies:2};s.board[0].armies=10;s.board[1].armies=3;
 for(const level of levels){const cmd=strategicCommand(project(s,1),level,()=>.5);assert.equal(cmd.type,'MOVE');if(cmd.type==='MOVE')assert.ok(cmd.count>=7,`${level}: armate bloccate nelle retrovie`);}
});
test('il pacing reale non consuma il turno prima di poter eseguire una sequenza di attacchi',()=>{
 for(const level of levels){const s=board();s.remainingMs=30000;const v=project(s,1),cmd={type:'ATTACK',from:0,to:1} as const;
  const delay=decisionDelay(v,cmd,null,1,()=>.99,level);assert.ok(delay<=1000);assert.ok(delay*25<30000);
  v.remainingMs=1500;assert.ok(decisionDelay(v,cmd,null,1,()=>.99,level)<100);assert.equal(decisionDelay(v,cmd,null,0,()=>.99,level),0);
 }
});

test('difesa persistente: protegge entrambi gli accessi antartici e quello oceanico durante piazzamenti reali',()=>{
 for(const [continent,gates,threats] of [['an',[42,43],[12,24,41]],['oc',[38],[37]]] as const)for(const level of levels){
  let s=board(3,true);s.phase='REINFORCEMENT';s.reinforcements=gates.length*2;
  for(const t of mapFor(s).territories)if(t.continent===continent)s.board[t.id]={owner:1,armies:1};
  for(const id of threats)s.board[id]={owner:0,armies:12};
  let context;
  for(let n=0;n<gates.length*2;n++){
   const result=humanDecision(project(s,1),level,()=>.5,context);assert.equal(result.command.type,'PLACE');
   s=applyCommand(s,1,result.command);context=structuredClone(result.context);assertState(s);
  }
  for(const id of gates)assert.ok(s.board[id].armies>=3,`${level}/${continent}: accesso ${id}`);
 }
});
test('tris consecutivi: usa entrambi i tris disponibili prima di iniziare a piazzare',()=>{
 for(const level of levels){
  let s=board();s.phase='TRIS_EXCHANGE';s.reinforcements=4;s.players[1].cards=[0,1,2,3,4,5,6];
  s.deck=s.deck.filter(id=>!s.players[1].cards.includes(id));
  for(let n=0;n<2;n++){
   const result=humanDecision(project(s,1),level,()=>.5);assert.equal(result.command.type,'EXCHANGE');
   s=applyCommand(s,1,result.command);assertState(s);
  }
  assert.equal(s.players[1].cards.length,1);
 }
});
