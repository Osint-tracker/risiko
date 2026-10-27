import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyCommand,advanceClock,assertState,project,owned,ranks,total} from '../src/engine/RisikoRulesEngine.ts';
import {diceHistogram,tournamentStats} from '../src/services/TournamentStats.ts';
import {writeLocalSnapshot,readLocalSnapshot,snapshotKey} from '../src/services/LocalSnapshot.ts';
import {armyBadge} from '../src/gui/art.ts';
import {seaRoute} from '../src/gui/mapGeometry.ts';
import {mapFor} from '../src/data/mapGraph.ts';
import type {GameConfig} from '../src/engine/types.ts';
import type {ResultRecord} from '../src/services/StorageService.ts';
const config:GameConfig={players:3,name:'Test',difficulties:['medio','difficile'],turnSeconds:180,seed:117,manualReinforcement:true};
function reinforcement(){const s=createGame(config);s.active=0;s.phase='REINFORCEMENT';s.round=5;s.reinforcements=4;s.players.forEach(p=>p.setupRemaining=0);return s;}

test('Undo ripristina armate, riserva e inferenze; resta disponibile dopo l’ultimo rinforzo fino ad Attacco',()=>{
 const before=reinforcement(),t=owned(before,0)[0],u=owned(before,0)[1];
 let s=applyCommand(before,0,{type:'PLACE',territory:t,count:1});
 const one=structuredClone(s);
 s=applyCommand(s,0,{type:'PLACE',territory:u,count:3});
 assert.equal(s.phase,'REINFORCEMENT');assert.equal(s.reinforcements,0);assert.equal(project(s).undoAvailable,true);
 assert.throws(()=>applyCommand(s,1,{type:'UNDO_PLACE'}));
 s=applyCommand(s,0,{type:'UNDO_PLACE'});
 assert.deepEqual(s.board,one.board);assert.deepEqual(s.beliefs,one.beliefs);assert.equal(s.reinforcements,3);
 s=applyCommand(s,0,{type:'UNDO_PLACE'});
 assert.deepEqual(s.board,before.board);assert.deepEqual(s.beliefs,before.beliefs);assert.equal(s.reinforcements,4);
 assert.throws(()=>applyCommand(s,0,{type:'UNDO_PLACE'}));assert.throws(()=>applyCommand(s,0,{type:'NEXT'}));
 s=applyCommand(s,0,{type:'PLACE',territory:t,count:4});s=applyCommand(s,0,{type:'NEXT'});
 assert.equal(s.phase,'ATTACK');assert.equal(project(s).undoAvailable,false);assert.throws(()=>applyCommand(s,0,{type:'UNDO_PLACE'}));
 assert.equal(before.board[t].armies,1,'Il comando non muta il precedente snapshot');
});

test('Undo non annulla la dotazione iniziale né scambi; il timeout conserva le armate e chiude la cronologia',()=>{
 const setup=createGame(config);setup.active=0;assert.throws(()=>applyCommand(setup,0,{type:'UNDO_PLACE'}));
 let s=reinforcement(),t=owned(s,0)[0];s=applyCommand(s,0,{type:'PLACE',territory:t,count:4});
 const armies=total(s,0);s=applyCommand(s,0,{type:'TIMEOUT'});
 assert.equal(total(s,0),armies);assert.deepEqual(s.placementHistory,[]);assert.throws(()=>applyCommand(s,0,{type:'UNDO_PLACE'}));
});

test('Countdown 45 minuti: esclusi setup e pausa, chiusura a punti alla scadenza, nessuna Sdadata',()=>{
 let s=createGame({...config,endMode:'countdown'});assert.equal(s.matchRemainingMs,45*60000);
 s=advanceClock(s,15000);assert.equal(s.matchRemainingMs,45*60000);
 s.phase='FORTIFY';s.round=20;s.active=s.order.at(-1)!;
 const paused={...s,paused:true};assert.equal(advanceClock(paused,10000),paused);
 s=applyCommand(s,s.active,{type:'NEXT'});assert.equal(s.sdadata,null);assert.equal(s.round,21);
 const prior=s.matchRemainingMs!;s=advanceClock(s,1000);assert.equal(s.matchRemainingMs,prior-1000);
 assert.equal(advanceClock(s,NaN),s);
 s.matchRemainingMs=100;const winner=ranks(s)[0].player;s=advanceClock(s,101);
 assert.equal(s.phase,'GAME_OVER');assert.equal(s.reason,'countdown');assert.equal(s.winner,winner);assert.equal(s.matchRemainingMs,0);
 assert.equal(advanceClock(s,10000),s);assertState(s);
 assert.throws(()=>createGame({...config,countdownMinutes:46}));assert.throws(()=>assertState({...s,matchRemainingMs:-1}));
});

test('Countdown risolve una conquista precedente senza azzerare né duplicare la guarnigione',()=>{
 let s=reinforcement();s.endMode='countdown';s.matchRemainingMs=1;s.phase='POST_CONQUEST_MOVE';
 s.board[0]={owner:0,armies:8};s.board[1]={owner:0,armies:0};s.pending={from:0,to:1,min:3};
 s=advanceClock(s,2);assert.equal(s.board[0].armies,5);assert.equal(s.board[1].armies,3);assert.equal(s.pending,null);assertState(s);
 const modern=reinforcement();modern.endMode='countdown';modern.matchRemainingMs=1;modern.phase='POST_CONQUEST_MOVE';
 modern.board[0]={owner:0,armies:5};modern.board[1]={owner:0,armies:3};modern.pending={from:0,to:1,min:3,transferred:3};
 assert.deepEqual(advanceClock(modern,2).board,modern.board);
});

