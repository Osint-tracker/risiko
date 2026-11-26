import {objectives, territories} from '../data/mapGraph.ts';
import {inferObjectiveWeights} from './BotAI.ts';
import type {GameView} from '../engine/types.ts';

/**
 * Runaway-leader awareness, from public information only: territory counts and the
 * objective progress inferred from visible moves (never another player's hidden card).
 * `level` is 0 when nobody is clearly ahead of the viewer, up to 1 when one opponent is
 * running away with the game. Trailing players then stop fighting each other and contain
 * the leader, as competent human players do.
 */
export type Threat = {
  leader: number;        // -1 when no opponent is clearly ahead
  level: number;         // 0..1
  progress: number[];    // estimated objective progress per player, 0..1
  counts: number[];
  denial: number[];      // per territory: expected objective value for the leader
};

const members = objectives.map(o => o.territories.map(t => [t, territories[t].points] as const));
// Reading the log is the expensive part: cache it per log and player. Simulations share the log.
const rawCache = new WeakMap<object, Map<string, number[]>>();
function weights(v: GameView, viewer: number, p: number): number[] {
  let byLog = rawCache.get(v.log);
  if (!byLog) { byLog = new Map(); rawCache.set(v.log, byLog); }
  const key = `${p}:${v.log.length}`;
  let raw = byLog.get(key);
  if (!raw) { raw = inferObjectiveWeights(v, p); byLog.set(key, raw); }
  const mine = (v.players[viewer].objective ?? 0) - 1;
  if (mine < 0 || !raw[mine]) return raw;
  // Objectives are unique: an opponent cannot hold mine.
  const rest = 1 - raw[mine] || 1;
  return raw.map((x, o) => o === mine ? 0 : x / rest);
}
const pointsOf = (objective: number, v: GameView, p: number) =>
  members[objective].reduce((n, [t, pts]) => n + (t < v.board.length && v.board[t].owner === p ? pts : 0), 0);

const cache = new WeakMap<GameView, Map<number, Threat>>();
export const forgetThreat = (v: GameView) => { cache.delete(v); };

export function threatOf(v: GameView, viewer = v.active): Threat {
  let byViewer = cache.get(v);
  if (!byViewer) { byViewer = new Map(); cache.set(v, byViewer); }
  const hit = byViewer.get(viewer); if (hit) return hit;
  const n = v.players.length, counts: number[] = Array(n).fill(0);
  for (const c of v.board) counts[c.owner]++;
  const alive = v.players.filter(p => counts[p.id] > 0).map(p => p.id);
  const progress: number[] = Array(n).fill(0);
  const w: number[][] = [];
  for (const id of alive) {
    if (id === viewer) { const own = (v.players[id].objective ?? 0) - 1; progress[id] = own >= 0 ? pointsOf(own, v, id) / 86 : 0; continue; }
    w[id] = weights(v, viewer, id);
    progress[id] = w[id].reduce((sum, x, o) => sum + (x > .002 ? x * pointsOf(o, v, id) : 0), 0) / 86;
  }
  const total = v.board.length, fair = total / Math.max(1, alive.length);
  const rank = (id: number) => progress[id] + counts[id] / total;
  const order = [...alive].sort((a, b) => rank(b) - rank(a) || a - b);
  const leader = order[0], second = order[1];
  let level = 0;
  if (leader !== undefined && second !== undefined && leader !== viewer) {
    const ratio = counts[leader] / fair;
    // A clear lead, not a crushing one, is enough: 3 players → from ~17 of 42 territories, full at ~23.
    const byLand = counts[leader] >= counts[second] * 1.25 ? Math.min(1, Math.max(0, (ratio - 1.15) / .5)) : 0;
    const byGoal = progress[leader] >= progress[second] + .12 ? Math.min(1, Math.max(0, (progress[leader] - .5) / .25)) : 0;
    level = Math.max(byLand, byGoal);
  }
  const denial: number[] = Array(v.board.length).fill(0);
  if (level > 0) {
    const lw = w[leader] ?? weights(v, viewer, leader);
    lw.forEach((x, o) => { if (x > .002) for (const [t, pts] of members[o]) if (t < denial.length) denial[t] += x * pts; });
  }
  const result = {leader: level > 0 ? leader : -1, level, progress, counts, denial};
  byViewer.set(viewer, result);
  return result;
}
