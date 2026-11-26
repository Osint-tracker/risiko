import type {BotPolicy, BotPersonality, Difficulty} from '../engine/types.ts';

/** What a personality WANTS (style). The level decides how well it pursues it (competence). */
export type Profile = {
  gate: number;        // minimum conquest probability to start or continue an attack
  objective: number;   // weight on own-objective territories
  continent: number;   // weight on completing and holding continents
  breaker: number;     // weight on breaking or blocking enemy bonuses
  picker: number;      // weight on weakly held targets
  hunter: number;      // weight on eliminations (cards)
  leader: number;      // weight on hitting whoever leads
  offTarget: number;   // value multiplier for targets outside goal, campaign and forcing reasons
  garrison: number;    // how much it protects borders and chokepoints
  concentrate: number; // 0 = spread reinforcements, 1 = one big stack
  cardOnly: boolean;   // after the first conquest, keeps going only for goal or continent targets
  armies: number;      // value of keeping armies alive in the position evaluation
  lossAversion: number;// weight of expected losses when scoring an attack
};

// Style knobs (targets) can move a lot; competence knobs (gate, lossAversion, armies) stay close to the baseline.
export const profiles: Record<BotPersonality, Profile> = {
  equilibrato:   {gate: .65, objective: 1,   continent: 1,   breaker: 1,   picker: 1,   hunter: 1,   leader: 1,   offTarget: 1,   garrison: 1,    concentrate: .4,  cardOnly: false, armies: .8, lossAversion: 1},
  stratega:      {gate: .66, objective: 2.3, continent: .7,  breaker: .6,  picker: .6,  hunter: .9,  leader: .6,  offTarget: .5,  garrison: 1.25, concentrate: .5,  cardOnly: true,  armies: .9, lossAversion: 1.1},
  incursore:     {gate: .62, objective: 1,   continent: .8,  breaker: 4,   picker: 1.6, hunter: 2,   leader: 1.5, offTarget: 1,   garrison: .9,   concentrate: .45, cardOnly: false, armies: .8, lossAversion: .95},
  conquistatore: {gate: .64, objective: .9,  continent: 2.2, breaker: 1,   picker: .8,  hunter: 1,   leader: .8,  offTarget: .7,  garrison: 1,    concentrate: .6,  cardOnly: false, armies: .8, lossAversion: 1},
};

/** Recommended checkboxes per personality: the preset, not "everything on". */
export const defaultToggles: Record<BotPersonality, Partial<BotPolicy>> = {
  equilibrato:   {},
  stratega:      {weakBorders: false, breakBonus: false, disruptGrowth: false, containLeader: false},
  incursore:     {reserve: false},
  conquistatore: {weakBorders: false, disruptGrowth: false, containLeader: false},
};

/** Easy keeps the style recognisable but naive: weaker preferences and no extra garrisons. */
const intensity: Record<Difficulty, number> = {facile: .55, medio: 1, difficile: 1, survival: 1};
let level: Difficulty = 'medio';
export const setProfileLevel = (value: Difficulty) => { level = value; };
/** Easy players notice a runaway leader late and only half-heartedly. */
export const truceScale = () => level === 'facile' ? .5 : 1;
const cache = new Map<string, Profile>();
const toward = (value: number, base: number, k: number) => base + (value - base) * k;

export function profileOf(p: BotPolicy): Profile {
  const key = `${p.personality ?? 'equilibrato'}|${level}`;
  const hit = cache.get(key); if (hit) return hit;
  const b = profiles[p.personality ?? 'equilibrato'], e = profiles.equilibrato, k = intensity[level];
  const out: Profile = k === 1 ? b : {
    ...b,
    // Objective and continent focus are competence in Torneo, not just style: Easy gets only a hint of them.
    gate: toward(b.gate, e.gate, k), objective: toward(b.objective, 1, k * .4), continent: toward(b.continent, 1, k * .2),
    breaker: toward(b.breaker, 1, k), picker: toward(b.picker, 1, k), hunter: toward(b.hunter, 1, k), leader: toward(b.leader, 1, k),
    offTarget: toward(b.offTarget, 1, k), garrison: Math.min(1, toward(b.garrison, 1, k)), concentrate: toward(b.concentrate, e.concentrate, k),
    armies: toward(b.armies, e.armies, k), lossAversion: toward(b.lossAversion, 1, k),
  };
  cache.set(key, out); return out;
}

/** How hard this bot turns on a runaway leader: personality, the "Contieni il leader" box and level. */
export function leaderFocus(p: BotPolicy): number {
  return profileOf(p).leader * (p.containLeader ? 1 : .7) * truceScale();
}
