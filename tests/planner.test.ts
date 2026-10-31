import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,project,applyCommand,assertState} from '../src/engine/RisikoRulesEngine.ts';
import {strategicCommand,reinforcementPlan,attackDecision} from '../src/ai/Strategy.ts';
import {strategicCommand as oldCommand} from '../src/ai/LegacyStrategy.ts';
import {humanDecision} from '../src/ai/HumanBot.ts';
import {objectives} from '../src/data/mapGraph.ts';
import {botPolicy} from '../src/ai/policy.ts';
function fixture(){
 const s=createGame({players:3,name:'Test',difficulties:['medio','survival'],turnSeconds:180,seed:17});
 s.active=0;s.round=6;s.phase='ATTACK';s.players.forEach(p=>{p.setupRemaining=0;p.botPolicy=botPolicy();});
 s.board.forEach((c,i)=>{c.owner=1+i%2;c.armies=3;});return s;
}
test('contrattacco: sfrutta un territorio lasciato con una sola armata, anche fuori obiettivo',()=>{
 for(const level of ['medio','difficile','survival'] as const){
  const s=fixture();s.board[0]={owner:0,armies:7};s.board[1]={owner:0,armies:1};s.board[3]={owner:0,armies:1};s.board[29].armies=1;
  // A genuinely exposed frontier, not a one-army lure backed by four large stacks.
  for(const id of [28,30,31,32])s.board[id].armies=1;
  s.players[0].objective=objectives.find(o=>!o.territories.includes(29))!.id;
  const cmd=strategicCommand(project(s),level,()=>.5);
  assert.deepEqual(cmd,{type:'ATTACK',from:0,to:29});assertState(applyCommand(s,0,cmd));
 }
});
test('rinforzi: concentra la riserva per sbloccare un attacco anziché distribuirla in incrementi inutili',()=>{
 const s=fixture();s.phase='REINFORCEMENT';s.reinforcements=6;for(const id of [1,3,9,10,12,20])s.board[id].armies=8;
 s.board[0]={owner:0,armies:2};s.board[11]={owner:0,armies:2};s.board[29].armies=3;
 const plan=reinforcementPlan(project(s),'medio');assert.equal(plan.length,6);assert.ok(plan.filter(id=>id===0).length>=4,'Almeno quattro rinforzi devono rendere praticabile il fronte Alaska');
 let context;let placed=0;
 while(s.phase==='REINFORCEMENT'&&s.reinforcements){
  const result=humanDecision(project(s),'difficile',()=>.5,context);context=JSON.parse(JSON.stringify(result.context));
  assert.equal(result.command.type,'PLACE');Object.assign(s,applyCommand(s,0,result.command));assertState(s);placed++;
 }
 assert.equal(placed,6);assert.ok(s.board[0].armies>=6);assert.equal(context.plan.placements.length,0);
});
test('spostamento: le armate interne avanzano di un collegamento verso il fronte',()=>{
 const s=fixture();s.phase='FORTIFY';s.board.forEach(c=>{c.owner=0;c.armies=1;});s.board[32]={owner:1,armies:3};s.board[12].armies=8;
 assert.deepEqual(strategicCommand(project(s),'difficile',()=>.5),{type:'MOVE',from:12,to:11,count:7});
});
test('preferenza interrompi bonus cambia davvero il bersaglio, non solo la legalità del comando',()=>{
 const s=fixture();s.board.forEach((c,i)=>{c.owner=i>=26&&i<=37?1:2;c.armies=1;});
 for(const id of [0,1,3,6,7,8])s.board[id]={owner:0,armies:1};s.board[0].armies=10;s.board[8].armies=10;
 s.players[0].objective=objectives.find(o=>o.territories.includes(9)&&!o.territories.includes(29))!.id;
 s.players[0].botPolicy=botPolicy({breakBonus:true});assert.deepEqual(strategicCommand(project(s),'medio',()=>.5),{type:'ATTACK',from:0,to:29});
 s.players[0].botPolicy=botPolicy({breakBonus:false});assert.deepEqual(strategicCommand(project(s),'medio',()=>.5),{type:'ATTACK',from:8,to:9});
});
test('simulazioni limitate, riproducibili, senza mutare la vista né leggere obiettivi avversari',()=>{
 const s=fixture();s.board[0]={owner:0,armies:8};s.board[29].armies=1;
 const v=project(s),saved=structuredClone(v),hard=attackDecision(v,'difficile',()=>.3),survival=attackDecision(v,'survival',()=>.3);
 assert.equal(hard.samples,24);assert.equal(survival.samples,48);assert.deepEqual(v,saved);
 assert.deepEqual(survival,attackDecision(v,'survival',()=>.3));
 s.players[1].objective=s.players[1].objective%16+1;
 assert.deepEqual(attackDecision(project(s),'survival',()=>.3),survival);
});
test('Facile mantiene il comportamento precedente nelle fasi decisionali',()=>{
 const s=fixture();s.board[0]={owner:0,armies:9};s.board[1]={owner:0,armies:1};
 for(const phase of ['ATTACK','REINFORCEMENT','FORTIFY','TRIS_EXCHANGE','SETUP_PLACEMENT'] as const){
  s.phase=phase;s.reinforcements=3;s.setupBatch=3;s.players[0].setupRemaining=6;
  assert.deepEqual(strategicCommand(project(s),'facile',()=>.37),oldCommand(project(s),'facile',()=>.37));
 }
});
test('Survival rispetta la tregua e non aggiunge sortite casuali',()=>{
 const s=fixture();s.round=1;s.board[0]={owner:0,armies:8};s.players[0].botPolicy=botPolicy({graceRounds:2});
 assert.equal(humanDecision(project(s),'survival',()=>0).command.type,'NEXT');
 s.round=6;s.turnReinforcements=0;
 const result=humanDecision(project(s),'survival',()=>0);assert.equal(result.context.episode,null);
});

test('Difficile e Survival costruiscono una forza per la campagna sudamericana, non due fronti sottodimensionati',()=>{
 const s=fixture();s.phase='REINFORCEMENT';s.reinforcements=8;
 s.board[9]={owner:0,armies:2};s.board[12]={owner:0,armies:3};s.board[10].armies=1;s.board[11].armies=2;
 s.board[0]={owner:0,armies:3};s.board[29].armies=1;
 const before=structuredClone(s);
 for(const level of ['difficile','survival'] as const){
  const plan=reinforcementPlan(project(s),level);
  assert.equal(plan.length,8);assert.ok(plan.filter(id=>id===9).length>=6,'Preparare la conquista di Brasile e Perù con una forza concentrata');
 }
 assert.deepEqual(s,before,'La ricerca non deve modificare lo stato reale');
});
test('occupazione: conserva la difesa del continente conquistato invece di svuotarne il passaggio',()=>{
 const s=fixture();s.phase='POST_CONQUEST_MOVE';s.conquests=1;s.pending={from:20,to:11,min:3,transferred:3};
 for(let id=20;id<=25;id++)s.board[id]={owner:0,armies:3};
 s.board[20].armies=10;s.board[11]={owner:0,armies:3};s.board[16].armies=12;s.board[18].armies=12;
 const cmd=strategicCommand(project(s),'survival',()=>.5);assert.equal(cmd.type,'MOVE');
 if(cmd.type==='MOVE'){assert.ok(cmd.count<=3,'Africa del Nord deve mantenere almeno sette armate davanti agli stack europei');assertState(applyCommand(s,0,cmd));}
});
