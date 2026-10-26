import {territories} from '../data/mapGraph.ts';
import {effectDuration, sequenceScale} from '../engine/presentation.ts';
import type {Transition, VisualEffect} from '../engine/presentation.ts';
import {armyToken, counterFontSize, tankShape, cardFace, dieMarkup, escapeHtml} from './art.ts';

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
    root.querySelectorAll('.fx-source,.fx-target,.fx-place,.fx-conquer').forEach(el=>el.classList.remove('fx-source','fx-target','fx-place','fx-conquer'));
    root.querySelectorAll('.count-changing').forEach(el=>el.classList.remove('count-changing'));
    root.querySelectorAll('.count-before').forEach(el=>el.remove());
    root.querySelector('#map-fx')?.remove();
  };
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const board=t.before.board.map(cell=>({...cell}));
  function badge(id:number, delta:number, owner:number, duration:number) {
    if(!delta)return;
    const point=territories[id], color=t.before.players[owner].color;
    root.querySelector('#map-fx')?.insertAdjacentHTML('beforeend',`<g class="army-delta ${delta<0?'army-loss':''}" transform="translate(${point.x-19} ${point.y-34})" style="--counter-ms:${duration}ms"><g class="delta-rise"><path d="${tankShape}" fill="${color}"/><text x="17" y="20" style="font-size:${counterFontSize(delta,true)}px">${delta>0?'+':'−'}${Math.abs(delta)}</text></g></g>`);
  }
  function changeArmy(id:number, delta:number, owner:number, duration:number) {
    if(!delta && board[id].owner===owner)return;
    board[id].armies+=delta;board[id].owner=owner;
    const token=root.querySelector<SVGElement>(`[data-token="${id}"]`);
    const number=token?.querySelector<SVGTextElement>('.tank-number');
    if(token && number) {
      token.querySelector('.count-before')?.remove();
      const old=number.cloneNode(true) as SVGTextElement;
      old.classList.remove('tank-number');old.classList.add('count-before');
      number.parentElement?.append(old);
      number.textContent=String(board[id].armies);
      number.style.fontSize=`${counterFontSize(board[id].armies)}px`;
      token.querySelector('.tank-token')?.setAttribute('fill',t.before.players[owner].color);
      token.style.setProperty('--counter-ms',`${duration}ms`);
      token.classList.remove('count-changing');
      // Restart just the small SVG counter; the map and open windows stay mounted.
      token.getBoundingClientRect();token.classList.add('count-changing');
      later(()=>{old.remove();token.classList.remove('count-changing');},duration);
    }
    const cell=root.querySelector(`[data-territory="${id}"]`);
    cell?.setAttribute('aria-label',`${territories[id].name}: ${board[id].armies} armate, ${t.before.players[owner].name}`);
    badge(id,delta,owner,duration);
  }
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
      root.querySelector('#world-map')?.insertAdjacentHTML('beforeend', '<g id="map-fx" pointer-events="none"></g>');
      if(e.kind==='place')later(()=>changeArmy(e.to,e.count,e.player,duration*.75),duration*.15);
      if(e.kind==='move')later(()=>{
        changeArmy(e.from,-e.count,e.player,duration*.75);
        changeArmy(e.to,e.count,e.player,duration*.75);
      },duration*.15);
      if(e.kind==='battle') {
        later(()=>{
          changeArmy(e.from,-e.losses[0],e.player,duration*.28);
          // A conquered territory swaps directly to its compulsory garrison;
          // never show the intermediate empty territory to the player.
          if(!e.conquered)changeArmy(e.to,-e.losses[1],e.defender,duration*.28);
          else badge(e.to,-e.losses[1],e.defender,duration*.19);
        },duration*.64);
        if(e.conquered)later(()=>{
          const target=root.querySelector(`[data-territory="${e.to}"]`);
          target?.classList.add('fx-conquer');
          target?.classList.remove('fx-target');
          board[e.to].armies=0;
          changeArmy(e.from,-e.transferred,e.player,duration*.23);
          changeArmy(e.to,e.transferred,e.player,duration*.23);
        },duration*.77);
      }
    }
    later(()=>host!.classList.add('rolling'),duration*.12);
    later(()=>{host!.classList.remove('rolling');host!.classList.add('resolved');},duration*.64);
    later(()=>host!.classList.add('show-losses'),duration*.78);
    later(()=>host!.classList.add('effect-leaving'),Math.max(duration*.8,duration-160));
    later(()=>run(index+1),duration);
  }
  run(0);
  return ()=>{stopped=true;timers.forEach(clearTimeout);clearMap();host.innerHTML='';};
}
