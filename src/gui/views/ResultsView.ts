import {mapFor, objectives} from '../../data/mapGraph.ts';
import {analyzeGame} from '../../engine/Replay.ts';
import type {GameView, PublicPlayer} from '../../engine/types.ts';
import {escapeHtml as e} from '../art.ts';
import {icon} from '../Icons.ts';
import {replayView, displayColor, mapBox} from './ReplayView.ts';

type Deps = {levelNames: Record<string, string>; duration: (ms: number) => string};

/** Objective map: owned objective territories in the player's colour, missing ones outlined, the rest dim. */
function objectiveBoard(s: GameView, p: PublicPlayer, cls: string, label: string) {
  const goal = objectives[(p.objective ?? 1) - 1].territories, color = displayColor(p.color);
  const paths = mapFor(s).territories.map(t => {
    const mine = s.board[t.id].owner === p.id, wanted = goal.includes(t.id);
    const kind = wanted ? (mine ? 'in' : 'missing') : (mine ? 'out' : 'none');
    return `<path class="obj-${kind}" d="${t.path}"/>`;
  }).join('');
  return `<svg class="${cls}" viewBox="${mapBox(s)}" role="img" aria-label="${e(label)}" style="--player:${color}">${paths}</svg>`;
}

function chart(s: GameView) {
  // One point per round (the last record of the round): the raw history has a row per action.
  const byRound = new Map<number, {round: number; points: (number | null)[]}>();
  for (const row of s.scoreHistory ?? []) byRound.set(row.round, row);
  const history = [...byRound.values()];
  if (history.length < 2) return '<p class="res-note">Andamento disponibile dalle nuove partite.</p>';
  const W = 340, H = 150, L = 24, R = 30, T = 14, B = 20, iw = W - L - R, ih = H - T - B;
  const x = (j: number) => L + j * iw / (history.length - 1), y = (v: number) => T + ih - Math.min(86, v) * ih / 86;
  const rounds = history.map(r => r.round), last = history.length - 1;
  const ticks = [0, Math.round(last / 2), last].filter((v, i, a) => a.indexOf(v) === i)
    .map(j => `<text class="res-axis" x="${x(j).toFixed(1)}" y="${H - 4}" text-anchor="middle">G${rounds[j]}</text>`).join('');
  const ends: {x: number; y: number; value: number; color: string}[] = [];
  const lines = s.players.map((p, i) => {
    const pts = history.flatMap((row, j) => row.points[i] === null ? [] : [[x(j), y(row.points[i]!)]]);
    if (!pts.length) return '';
    const end = pts[pts.length - 1], value = Math.min(86, [...history].reverse().find(r => r.points[i] !== null)?.points[i] ?? 0), c = displayColor(p.color);
    ends.push({x: end[0], y: end[1], value, color: c});
    return `<polyline points="${pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ')}" stroke="${c}" stroke-width="${p.id === s.viewer ? 3 : 2}"/><circle cx="${end[0].toFixed(1)}" cy="${end[1].toFixed(1)}" r="3.5" fill="${c}"/>`;
  }).join('');
  // Final values never overlap: close labels are pushed apart vertically.
  ends.sort((a, b) => a.y - b.y);
  ends.forEach((e, k) => { e.y = Math.max(e.y + 4, k ? ends[k - 1].y + 12 : -Infinity); });
  const labels = ends.map(e => `<text class="res-end" x="${(e.x + 7).toFixed(1)}" y="${e.y.toFixed(1)}" fill="${e.color}">${e.value}</text>`).join('');
  const legend = s.players.map(p => `<span class="res-chip-player" style="--player:${displayColor(p.color)}"><i></i>${e(p.id === s.viewer ? 'Tu' : p.name)}</span>`).join('');
  return `<figure class="res-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Andamento punti obiettivo da 0 a 86"><line class="res-grid" x1="${L}" x2="${W - R}" y1="${y(86)}" y2="${y(86)}"/><line class="res-base" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/><text class="res-axis" x="${L - 5}" y="${y(86) + 4}" text-anchor="end">86</text><text class="res-axis" x="${L - 5}" y="${y(0) + 4}" text-anchor="end">0</text>${ticks}<g fill="none" stroke-linejoin="round" stroke-linecap="round">${lines}</g>${labels}</svg><figcaption class="res-chips">${legend}</figcaption></figure>`;
}

function role(p: PublicPlayer, levelNames: Record<string, string>) {
  return p.human ? 'Comandante' : `Bot ${levelNames[p.difficulty] ?? p.difficulty}${p.blind ? ' · livello svelato' : ''}`;
}

