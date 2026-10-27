import { mapFor, objectives } from '../data/mapGraph.ts';
import { border, owned, validTris, moveBounds, canAttack } from '../engine/RisikoRulesEngine.ts';
import type { GameView, Command, Difficulty } from '../engine/types.ts';
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
  return mapFor(v).territories[t].neighbors.reduce((n, id) => n + (v.board[id].owner !== v.active ? v.board[id].armies : 0), 0);
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
export {strategicCommand as chooseBotCommand} from './Strategy.ts';
