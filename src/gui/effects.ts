import {territories} from '../data/mapGraph.ts';
import {effectDuration, sequenceScale} from '../engine/presentation.ts';
import type {Transition, VisualEffect} from '../engine/presentation.ts';
import {armyToken, cardFace, dieMarkup, escapeHtml} from './art.ts';

export function effectMarkup(e: VisualEffect, t: Transition) {
  const player = t.before.players[e.player];
  if (e.kind === 'battle') {
    const defender = t.before.players[e.defender];
    return `<section class="battle-window fx-window" data-floating role="status" aria-label="Combattimento"><header data-drag-handle>COMBATTIMENTO ${player.human?'<button data-action="blitz" class="stop-blitz">Ferma blitz</button>':''}</header><div class="battle-sides">${[[e.from,e.attack,player.color,'ATTACCO',e.losses[0]],[e.to,e.defense,defender.color,'DIFESA',e.losses[1]]].map(([id,dice,color,label,loss],i)=>`<div class="battle-side side-${i}"><small>${label}</small><strong>${escapeHtml(territories[id as number].name)}</strong><div class="dice-bowl">${(dice as number[]).map((n,j)=>dieMarkup(n,color as string,j+i*3)).join('')}</div><span class="loss-label">−${loss} carri</span></div>`).join('')}</div><div class="battle-comparison">${e.attack.slice(0,e.defense.length).map((n,i)=>`<span>${n} ${n>e.defense[i]?'›':'≤'} ${e.defense[i]} <b>${n>e.defense[i]?'difesa −1':'attacco −1'}</b></span>`).join('')}</div>${e.conquered?'<p class="conquest-label">Territorio conquistato!</p>':''}</section>`;
  }
  if (e.kind === 'sdadata') return `<section class="fx-window sdadata-window" role="status"><header>SDADATA · ${escapeHtml(player.name)}</header><div class="dice-bowl">${e.dice.map((n,i)=>dieMarkup(n,player.color,i)).join('')}</div><p class="battle-comparison">${e.dice.join(' + ')} = ${e.dice.reduce((a,b)=>a+b,0)} · chiusura ≤ ${e.threshold}</p></section>`;
  if (e.kind === 'draw') return `<section class="card-reward" role="status"><h2>${e.player===t.before.viewer?'HAI RICEVUTO UNA CARTA':`${escapeHtml(player.name)} pesca una carta`}</h2><div class="reward-flight"><div class="reward-flip ${e.card===undefined?'hidden-card':''}"><div class="reward-back">${cardFace()}</div><div class="reward-front">${cardFace(e.card)}</div></div></div></section>`;
  if (e.kind === 'exchange') return `<section class="exchange-effect" role="status"><h2>CAMBIO TRIS</h2><div class="exchange-cards">${(e.cards??[undefined,undefined,undefined]).map(c=>cardFace(c)).join('')}</div><div class="exchange-bonus">${armyToken(e.count,player.color)}<strong>+${e.count} rinforzi</strong></div></section>`;
  return `<div class="map-effect-caption" role="status">${escapeHtml(player.name)} · ${e.kind==='place'?`+${e.count} in ${escapeHtml(territories[e.to].name)}`:`${escapeHtml(territories[e.from].name)} → ${escapeHtml(territories[e.to].name)} · ${e.count} carri`}</div>`;
}