test('Andamento punti: ogni bot vede solo i propri valori fino alla classifica finale',()=>{
 let s=reinforcement();s.phase='FORTIFY';s=applyCommand(s,0,{type:'NEXT'});
 assert.equal(s.scoreHistory!.length,1);
 for(let viewer=0;viewer<3;viewer++){
  const view=project(s,viewer);assert.deepEqual(view.scoreHistory![0].points,s.scoreHistory![0].points.map((n,i)=>i===viewer?n:null));
  assert.ok(!('placementHistory' in view));assert.ok(!('beliefs' in view));
 }
 s.endMode='countdown';s.matchRemainingMs=1;s=advanceClock(s,2);
 assert.deepEqual(project(s,1).scoreHistory,s.scoreHistory);
});

test('Snapshot locale completo: ripresa con Undo, no perdita silenziosa su JSON corrotto o quota esaurita',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let raw:string|null=null;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>{assert.equal(key,snapshotKey);return raw;},setItem:(key:string,v:string)=>{assert.equal(key,snapshotKey);raw=v;}}});
 try{
  const s=reinforcement(),t=owned(s,0)[0],placed=applyCommand(s,0,{type:'PLACE',territory:t,count:4});
  assert.equal(writeLocalSnapshot(placed),true);assert.deepEqual(readLocalSnapshot(),placed);
  const restored=applyCommand(readLocalSnapshot()!,0,{type:'UNDO_PLACE'});assert.deepEqual(restored.board,s.board);
  raw='{broken';assert.equal(readLocalSnapshot(),null);
  raw=JSON.stringify({...s,matchRemainingMs:-2});assert.equal(readLocalSnapshot(),null);
  globalThis.localStorage.setItem=()=>{throw Error('QuotaExceededError');};assert.equal(writeLocalSnapshot(s),false);
 }finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete (globalThis as any).localStorage;}
});

test('Statistiche: dadi dell’umano in attacco/difesa, esclusi altri bot e Sdadata; media punti tavolo e vecchi record',()=>{
 const dice=diceHistogram({log:[
  {type:'onDiceRolled',player:0,defender:1,message:'',attack:[6,3,1],defense:[5,4]},
  {type:'onDiceRolled',player:2,defender:0,message:'',attack:[6,6],defense:[5,3,2]},
  {type:'onDiceRolled',player:2,defender:1,message:'',attack:[6],defense:[6]},
  {type:'onSdadataRoll',player:0,message:'',attack:[6,6]}
 ]});assert.deepEqual(dice,[1,1,2,0,1,1]);
 const base={id:'one',date:1,name:'Test',duration:1,players:3};
 const rows:ResultRecord[]=[{...base,rank:1,points:100,objectivePoints:86,reason:'risiko',dice},{...base,id:'two',rank:1,points:40,reason:'sdadata'},{...base,id:'three',rank:2,points:10,reason:'countdown'}];
 const stats=tournamentStats(rows);assert.equal(stats.played,3);assert.equal(stats.wins,2);assert.equal(stats.winRate,67);assert.equal(stats.average,50);assert.equal(stats.risiko,1);assert.equal(stats.sdadata,1);assert.deepEqual(stats.dice,dice);
 assert.equal(tournamentStats([]).average,0);
});

test('Rotte su entrambe le mappe: punti di costa finiti e distinti dai centri; badge 12 puramente estetico',()=>{
 for(const antarctica of [false,true]){const m=mapFor({antarctica});for(const [a,b] of m.seaLinks){
  const route=seaRoute(m.territories[a],m.territories[b]);assert.match(route.path,/Q/);assert.doesNotMatch(route.path,/NaN|Infinity/);
  route.anchors.forEach((point,i)=>{const t=m.territories[[a,b][i]];assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));assert.ok(Math.hypot(point.x-t.x,point.y-t.y)>0);});
 }}
 const s=reinforcement(),t=owned(s,0)[0];s.reinforcements=20;const after=applyCommand(s,0,{type:'PLACE',territory:t,count:20});
 assert.equal(after.board[t].armies,21);assertState(after);
 assert.match(armyBadge(21,'#ffff00'),/>21</);assert.match(armyBadge(12,'#ffff00'),/army-strength/);
});

test('Tick ordinari e scadenze conservano gli snapshot precedenti, anche dopo una lunga cronologia',()=>{
 let s=reinforcement();s.endMode='countdown';s.matchRemainingMs=45000;s.remainingMs=10000;
 s.log=Array.from({length:4000},()=>({type:'onGameStateUpdate' as const,player:0,message:'Rinforzo'}));
 const original=structuredClone(s),t=advanceClock(s,50);
 assert.deepEqual(s,original);assert.equal(t.remainingMs,9950);assert.equal(t.matchRemainingMs,44950);
 const expired=advanceClock(t,50000);assert.equal(expired.phase,'GAME_OVER');assert.equal(expired.reason,'countdown');
 assert.equal(t.phase,'REINFORCEMENT');assert.equal(t.log.length,4000);assert.deepEqual(s,original);
 const timed=advanceClock({...s,endMode:'regular',remainingMs:1},2);
 assert.notEqual(timed.active,s.active);assert.deepEqual(s,original);
});
