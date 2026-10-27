import {botPolicy} from './policy.ts';
import {chooseBotCommand, conquestOdds} from './BotAI.ts';
import {canAttack, owned} from '../engine/RisikoRulesEngine.ts';
import {mapFor} from '../data/mapGraph.ts';
import type {BotContext, Command, Difficulty, GameView} from '../engine/types.ts';

export function humanDecision(v: GameView, level: Difficulty, rng: () => number, previous?: BotContext): {command: Command; context: BotContext} {
  const p = v.players[v.active];
  const context: BotContext = previous ? structuredClone(previous) : {
    temperament: rng() * 2 - 1, round: -1, turns: 0, lastEpisode: -10,
    previousArmies: p.totalArmies, cautious: false, lostTerritory: null, logIndex: 0, episode: null
  };
  for (const e of v.log.slice(context.logIndex)) {
    if (e.type === 'onDiceRolled') {
      if (e.defender === p.id && e.to !== undefined && v.board[e.to].owner !== p.id) {
        context.lostTerritory = e.to;
        context.reclaimUntil = context.turns + 2;
      }
      if (e.player === p.id && (e.losses?.[0] ?? 0) >= 2) context.cautious = true;
    }
  }
  context.logIndex = v.log.length;
  if (context.round !== v.round) {
    context.cautious = p.totalArmies < context.previousArmies * .75;
    context.previousArmies = p.totalArmies;
    context.round = v.round;
    context.turns++;
    if (context.reclaimUntil !== undefined && context.turns > context.reclaimUntil) context.lostTerritory = null;
    context.episode = null;
    context.sortieChecked = false;
    context.sortiePending = false;
  }
  const policy=botPolicy(p.botPolicy);
  // Decide only after card exchanges: a large bonus must prevent eligibility.
  if(!context.sortieChecked && ['REINFORCEMENT','ATTACK','FORTIFY'].includes(v.phase)){
    context.sortieChecked=true;
    const received=v.turnReinforcements ?? (v.phase==='REINFORCEMENT'?v.reinforcements:Infinity);
    const eligible=v.round>=5 && v.round>policy.graceRounds && p.territoryCount<=8 && received<3 && context.turns-context.lastEpisode>=3;
    context.sortiePending=eligible && rng() < {facile:.06,medio:.03,difficile:.02}[level];
  }
  if(v.phase==='ATTACK' && context.sortiePending){
    context.sortiePending=false;
    const attacks=owned(v,p.id).flatMap(from=>mapFor(v).territories[from].neighbors.filter(to=>canAttack(v,from,to)).map(to=>({from,to,score:(to===context.lostTerritory?10:0)-v.board[to].armies}))).sort((a,b)=>b.score-a.score||a.from-b.from||a.to-b.to);
    if(attacks[0]){const {from,to}=attacks[0];context.episode={from,to,initialArmies:v.board[from].armies,rolls:0};context.lastEpisode=context.turns;}
  }
  if (v.phase === 'ATTACK' && context.episode && v.round>policy.graceRounds) {
    const e = context.episode;
    if (e.rolls < 3 && v.board[e.from].armies > e.initialArmies / 2 && canAttack(v, e.from, e.to)) {
      e.rolls++;
      return {command: {type: 'ATTACK', from: e.from, to: e.to}, context};
    }
    context.episode = null;
  }
  if (context.lostTerritory !== null && v.board[context.lostTerritory].owner === p.id) context.lostTerritory = null;
  const dosage = {facile: 1, medio: .65, difficile: .3}[level];
  const riskBias = dosage * ((context.cautious ? .08 : 0) - (v.conquests >= 2 ? .04 : 0) - context.temperament * .025);
  const command = chooseBotCommand(v, level, rng, {riskBias, reclaim: context.lostTerritory, variation: dosage * .1});
  return {command, context};
}

/** Timing randomness is independent of the engine and decision RNGs. */
export function decisionDelay(v: GameView, next: Command, previous: Command | null, speed: number, rng: () => number): number {
  if (speed === 0) return 0;
  let delay: number;
  if (next.type === 'PLACE' && previous?.type === 'PLACE') {
    delay = next.territory === previous.territory ? 400 + rng() * 500 : 1000 + rng() * 1000;
  } else {
    const battle = v.lastBattle;
    const lowForce = battle?.player === v.active && battle.from !== undefined && v.board[battle.from].armies <= 4;
    const costly = v.conquests > 0 && ((battle?.losses?.[0] ?? 0) >= 2 || lowForce);
    const uncertain = next.type === 'ATTACK' && conquestOdds(v.board[next.from].armies, v.board[next.to].armies) < .8;
    const complex = costly || uncertain || v.phase === 'POST_CONQUEST_MOVE';
    delay = complex ? (rng() < .05 ? 8000 + rng() * 7000 : 4000 + rng() * 4000) : 2000 + rng() * 2000;
  }
  const remaining = v.phase === 'SETUP_PLACEMENT' ? 30000 : Math.max(0, v.remainingMs - 500);
  return Math.min(30000, remaining, delay / speed);
}
