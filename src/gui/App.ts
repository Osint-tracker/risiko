import { territories, continents, objectives, seaLinks, cards, colors } from '../data/mapGraph.ts';
import { canAttack, moveBounds, validTris, exchangeValue } from '../engine/RisikoRulesEngine.ts';
import type { GameView, Command, GameConfig } from '../engine/types.ts';
import {armyToken, tankShape, territoryColors, cardFace, objectiveMap, dieMarkup} from './art.ts';
import {playTransition, positionPanel, bindPanelDrag} from './effects.ts';
import type {Transition} from '../engine/presentation.ts';
import type { Profile } from '../services/StorageService.ts';
const escape = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
} as Record<string, string>)[c]);
const phases = ['Rinforzi', 'Attacco', 'Spostamento', 'Fine turno'];
const phaseNames: Record<string, string> = {
  SETUP_PLACEMENT: 'Piazzamento iniziale',
  TRIS_EXCHANGE: 'Cambio tris',
  REINFORCEMENT: 'Rinforzi',
  ATTACK: 'Attacco',
  POST_CONQUEST_MOVE: 'Territorio conquistato',
  FORTIFY: 'Spostamento strategico',
  CARD_DRAW: 'Pesca carta',
  SDADATA_CHECK: 'Sdadata',
  GAME_OVER: 'Partita conclusa'
};
const levelNames: Record<string, string> = {
  facile: 'Facile',
  medio: 'Medio',
  difficile: 'Difficile',
  casuale: 'Casuale · Blind',
  '?': '?'
};
const tank = '<path d="M2 10h26l-3-5h-7V2h-7v3H7zM4 12h22a4 4 0 010 8H4a4 4 0 010-8zm1 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm7 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm7 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM16 3h17v3H16z"/>';
const tankIcon = `<svg viewBox="0 0 34 22" class="tank-icon" aria-hidden="true">${tank}</svg>`;
const duration = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
let audio: AudioContext | null = null;
function sound(kind = 'tap') {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.connect(g);
    g.connect(audio.destination);
    o.type = kind === 'battle' ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(kind === 'battle' ? 130 : 480, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(70, audio.currentTime + .12);
    g.gain.setValueAtTime(.035, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .15);
    o.start();
    o.stop(audio.currentTime + .16);
  } catch {}
}
export function mountGame(root: HTMLElement): () => void {
  const worker = new Worker(new URL('../engine/server.worker.ts', import.meta.url), {
    type: 'module'
  });
  let state: GameView | null = null,
    profile: Profile = {
      name: 'Comandante',
      results: []
    },
    screen = 'home',
    ready = false,
    hasGame = false;
  let showNames = true;
  let placementCount = 1;
  let lastPresentedId = '';
  let panelKey = '';
  let panelPosition: {x:number;y:number} | null = null;
  let presenting: Transition | null = null;
  let cancelEffects: (() => void) | null = null;
  let restoreViewport: typeof viewport | null = null;
  let blitzTimer: ReturnType<typeof setTimeout> | null = null;
  function cancelPresentation() {
    cancelEffects?.(); cancelEffects=null; presenting=null;
    if(restoreViewport){viewport=restoreViewport;restoreViewport=null;}
    if(blitzTimer){clearTimeout(blitzTimer);blitzTimer=null;}
  }
  let selected: number | null = null,
    target: number | null = null,
    modal: string | null = null,
    objectiveView = false,
    showLog = false,
    speed = 1,
    muted = false,
    pendingCommand = false,
    blitz = false;
  let config: GameConfig = {
    players: 4,
    name: 'Comandante',
    difficulties: ['medio', 'medio', 'medio'],
    turnSeconds: 180
  };
  let viewport = {
      x: 0,
      y: 0,
      w: 1240,
      h: 690
    },
    moveCount = 1,
    cardSelection: number[] = [],
    lastBattleMessage = '',
    toastTimer: ReturnType<typeof setTimeout> | null = null;
  const send = (data: unknown) => worker.postMessage(data);
  const humanTurn = () => !!state && state.active === 0 && !state.paused && state.phase !== 'GAME_OVER';
  function command(c: Command) {
    if (!state || presenting || pendingCommand || !humanTurn()) return;
    pendingCommand = true;
    send({
      type: 'COMMAND',
      command: c,
      id: crypto.randomUUID(),
      revision: state.revision
    });
    if (!muted && c.type !== 'ATTACK') sound('tap');
  }
  function toast(message: string) {
    const el = root.querySelector<HTMLElement>('#toast');
    if (el) {
      el.textContent = message;
      el.classList.add('visible');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.classList.remove('visible'), 5000);
    }
  }
  function points() {
    return state?.players[0].points ?? 0;
  }
  function mapMarkup(preview = false) {
    const labels: string[] = [];
    const s = state,
      goal = s?.players[0].objective ? objectives[s.players[0].objective! - 1].territories : [];
    return `<svg id="world-map" class="world-map ${preview ? 'preview' : ''}" viewBox="${preview ? '0 0 1240 690' : `${viewport.x} ${viewport.y} ${viewport.w} ${viewport.h}`}" role="img" aria-label="Plancia interattiva: 42 territori"><defs><pattern id="ocean-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#9addcc" stroke-width=".5" opacity=".25"/></pattern><linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#064452"/><stop offset=".43" stop-color="#20ac9e"/><stop offset=".55" stop-color="#29b7a7"/><stop offset="1" stop-color="#054250"/></linearGradient><pattern id="triangles" width="18" height="16" patternUnits="userSpaceOnUse"><path d="M0 0L9 16L18 0ZM0 16L9 0L18 16Z" fill="none" stroke="#011f2d" stroke-width="2" opacity=".32"/></pattern><linearGradient id="pattern-fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="white"/><stop offset=".35" stop-color="black"/><stop offset=".65" stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient><mask id="ocean-pattern"><rect width="1240" height="690" fill="url(#pattern-fade)"/></mask><pattern id="land-grain" width="17" height="19" patternUnits="userSpaceOnUse"><path d="M1 3L4 2M7 8L11 7M3 15L5 17M14 1L16 5M12 16L16 14" stroke="#ffe9ad" stroke-width=".7" opacity=".14"/><path d="M2 7L5 10M9 1L11 2M9 13L8 17" stroke="#173d25" stroke-width="1" opacity=".2"/></pattern><filter id="terrain"><feTurbulence type="fractalNoise" baseFrequency=".4" numOctaves="3" seed="8" result="noise"/><feColorMatrix in="noise" type="matrix" values=".33 .33 .33 0 0 .33 .33 .33 0 0 .33 .33 .33 0 0 0 0 0 .28 0"/><feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="soft-light"/></filter><filter id="land-shadow"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-opacity=".35"/></filter><symbol id="tank" viewBox="0 0 34 22">${tank}</symbol></defs><rect x="-4000" y="-4000" width="9200" height="9200" fill="#07535e"/><rect width="1240" height="690" fill="url(#ocean)"/><rect width="1240" height="690" fill="url(#triangles)" mask="url(#ocean-pattern)"/><rect x="0" y="0" width="1240" height="690" fill="url(#ocean-grid)"/><g class="map-decoration"><circle cx="620" cy="345" r="290"/><circle cx="620" cy="345" r="190"/><path d="M0 345H1240M620 0V690"/><text x="80" y="450">OCEANO PACIFICO</text><text x="410" y="290">ATLANTICO</text><text x="809" y="580">OCEANO INDIANO</text></g><g class="sea-links">${seaLinks.map(([a, b]) => {
      const A = territories[a],
        B = territories[b];
      return a === 0 && b === 29 ? `<path d="M${A.x} ${A.y}L0 ${A.y}M1240 ${B.y}L${B.x} ${B.y}"/>` : `<path d="M${A.x} ${A.y}L${B.x} ${B.y}"/>`;
    }).join('')}</g><g filter="url(#land-shadow)"><g>${territories.map(t => {
      const cell = s?.board[t.id],
        p = cell ? s!.players[cell.owner] : null,
        c = continents.find(c => c.id === t.continent)!,
        dim = !preview && objectiveView && !goal.includes(t.id),
        legal = !preview && selected !== null && s?.phase === 'ATTACK' && canAttack(s!, selected, t.id);
      const placeable = !preview && humanTurn() && !presenting && cell?.owner === 0 && ['SETUP_PLACEMENT','REINFORCEMENT'].includes(s!.phase);
      if (!preview) labels.push(`<g class="territory-label ${dim ? 'dim' : ''}" pointer-events="none"><text class="territory-name" x="${t.x}" y="${t.y - 16}">${escape(t.short)}</text><g transform="translate(${t.x-19} ${t.y-10}) scale(.9)"><path class="tank-token" d="${tankShape}" fill="${p?.color??'#899'}"/><text class="tank-number" x="21" y="20">${cell?.armies??0}</text></g></g>`);
      return `<g data-territory="${t.id}" class="territory ${placeable ? 'placeable' : ''} ${dim ? 'dim' : ''} ${selected === t.id && !preview ? 'selected' : ''} ${target === t.id && !preview ? 'target' : ''} ${legal ? 'attackable' : ''} ${objectiveView && goal.includes(t.id) && !preview ? 'goal' : ''}" tabindex="${preview ? -1 : 0}" role="button" aria-label="${escape(t.name)}: ${t.points} punti${p ? `, ${escape(p.name)}, ${cell!.armies} armate` : ''}"><title>${escape(t.name)} · ${t.points} punti${p ? ` · ${escape(p.name)} · ${cell!.armies} carri` : ''}</title><path class="land" d="${t.path}" fill="${territoryColors[t.id]??c.color}"/><path d="${t.path}" fill="url(#land-grain)" pointer-events="none"/><circle class="territory-hit" cx="${t.x}" cy="${t.y}" r="17" fill="transparent"/>${placeable?`<g class="placement-plus" transform="translate(${t.x+23} ${t.y-5})"><circle r="9"/><path d="M-5 0H5M0-5V5"/></g>`:''}</g>`;
    }).join('')}</g></g>${labels.join('')}<g class="compass" transform="translate(537 526)"><circle r="37" fill="none" stroke="#4bbed0" stroke-width="2"/><circle r="31" fill="none" stroke="#4bbed0" stroke-width=".7"/><path d="M-25-25L0-10L25-25L10 0L25 25L0 10L-25 25L-10 0Z"/><path d="M0-43L9-9L43 0L9 9L0 43L-9 9L-43 0L-9-9Z"/><path d="M0-43L0 0L9-9ZM43 0L0 0L9 9ZM0 43L0 0L-9 9ZM-43 0L0 0L-9-9Z" style="fill:#6ad8df;stroke:none"/><text x="0" y="-49">N</text><text x="49" y="4">E</text><text x="0" y="59">S</text><text x="-49" y="4">W</text></g></svg>`;
  }
  const header = () => `<header class="app-header"><button class="brand" data-action="home" aria-label="Pagina iniziale">RisiKo<span>!</span><small>OFFLINE / REGULAR</small></button><nav><span class="offline-indicator"><i></i> 100% OFFLINE</span><button class="profile-button" data-action="profile"><span class="avatar">${escape(profile.name[0].toUpperCase())}</span><span>${escape(profile.name)}<small>Profilo locale</small></span></button></nav></header>`;
  function home() {
    const wins = profile.results.filter(r => r.rank === 1).length;
    return `${header()}<main class="dashboard"><section class="intro"><div class="eyebrow"><span class="gold-line"></span> IL TUO TAVOLO. LA TUA STRATEGIA.</div><h1>Il mondo aspetta<br>la tua <em>prossima mossa.</em></h1><p>Una plancia, un obiettivo segreto.<br>Sfida l’intelligenza artificiale, ovunque ti trovi.</p><div class="home-map">${mapMarkup(true)}<span class="map-stamp">42 TERRITORI · 6 CONTINENTI</span></div><div class="home-stats"><div><strong>${profile.results.length}</strong><span>PARTITE GIOCATE</span></div><div><strong>${wins}</strong><span>VITTORIE</span></div><div><strong>${profile.results.length ? Math.round(profile.results.reduce((n, r) => n + r.points, 0) / profile.results.length) : '—'}</strong><span>MEDIA PUNTI</span></div></div></section><section class="lobby-panel"><div class="panel-heading"><span class="mode-icon">${tankIcon}</span><div><span class="eyebrow">TORNEO STANDARD</span><h2>Regular <span>20</span></h2></div><span class="pill">SINGLE PLAYER</span></div><p class="muted">20 giri + sdadata · Obiettivi segreti da 86 punti</p><label class="field-label" for="player-name">IL TUO NOME</label><input id="player-name" maxlength="24" value="${escape(config.name)}" autocomplete="off"/><div class="lobby-row"><div><label class="field-label" for="player-count">GIOCATORI AL TAVOLO</label><div class="segmented">${[3, 4, 5].map(n => `<button data-count="${n}" class="${config.players === n ? 'active' : ''}">${n}</button>`).join('')}</div></div><div><label class="field-label" for="turn-time">TEMPO PER TURNO</label><select id="turn-time">${[60, 120, 180, 240, 300, 600].map(n => `<option value="${n}" ${config.turnSeconds === n ? 'selected' : ''}>${n / 60} minuti</option>`).join('')}</select></div></div><div class="opponents-heading"><span class="field-label">I TUOI AVVERSARI</span><button class="text-button" data-action="blind-all">Tutti casuali ↻</button></div><div class="bot-slots">${config.difficulties.map((d, i) => `<div class="bot-slot"><span class="bot-avatar" style="--player:${colors[i + 1]}">${tankIcon}</span><div class="bot-info"><strong>${['Falco', 'Vega', 'Atlas', 'Ombra'][i]}</strong><small>${d === 'casuale' ? 'Bot ? · livello segreto' : 'BOT IA'}</small></div><select data-bot="${i}" aria-label="Difficoltà ${['Falco', 'Vega', 'Atlas', 'Ombra'][i]}">${['facile', 'medio', 'difficile', 'casuale'].map(l => `<option value="${l}" ${l === d ? 'selected' : ''}>${levelNames[l]}</option>`).join('')}</select></div>`).join('')}</div><button class="primary start-button" data-action="new" ${!ready ? 'disabled' : ''}>${ready ? 'Crea il tuo tavolo' : 'Caricamento…'} <span>→</span></button>${hasGame ? '<button class="secondary full" data-action="resume">Riprendi la partita salvata ↗</button>' : ''}<p class="privacy-note">Salvataggio automatico sul dispositivo.<br>Nessun account. Nessuna connessione necessaria.</p></section></main><footer class="home-footer"><span>REGOLAMENTO ITALIANO · FINO A 3 DADI IN DIFESA</span><button data-action="rules" class="text-button">Regole e informazioni ↗</button></footer>`;
  }
  function playerCards() {
    return `<aside class="players-row" aria-label="Giocatori">${state!.order.map(id => {
      const p=state!.players[id];
      return `<article class="player-card ${id===state!.active?'turn-active':''} ${p.eliminated?'eliminated':''}" style="--player:${p.color}"><div class="player-heading"><span class="player-orb"><span></span></span><div class="player-identity"><strong>${escape(p.name)}</strong><small>${p.eliminated?'ELIMINATO':p.human?'TU':`Bot ${levelNames[p.difficulty]}`}</small></div>${id===state!.active?'<span class="turn-arrow">▶</span>':''}</div><div class="player-numbers"><span title="Carri">${tankIcon}<b>${p.totalArmies}</b></span><span title="Territori">◇ ${p.territoryCount}</span><span title="Carte">▣ ${p.cardCount}</span><span title="Rinforzi">↑${p.nextReinforcements}</span></div></article>`;
    }).join('')}</aside>`;
  }
  function instructions() {
    if (!state) return '';
    if (state.paused) return 'Partita in pausa';
    if (!humanTurn()) return `${escape(state.players[state.active].name)} sta pianificando la prossima mossa…`;
    switch (state.phase) {
      case 'SETUP_PLACEMENT':
        return `Tocca un tuo territorio per piazzare un carro. Restano ${state.setupBatch} in questa mano.`;
      case 'TRIS_EXCHANGE':
        return 'Puoi cambiare le carte prima di piazzare i rinforzi.';
      case 'REINFORCEMENT':
        return `Tocca i tuoi territori: hai ${state.reinforcements} rinforzi da piazzare.`;
      case 'ATTACK':
        return selected === null ? 'Scegli un tuo territorio per attaccare.' : 'Tocca un territorio nemico confinante per iniziare la battaglia.';
      case 'FORTIFY':
        return 'Scegli origine e destinazione adiacenti, oppure termina il turno.';
      default:
        return 'Completa lo spostamento obbligatorio.';
    }
  }
  function table() {
    const s=state!,me=s.players[0],active=s.players[s.active];
    const setup=s.phase==='SETUP_PLACEMENT',reinforcing=['TRIS_EXCHANGE','REINFORCEMENT'].includes(s.phase);
    const initial=({3:35,4:30,5:25} as Record<number,number>)[s.players.length];
    const reserve=setup?active.totalArmies:reinforcing?s.reinforcements:active.totalArmies;
    const denominator=setup?initial:reinforcing?Math.max(s.reinforcements,active.nextReinforcements):130;
    const step=setup||reinforcing?0:['ATTACK','POST_CONQUEST_MOVE'].includes(s.phase)?1:s.phase==='FORTIFY'?2:3;
    return `<main data-phase="${s.phase}" data-active="${s.active}" data-revision="${s.revision}" class="game-table reference-table ${showNames?'':'names-hidden'}">${playerCards()}
      <section class="map-stage">
        <div class="map-container">${mapMarkup()}</div>
        <div class="reference-topbar">
          <div class="reserve-counter" style="--player:${active.color}" title="${setup?'Armate schierate':'Carri disponibili'}">${armyToken(reserve,active.color)}<div><small>${setup?'SCHIERATI':'DISPONIBILI'}</small><strong>${reserve}<small>/${denominator}</small></strong></div></div>
          <div class="reference-turn"><span>${active.human?'Il tuo turno':`Il turno di <b style="color:${active.color}">${escape(active.name)}</b>`}</span><strong>${phaseNames[s.phase]}</strong></div>
          <div class="reference-timer"><span>⌛</span><strong id="timer">${setup?'—':duration(s.remainingMs)}</strong></div>
        </div>
        <div class="reference-tools"><button data-action="names">NOMI ${showNames?'⌄':'−'}</button><button data-action="rules" aria-label="Regole">?</button><button data-action="home" aria-label="Menu principale">☰</button></div>
        <div class="reference-round">${s.round?`GIRO <b>${s.round}</b> / 20`:`PREPARAZIONE · ${escape(active.name)} · Da piazzare <b>${active.setupRemaining}</b> · Questa mano: <b>${s.setupBatch}</b>`}${s.sdadata?`<span class="sdadata-badge">SDADATA ≤ ${s.sdadata.threshold}</span>`:''}</div>
        <aside class="reference-sidebar"><button class="reference-eye ${objectiveView?'active':''}" data-action="objective-view" aria-label="Vista obiettivo"><span>◉</span><small>${points()} / 86</small></button><button data-action="cards" aria-label="Carte territorio"><span>▰</span><small>CARTE ${me.cardCount}</small></button><button data-action="objective" aria-label="Carta obiettivo"><span>◎</span><small>OBIETTIVO</small></button><div class="reference-info"><span>ⓘ</span>${selected===null?'<p>Seleziona<br>un territorio</p>':`<strong>${escape(territories[selected].name)}</strong><p>${territories[selected].points} punti<br>${s.board[selected].armies} carri</p>`}</div><button class="reference-log" data-action="log">▤ DIARIO</button></aside>
        <div class="reference-zoom"><button data-action="zoom-out" aria-label="Riduci">−</button><button data-action="reset-map" aria-label="Centra mappa">⌖</button><button data-action="zoom-in" aria-label="Ingrandisci">+</button></div>
        ${s.lastBattle&&!modal&&!presenting?`<div class="battle-toast"><small>${s.lastBattle.from!==undefined?escape(territories[s.lastBattle.from].short)+' → ':''}${escape(territories[s.lastBattle.territory!].short)}</small><div class="last-dice">${s.lastBattle.attack!.map((n,i)=>dieMarkup(n,s.players[s.lastBattle!.player].color,i)).join('')}<span>vs</span>${s.lastBattle.defense!.map((n,i)=>dieMarkup(n,s.players[s.lastBattle!.defender??s.board[s.lastBattle!.territory!].owner].color,i)).join('')}</div></div>`:''}
        ${s.paused?'<div class="pause-shade"><div class="pause-card"><span class="eyebrow">POSIZIONE SALVATA</span><h2>Partita in pausa</h2><button class="primary" data-action="resume">Riprendi la partita →</button><button class="text-button" data-action="home">Torna al menu</button></div></div>':''}
      </section>
      <section class="command-deck"><div class="phase-section"><div class="phase-steps">${phases.map((p,i)=>`<span class="${i===step?'current':''}"><b>${i+1}</b> ${p}</span>`).join('<i>›</i>')}</div><p id="instruction">${instructions()}</p>${humanTurn()&&s.phase==='REINFORCEMENT'?`<div class="placement-amounts" aria-label="Quantità da piazzare">${[1,3,5,10,130].map(n=>`<button data-place-count="${n}" class="${placementCount===n?'active':''}">${n===130?'Tutti':'+'+n}</button>`).join('')}</div>`:''}</div><div class="command-buttons"><button class="primary" data-action="next" ${!humanTurn()||!['TRIS_EXCHANGE','ATTACK','FORTIFY'].includes(s.phase)||pendingCommand?'disabled':''}>${s.phase==='TRIS_EXCHANGE'?'Piazza rinforzi':s.phase==='ATTACK'?'Spostamento →':'Fine turno →'}</button></div></section>
      <div class="table-footer"><span>REGULAR · OFFLINE</span><div><span class="muted">BOT</span>${[1,2,4,0].map(n=>`<button class="speed-button ${speed===n?'active':''}" data-speed="${n}">${n?n+'×':'⚡'}</button>`).join('')}<button class="text-button" data-action="sound">${muted?'Audio off':'Audio on'}</button><button class="text-button" data-action="pause">Ⅱ Pausa</button></div></div>
      ${showLog?`<aside class="game-log"><button data-action="log" class="close-button">×</button><h3>Diario della partita</h3>${s.log.slice(-250).reverse().map(e=>`<p><i style="background:${s.players[e.player].color}"></i>${escape(e.message)}</p>`).join('')}</aside>`:''}
    </main>`;
  }
  function miniObjective(id: number) { return objectiveMap(id); }
  function results() {
    const s = state!,
      ranking = [...s.players].sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.outside ?? 0) - (a.outside ?? 0) || s.order.indexOf(b.id) - s.order.indexOf(a.id));
    return `${header()}<main class="results-page"><span class="eyebrow">${s.reason === 'risiko' ? 'OBIETTIVO COMPLETATO' : 'LA SDADATA HA DECISO'}</span><h1>${s.winner === 0 ? 'La vittoria è tua.' : `${escape(s.players[s.winner!].name)} conquista la vittoria.`}</h1><p class="muted">${s.round} giri · ${duration(s.elapsedMs)} di gioco · Tutti gli obiettivi sono ora rivelati</p><div class="results-list">${ranking.map((p, i) => `<article class="result-row" style="--player:${p.color}"><strong class="rank">${String(i + 1).padStart(2, '0')}</strong><div class="result-player"><strong>${escape(p.name)} ${p.human ? '· TU' : ''}</strong><small>${p.human ? 'Comandante' : `Bot ${levelNames[p.difficulty]}${p.blind ? ' · livello svelato' : ''}`}</small></div><div class="result-objective">${miniObjective(p.objective!)}<span>${escape(objectives[p.objective! - 1].name)}</span></div><div><strong>${p.points === 100 ? '100' : p.points}</strong><small>${p.points === 100 ? 'RISIKO!' : 'IN OBIETTIVO'}</small></div><div><strong>${p.outside}</strong><small>FUORI OBIETTIVO</small></div><div><strong>${p.territoryCount}</strong><small>TERRITORI</small></div><div><strong>${p.cardCount}</strong><small>CARTE</small></div></article>`).join('')}</div><div class="results-actions"><button class="primary" data-action="home">Un’altra strategia. Un nuovo tavolo. →</button><button class="secondary" data-action="profile">Le tue statistiche</button></div></main>`;
  }
  function profilePage() {
    const rows = profile.results,
      n = rows.length,
      wins = rows.filter(r => r.rank === 1).length,
      mean = n ? Math.round(rows.reduce((sum, r) => sum + r.points, 0) / n) : 0,
      xp = rows.reduce((sum, r) => sum + ({
        3: [50, 25, 10],
        4: [70, 50, 25, 10],
        5: [90, 70, 50, 25, 10]
      } as Record<number, number[]>)[r.players][r.rank - 1], 0);
    return `${header()}<main class="profile-page"><button class="text-button" data-action="home">← Torna al tavolo</button><span class="eyebrow">IL TUO PERCORSO / REGULAR</span><h1>${escape(profile.name)}</h1><p class="muted">Livello locale ${1 + Math.floor(xp / 100)} · ${xp} XP · Statistiche conservate su questo dispositivo</p><div class="stat-grid">${[[n, 'Partite giocate'], [wins, 'Vittorie'], [mean, 'Media punti'], [n ? Math.round(100 * rows.filter(r => r.reason === 'risiko').length / n) + '%' : '—', 'Fine per RisiKo!'], [n ? Math.round(100 * rows.filter(r => r.reason === 'sdadata').length / n) + '%' : '—', 'Fine per sdadata'], [n ? duration(rows.reduce((sum, r) => sum + r.duration, 0) / n) : '—', 'Durata media']].map(([v, l]) => `<div><strong>${v}</strong><span>${l}</span></div>`).join('')}</div><h2>Le tue partite</h2>${!n ? '<div class="empty-state">La tua storia comincia dalla prossima mossa.<br>Completa una partita per registrare il primo risultato.</div>' : `<table class="history"><thead><tr><th>Data</th><th>Tavolo</th><th>Posizione</th><th>Punti</th><th>Conclusione</th><th>Durata</th></tr></thead><tbody>${rows.map(r => `<tr><td>${new Date(r.date).toLocaleDateString('it-IT')}</td><td>${r.players} giocatori</td><td>${r.rank}°</td><td>${r.points}</td><td>${r.reason === 'risiko' ? 'RisiKo!' : 'Sdadata'}</td><td>${duration(r.duration)}</td></tr>`).join('')}</tbody></table>`}<h2>Classifica personale</h2><div class="local-ranking">${[...rows].sort((a, b) => b.points - a.points || a.rank - b.rank).slice(0, 10).map((r, i) => `<div><span>${i + 1}.</span><b>${escape(r.name)}</b><span>${new Date(r.date).toLocaleDateString('it-IT')}</span><strong>${r.points} pt</strong></div>`).join('') || '<p class="muted">Le dieci migliori prestazioni appariranno qui.</p>'}</div></main>`;
  }
  function modalMarkup() {
    if (!modal || !state && modal !== 'rules' && modal !== 'replace') return '';
    let content = '',
      cls = '';
    const s = state;
    if (modal === 'replace') {
      content = '<span class="eyebrow">NUOVA PARTITA</span><h2>Aprire un nuovo tavolo?</h2><p>La partita in corso verrà sostituita. Le statistiche delle partite concluse rimangono salvate.</p><button class="primary full" data-action="confirm-new">Crea il nuovo tavolo</button>';
    }
    if (modal === 'rules') {
      content = '<span class="eyebrow">COME SI GIOCA</span><h2>La strategia, in breve.</h2><div class="rules-copy"><p>Rinforza, attacca, effettua uno spostamento tra territori adiacenti e pesca una carta se hai conquistato almeno un territorio.</p><p>Si attacca e si difende con il massimo dei dadi, fino a tre. Non puoi attaccare con meno dadi del difensore. I pareggi favoriscono la difesa.</p><p>I tris valgono 8, 10 o 12 armate, più 2 per ogni carta territorio posseduta. Puoi conservare fino a 7 carte e schierare fino a 130 carri.</p><p>Conquista il tuo obiettivo per vincere subito. Dal termine del giro 20, la sdadata può chiudere la partita: soglia 4, poi 5, 6 e 7. Con tre conquiste o più non si lancia.</p><p>Gli avversari non possono essere eliminati nei primi quattro giri. Una guarnigione di almeno due carri deve rimanere sui confini nemici quando sposti volontariamente.</p><p>Alla scadenza del turno vengono completati i piazzamenti e i movimenti obbligatori; poi il turno termina. L’app in background mette in pausa la partita.</p><p class="muted">Riferimento: il file “RisiKo! Online – Come si gioca” fornito dall’utente, integrato con le regole concordate. Ricostruzione indipendente offline, non affiliata a Spin Master.</p></div>';
    }
    if (modal === 'objective') {
      const o = objectives[s!.players[0].objective! - 1];
      content = `<span class="eyebrow">RISERVATO AL COMANDANTE</span><h2>IL TUO OBIETTIVO</h2>${miniObjective(o.id)}<div class="objective-score"><b>${points()}</b><span>/ 86 punti</span></div><p>Occupa tutti i territori evidenziati per fare RisiKo!</p><button class="primary full" data-action="objective-map">Mostra l’obiettivo sulla plancia ◎</button><details><summary>Territori dell’obiettivo</summary><p>${o.territories.map(t => `${escape(territories[t].name)} (${territories[t].points})`).join(' · ')}</p></details>`;
    }
    if (modal === 'cards') {
      const hand=s!.players[0].cards??[], allowed=humanTurn()&&s!.phase==='TRIS_EXCHANGE';
      cardSelection=cardSelection.filter(id=>hand.includes(id));
      const value=exchangeValue(s!,0,cardSelection);
      content=`<h2>LE TUE CARTE</h2><p class="card-instructions">Seleziona 3 CARTE compatibili<br>per ottenere ARMATE BONUS</p><span class="sr-only">Carte territorio</span><div class="hand">${hand.map(id=>`<button class="territory-card ${cardSelection.includes(id)?'chosen':''}" data-card="${id}" aria-pressed="${cardSelection.includes(id)}" aria-label="${escape(cards[id].territory===null?'Jolly':territories[cards[id].territory!].name)} · ${cards[id].symbol}">${cardFace(id)}</button>`).join('')||'<div class="empty-state">NON HAI CARTE<br><small>Conquista un territorio per pescare a fine turno.</small></div>'}</div><div class="card-bonus"><small>DOTAZIONE AGGIUNTIVA:</small>${armyToken(value,s!.players[0].color)}<strong>${value?'+'+value:'—'}</strong></div><button class="primary full" data-action="exchange-selected" ${allowed&&value>0&&!pendingCommand?'':'disabled'}>USA LE CARTE SELEZIONATE</button><p class="card-hint">${allowed?(cardSelection.length===3&&!value?'Queste tre carte non formano un tris.':'3 uguali: 8 · 3 diversi: 10 · Jolly + 2 uguali: 12 · +2 per territorio posseduto'):'Puoi cambiare un tris soltanto all’inizio del tuo turno.'}</p>`;
      cls='cards-window';
    }
    if (modal === 'combat' && selected !== null && target !== null) {
      const a = territories[selected],
        d = territories[target],
        last = s!.lastBattle;
      const matching=last?.from===a.id&&last?.to===d.id?last:null;
      content = `<div class="combat-title"><div><small>ATTACCO</small><h2>${escape(a.name)}</h2><strong>${s!.board[a.id].armies} carri</strong></div><span>→</span><div><small>DIFESA</small><h2>${escape(d.name)}</h2><strong>${s!.board[d.id].armies} carri</strong></div></div><div class="combat-preview">${matching?`<div>${matching.attack!.map((n,i)=>dieMarkup(n,s!.players[0].color,i)).join('')}</div><span>vs</span><div>${matching.defense!.map((n,i)=>dieMarkup(n,s!.players[s!.board[d.id].owner].color,i)).join('')}</div>`:'Seleziona «Lancia dadi» per attaccare.'}</div><div class="combat-actions"><button class="primary" data-action="roll" ${pendingCommand||!canAttack(s!,a.id,d.id)?'disabled':''}>Lancia dadi</button><button class="secondary ${blitz?'active':''}" data-action="blitz" ${!canAttack(s!,a.id,d.id)?'disabled':''}>${blitz?'Ferma blitz':'Blitz'}</button><button class="text-button" data-action="close">Ritirati</button></div>`;
      cls = 'combat';
    }
    if (modal === 'move' && selected !== null && target !== null) {
      const bounds = moveBounds(s!, selected, target);
      moveCount = Math.max(bounds.min, Math.min(bounds.max, moveCount));
      content = `<span class="eyebrow">${s!.phase === 'POST_CONQUEST_MOVE' ? 'CONQUISTA COMPLETATA' : 'SPOSTAMENTO STRATEGICO'}</span><h2>${escape(territories[target].name)}</h2><p>Da ${escape(territories[selected].name)} · minimo ${bounds.min}, massimo ${bounds.max}</p><div class="move-number" id="move-number">${moveCount}</div><input type="range" id="move-range" min="${bounds.min}" max="${bounds.max}" value="${moveCount}" aria-label="Armate da spostare"/><div class="move-shortcuts">${['Min', '−1', '+1', '+5', 'Max'].map(x => `<button class="secondary" data-move="${x}">${x}</button>`).join('')}</div><button class="primary full" data-action="confirm-move">Conferma spostamento →</button><p class="muted">La guarnigione minima è già inclusa nei limiti.</p>`;
    }
    const floating=modal==='combat'||modal==='move';
    return `<div class="${floating?'floating-wrap':'modal-backdrop'}"><section class="modal ${cls} ${floating?'floating-panel':''}" ${floating?'data-floating':''} role="dialog" aria-modal="${!floating}">${floating?'<header data-drag-handle>Trascina per spostare la finestra</header>':''}${modal==='move'&&s?.phase === 'POST_CONQUEST_MOVE' ? '' : '<button class="close-button" data-action="close" aria-label="Chiudi">×</button>'}${content}</section></div>`;
  }
  function render(force=false) {
    if(presenting&&!force)return;
    const key=`${modal}:${selected}:${target}`;
    const oldPanel=root.querySelector<HTMLElement>('.floating-panel');
    if(oldPanel&&panelKey===key){const r=oldPanel.getBoundingClientRect();panelPosition={x:r.left,y:r.top};}
    else if(panelKey!==key)panelPosition=null;
    panelKey=key;
    const routes: Record<string, string> = {
      home: '/app/gui/user/home',
      table: '/app/gui/game/table',
      results: '/app/gui/game/results',
      profile: '/app/gui/profile/local'
    };
    history.replaceState(null, '', '#' + routes[screen]);
    root.innerHTML = `<div class="app-shell">${screen === 'home' ? home() : screen === 'profile' ? profilePage() : screen === 'results' ? results() : state ? table() : home()}${presenting?'':modalMarkup()}<div id="effects" class="effects-layer"></div><div id="toast" role="status" class="toast"></div><div class="portrait-notice"><span>↻</span><h2>Ruota il dispositivo</h2><p>La tua strategia merita tutta la plancia.<br>Gioca in orizzontale.</p></div></div>`;
    bindMap();
    const panel=root.querySelector<HTMLElement>('[data-floating]');
    if(panel){
      if(panelPosition){panel.style.left=`${Math.max(6,Math.min(innerWidth-panel.offsetWidth-6,panelPosition.x))}px`;panel.style.top=`${Math.max(6,Math.min(innerHeight-panel.offsetHeight-6,panelPosition.y))}px`;panel.style.transform='none';}
      else positionPanel(root,panel,[selected,target].filter((n): n is number=>n!==null));
      bindPanelDrag(panel);
    }
  }
  function start() {
    cancelPresentation();
    modal = null;
    selected = null;
    target = null;
    objectiveView = false;
    viewport = {
      x: 0,
      y: 0,
      w: 1240,
      h: 690
    };
    screen = 'table';
    send({
      type: 'NEW',
      config
    });
  }
  function onTerritory(id: number) {
    if (!state || presenting || !humanTurn() || pendingCommand || modal) return;
    const cell = state.board[id];
    if (['SETUP_PLACEMENT', 'REINFORCEMENT'].includes(state.phase)) {
      if (cell.owner === 0) command({
        type: 'PLACE',
        territory: id,
        count: state.phase==='SETUP_PLACEMENT'?1:Math.min(placementCount,state.reinforcements)
      });else toast('Puoi rinforzare solo i tuoi territori.');
      return;
    }
    if (state.phase === 'TRIS_EXCHANGE') {
      toast('Conferma prima il cambio tris con “Piazza rinforzi”.');
      return;
    }
    if (state.phase === 'ATTACK') {
      if (cell.owner === 0) {
        selected = id;
        target = null;
        render();
      } else if (selected !== null && canAttack(state!, selected, id)) {
        target = id;
        modal = 'combat';
        blitz = false;
        render();
      } else toast('Attacco non consentito: scegli un’origine valida e confinante.');
    } else if (state.phase === 'FORTIFY') {
      if (cell.owner !== 0) {
        toast('Lo spostamento richiede due tuoi territori adiacenti.');
        return;
      }
      if (selected !== null && selected !== id && moveBounds(state, selected, id).max >= 1) {
        target = id;
        modal = 'move';
        moveCount = 1;
        render();
      } else {
        selected = id;
        render();
      }
    }
  }
  function setZoom(factor: number) {
    const nw = Math.max(380, Math.min(1240, viewport.w * factor)),
      nh = nw * 690 / 1240;
    viewport.x += (viewport.w - nw) / 2;
    viewport.y += (viewport.h - nh) / 2;
    viewport.w = nw;
    viewport.h = nh;
    updateMap();
  }
  function updateMap() {
    viewport.x = Math.max(-100, Math.min(1240 - viewport.w + 100, viewport.x));
    viewport.y = Math.max(-70, Math.min(690 - viewport.h + 70, viewport.y));
    root.querySelector('#world-map')?.setAttribute('viewBox', `${viewport.x} ${viewport.y} ${viewport.w} ${viewport.h}`);
  }
  function bindMap() {
    const svg = root.querySelector<SVGSVGElement>('.game-table #world-map');
    if (!svg) return;
    const pointers = new Map<number, {
      x: number;
      y: number;
    }>();
    let moved = false,
      startId: number | null = null,
      lastDistance = 0,
      travel = 0;
    svg.addEventListener('pointerdown', e => {
      pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY
      });
      startId = Number((e.target as Element).closest('[data-territory]')?.getAttribute('data-territory'));
      if (!(e.target as Element).closest('[data-territory]')) startId = null;
      moved = false;
      travel = 0;
      svg.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        lastDistance = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    svg.addEventListener('pointermove', e => {
      const old = pointers.get(e.pointerId);
      if (!old) return;
      const dx = e.clientX - old.x,
        dy = e.clientY - old.y;
      pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY
      });
      travel += Math.abs(dx) + Math.abs(dy);
      if (travel > 6) moved = true;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()],
          dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastDistance) setZoom(lastDistance / dist);
        lastDistance = dist;
        moved = true;
      } else if (moved) {
        const r = svg.getBoundingClientRect();
        viewport.x -= dx * viewport.w / r.width;
        viewport.y -= dy * viewport.h / r.height;
        updateMap();
      }
    });
    svg.addEventListener('pointerup', e => {
      const clicked = !moved && pointers.size === 1;
      pointers.delete(e.pointerId);
      if (clicked && startId !== null) onTerritory(startId);
    });
    svg.addEventListener('pointercancel', e => pointers.delete(e.pointerId));
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      setZoom(e.deltaY > 0 ? 1.12 : .88);
    }, {
      passive: false
    });
  }
  function click(e: MouseEvent) {
    const el = (e.target as Element).closest<HTMLElement>('button');
    if (!el || el.hasAttribute('disabled')) return;
    if(presenting && !['pause','home','blitz','zoom-in','zoom-out','reset-map'].includes(el.dataset.action??''))return;
    if(el.dataset.placeCount){placementCount=Number(el.dataset.placeCount);render();return;}
    if (el.dataset.count) {
      config.players = Number(el.dataset.count);
      config.difficulties = Array.from({
        length: config.players - 1
      }, (_, i) => config.difficulties[i] ?? 'medio');
      render();
      return;
    }
    if (el.dataset.speed !== undefined) {
      speed = Number(el.dataset.speed);
      send({
        type: 'SPEED',
        speed
      });
      render();
      return;
    }
    if (el.dataset.tris !== undefined) {
      const combo = validTris(state!, 0, state!.players[0].cards ?? [])[Number(el.dataset.tris)];
      command({
        type: 'EXCHANGE',
        cards: combo.cards
      });
      return;
    }
    if (el.dataset.card !== undefined) {
      const id = Number(el.dataset.card);
      cardSelection = cardSelection.includes(id) ? cardSelection.filter(x => x !== id) : [...cardSelection.slice(-2), id];
      render();
      return;
    }
    if (el.dataset.move) {
      const bounds = moveBounds(state!, selected!, target!);
      moveCount = el.dataset.move === 'Min' ? bounds.min : el.dataset.move === 'Max' ? bounds.max : moveCount + (el.dataset.move === '−1' ? -1 : el.dataset.move === '+5' ? 5 : 1);
      render();
      return;
    }
    switch (el.dataset.action) {
      case 'exchange-selected':
        if(state&&exchangeValue(state,0,cardSelection)>0)command({type:'EXCHANGE',cards:[...cardSelection]});
        break;
      case 'names': showNames=!showNames;render();break;
      case 'new':
        if (hasGame) {
          modal = 'replace';
          render();
        } else start();
        break;
      case 'confirm-new':
        start();
        break;
      case 'resume':
        screen = 'table';
        modal = null;
        send({
          type: 'RESUME'
        });
        break;
      case 'home':
        cancelPresentation();
        if (state && state.phase !== 'GAME_OVER') send({
          type: 'PAUSE'
        });
        screen = 'home';
        modal = null;
        send({
          type: 'PROFILE'
        });
        render();
        break;
      case 'profile':
        cancelPresentation();
        if (state && state.phase !== 'GAME_OVER') send({
          type: 'PAUSE'
        });
        screen = 'profile';
        modal = null;
        send({
          type: 'PROFILE'
        });
        render();
        break;
      case 'blind-all':
        config.difficulties.fill('casuale');
        render();
        break;
      case 'rules':
      case 'cards':
      case 'objective':
        modal = el.dataset.action;
        render();
        break;
      case 'objective-view':
        objectiveView = !objectiveView;
        render();
        break;
      case 'objective-map':
        objectiveView = true;
        modal = null;
        render();
        break;
      case 'close':
        if (state?.phase !== 'POST_CONQUEST_MOVE') modal = null;
        blitz = false;
        render();
        break;
      case 'roll':
        command({
          type: 'ATTACK',
          from: selected!,
          to: target!
        });
        break;
      case 'blitz':
        if(presenting){blitz=false;const stop=root.querySelector<HTMLElement>('.stop-blitz');if(stop)stop.textContent='Blitz fermato';break;}
        blitz = !blitz;
        if (blitz) command({
          type: 'ATTACK',
          from: selected!,
          to: target!
        });
        render();
        break;
      case 'confirm-move':
        command({
          type: 'MOVE',
          from: selected!,
          to: target!,
          count: moveCount
        });
        modal = null;
        selected = target;
        target = null;
        break;
      case 'next':
        selected = null;
        target = null;
        command({
          type: 'NEXT'
        });
        break;
      case 'pause':
        blitz = false;
        send({
          type: 'PAUSE'
        });
        break;
      case 'log':
        showLog = !showLog;
        render();
        break;
      case 'sound':
        muted = !muted;
        render();
        break;
      case 'zoom-in':
        setZoom(.8);
        break;
      case 'zoom-out':
        setZoom(1.25);
        break;
      case 'reset-map':
        viewport = {
          x: 0,
          y: 0,
          w: 1240,
          h: 690
        };
        updateMap();
        break;
    }
  }
  function change(e: Event) {
    const el = e.target as HTMLInputElement;
    if (el.id === 'player-name') config.name = el.value;
    if (el.id === 'turn-time') config.turnSeconds = Number(el.value);
    if (el.dataset.bot !== undefined) {
      config.difficulties[Number(el.dataset.bot)] = el.value as never;
      render();
    }
    if (el.id === 'move-range') {
      moveCount = Number(el.value);
      const label = root.querySelector('#move-number');
      if (label) label.textContent = String(moveCount);
    }
  }
  function visibility() {
    if (document.hidden) {
      blitz = false;
      send({
        type: 'PAUSE'
      });
    }
  }
  root.addEventListener('click', click);
  root.addEventListener('input', change);
  root.addEventListener('keydown', e => {
    if(presenting)return;
    if (e.key === 'Escape' && state?.phase !== 'POST_CONQUEST_MOVE') {
      modal = null;
      blitz = false;
      render();
    }
    if (e.key === 'Enter') {
      const id = (e.target as Element).closest('[data-territory]')?.getAttribute('data-territory');
      if (id) onTerritory(Number(id));
    }
  });
  document.addEventListener('visibilitychange', visibility);
  const nativePause = () => {
    blitz = false;
    send({
      type: 'PAUSE'
    });
  };
  document.addEventListener('risiko-pause', nativePause);
  worker.onmessage = ({
    data
  }) => {
    if (data.type === 'ERROR') {
      pendingCommand = false;
      blitz = false;
      toast(data.message);
      return;
    }
    if (data.type === 'READY') {
      ready = true;
      hasGame = data.hasGame;
      render();
    }
    if (data.type === 'PROFILE') {
      profile = data.profile;
      if (config.name === 'Comandante') config.name = profile.name;
      render();
    }
    if (data.type === 'TRANSITION') {
      const t=data.transition as Transition;
      if(presenting?.id===t.id)return;
      if(lastPresentedId===t.id){send({type:'PRESENTED',id:t.id});return;}
      cancelPresentation();
      if(screen!=='table'||document.hidden){send({type:'PRESENTED',id:t.id});receiveState(t.after);return;}
      state=t.before;presenting=t;pendingCommand=true;
      const involved=t.effects.flatMap(e=>'from' in e?[e.from,e.to]:'to' in e?[e.to]:[]);
      if(involved.some(id=>{const p=territories[id];return p.x<viewport.x+35||p.x>viewport.x+viewport.w-35||p.y<viewport.y+35||p.y>viewport.y+viewport.h-35;})) {
        restoreViewport={...viewport};viewport={x:0,y:0,w:1240,h:690};
      }
      render(true);
      if(!muted&&t.effects.some(e=>e.kind==='battle'||e.kind==='sdadata'))sound('battle');
      cancelEffects=playTransition(root,t,()=>{
        if(presenting?.id!==t.id)return;
        lastPresentedId=t.id;lastBattleMessage=t.after.lastBattle?.message??'';cancelPresentation();send({type:'PRESENTED',id:t.id});receiveState(t.after);
      });
      return;
    }
    if (data.type === 'STATE') {
      if(presenting)cancelPresentation();
      receiveState(data.state);
    }
  };
  function receiveState(nextState: GameView) {
      const previous = state;
      state = nextState;
      if (state && state.id !== previous?.id) profile.name = state.players[0].name;
      hasGame = state!.phase !== 'GAME_OVER';
      const changed = !previous || previous.revision !== state!.revision || previous.paused !== state!.paused || previous.id !== state!.id;
      if (changed) {
        pendingCommand = false;
        if (previous?.active !== state!.active) {
          selected = null;
          target = null;
          modal = null;
          blitz = false;
        }
        if (state!.phase === 'GAME_OVER' && screen === 'table') {
          screen = 'results';
          modal = null;
          send({
            type: 'PROFILE'
          });
        }
        if (state!.paused) { modal=null; blitz=false; }
        if (screen==='table' && !state!.paused && state!.phase === 'POST_CONQUEST_MOVE' && state!.active === 0) {
          selected = state!.pending!.from;
          target = state!.pending!.to;
          moveCount = state!.pending!.min;
          modal = 'move';
          blitz = false;
        }
        if (state!.lastBattle?.message !== lastBattleMessage) {
          lastBattleMessage = state!.lastBattle?.message ?? '';
          if (lastBattleMessage && !muted) sound('battle');
        }
        render();
        if (blitz && modal === 'combat' && selected !== null && target !== null) {
          if (canAttack(state!, selected, target)) {
            const expected=state!.revision;
            blitzTimer=setTimeout(() => {
            if (blitz && !presenting && state?.revision===expected && modal === 'combat') command({
              type: 'ATTACK',
              from: selected!,
              to: target!
            });
          }, 120); } else {
            blitz = false;
            render();
          }
        }
      } else {
        const timer = root.querySelector('#timer');
        if (timer) timer.textContent = state!.phase === 'SETUP_PLACEMENT' ? '—' : duration(state!.remainingMs);
      }
    }
  worker.onerror = e => toast(`Errore del motore: ${e.message}`);
  render();
  send({
    type: 'INIT', presentation: true
  });
  return () => {
    cancelPresentation();
    worker.terminate();
    root.removeEventListener('click', click);
    root.removeEventListener('input', change);
    document.removeEventListener('visibilitychange', visibility);
    document.removeEventListener('risiko-pause', nativePause);
  };
}
