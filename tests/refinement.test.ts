import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyCommand,moveBounds,upgradeConquestSave,assertState,project} from '../src/engine/RisikoRulesEngine.ts';
import {makeTransition} from '../src/engine/presentation.ts';
import {territories,objectives} from '../src/data/mapGraph.ts';
import {chooseBotCommand} from '../src/ai/BotAI.ts';

function attackFixture(dice:number,extra=0) {
 const s=createGame({players:3,name:'Test',difficulties:['medio','medio'],turnSeconds:180,seed:17});
 s.active=0;s.phase='ATTACK';s.round=5;s.players.forEach(p=>p.setupRemaining=0);
 s.board[0]={owner:0,armies:dice+1+extra};s.board[1]={owner:1,armies:1};
 for(let seed=1;seed<1000;seed++){
  s.rng=(seed*2654435761)>>>0;
  const n=applyCommand(s,0,{type:'ATTACK',from:0,to:1});
  if(n.board[1].owner===0)return {s,n};
 }
 throw Error('No winning seed');
}
test('conquista con 1/2/3 dadi trasferisce subito il minimo, senza mostrare zero',()=>{
 for(const dice of [1,2,3]){
  const {s,n}=attackFixture(dice);
  assert.equal(n.board[1].armies,dice);assert.equal(n.board[0].armies,1);
  assert.equal(n.pending,null);assert.equal(n.phase,'ATTACK');
  assert.equal(n.board.reduce((a,c)=>a+c.armies,0),s.board.reduce((a,c)=>a+c.armies,0)-1);
  const e=makeTransition(s,n)!.effects[0];assert.equal(e.kind,'battle');
  if(e.kind==='battle')assert.equal(e.transferred,dice);
  assertState(n);
 }
});
test('i carri aggiuntivi partono da zero e rispettano la guarnigione',()=>{
 const {n}=attackFixture(3,8);
 assert.equal(n.pending?.transferred,3);assert.equal(n.board[1].armies,3);
 const bounds=moveBounds(n,0,1);assert.equal(bounds.min,0);assert.ok(bounds.max>0);
 const zero=applyCommand(n,0,{type:'MOVE',from:0,to:1,count:0});
 assert.deepEqual(zero.board,n.board);assert.equal(zero.phase,'ATTACK');assert.equal(makeTransition(n,zero),null);
 const all=applyCommand(n,0,{type:'MOVE',from:0,to:1,count:bounds.max});
 assert.equal(all.board[1].armies,3+bounds.max);assert.ok(all.board[0].armies>=1);assertState(all);
 assert.throws(()=>applyCommand(n,0,{type:'MOVE',from:0,to:1,count:bounds.max+1}));
 assert.throws(()=>applyCommand(n,0,{type:'MOVE',from:0,to:1,count:-1}));
 assert.throws(()=>applyCommand(n,0,{type:'MOVE',from:0,to:1,count:.5}));
});
test('timeout non sposta nuovamente il minimo già trasferito',()=>{
 const {n}=attackFixture(3,8);
 const timeout=applyCommand(n,0,{type:'TIMEOUT'});
 assert.deepEqual(timeout.board,n.board);assert.equal(timeout.pending,null);assertState(timeout);
});
test('vecchio salvataggio di conquista: conversione idempotente e immutabile',()=>{
 const {n}=attackFixture(3,8);const old=structuredClone(n);
 old.board[0].armies+=3;old.board[1].armies-=3;delete old.pending!.transferred;
 const upgraded=upgradeConquestSave(old);
 assert.equal(old.board[1].armies,0);assert.deepEqual(upgraded.board,n.board);
 assert.equal(upgraded.pending!.transferred,3);assert.equal(upgraded.revision,old.revision+1);
 assert.strictEqual(upgradeConquestSave(upgraded),upgraded);assertState(upgraded);
 const impossible=structuredClone(old);impossible.board[0].armies=2;
 assert.throws(()=>upgradeConquestSave(impossible));
});
test('conquista che completa un obiettivo trasferisce il minimo una sola volta',()=>{
 const s=createGame({players:3,name:'Test',difficulties:['medio','medio'],turnSeconds:180,seed:17});
 s.phase='ATTACK';s.round=5;s.active=0;s.players.forEach(p=>p.setupRemaining=0);
 const goal=objectives[s.players[0].objective-1];
 for(const id of goal.territories)s.board[id]={owner:0,armies:1};
 const to=goal.territories.find(id=>territories[id].neighbors.some(n=>goal.territories.includes(n)))!;
 const from=territories[to].neighbors.find(id=>goal.territories.includes(id))!;
 s.board[to]={owner:1,armies:1};s.board[from]={owner:0,armies:12};
 // Keep both opponents alive outside the target objective.
 const outside=territories.filter(t=>!goal.territories.includes(t.id));
 s.board[outside[0].id]={owner:1,armies:1};s.board[outside[1].id]={owner:2,armies:1};
 let win;
 for(let seed=1;seed<1000;seed++){s.rng=(seed*2654435761)>>>0;const n=applyCommand(s,0,{type:'ATTACK',from,to});if(n.phase==='GAME_OVER'){win=n;break;}}
 assert.ok(win);assert.equal(win.board[to].armies,3);assert.equal(win.board[from].armies,9);assert.equal(win.pending,null);assertState(win);
});

test('i bot scelgono solo rinforzi aggiuntivi validi dopo la conquista',()=>{
 const {n}=attackFixture(3,8);
 for(const level of ['facile','medio','difficile'] as const){
  const command=chooseBotCommand(project(n,0),level,()=>.5);
  assert.equal(command.type,'MOVE');
  const after=applyCommand(n,0,command);assertState(after);
  assert.equal(after.board[0].armies+after.board[1].armies,n.board[0].armies+n.board[1].armies);
 }
});
