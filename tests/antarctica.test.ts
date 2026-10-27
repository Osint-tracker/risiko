import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapFor,territories,cards,objectives,objectivePoints} from '../src/data/mapGraph.ts';
import {createGame,assertState,owned,total,reinforcement,canAttack,moveBounds,applyCommand,project,ranks,random} from '../src/engine/RisikoRulesEngine.ts';
import {humanDecision} from '../src/ai/HumanBot.ts';
import {strategicCommand} from '../src/ai/Strategy.ts';
import {cardFace} from '../src/gui/art.ts';
import type {BotContext,Difficulty} from '../src/engine/types.ts';
const game=(players=3,seed=7)=>createGame({antarctica:true,players,name:'Test',difficulties:Array(players-1).fill('medio'),turnSeconds:180,seed});
test('Antartide: grafo simmetrico, tre rotte richieste e modalità classica isolata',()=>{
 const m=mapFor({antarctica:true});assert.equal(m.territories.length,44);assert.equal(m.continents.length,7);
 assert.deepEqual(m.territories[42].neighbors,[12,43]);assert.deepEqual(m.territories[43].neighbors,[42,24,41]);
 for(const t of m.territories)for(const n of t.neighbors)assert.ok(m.territories[n].neighbors.includes(t.id));
 assert.equal(m.continents.at(-1)!.bonus,2);assert.deepEqual(m.territories.slice(42).map(t=>t.points),[3,3]);
 assert.equal(territories.length,42);assert.equal(cards.length,44);assert.ok(!territories[12].neighbors.includes(42));
 for(const o of objectives)assert.equal(objectivePoints(o.id,o.territories),86);
});
test('distribuzione Antartide 3/4/5: totali invariati, mai un continente iniziale, mani da tre',()=>{
 for(const n of [3,4,5])for(let seed=1;seed<=20;seed++){
  let s=game(n,seed);assertState(s);
  const counts=s.players.map(p=>owned(s,p.id).length);assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
  assert.notEqual(s.board[42].owner,s.board[43].owner);
  for(const p of s.players)assert.equal(total(s,p.id)+p.setupRemaining,({3:35,4:30,5:25} as Record<number,number>)[n]);
  const actor=s.active,t=owned(s,actor)[0];s=applyCommand(s,actor,{type:'PLACE',territory:t,count:3});assert.notEqual(s.active,actor);assertState(s);
 }
});
test('bonus polare, attraversamenti, confini e spostamenti funzionano in entrambi i sensi',()=>{
 const s=game();s.phase='ATTACK';s.round=5;s.active=0;
 s.board.forEach((c,i)=>{c.owner=1+i%2;c.armies=1;});
 s.board[42]={owner:0,armies:8};s.board[43]={owner:0,armies:5};
 assert.equal(reinforcement(s,0),2);
 for(const [a,b] of [[42,12],[43,24],[43,41]]){
  assert.equal(canAttack(s,a,b),true);
  s.active=s.board[b].owner;s.board[b].armies=8;assert.equal(canAttack(s,b,a),true);s.active=0;s.board[b].armies=1;
 }
 s.board[43].owner=1;assert.equal(reinforcement(s,0),0);assert.equal(canAttack(s,42,43),true);
 s.board[43].owner=0;s.phase='FORTIFY';assert.equal(moveBounds(s,42,43).max,6);
 const moved=applyCommand(s,0,{type:'MOVE',from:42,to:43,count:2});assert.equal(moved.board[42].armies,6);assert.equal(moved.board[43].armies,7);assertState(moved);
});
test('carte polari: ID jolly conservati, tris e bonus territorio, salvataggio e punteggio',()=>{
 const s=game(),m=mapFor(s);assert.equal(m.cards.length,46);assert.equal(m.cards[42].symbol,'jolly');assert.equal(m.cards[43].symbol,'jolly');
 assert.equal(m.cards[44].territory,42);assert.equal(m.cards[45].territory,43);
 s.active=0;s.phase='TRIS_EXCHANGE';s.round=5;s.reinforcements=0;s.turnReinforcements=0;
 s.players[0].cards=[44,0,3];s.deck=s.deck.filter(id=>![44,0,3].includes(id));
 s.board[42].owner=0;s.board[0].owner=1;s.board[3].owner=1;
 const changed=applyCommand(s,0,{type:'EXCHANGE',cards:[44,0,3]});assert.equal(changed.reinforcements,10);assert.equal(changed.turnReinforcements,10);assertState(changed);
 const restored=JSON.parse(JSON.stringify(changed));assertState(restored);assert.equal(project(restored).antarctica,true);
 const invalid={...restored,antarctica:false};assert.throws(()=>assertState(invalid));
 assert.match(cardFace(44),/Antartide Occidentale/);assert.match(cardFace(45),/Antartide Orientale/);
 const base=ranks(s).find(r=>r.player===0)!.outside;s.board[43].owner=0;assert.equal(ranks(s).find(r=>r.player===0)!.outside,base+3);
});
test('bot medio/difficile completano Antartide e difendono le nuove frontiere',()=>{
 const s=game();s.active=0;s.round=5;s.phase='ATTACK';s.players[0].objective=1;
 s.board.forEach((c,i)=>{c.owner=i%2+1;c.armies=3;});s.board[42]={owner:0,armies:12};s.board[43].armies=1;
 for(const level of ['medio','difficile'] as const){
  const cmd=strategicCommand(project(s),level,()=>.5);assert.deepEqual(cmd,{type:'ATTACK',from:42,to:43});assertState(applyCommand(s,0,cmd));
 }
 s.board[43]={owner:0,armies:1};s.board[12].armies=3;s.board[24].armies=8;s.board[41].armies=8;
 s.phase='REINFORCEMENT';s.reinforcements=2;
 assert.deepEqual(strategicCommand(project(s),'difficile',()=>.5),{type:'PLACE',territory:43,count:1});
});
test('Antartide: sei partite complete 3/4/5 con bot medi e difficili, invarianti dopo ogni azione',()=>{
 for(const n of [3,4,5])for(const level of ['medio','difficile'] as Difficulty[]){
  let s=game(n,100+n),actions=0;const contexts:Record<number,BotContext>={};
  while(s.phase!=='GAME_OVER'&&actions++<18000){
   const actor=s.active,rng={rng:s.aiRng};const result=humanDecision(project(s,actor),level,()=>random(rng),contexts[actor]);
   contexts[actor]=result.context;s=applyCommand(s,actor,result.command);s.aiRng=rng.rng;assertState(s);
  }
  assert.equal(s.phase,'GAME_OVER',`${n}/${level}`);assert.ok(s.winner!==null);
 }
});
