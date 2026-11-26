import {mapFor} from '../../data/mapGraph.ts';
import type {GameView} from '../../engine/types.ts';
import {escapeHtml as e} from '../art.ts';

/** Player colours as drawn on the navy results page: the dark grey player is lifted so it stays visible. */
export function displayColor(color: string): string {
  const n = parseInt(color.replace('#', ''), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const lum = (.2126 * r + .7152 * g + .0722 * b) / 255;
  return lum < .25 ? '#8f9ca2' : color;
}
export function inkOn(color: string): string {
  const n = parseInt(color.replace('#', ''), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  return (.2126 * r + .7152 * g + .0722 * b) / 255 > .55 ? '#0b1f2e' : '#ffffff';
}
const boxes = new WeakMap<object, string>();
/** Tight viewBox around the territories, with or without Antarctica. */
export function mapBox(s: Pick<GameView, 'antarctica'>): string {
  const map = mapFor(s);
  let box = boxes.get(map);
  if (!box) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const t of map.territories) {
      const n = t.path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      for (let i = 0; i + 1 < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]); }
    }
    box = `${Math.floor(x0 - 6)} ${Math.floor(y0 - 6)} ${Math.ceil(x1 - x0 + 12)} ${Math.ceil(y1 - y0 + 12)}`;
    boxes.set(map, box);
  }
  return box;
}

/** The part that changes while scrubbing: label, map and per-player points. The slider stays put. */
export function replayBody(s: GameView, index: number) {
  const rows = s.replay ?? [];
  const i = Math.max(0, Math.min(index, rows.length - 1)), row = rows[i], map = mapFor(s);
  const actor = s.players[row.actor];
  const paths = map.territories.map(t => {
    const [owner] = row.board[t.id];
    return `<path d="${t.path}" fill="${displayColor(s.players[owner].color)}"/>`;
  }).join('');
  const labels = map.territories.map(t => {
    const [owner, armies] = row.board[t.id], fill = displayColor(s.players[owner].color);
    return `<text x="${t.x}" y="${t.y + 5}" fill="${inkOn(fill)}">${armies}</text>`;
  }).join('');
  const chips = s.players.map((p, k) => `<span class="res-chip-player" style="--player:${displayColor(p.color)}"><i></i>${e(p.id === s.viewer ? 'Tu' : p.name)} <b>${Math.min(86, row.points[k] ?? 0)}</b></span>`).join('');
  return `<div class="replay-body"><div class="res-card-head"><h2>Replay</h2><label for="replay-turn">Giro ${row.round} · ${e(actor.name)}</label></div>
<svg class="replay-map" viewBox="${mapBox(s)}" role="img" aria-label="Mappa storica giro ${row.round}"><g class="replay-land">${paths}</g><g class="replay-armies">${labels}</g></svg>
<div class="res-chips">${chips}</div></div>`;
}

export function replayView(s: GameView, index: number) {
  const rows = s.replay ?? [];
  if (!rows.length) return '<section class="replay-panel res-card"><h2>Replay</h2><p class="res-note">Replay non disponibile per questa partita precedente.</p></section>';
  const i = Math.max(0, Math.min(index, rows.length - 1));
  return `<section class="replay-panel res-card">${replayBody(s, i)}
<div class="res-replay-controls"><button class="res-step" data-replay-step="-1" aria-label="Turno precedente">‹</button><input id="replay-turn" type="range" min="0" max="${rows.length - 1}" value="${i}" aria-label="Turno del replay"/><button class="res-step" data-replay-step="1" aria-label="Turno successivo">›</button></div></section>`;
}