export function positionPanel(root: HTMLElement, panel: HTMLElement, ids: number[]) {
  const svg = root.querySelector<SVGSVGElement>('#world-map');
  const bounds = root.getBoundingClientRect(), width = panel.offsetWidth, height = panel.offsetHeight;
  const points = ids.flatMap(id => {
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return [];
    const p = svg.createSVGPoint(); p.x=territories[id].x; p.y=territories[id].y;
    const screen = p.matrixTransform(matrix); return [{x:screen.x,y:screen.y}];
  });
  const left = bounds.left + 80, right = Math.max(bounds.left+8, bounds.right-width-66);
  const top = bounds.top+65, bottom = Math.max(bounds.top+8, bounds.bottom-height-75);
  const choices = [{x:left,y:bottom},{x:right,y:bottom},{x:left,y:top},{x:right,y:top}];
  const score = (c: {x:number;y:number}) => points.reduce((s,p)=>s+(p.x>c.x-30&&p.x<c.x+width+30&&p.y>c.y-30&&p.y<c.y+height+30?1000:0),0);
  choices.sort((a,b)=>score(a)-score(b));
  const c=choices[0]; panel.style.left=`${Math.max(8,Math.min(innerWidth-width-8,c.x))}px`; panel.style.top=`${Math.max(8,Math.min(innerHeight-height-8,c.y))}px`;
  panel.style.transform='none';
}
export function bindPanelDrag(panel: HTMLElement) {
  const handle=panel.querySelector<HTMLElement>('[data-drag-handle]');
  if(!handle)return;
  let drag: {id:number;x:number;y:number;left:number;top:number}|null=null;
  handle.onpointerdown=e=>{
    if((e.target as Element).closest('button'))return;
    const r=panel.getBoundingClientRect(); drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};
    handle.setPointerCapture(e.pointerId); e.preventDefault();
  };
  handle.onpointermove=e=>{
    if(!drag||drag.id!==e.pointerId)return;
    panel.style.left=`${Math.max(6,Math.min(innerWidth-panel.offsetWidth-6,drag.left+e.clientX-drag.x))}px`;
    panel.style.top=`${Math.max(6,Math.min(innerHeight-panel.offsetHeight-6,drag.top+e.clientY-drag.y))}px`;
    panel.style.transform='none';
  };
  handle.onpointerup=handle.onpointercancel=()=>{drag=null;};
}

/** Runs on a separate layer: no full-page render between dice frames. */
export function playTransition(root: HTMLElement, t: Transition, finished: () => void): () => void {
  const host = root.querySelector<HTMLElement>('#effects');
  if (!host) { finished(); return ()=>{}; }
  const timers: ReturnType<typeof setTimeout>[]=[];
  let stopped=false;
  const later=(f:()=>void, ms:number)=>timers.push(setTimeout(()=>{if(!stopped)f();},ms));
  const clearMap=()=>{
    root.querySelectorAll('.fx-source,.fx-target,.fx-place').forEach(el=>el.classList.remove('fx-source','fx-target','fx-place'));
    root.querySelector('#map-fx')?.remove();
  };
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function run(index:number) {
    if(stopped)return;
    clearMap();
    const e=t.effects[index];
    if(!e){host!.innerHTML='';finished();return;}
    const duration=(reduced?Math.min(450,effectDuration(e,t.speed)):effectDuration(e,t.speed))*sequenceScale(t);
    host!.style.setProperty('--effect-ms',`${duration}ms`);
    host!.className=`effects-layer effect-${e.kind} ${reduced?'reduced-effects':''}`;
    host!.innerHTML=effectMarkup(e,t);
    const panel=host!.querySelector<HTMLElement>('[data-floating]');
    if(panel){positionPanel(root,panel,e.kind==='battle'?[e.from,e.to]:[]);bindPanelDrag(panel);}
    if('to' in e) {
      root.querySelector(`[data-territory="${e.to}"]`)?.classList.add(e.kind==='place'?'fx-place':'fx-target');
      if('from' in e)root.querySelector(`[data-territory="${e.from}"]`)?.classList.add('fx-source');
      const svg=root.querySelector('#world-map');
      const target=territories[e.to];
      let path='';
      if('from' in e) {
        const source=territories[e.from];
        path=e.from===0&&e.to===29?`M${source.x} ${source.y}L0 ${source.y}M1240 ${target.y}L${target.x} ${target.y}`:
          e.from===29&&e.to===0?`M${source.x} ${source.y}L1240 ${source.y}M0 ${target.y}L${target.x} ${target.y}`:
          `M${source.x} ${source.y}Q${(source.x+target.x)/2} ${Math.min(source.y,target.y)-20} ${target.x} ${target.y}`;
      }
      svg?.insertAdjacentHTML('beforeend',`<g id="map-fx" pointer-events="none" style="--effect-ms:${duration}ms"><defs><marker id="attack-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#fff9ba"/></marker></defs>${path?`<path class="attack-trail" d="${path}" marker-end="url(#attack-arrow)"/>`:''}<circle class="attack-ring" cx="${target.x}" cy="${target.y}" r="18"/>${e.kind==='place'?`<text class="floating-add" x="${target.x}" y="${target.y-22}">+${e.count}</text>`:''}</g>`);
    }
    later(()=>host!.classList.add('rolling'),duration*.12);
    later(()=>{host!.classList.remove('rolling');host!.classList.add('resolved');},duration*.64);
    later(()=>host!.classList.add('show-losses'),duration*.78);
    later(()=>run(index+1),duration);
  }
  run(0);
  return ()=>{stopped=true;timers.forEach(clearTimeout);clearMap();host.innerHTML='';};
}
