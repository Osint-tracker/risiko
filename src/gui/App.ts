import {seaRoute} from './mapGeometry.ts';
import {conquestOdds} from '../ai/BotAI.ts';
import {tournamentStats} from '../services/TournamentStats.ts';
import {readLocalSnapshot,writeLocalSnapshot} from '../services/LocalSnapshot.ts';
import {GameAudio} from './AudioService.ts';
import {botPolicy,policyOptions} from '../ai/policy.ts';
import { allTerritories as territories, objectives, allCards as cards, colors, mapFor } from '../data/mapGraph.ts';
import { canAttack, moveBounds, validTris, exchangeValue } from '../engine/RisikoRulesEngine.ts';
import type { GameView, Command, GameConfig } from '../engine/types.ts';
import {tankModel,armyBadge,scoreChart,armyToken, counterFontSize, tankShape, territoryColors, cardFace, objectiveMap, dieMarkup} from './art.ts';
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
export function mountGame(root: HTMLElement): () => void {
  const sounds=new GameAudio();
  const sound=(kind='tap')=>kind==='battle'?sounds.clash():sounds.tap();
  let strategyBot=0;
  let objectiveExpanded=false,blitzStop=3;
  let localSaveWarning=false;
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
  let dialogMarkup = '';
  let dialogExit: ReturnType<typeof setTimeout> | null = null;
  const consulting = () => modal === 'cards' || modal === 'objective';
  let panelKey = '';
  let panelPosition: {x:number;y:number} | null = null;
  let presenting: Transition | null = null;
  let cancelEffects: (() => void) | null = null;
  let restoreViewport: typeof viewport | null = null;
  let blitzTimer: ReturnType<typeof setTimeout> | null = null;
  function cancelPresentation() {
    sounds.stop();
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
    muted = sounds.muted,
    pendingCommand = false,
    blitz = false;
  let config: GameConfig = {
    antarctica: false,
    manualReinforcement:true,
    endMode:'regular',countdownMinutes:45,botSpeed:1,
    players: 4,
    name: 'Comandante',
    difficulties: ['medio', 'medio', 'medio'],
    turnSeconds: 180,
    botPolicies:['equilibrato','stratega','incursore','conquistatore'].map(personality=>botPolicy({personality:personality as never}))
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
    return Math.min(86,state?.players[0].points ?? 0);
  }
  function mapMarkup(preview = false) {
    const {territories,continents,seaLinks,height}=mapFor(preview?config:state??{});
    const labels: string[] = [];
    const spotlight=!preview&&humanTurn()&&selected!==null&&['ATTACK','FORTIFY'].includes(state!.phase);
    const reachable=(id:number)=>!spotlight?false:state!.phase==='ATTACK'?canAttack(state!,selected!,id):id!==selected&&moveBounds(state!,selected!,id).max>=1;
    const combo=!preview&&humanTurn()&&state?.phase==='TRIS_EXCHANGE'?(exchangeValue(state,0,cardSelection)>0?cardSelection:validTris(state,0,state.players[0].cards??[]).sort((a,b)=>b.value-a.value)[0]?.cards??[]):[];
    const bonusIds=combo.map(id=>cards[id].territory).filter((id):id is number=>id!==null&&state!.board[id].owner===0);
    const s = state,
      goal = s?.players[0].objective ? objectives[s.players[0].objective! - 1].territories : [];
    return `<svg id="world-map" class="world-map ${preview ? 'preview' : ''}" viewBox="${preview ? `0 0 1240 ${height}` : `${viewport.x} ${viewport.y} ${viewport.w} ${viewport.h}`}" role="img" aria-label="Plancia interattiva: ${territories.length} territori"><defs><pattern id="ocean-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#9addcc" stroke-width=".5" opacity=".25"/></pattern><radialGradient id="ocean"><stop stop-color="#0f1c2e"/><stop offset="1" stop-color="#070d17"/></radialGradient><filter id="continent-rim"><feMorphology in="SourceAlpha" operator="dilate" radius="2.8" result="outer"/><feComposite in="outer" in2="SourceAlpha" operator="out"/><feFlood flood-color="#d49b35" flood-opacity=".65"/><feComposite in2="outer" operator="in"/></filter><pattern id="triangles" width="18" height="16" patternUnits="userSpaceOnUse"><path d="M0 0L9 16L18 0ZM0 16L9 0L18 16Z" fill="none" stroke="#011f2d" stroke-width="2" opacity=".32"/></pattern><linearGradient id="pattern-fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="white"/><stop offset=".35" stop-color="black"/><stop offset=".65" stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient><mask id="ocean-pattern"><rect width="1240" height="${height}" fill="url(#pattern-fade)"/></mask><pattern id="land-grain" width="17" height="19" patternUnits="userSpaceOnUse"><path d="M1 3L4 2M7 8L11 7M3 15L5 17M14 1L16 5M12 16L16 14" stroke="#ffe9ad" stroke-width=".7" opacity=".14"/><path d="M2 7L5 10M9 1L11 2M9 13L8 17" stroke="#173d25" stroke-width="1" opacity=".2"/></pattern><filter id="terrain"><feTurbulence type="fractalNoise" baseFrequency=".4" numOctaves="3" seed="8" result="noise"/><feColorMatrix in="noise" type="matrix" values=".33 .33 .33 0 0 .33 .33 .33 0 0 .33 .33 .33 0 0 0 0 0 .28 0"/><feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="soft-light"/></filter><filter id="land-shadow"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-opacity=".35"/></filter><symbol id="tank" viewBox="0 0 34 22">${tank}</symbol></defs><rect x="-4000" y="-4000" width="9200" height="9200" fill="#070d17"/><rect width="1240" height="${height}" fill="url(#ocean)"/><rect width="1240" height="${height}" fill="url(#triangles)" mask="url(#ocean-pattern)"/><rect x="0" y="0" width="1240" height="${height}" fill="url(#ocean-grid)"/><g class="map-decoration"><circle cx="620" cy="345" r="290"/><circle cx="620" cy="345" r="190"/><path d="M0 345H1240M620 0V690"/><text x="80" y="450">OCEANO PACIFICO</text><text x="410" y="290">ATLANTICO</text><text x="809" y="580">OCEANO INDIANO</text></g><g class="sea-links">${seaLinks.map(([a, b]) => {
      const route=seaRoute(territories[a],territories[b]);
      return `<path d="${route.path}"/>${route.anchors.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="2.3"/>`).join('')}`;
    }).join('')}</g><g class="continent-outlines" pointer-events="none">${continents.map(c=>`<g stroke="#d49b35" stroke-width="5.6" stroke-linejoin="round">${territories.filter(t=>t.continent===c.id).map(t=>`<path d="${t.path}" fill="#d49b35"/>`).join('')}</g>`).join('')}</g><g><g>${territories.map(t => {
      const cell = s?.board[t.id],
        p = cell ? s!.players[cell.owner] : null,
        c = continents.find(c => c.id === t.continent)!,
        dim = !preview && objectiveView && !goal.includes(t.id),
        legal = reachable(t.id),
        spotDim=spotlight&&t.id!==selected&&!legal;
      const placeable = !preview && humanTurn() && !presenting && cell?.owner === 0 && ['SETUP_PLACEMENT','REINFORCEMENT'].includes(s!.phase);
      if (!preview) labels.push(`<g data-token="${t.id}" class="territory-label ${dim ? 'dim' : ''} ${spotDim?'map-territory--dimmed':''}" pointer-events="none"><text class="territory-name" x="${t.x}" y="${t.y-23}">${escape(t.short)}</text><g class="army-map-icon" data-x="${t.x}" data-y="${t.y}" transform="translate(${t.x-22} ${t.y-14}) scale(.7)">${tankModel(p?.color??'#899')}${armyBadge(cell?.armies??0,p?.color??'#899')}</g>${objectiveView?`<g class="objective-points" transform="translate(${t.x-18} ${t.y-45})"><rect width="40" height="17" rx="6"/><text x="20" y="12">+${goal.includes(t.id)?t.points:0} pt</text></g>`:''}${selected===t.id&&spotlight?`<circle class="source-ring" cx="${t.x}" cy="${t.y}" r="30"/>`:''}</g>`);
      return `<g data-territory="${t.id}" class="territory ${spotDim?'map-territory--dimmed':''} ${bonusIds.includes(t.id)?'card-bonus-territory':''} ${placeable ? 'placeable' : ''} ${dim ? 'dim' : ''} ${selected === t.id && !preview ? 'selected' : ''} ${target === t.id && !preview ? 'target' : ''} ${legal ? 'attackable' : ''} ${objectiveView && goal.includes(t.id) && !preview ? 'goal' : ''}" tabindex="${preview ? -1 : 0}" role="button" aria-label="${escape(t.name)}: ${t.points} punti${p ? `, ${escape(p.name)}, ${cell!.armies} armate` : ''}"><title>${escape(t.name)} · ${t.points} punti${p ? ` · ${escape(p.name)} · ${cell!.armies} carri` : ''}</title><path class="land" d="${t.path}" fill="${territoryColors[t.id]??c.color}"/><path d="${t.path}" fill="url(#land-grain)" pointer-events="none"/><circle class="territory-hit" cx="${t.x}" cy="${t.y}" r="17" fill="transparent"/>${placeable?`<g class="placement-plus" transform="translate(${t.x+23} ${t.y-5})"><circle r="9"/><path d="M-5 0H5M0-5V5"/></g>`:''}</g>`;
    }).join('')}</g></g>${labels.join('')}<g class="compass" transform="translate(537 526)"><circle r="37" fill="none" stroke="#4bbed0" stroke-width="2"/><circle r="31" fill="none" stroke="#4bbed0" stroke-width=".7"/><path d="M-25-25L0-10L25-25L10 0L25 25L0 10L-25 25L-10 0Z"/><path d="M0-43L9-9L43 0L9 9L0 43L-9 9L-43 0L-9-9Z"/><path d="M0-43L0 0L9-9ZM43 0L0 0L9 9ZM0 43L0 0L-9 9ZM-43 0L0 0L-9-9Z" style="fill:#6ad8df;stroke:none"/><text x="0" y="-49">N</text><text x="49" y="4">E</text><text x="0" y="59">S</text><text x="-49" y="4">W</text></g></svg>`;
  }
  const header = () => `<header class="app-header"><button class="brand" data-action="home" aria-label="Pagina iniziale">RisiKo<span>!</span><small>OFFLINE / TORNEO</small></button><nav><span class="offline-indicator"><i></i> 100% OFFLINE</span><button class="profile-button" data-action="profile"><span class="avatar">${escape(profile.name[0].toUpperCase())}</span><span>${escape(profile.name)}<small>Profilo locale</small></span></button></nav></header>`;
  function statsMarkup(){
    const stats=tournamentStats(profile.results),max=Math.max(1,...stats.dice);
    return `<section class="tournament-stats"><h2>Statistiche Torneo</h2><div class="tournament-stat-grid">${[[stats.played,'Partite'],[stats.wins,'Vittorie'],[stats.winRate+'%','Vittorie %'],[stats.average,'Media punti tavolo'],[stats.risiko,'RisiKo!'],[stats.sdadata,'Vinte in Sdadata']].map(([n,label])=>`<div><strong>${n}</strong><small>${label}</small></div>`).join('')}</div><h3>I tuoi dadi · attacco e difesa</h3><div class="dice-histogram">${stats.dice.map((n,i)=>`<div><span style="height:${4+n/max*48}px"></span><b>${i+1}</b><small>${n}</small></div>`).join('')}</div></section>`;
  }
  function home() {
    return `<main class="classic-home"><header class="classic-header"><div class="classic-brand"><b>RisiKo<span>!</span></b><small>TORNEO · OFFLINE</small></div><nav><button data-action="audio" aria-label="Impostazioni audio">♫ Audio</button><button data-action="profile">${escape(profile.name)} · Profilo</button><button data-action="rules">Regole</button></nav></header><section class="classic-lobby"><aside class="box-art">${statsMarkup()}<div class="box-map">${mapMarkup(true)}</div><div class="box-caption">${config.antarctica?44:42} TERRITORI · 3–5 GIOCATORI</div></aside><section class="classic-settings"><div class="home-player-strip"><span class="home-player-emblem">R</span><div><strong>${escape(profile.name)}</strong><small>IL TUO TAVOLO · TORNEO</small></div><button data-action="profile">${profile.results.length} partite · ${profile.results.filter(r=>r.rank===1).length} vittorie ›</button></div><div class="settings-title"><h1>Prepara la partita <small class="initial-armies">${({3:35,4:30,5:25} as Record<number,number>)[config.players]} armate iniziali</small></h1><div class="settings-actions">${hasGame?`<button class="resume-button" data-action="resume">RIPRENDI PARTITA · Turno ${state?.round??0} ▶</button>`:''}<button class="primary start-button" data-action="new" ${ready?'':'disabled'}><span>▶</span><span class="play-caption">${ready?'GIOCA':'CARICAMENTO…'}<small>ENTRA IN BATTAGLIA</small></span></button></div></div><div class="settings-scroll"><section class="lobby-basics" aria-label="Impostazioni partita"><label class="field-label" for="player-name">IL TUO NOME</label><input id="player-name" maxlength="24" value="${escape(config.name)}" autocomplete="off"/><div class="lobby-row"><div><span class="field-label">GIOCATORI</span><div class="segmented">${[3,4,5].map(n=>`<button data-count="${n}" class="${config.players===n?'active':''}">${n}</button>`).join('')}</div></div><div><label class="field-label" for="turn-time">TEMPO PER TURNO</label><select id="turn-time">${[60,120,180,240,300,600].map(n=>`<option value="${n}" ${config.turnSeconds===n?'selected':''}>${n/60} minuti</option>`).join('')}</select></div></div><div class="lobby-row"><div><label class="field-label" for="end-mode">FINE PARTITA TORNEO</label><select id="end-mode"><option value="regular" ${config.endMode!=='countdown'?'selected':''}>Regular · 20 giri + Sdadata</option><option value="countdown" ${config.endMode==='countdown'?'selected':''}>Countdown · a tempo</option></select></div><div>${config.endMode==='countdown'?`<label class="field-label" for="countdown-minutes">DURATA PARTITA</label><select id="countdown-minutes">${[30,45,60].map(n=>`<option value="${n}" ${config.countdownMinutes===n?'selected':''}>${n} minuti</option>`).join('')}</select>`:`<label class="field-label" for="bot-speed">VELOCITÀ BOT</label><select id="bot-speed">${[[1,'Normale'],[2,'Veloce'],[0,'Istantaneo']].map(([n,label])=>`<option value="${n}" ${config.botSpeed===n?'selected':''}>${label}</option>`).join('')}</select>`}</div></div>${config.endMode==='countdown'?`<label class="field-label" for="bot-speed">VELOCITÀ BOT</label><select id="bot-speed">${[[1,'Normale'],[2,'Veloce'],[0,'Istantaneo']].map(([n,label])=>`<option value="${n}" ${config.botSpeed===n?'selected':''}>${label}</option>`).join('')}</select>`:''}<label class="antarctica-option"><input id="antarctica-mode" type="checkbox" ${config.antarctica?'checked':''}/><span><b>Modalità Antartide</b><small>2 territori · +2 armate per turno se controlli entrambi</small></span></label></section><section class="lobby-opponents" aria-label="Avversari"><div class="opponents-heading"><span class="field-label">AVVERSARI</span><button data-action="blind-all" class="text-button">Tutti casuali ↻</button></div><div class="bot-slots">${config.difficulties.map((d,i)=>`<div class="bot-slot" style="--player:${colors[i+1]}"><span class="bot-avatar">${armyToken(i+1,colors[i+1])}</span><div class="bot-info"><strong>${['Falco','Vega','Atlas','Ombra'][i]}</strong><small>${d==='casuale'?'Bot ? · livello segreto':'BOT IA'}</small></div><select data-bot="${i}" aria-label="Difficoltà ${['Falco','Vega','Atlas','Ombra'][i]}">${['facile','medio','difficile','casuale'].map(l=>`<option value="${l}" ${l===d?'selected':''}>${levelNames[l]}</option>`).join('')}</select><button class="strategy-button" data-strategy="${i}">Strategia</button></div>`).join('')}</div></section></div><small class="classic-footnote">Salvataggio automatico · Nessuna connessione richiesta</small><details class="mobile-tournament-stats"><summary>Statistiche Torneo ▾</summary>${statsMarkup()}</details></section></section></main>`;
  }
  function playerCards() {
    return `<aside class="players-row" aria-label="Giocatori">${state!.order.map(id => {
      const p=state!.players[id];
      return `<article class="player-card ${id===state!.active?'turn-active':''} ${p.eliminated?'eliminated':''}" style="--player:${p.color}"><div class="player-heading"><span class="player-orb"><span></span></span><div class="player-identity"><strong>${escape(p.name)}</strong><small>${p.eliminated?'ELIMINATO':p.human?'TU':`Bot ${levelNames[p.difficulty]} · ${p.botPolicy?.personality??'equilibrato'}`}</small></div>${id===state!.active?'<span class="turn-arrow">▶</span>':''}</div><div class="player-numbers"><span title="Carri">${tankIcon}<b>${p.totalArmies}</b></span><span title="Territori">◇ ${p.territoryCount}</span><span title="Carte">▣ ${p.cardCount}</span><span title="Rinforzi">↑${p.nextReinforcements}</span></div></article>`;
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
        return state.reinforcements?`Tocca i tuoi territori: hai ${state.reinforcements} rinforzi da piazzare.`:'Rinforzi completati. Puoi annullare un piazzamento o iniziare l’attacco.';
      case 'ATTACK':
        return selected === null ? 'Scegli un tuo territorio per attaccare.' : 'Tocca un territorio nemico confinante per iniziare la battaglia.';
      case 'FORTIFY':
        return 'Scegli origine e destinazione adiacenti, oppure termina il turno.';
      default:
        return 'Completa lo spostamento obbligatorio.';
    }
  }
  function objectiveWidget(){
    if(!state)return "";
    const s=state,me=s.players[0];
    return `<aside class="objective-widget ${objectiveExpanded?'expanded':''}"><button data-action="objective-widget" aria-expanded="${objectiveExpanded}">Obiettivo · <b>${points()} / 86</b> ${objectiveExpanded?'▴':'▾'}</button>${objectiveExpanded?`<p>Punti attuali: ${points()} / 86 per RisiKo!</p>${miniObjective(me.objective!)}<button class="secondary" data-action="objective-view" aria-pressed="${objectiveView}">Mostra Punti su Mappa</button><div class="continent-bonuses">${mapFor(s).continents.map(c=>`<span>${c.name} <b>+${c.bonus}</b></span>`).join('')}</div>`:''}</aside>`;
  }
  function table() {
    const s=state!,me=s.players[0],active=s.players[s.active];
    const tris=humanTurn()&&s.phase==='TRIS_EXCHANGE'?validTris(s,0,me.cards??[]).sort((a,b)=>b.value-a.value)[0]:null;
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
        <div class="reference-round">${s.endMode==='countdown'?`COUNTDOWN <b id="match-timer">${duration(s.matchRemainingMs??0)}</b> · `:''}${s.round?`GIRO <b>${s.round}</b>${s.endMode==='countdown'?'':' / 20'}`:`PREPARAZIONE · ${escape(active.name)} · Da piazzare <b>${active.setupRemaining}</b> · Questa mano: <b>${s.setupBatch}</b>`}${s.sdadata?`<span class="sdadata-badge">SDADATA ≤ ${s.sdadata.threshold}</span>`:''}</div>
        <aside class="reference-sidebar"><button class="reference-eye ${objectiveView?'active':''}" data-action="objective-view" aria-label="Vista obiettivo"><span>◉</span><small>${points()} / 86</small></button><button class="${tris?'tris-ready':''}" data-action="cards" aria-label="Carte territorio"><span>▰</span><small>${tris?`Gioca Tris (+${tris.value} carri)`:`CARTE ${me.cardCount}`}</small></button><button data-action="objective" aria-label="Carta obiettivo"><span>◎</span><small>OBIETTIVO</small></button><div class="reference-info"><span>ⓘ</span>${selected===null?'<p>Seleziona<br>un territorio</p>':`<strong>${escape(territories[selected].name)}</strong><p>${territories[selected].points} punti<br>${s.board[selected].armies} carri</p>`}</div><button class="reference-log" data-action="log">▤ Cronologia</button></aside>${objectiveWidget()}
        <div class="reference-zoom"><button data-action="zoom-out" aria-label="Riduci">−</button><button data-action="reset-map" aria-label="Centra mappa">⌖</button><button data-action="zoom-in" aria-label="Ingrandisci">+</button></div>
        ${s.lastBattle&&!modal&&!presenting?`<div class="battle-toast"><small>${s.lastBattle.from!==undefined?escape(territories[s.lastBattle.from].short)+' → ':''}${escape(territories[s.lastBattle.territory!].short)}</small><div class="last-dice">${s.lastBattle.attack!.map((n,i)=>dieMarkup(n,'#d93829',i)).join('')}<span>vs</span>${s.lastBattle.defense!.map((n,i)=>dieMarkup(n,'#2784df',i)).join('')}</div></div>`:''}
        ${s.paused?'<div class="pause-shade"><div class="pause-card"><span class="eyebrow">POSIZIONE SALVATA</span><h2>Partita in pausa</h2><button class="primary" data-action="resume">Riprendi la partita →</button><button class="text-button" data-action="home">Torna al menu</button></div></div>':''}
      </section>
      <section class="command-deck"><div class="phase-section"><div class="phase-steps">${phases.map((p,i)=>`<span class="${i===step?'current':''}"><b>${i+1}</b> ${p}</span>`).join('<i>›</i>')}</div><p id="instruction">${instructions()}</p>${humanTurn()&&s.phase==='REINFORCEMENT'?`<div class="placement-amounts" aria-label="Quantità da piazzare">${[1,3,5,10,130].map(n=>`<button data-place-count="${n}" class="${placementCount===n?'active':''}">${n===130?'Tutti':'+'+n}</button>`).join('')}</div>`:''}</div><div class="command-buttons">${humanTurn()&&s.phase==='REINFORCEMENT'?`<button class="secondary undo-placement" data-action="undo-place" ${!s.undoAvailable||pendingCommand?'disabled':''}>↶ Annulla ultimo piazzamento</button>`:''}<button class="primary" data-action="next" ${!humanTurn()||!['TRIS_EXCHANGE','REINFORCEMENT','ATTACK','FORTIFY'].includes(s.phase)||(s.phase==='REINFORCEMENT'&&s.reinforcements>0)||pendingCommand?'disabled':''}>${s.phase==='TRIS_EXCHANGE'?'Piazza rinforzi':s.phase==='REINFORCEMENT'?'Inizia attacco →':s.phase==='ATTACK'?'Spostamento →':'Fine turno →'}</button></div></section>
      <div class="table-footer"><span>${s.endMode==='countdown'?'COUNTDOWN':'REGULAR'} · OFFLINE</span><div><span class="muted">RITMO</span>${[1,2,0].map(n=>`<button class="speed-button ${speed===n?'active':''}" data-speed="${n}">${n===1?'Normale':n===2?'Veloce':'Istantaneo'}</button>`).join('')}<button class="text-button" data-action="sound">${muted?'Audio off':'Audio on'}</button><button class="text-button" data-action="pause">Ⅱ Pausa</button></div></div>
      ${showLog?`<aside class="game-log"><button data-action="log" class="close-button">×</button><h3>Cronologia / Log di Guerra</h3>${s.log.slice(-250).reverse().map(e=>`<p><i style="background:${s.players[e.player].color}"></i>${escape(e.message)}</p>`).join('')}</aside>`:''}
    </main>`;
  }
  function miniObjective(id: number) { return objectiveMap(id,state?.antarctica===true); }
  function results() {
    const s = state!,
      ranking = [...s.players].sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.outside ?? 0) - (a.outside ?? 0) || s.order.indexOf(b.id) - s.order.indexOf(a.id));
    return `${header()}<main class="results-page"><span class="eyebrow">${s.reason === 'risiko' ? 'OBIETTIVO COMPLETATO' : s.reason==='countdown'?'COUNTDOWN TERMINATO':'LA SDADATA HA DECISO'}</span><h1>${s.winner === 0 ? 'La vittoria è tua.' : `${escape(s.players[s.winner!].name)} conquista la vittoria.`}</h1><p class="muted">${s.round} giri · ${duration(s.elapsedMs)} di gioco · Tutti gli obiettivi sono ora rivelati</p><div class="results-list">${ranking.map((p, i) => `<article class="result-row" style="--player:${p.color}"><strong class="rank">${String(i + 1).padStart(2, '0')}</strong><div class="result-player"><strong>${escape(p.name)} ${p.human ? '· TU' : ''}</strong><small>${p.human ? 'Comandante' : `Bot ${levelNames[p.difficulty]}${p.blind ? ' · livello svelato' : ''}`}</small></div><div class="result-objective">${miniObjective(p.objective!)}<span>${escape(objectives[p.objective! - 1].name)}</span></div><div><strong>${Math.min(86,p.points??0)}</strong><small>${p.points === 100 ? 'RISIKO! · 100 PT TAVOLO' : 'IN OBIETTIVO'}</small></div><div><strong>${p.outside}</strong><small>FUORI OBIETTIVO</small></div><div><strong>${p.territoryCount}</strong><small>TERRITORI</small></div><div><strong>${p.cardCount}</strong><small>CARTE</small></div></article>`).join('')}</div>${scoreChart(s.scoreHistory,s.players)}<div class="results-actions"><button class="primary" data-action="home">Un’altra strategia. Un nuovo tavolo. →</button><button class="secondary" data-action="profile">Le tue statistiche</button></div></main>`;
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
    return `${header()}<main class="profile-page"><button class="text-button" data-action="home">← Torna al tavolo</button><span class="eyebrow">IL TUO PERCORSO / TORNEO</span><h1>${escape(profile.name)}</h1><p class="muted">Livello locale ${1 + Math.floor(xp / 100)} · ${xp} XP · Statistiche conservate su questo dispositivo</p><div class="stat-grid">${[[n, 'Partite giocate'], [wins, 'Vittorie'], [mean, 'Media punti'], [n ? Math.round(100 * rows.filter(r => r.reason === 'risiko').length / n) + '%' : '—', 'Fine per RisiKo!'], [n ? Math.round(100 * rows.filter(r => r.reason === 'sdadata').length / n) + '%' : '—', 'Fine per sdadata'], [n ? duration(rows.reduce((sum, r) => sum + r.duration, 0) / n) : '—', 'Durata media']].map(([v, l]) => `<div><strong>${v}</strong><span>${l}</span></div>`).join('')}</div>${statsMarkup()}<h2>Le tue partite</h2>${!n ? '<div class="empty-state">La tua storia comincia dalla prossima mossa.<br>Completa una partita per registrare il primo risultato.</div>' : `<table class="history"><thead><tr><th>Data</th><th>Tavolo</th><th>Posizione</th><th>Punti</th><th>Conclusione</th><th>Durata</th></tr></thead><tbody>${rows.map(r => `<tr><td>${new Date(r.date).toLocaleDateString('it-IT')}</td><td>${r.players} giocatori${r.antarctica?' · Antartide':''}</td><td>${r.rank}°</td><td>${r.points}</td><td>${r.reason === 'risiko' ? 'RisiKo!' : r.reason==='countdown'?'Countdown':'Sdadata'}</td><td>${duration(r.duration)}</td></tr>`).join('')}</tbody></table>`}<h2>Classifica personale</h2><div class="local-ranking">${[...rows].sort((a, b) => b.points - a.points || a.rank - b.rank).slice(0, 10).map((r, i) => `<div><span>${i + 1}.</span><b>${escape(r.name)}</b><span>${new Date(r.date).toLocaleDateString('it-IT')}</span><strong>${r.points} pt</strong></div>`).join('') || '<p class="muted">Le dieci migliori prestazioni appariranno qui.</p>'}</div></main>`;
  }
  function modalMarkup() {
    if (!modal || !state && !['rules','replace','strategy','audio'].includes(modal)) return '';
    let content = '',
      cls = '';
    const s = state;
    if(modal==='strategy'){
      const policy=config.botPolicies![strategyBot];cls='strategy-window';
      content=`<h2>Strategia · ${['Falco','Vega','Atlas','Ombra'][strategyBot]}</h2><p>Le caselle definiscono le priorità di questo bot.</p><label class="grace-field">Personalità <select id="bot-personality">${['equilibrato','stratega','incursore','conquistatore'].map(personality=>`<option value="${personality}" ${policy.personality===personality?'selected':''}>${personality}</option>`).join('')}</select></label><div class="policy-list">${policyOptions.map(([key,label,hint])=>`<label><input type="checkbox" data-policy="${key}" ${policy[key]?'checked':''}/><span><strong>${label}</strong><small>${hint}</small></span></label>`).join('')}</div><label class="grace-field">Tregua iniziale <select id="grace-rounds">${[0,1,2,3].map(n=>`<option value="${n}" ${policy.graceRounds===n?'selected':''}>${n===0?'Nessuna':n+' giri'}</option>`).join('')}</select></label><p class="policy-note">Durante la tregua il bot difende e rinforza, ma non attacca.</p><div class="policy-actions"><button class="secondary" data-action="policy-all">Applica a tutti</button><button class="text-button" data-action="policy-reset">Ripristina consigliati</button></div>`;
    }
    if(modal==='audio'){
      cls='audio-window';content=`<h2>Audio</h2><label class="audio-switch"><input type="checkbox" id="audio-enabled" ${muted?'':'checked'}/> Effetti sonori</label><label class="audio-switch"><input type="checkbox" id="haptics-enabled" ${sounds.haptics?'checked':''}/> Vibrazione Android</label><label for="audio-volume">Volume</label><input id="audio-volume" type="range" min="0" max="100" value="${Math.round(sounds.volume*100)}"/><button class="primary full" data-action="audio-test">Prova il clash</button><p>Il volume multimediale del telefono deve essere attivo.</p>`;
    }
    if (modal === 'replace') {
      content = '<span class="eyebrow">NUOVA PARTITA</span><h2>Aprire un nuovo tavolo?</h2><p>La partita in corso verrà sostituita. Le statistiche delle partite concluse rimangono salvate.</p><button class="primary full" data-action="confirm-new">Crea il nuovo tavolo</button>';
    }
    if (modal === 'rules') {
      content = '<span class="eyebrow">COME SI GIOCA</span><h2>La strategia, in breve.</h2><div class="rules-copy"><p>Rinforza, attacca, effettua uno spostamento tra territori adiacenti e pesca una carta se hai conquistato almeno un territorio.</p><p>Si attacca e si difende con il massimo dei dadi, fino a tre. Non puoi attaccare con meno dadi del difensore. I pareggi favoriscono la difesa.</p><p>I tris valgono 8, 10 o 12 armate, più 2 per ogni carta territorio posseduta. Puoi conservare fino a 7 carte e schierare fino a 130 carri.</p><p>Conquista il tuo obiettivo per vincere subito. Dal termine del giro 20, la sdadata può chiudere la partita: soglia 4, poi 5, 6 e 7. Con tre conquiste o più non si lancia.</p><p>Gli avversari non possono essere eliminati nei primi quattro giri. Una guarnigione di almeno due carri deve rimanere sui confini nemici quando sposti volontariamente.</p><p>Alla scadenza del turno vengono completati i piazzamenti e i movimenti obbligatori; poi il turno termina. L’app in background mette in pausa la partita.</p><p><b>Modalità Antartide (facoltativa):</b> 44 territori e 46 carte. Antartide Occidentale confina con Argentina e Antartide Orientale; Antartide Orientale confina anche con Africa del Sud e Australia Orientale. Il controllo di entrambe dà +2 armate a turno. I due territori valgono 3 punti ciascuno fuori obiettivo; gli obiettivi Torneo restano da 86 punti. Dotazioni iniziali e mani da tre restano invariate.</p><p><b>Countdown:</b> scegli 30, 45 o 60 minuti (45 predefiniti). Il tempo inizia dopo il piazzamento iniziale; pausa e animazioni non consumano tempo. Alla scadenza vince la classifica a punti, senza Sdadata. RisiKo! resta una vittoria immediata.</p><p><b>Annulla piazzamento:</b> durante i rinforzi puoi annullare i tuoi ultimi piazzamenti fino a premere Inizia attacco. Le decorazioni dei badge a 5, 10 e 12 carri sono solo grafiche: resta il limite di 130 carri per giocatore.</p><p class="muted">Riferimento: il file “RisiKo! Online – Come si gioca” fornito dall’utente, integrato con le regole concordate. Ricostruzione indipendente offline, non affiliata a Spin Master.</p></div>';
    }
    if (modal === 'objective') {
      const o = objectives[s!.players[0].objective! - 1];
      content = `<span class="eyebrow">RISERVATO AL COMANDANTE</span><h2>IL TUO OBIETTIVO</h2>${miniObjective(o.id)}<div class="objective-score"><b>${points()}</b><span>/ 86 punti</span></div><p>Occupa tutti i territori evidenziati per fare RisiKo!</p>${s?.antarctica?'<p class="card-hint">Antartide: +2 rinforzi con entrambi i territori. Valgono 3 punti ciascuno fuori obiettivo; gli obiettivi restano da 86 punti.</p>':''}<button class="primary full" data-action="objective-map">Mostra Punti su Mappa ◎</button><details><summary>Territori dell’obiettivo</summary><p>${o.territories.map(t => `${escape(territories[t].name)} (${territories[t].points})`).join(' · ')}</p></details>`;
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
      content = `<div class="combat-title"><div><small>ATTACCO</small><h2>${escape(a.name)}</h2><strong>${s!.board[a.id].armies} carri</strong></div><span>→</span><div><small>DIFESA</small><h2>${escape(d.name)}</h2><strong>${s!.board[d.id].armies} carri</strong></div></div><div class="combat-preview">${matching?`<div>${matching.attack!.map((n,i)=>dieMarkup(n,'#d93829',i)).join('')}</div><span>vs</span><div>${matching.defense!.map((n,i)=>dieMarkup(n,'#2784df',i)).join('')}</div>`:'Seleziona «Attacca 1 volta» per lanciare i dadi.'}</div><div class="conquest-odds">Probabilità di conquista: <b>${Math.round(conquestOdds(s!.board[a.id].armies,s!.board[d.id].armies)*100)}%</b></div><label class="blitz-stop" for="blitz-stop">Stop Blitz sotto <b id="blitz-limit">${blitzStop}</b> carri<input id="blitz-stop" type="range" min="2" max="${Math.max(2,s!.board[a.id].armies)}" value="${blitzStop}"/></label><div class="combat-actions"><button class="primary" data-action="roll" ${pendingCommand||!canAttack(s!,a.id,d.id)?'disabled':''}>Attacca 1 volta</button><button class="secondary ${blitz?'active':''}" data-action="blitz" ${!canAttack(s!,a.id,d.id)?'disabled':''}>${blitz?'Ferma blitz':'Blitz'}</button><button class="text-button" data-action="close">Ritirati</button></div>`;
      cls = 'combat';
    }
    if (modal === 'move' && selected !== null && target !== null) {
      const bounds = moveBounds(s!, selected, target);
      moveCount = Math.max(bounds.min, Math.min(bounds.max, moveCount));
      const conquest=s!.phase==='POST_CONQUEST_MOVE';
      cls='move-panel';
      content = `<div class="move-heading"><small>${conquest?'TERRITORIO CONQUISTATO':'SPOSTAMENTO STRATEGICO'}</small><h2>${escape(territories[target].name)}</h2><p>Da ${escape(territories[selected].name)}</p></div>${conquest?`<p class="transferred-note">${s!.pending!.transferred??0} carri già trasferiti</p>`:''}<label class="move-label" for="move-range">${conquest?'Carri aggiuntivi':'Carri da spostare'} <strong id="move-number">${moveCount}</strong></label><input type="range" id="move-range" min="${bounds.min}" max="${bounds.max}" value="${moveCount}" aria-label="${conquest?'Carri aggiuntivi':'Armate da spostare'}"/><div class="move-shortcuts">${['Min','−1','+1','+5','Max'].map(x=>`<button class="secondary" data-move="${x}" aria-label="${x==='Min'?'Minimo':x==='Max'?'Massimo':x}">${x}</button>`).join('')}</div><button class="primary full" data-action="confirm-move">Conferma spostamento</button>`;
    }
    const floating=modal==='combat'||modal==='move';
    return `<div class="${floating?'floating-wrap':consulting()?'modal-backdrop consultation':'modal-backdrop'}"><section class="modal ${cls} ${floating?'floating-panel':''}" ${floating?'data-floating':''} role="dialog" aria-modal="${!floating}">${floating?'<header data-drag-handle>Trascina per spostare la finestra</header>':''}${modal==='move'&&s?.phase === 'POST_CONQUEST_MOVE' ? '' : '<button class="close-button" data-action="close" aria-label="Chiudi">×</button>'}${content}</section></div>`;
  }
  function refreshDialogs() {
    const host=root.querySelector<HTMLElement>('#dialogs');
    if(!host)return;
    const markup=presenting&&!consulting()?'':modalMarkup();
    if(markup===dialogMarkup)return;
    if(dialogExit){clearTimeout(dialogExit);dialogExit=null;}
    if(!markup && host.firstElementChild?.classList.contains('consultation') && !state?.paused && screen==='table'){
      dialogMarkup='';host.firstElementChild.classList.add('dialog-leaving');
      dialogExit=setTimeout(()=>{if(!dialogMarkup)host.innerHTML='';dialogExit=null;},160);
      return;
    }
    const hand=host.querySelector<HTMLElement>('.hand');
    const scroll=hand?.scrollTop??0;
    const active=document.activeElement as HTMLElement | null;
    const focus=active&&host.contains(active)?active:null;
    const card=focus?.dataset.card, action=focus?.dataset.action;
    host.innerHTML=markup;dialogMarkup=markup;
    const newHand=host.querySelector<HTMLElement>('.hand');if(newHand)newHand.scrollTop=scroll;
    if(card!==undefined)host.querySelector<HTMLElement>(`[data-card="${card}"]`)?.focus({preventScroll:true});
    else if(action)host.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus({preventScroll:true});
  }
  function previewMove() {
    if(!state || presenting || modal!=='move' || selected===null || target===null)return;
    for(const [id,delta] of [[selected,-moveCount],[target,moveCount]]) {
      const token=root.querySelector<SVGElement>(`[data-token="${id}"]`);
      const number=token?.querySelector<SVGTextElement>('.tank-number');
      if(number){number.textContent=String(state.board[id].armies+delta);number.style.fontSize=`${counterFontSize(state.board[id].armies+delta)}px`;}
      token?.classList.toggle('move-preview',delta!==0);
    }
  }
  function render(force=false) {
    const homeScroll=screen==='home'?root.querySelector<HTMLElement>('.classic-settings')?.scrollTop??0:0;
    if(presenting&&!force){refreshDialogs();const widget=root.querySelector(".objective-widget");if(widget)widget.outerHTML=objectiveWidget();return;}
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
    const sceneMarkup=screen === 'home' ? home() : screen === 'profile' ? profilePage() : screen === 'results' ? results() : state ? table() : home();
    const scene=root.querySelector<HTMLElement>('#scene');
    if(scene){scene.innerHTML=sceneMarkup;refreshDialogs();}
    else {
      dialogMarkup=presenting&&!consulting()?'':modalMarkup();
      root.innerHTML = `<div class="app-shell"><div id="scene">${sceneMarkup}</div><div id="dialogs">${dialogMarkup}</div><div id="effects" class="effects-layer"></div><div id="toast" role="status" class="toast"></div><div class="portrait-notice"><span>↻</span><h2>Ruota il dispositivo</h2><p>La tua strategia merita tutta la plancia.<br>Gioca in orizzontale.</p></div></div>`;
    }
    const homePanel=screen==='home'?root.querySelector<HTMLElement>('.classic-settings'):null;
    if(homePanel)homePanel.scrollTop=homeScroll;
    bindMap();
    fitMapTargets();
    previewMove();
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
      h: mapFor(config).height
    };
    speed=config.botSpeed??1;
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
  function setZoom(factor: number, deferred=false) {
    const nw = Math.max(380, Math.min(1240, viewport.w * factor)),
      nh = nw * mapFor(state??{}).height / 1240;
    viewport.x += (viewport.w - nw) / 2;
    viewport.y += (viewport.h - nh) / 2;
    viewport.w = nw;
    viewport.h = nh;
    if(deferred)scheduleMapUpdate();else updateMap();
  }
  let mapFrame:number|null=null;
  function scheduleMapUpdate(){
    if(!globalThis.requestAnimationFrame){updateMap();return;}
    if(mapFrame===null)mapFrame=requestAnimationFrame(()=>{mapFrame=null;updateMap();});
  }
  function updateMap() {
    viewport.x = Math.max(-100, Math.min(1240 - viewport.w + 100, viewport.x));
    viewport.y = Math.max(-70, Math.min(mapFor(state??{}).height - viewport.h + 70, viewport.y));
    root.querySelector('#world-map')?.setAttribute('viewBox', `${viewport.x} ${viewport.y} ${viewport.w} ${viewport.h}`);
    fitMapTargets();
  }
  function fitMapTargets(){
    const svg=root.querySelector<SVGSVGElement>('.game-table #world-map'),matrix=svg?.getScreenCTM?.();
    if(!svg||!matrix)return;
    const scale=Math.max(.01,Math.hypot(matrix.a,matrix.b));
    const key=scale.toFixed(5);if(svg.dataset.hitScale===key)return;svg.dataset.hitScale=key;
    svg.querySelectorAll<SVGCircleElement>('.territory-hit').forEach(el=>el.setAttribute('r',String(22/scale)));
    // Only invisible touch targets remain 44 CSS pixels. Artwork and names
    // stay in map coordinates, so zoom scales them with their territories.
  }
  function territoryAtPoint(svg:SVGSVGElement,x:number,y:number,fallback:number|null){
    const matrix=svg.getScreenCTM?.();if(!matrix||!state)return fallback;
    const candidates=mapFor(state).territories.map(t=>({id:t.id,distance:Math.hypot(matrix.a*t.x+matrix.c*t.y+matrix.e-x,matrix.b*t.x+matrix.d*t.y+matrix.f-y)})).filter(t=>t.distance<=22).sort((a,b)=>a.distance-b.distance);
    return candidates[0]?.id??fallback;
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
      startId=territoryAtPoint(svg,e.clientX,e.clientY,startId);
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
        if (lastDistance) setZoom(lastDistance / dist,true);
        lastDistance = dist;
        moved = true;
      } else if (moved) {
        // SVG preserveAspectRatio can add wide letterboxes; element width is
        // not the drawing scale. Convert the actual screen transform instead.
        const matrix=svg.getScreenCTM();
        if(matrix){const determinant=matrix.a*matrix.d-matrix.b*matrix.c;
          if(Math.abs(determinant)>1e-8){viewport.x-=(matrix.d*dx-matrix.c*dy)/determinant;viewport.y-=(-matrix.b*dx+matrix.a*dy)/determinant;}
        }
        scheduleMapUpdate();
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
    void sounds.unlock();
    if(presenting && el.dataset.card===undefined && !['cards','objective','objective-map','objective-view','objective-widget','log','sound','close','pause','home','blitz','zoom-in','zoom-out','reset-map'].includes(el.dataset.action??''))return;
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
    if(el.dataset.strategy!==undefined){strategyBot=Number(el.dataset.strategy);modal='strategy';render();return;}
    switch (el.dataset.action) {
      case 'audio': modal='audio';render();break;
      case 'audio-test': void sounds.unlock().then(()=>{sounds.clash();if(!sounds.ready)toast('Tocca ancora Prova il clash per attivare l’audio.');});break;
      case 'policy-all': config.botPolicies=Array.from({length:4},()=>({...config.botPolicies![strategyBot]}));toast('Strategia applicata a tutti i bot');break;
      case 'policy-reset': config.botPolicies![strategyBot]=botPolicy();render();break;
      case 'exchange-selected':
        if(state&&exchangeValue(state,0,cardSelection)>0)command({type:'EXCHANGE',cards:[...cardSelection]});
        break;
      case 'undo-place':command({type:'UNDO_PLACE'});break;
      case 'objective-widget':objectiveExpanded=!objectiveExpanded;render();break;
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
        if(consulting() && (state?.phase!=='POST_CONQUEST_MOVE'||!humanTurn())){
          modal=null;blitz=false;
          if(root.querySelector('#dialogs'))refreshDialogs();else render();
          break;
        }
        if (state?.phase !== 'POST_CONQUEST_MOVE' || !humanTurn()) modal = null;
        else if(consulting()) modal = 'move';
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
        if(blitz && state!.board[selected!].armies<blitzStop){blitz=false;toast('Soglia di arresto del Blitz raggiunta.');}
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
        muted = !muted;sounds.muted=muted;sounds.save();
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
          h: mapFor(state??{}).height
        };
        updateMap();
        break;
    }
  }
  function change(e: Event) {
    const el = e.target as HTMLInputElement;
    if(el.id==='end-mode'){config.endMode=el.value as 'regular'|'countdown';render();return;}
    if(el.id==='countdown-minutes')config.countdownMinutes=Number(el.value);
    if(el.id==='bot-speed')config.botSpeed=Number(el.value);
    if(el.id==='bot-personality')config.botPolicies![strategyBot].personality=el.value as never;
    if(el.id==='haptics-enabled'){sounds.haptics=el.checked;sounds.save();}
    if(el.id==='blitz-stop'){blitzStop=Number(el.value);const label=root.querySelector('#blitz-limit');if(label)label.textContent=el.value;}
    if(el.id==='antarctica-mode'){config.antarctica=el.checked;render();return;}
    if(el.dataset.policy){const key=el.dataset.policy as typeof policyOptions[number][0];config.botPolicies![strategyBot][key]=el.checked;}
    if(el.id==='grace-rounds')config.botPolicies![strategyBot].graceRounds=Number(el.value);
    if(el.id==='audio-enabled'){muted=!el.checked;sounds.muted=muted;sounds.save();}
    if(el.id==='audio-volume'){sounds.volume=Number(el.value)/100;sounds.save();}
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
      previewMove();
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
    if(presenting&&!consulting())return;
    if (e.key === 'Escape' && (state?.phase !== 'POST_CONQUEST_MOVE' || !humanTurn())) {
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
  globalThis.addEventListener?.('resize',fitMapTargets);
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
    if(data.type==='CLOCK'){
      if(state&&state.id===data.id&&state.revision===data.revision&&!presenting){
        state={...state,remainingMs:data.remainingMs,matchRemainingMs:data.matchRemainingMs,elapsedMs:data.elapsedMs};
        const timer=root.querySelector('#timer'),match=root.querySelector('#match-timer');
        if(timer)timer.textContent=state.phase==='SETUP_PLACEMENT'?'—':duration(state.remainingMs);
        if(match)match.textContent=duration(state.matchRemainingMs??0);
      }
      return;
    }
    if(data.type==='LOCAL_SAVE'){if(!writeLocalSnapshot(data.state)&&!localSaveWarning){localSaveWarning=true;toast('Copia locale non disponibile; il salvataggio principale resta in IndexedDB.');}return;}
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
        restoreViewport={...viewport};viewport={x:0,y:0,w:1240,h:mapFor(state??{}).height};
      }
      // The map already shows transition.before. Keep its SVG mounted while
      // effects run, instead of reparsing every path twice per action.
      if(root.querySelector('#world-map')){updateMap();refreshDialogs();}
      else render(true);

      cancelEffects=playTransition(root,t,()=>{
        if(presenting?.id!==t.id)return;
        lastPresentedId=t.id;lastBattleMessage=t.after.lastBattle?.message??'';cancelPresentation();send({type:'PRESENTED',id:t.id});receiveState(t.after);
      },()=>sounds.clash(),cue=>{if(cue==='deploy')sounds.playDeploy();if(cue==='dice')sounds.playDiceRoll();if(cue==='conquest')sounds.playConquest();if(cue==='draw')sounds.playCardDraw();if(cue==='trade')sounds.playCardTrade();});
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
      if(previous?.id===state.id && previous.active!==0 && state.active===0 && !state.paused)sounds.playTurnStart();
      if(!previous||previous.id!==state.id)viewport={x:0,y:0,w:1240,h:mapFor(state).height};
      if (state && state.id !== previous?.id) profile.name = state.players[0].name;
      hasGame = state!.phase !== 'GAME_OVER';
      const changed = !previous || previous.revision !== state!.revision || previous.paused !== state!.paused || previous.id !== state!.id;
      if (changed) {
        pendingCommand = false;
        if (previous?.active !== state!.active) {
          selected = null;
          target = null;
          if(!consulting())modal = null;
          blitz = false;
        }
        if(modal==='combat' && target!==null && state!.phase==='ATTACK' && state!.board[target].owner===0){
          selected=target;target=null;modal=null;blitz=false;
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
          if(previous?.pending?.from!==state!.pending!.from || previous?.pending?.to!==state!.pending!.to || previous?.phase!=='POST_CONQUEST_MOVE' || previous?.paused)moveCount = moveBounds(state!,selected,target).min;
          if(!consulting())modal = 'move';
          blitz = false;
        }
        if (state!.lastBattle?.message !== lastBattleMessage) {
          lastBattleMessage = state!.lastBattle?.message ?? '';

        }
        render();
        if (blitz && modal === 'combat' && selected !== null && target !== null) {
          if (state!.board[selected].armies>=blitzStop && canAttack(state!, selected, target)) {
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
        const matchTimer=root.querySelector('#match-timer');if(matchTimer)matchTimer.textContent=duration(state!.matchRemainingMs??0);
        if (timer) timer.textContent = state!.phase === 'SETUP_PLACEMENT' ? '—' : duration(state!.remainingMs);
      }
    }
  worker.onerror = e => toast(`Errore del motore: ${e.message}`);
  render();
  send({
    type: 'INIT', presentation: true, snapshot:readLocalSnapshot()
  });
  return () => {
    globalThis.removeEventListener?.('resize',fitMapTargets);
    if(mapFrame!==null)cancelAnimationFrame(mapFrame);
    if(dialogExit)clearTimeout(dialogExit);
    cancelPresentation();
    sounds.dispose();
    worker.terminate();
    root.removeEventListener('click', click);
    root.removeEventListener('input', change);
    document.removeEventListener('visibilitychange', visibility);
    document.removeEventListener('risiko-pause', nativePause);
  };
}
