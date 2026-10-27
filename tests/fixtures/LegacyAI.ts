import { territories, objectives, continents } from '../../src/data/mapGraph.ts';
import { border, owned, validTris, moveBounds, canAttack } from '../../src/engine/RisikoRulesEngine.ts';
import type { GameView, Command, Difficulty } from '../../src/engine/types.ts';
type Outcome = {
  attacker: number;
  defender: number;
  probability: number;
};
const distributionCache = new Map<string, Outcome[]>();
/** Exact exhaustive dice distribution, including three defending dice and ties. */
export function diceDistribution(a: number, d: number): Outcome[] {
  const key = `${a},${d}`;
  if (distributionCache.has(key)) return distributionCache.get(key)!;
  const count = new Map<string, number>(),
    dice: number[] = [];
  function enumerate(i: number) {
    if (i < a + d) {
      for (let k = 1; k <= 6; k++) {
        dice[i] = k;
        enumerate(i + 1);
      }
      return;
    }
    const attack = dice.slice(0, a).sort((x, y) => y - x),
      defense = dice.slice(a).sort((x, y) => y - x);
    let al = 0,
      dl = 0;
    for (let j = 0; j < Math.min(a, d); j++) {
      if (attack[j] > defense[j]) dl++;else al++;
    }
    const id = `${al},${dl}`;
    count.set(id, (count.get(id) ?? 0) + 1);
  }
  enumerate(0);
  const out = [...count].map(([k, n]) => {
    const [attacker, defender] = k.split(',').map(Number);
    return {
      attacker,
      defender,
      probability: n / 6 ** (a + d)
    };
  });
  distributionCache.set(key, out);
  return out;
}
const oddsCache = new Map<string, number>();
export function conquestOdds(armies: number, defenders: number): number {
  if (defenders === 0) return 1;
  const a = Math.min(3, armies - 1),
    d = Math.min(3, defenders);
  if (a < d || a < 1) return 0;
  const key = `${armies},${defenders}`;
  if (oddsCache.has(key)) return oddsCache.get(key)!;
  const chance = diceDistribution(a, d).reduce((n, o) => n + o.probability * conquestOdds(armies - o.attacker, defenders - o.defender), 0);
  oddsCache.set(key, chance);
  return chance;
}
function targetPressure(v: GameView, t: number) {
  return territories[t].neighbors.reduce((n, id) => n + (v.board[id].owner !== v.active ? v.board[id].armies : 0), 0);
}
export function inferObjectiveWeights(v: GameView, p: number): number[] {
  const scores = objectives.map(() => 0);
  for (const e of v.log) {
    if (e.player !== p || e.territory === undefined) continue;
    const weight = e.action === 'conquer' ? 1.2 : e.action === 'reinforce' ? .25 : 0;
    if (!weight) continue;
    for (let i = 0; i < 16; i++) scores[i] += objectives[i].territories.includes(e.territory) ? weight : -weight / 2;
  }
  const max = Math.max(...scores),
    raw = scores.map(x => Math.exp(Math.max(-20, (x - max) / 3))),
    sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(x => x / sum);
}
export type BotMood = {riskBias: number; reclaim: number | null; variation: number};
export function chooseBotCommand(v: GameView, level: Difficulty, rng: () => number, mood?: BotMood): Command {
  const p = v.players[v.active],
    own = owned(v, v.active),
    goal = objectives[p.objective! - 1].territories;
  const pick = <T,>(a: T[]) => a[Math.min(a.length - 1, Math.floor(rng() * a.length))];
  const easy = level === 'facile',
    hard = level === 'difficile';
  const frontier = own.filter(t => border(v, t));
  const weights = new Map(v.players.filter(x => x.id !== p.id && !x.eliminated).map(x => [x.id, inferObjectiveWeights(v, x.id)]));
  const estimated = (id: number) => {
    const w = weights.get(id)!;
    return objectives.reduce((n, o, i) => n + w[i] * o.territories.filter(t => v.board[t].owner === id).reduce((n, t) => n + territories[t].points, 0), 0);
  };
  const leading = hard && v.round >= 17 && (p.points ?? 0) >= Math.max(0, ...[...weights.keys()].map(estimated));
  const priority = (t: number) => {
    const nearby = territories[t].neighbors.filter(id => v.board[id].owner !== p.id);
    const continent = territories.filter(x => x.continent === territories[t].continent);
    const control = continent.filter(x => v.board[x.id].owner === p.id).length / continent.length;
    return (goal.includes(t) ? 10 + territories[t].points : 0) + (nearby.some(id => goal.includes(id)) ? 8 : 0) + control * 7 + Math.min(20, targetPressure(v, t)) * .6 - v.board[t].armies * .9;
  };
  if (v.phase === 'SETUP_PLACEMENT' || v.phase === 'REINFORCEMENT') {
    const candidates = frontier.length ? frontier : own;
    const t = easy ? pick(candidates) : [...candidates].sort((a, b) => priority(b) - priority(a) || a - b)[0];
    return {
      type: 'PLACE',
      territory: t,
      count: 1
    };
  }
  if (v.phase === 'TRIS_EXCHANGE') {
    const combos = validTris(v, p.id, p.cards ?? []).sort((a, b) => b.value - a.value);
    const threatened = frontier.some(t => targetPressure(v, t) > v.board[t].armies * 2);
    if (combos.length && p.totalArmies + v.reinforcements < 130 && (easy || combos[0].value >= 10 || p.cardCount >= 7 || threatened || v.round >= 17)) return {
      type: 'EXCHANGE',
      cards: combos[0].cards
    };
    return {
      type: 'NEXT'
    };
  }
  if (v.phase === 'POST_CONQUEST_MOVE') {
    const m = v.pending!,
      b = moveBounds(v, m.from, m.to);
    let count = b.min;
    if (border(v, m.to)) {
      if (!border(v, m.from)) count = b.max;else count = Math.max(b.min, Math.min(b.max, Math.round((v.board[m.from].armies + v.board[m.to].armies) / 2) - v.board[m.to].armies));
    }
    return {
      type: 'MOVE',
      from: m.from,
      to: m.to,
      count
    };
  }
  if (v.phase === 'ATTACK') {
    const candidates: {
      from: number;
      to: number;
      utility: number;
    }[] = [];
    for (const from of frontier) for (const to of territories[from].neighbors) {
      if (!canAttack(v, from, to)) continue;
      const attack = v.board[from].armies,
        defense = v.board[to].armies;
      if (easy) {
        if (attack / defense >= 1.5 + (mood?.riskBias ?? 0)) candidates.push({
          from,
          to,
          utility: rng()
        });
        continue;
      }
      if (leading && v.conquests >= 1) continue;
      const odds = conquestOdds(attack, defense),
        threshold = Math.max(.4, Math.min(.95, (leading ? .9 : hard ? v.round >= 17 ? .6 : .75 : .65) + (mood?.riskBias ?? 0)));
      if (odds <= threshold) continue;
      const owner = v.board[to].owner,
        goalValue = goal.includes(to) ? territories[to].points : 0;
      const c = territories[to].continent,
        full = territories.filter(t => t.continent === c).every(t => v.board[t.id].owner === owner);
      const continentBonus = full ? continents.find(x => x.id === c)!.bonus : 0;
      const denial = hard ? (weights.get(owner) ?? []).reduce((n, w, i) => n + w * (objectives[i].territories.includes(to) ? territories[to].points : 0), 0) : 0;
      const utility = (goalValue * 3 + (v.conquests === 0 ? 8 : 0) + continentBonus * 4 + denial - defense * 1.6 - (1 - odds) * 10 + (mood?.reclaim === to ? 2 : 0)) * (1 + (mood ? (rng() * 2 - 1) * mood.variation : 0));
      if (utility > 0 && (!leading || v.conquests < 2)) candidates.push({
        from,
        to,
        utility
      });
    }
    if (!candidates.length) return {
      type: 'NEXT'
    };
    const chosen = easy ? pick(candidates) : candidates.sort((a, b) => b.utility - a.utility || a.from - b.from || a.to - b.to)[0];
    return {
      type: 'ATTACK',
      from: chosen.from,
      to: chosen.to
    };
  }
  if (v.phase === 'FORTIFY') {
    const moves: {
      from: number;
      to: number;
      count: number;
      score: number;
    }[] = [];
    for (const from of own) for (const to of territories[from].neighbors) {
      if (v.board[to].owner !== p.id) continue;
      const b = moveBounds(v, from, to);
      if (b.max < b.min) continue;
      const score = priority(to) - priority(from) + (border(v, to) && !border(v, from) ? 20 : 0);
      if (easy || score > 2) moves.push({
        from,
        to,
        count: easy ? b.max : Math.max(1, Math.min(b.max, Math.ceil((v.board[from].armies - v.board[to].armies) / 2) + (border(v, from) ? 0 : Math.floor(b.max / 2)))),
        score
      });
    }
    if (moves.length) {
      const m = easy ? pick(moves) : moves.sort((a, b) => b.score - a.score)[0];
      return {
        type: 'MOVE',
        from: m.from,
        to: m.to,
        count: m.count
      };
    }
    return {
      type: 'NEXT'
    };
  }
  return {
    type: 'NEXT'
  };
}