export function resultsView(s: GameView, replayIndex: number, {levelNames, duration}: Deps) {
  const ranking = [...s.players].sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.outside ?? 0) - (a.outside ?? 0) || s.order.indexOf(b.id) - s.order.indexOf(a.id));
  const me = s.players[s.viewer], mine = objectives[(me.objective ?? 1) - 1], risiko = s.reason === 'risiko';
  const eyebrow = risiko ? 'RisiKo! · Obiettivo completato' : s.reason === 'countdown' ? 'Countdown terminato' : 'La sdadata ha deciso';
  const title = s.winner === s.viewer ? 'La vittoria è tua.' : `${e(s.players[s.winner!].name)} conquista la vittoria.`;
  const myPoints = Math.min(86, me.points ?? 0), done = risiko && s.winner === s.viewer;
  const stat = (value: string | number, label: string) => `<div><strong>${value}</strong><small>${label}</small></div>`;
  const hero = `<section class="res-card res-hero" style="--player:${displayColor(me.color)}">
<div class="res-card-head"><span class="res-label">Il tuo obiettivo · n. ${me.objective}</span><span class="res-status">${done ? 'Completato' : `${myPoints}/86`}</span></div>
<h2 class="res-goal">${e(mine.name)}</h2>
${objectiveBoard(s, me, 'res-objective-map', `Obiettivo ${mine.name}: territori tuoi e mancanti`)}
<div class="res-legend"><span><i class="in"></i>In obiettivo</span><span><i class="out"></i>Fuori obiettivo</span><span><i class="missing"></i>Mancanti</span></div>
<div class="res-bar" role="img" aria-label="${myPoints} punti obiettivo su 86"><span style="width:${(myPoints / 86 * 100).toFixed(1)}%"></span></div>
<div class="res-stats">${stat(me.points === 100 ? 100 : myPoints, me.points === 100 ? 'Pt tavolo · RisiKo!' : 'In obiettivo')}${stat(me.outside ?? 0, 'Fuori obiettivo')}${stat(me.territoryCount, 'Territori')}${stat(me.cardCount, 'Carte')}</div></section>`;
  const rows = ranking.map((p, i) => {
    const goal = objectives[(p.objective ?? 1) - 1], pts = Math.min(86, p.points ?? 0), out = p.territoryCount === 0;
    const badges = `${p.points === 100 ? '<span class="res-badge gold">RisiKo!</span>' : ''}${out ? '<span class="res-badge">Eliminato</span>' : ''}`;
    return `<li class="res-row${p.id === s.viewer ? ' is-you' : ''}${out ? ' is-out' : ''}" style="--player:${displayColor(p.color)}">
<span class="res-rank">${String(i + 1).padStart(2, '0')}</span>
${objectiveBoard(s, p, 'res-thumb', `Obiettivo di ${p.name}: ${goal.name}`)}
<div class="res-who"><strong><i></i>${e(p.name)}${p.id === s.viewer ? ' · TU' : p.human ? ' · UMANO' : ''}${badges}</strong><small>${role(p, levelNames)}</small><small>${e(goal.name)} · ${p.outside ?? 0} fuori · ${p.territoryCount} terr. · ${p.cardCount} carte</small><div class="res-bar thin"><span style="width:${(pts / 86 * 100).toFixed(1)}%"></span></div></div>
<div class="res-pts"><strong>${pts}</strong><small>/86</small></div></li>`;
  }).join('');
  const analysis = analyzeGame(s), swinger = s.players[analysis.swing.actor];
  const notes = s.analysis ?? [];
  const tiles = `<div class="res-tiles"><div><strong class="accent">+${analysis.swing.delta}</strong><small>Svolta · giro ${analysis.swing.round}${swinger ? ' · ' + e(swinger.id === s.viewer ? 'tu' : swinger.name) : ''}</small></div><div><strong>${analysis.conquests}</strong><small>Conquiste</small></div><div><strong>${analysis.exposed.length}</strong><small>Confini esposti</small></div><div><strong>${notes.length}</strong><small>Occasioni</small></div></div>`;
  const exposed = analysis.exposed.slice(-20).map(x => `<p>Giro ${x.round}: ${e(s.players[x.owner].name)}, ${e(x.continent)} — ${x.territories.map(e).join(', ')} con un solo carro.</p>`).join('') || '<p>Nessun caso nei checkpoint disponibili.</p>';
  const report = `<section class="res-card res-report"><div class="res-card-head"><h2>Resoconto strategico</h2></div>
<p class="res-note">Maggiore progresso tra due checkpoint: ${e(swinger?.name ?? '—')} +${analysis.swing.delta} punti al giro ${analysis.swing.round}. ${analysis.conquests} conquiste registrate.</p>${tiles}
<details><summary>Confini continentali esposti</summary>${exposed}</details>${notes.length ? `<details><summary>Attacchi e opportunità</summary>${notes.slice(-60).map(x => `<p>Giro ${x.round}: ${e(x.message)}</p>`).join('')}</details>` : ''}</section>`;
  return `<main class="atlas-home results-atlas"><section class="portal-column res-column">
<header class="res-top"><button class="res-brand" data-action="home" aria-label="Menu principale">RISIKO</button><span class="res-tag">Torneo · Offline</span><button class="atlas-settings" data-action="audio" aria-label="Impostazioni audio">${icon('sound')}</button></header>
<section class="res-verdict"><span class="res-eyebrow">${eyebrow}</span><h1>${title}</h1><p>${s.round} giri · ${duration(s.elapsedMs)} di gioco · Tutti gli obiettivi sono ora rivelati</p></section>
${hero}
<section class="res-card res-ranking"><div class="res-card-head"><h2>Classifica</h2><span class="res-label">Obiettivi svelati</span></div><ol>${rows}</ol></section>
<section class="res-card"><div class="res-card-head"><h2>Andamento</h2><span class="res-label">Punti obiettivo</span></div>${chart(s)}</section>
${replayView(s, replayIndex)}
${report}
<div class="res-actions"><button class="primary" data-action="configure">${icon('play')}Nuova partita</button><div><button data-action="profile">${icon('chart')}Statistiche</button><button data-action="home">${icon('home')}Home</button></div></div>
</section></main>`;
}
