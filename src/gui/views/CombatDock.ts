import {allTerritories as territories} from '../../data/mapGraph.ts';
import {canAttack,moveBounds} from '../../engine/RisikoRulesEngine.ts';
import {conquestOdds} from '../../ai/BotAI.ts';
import {conquestEstimate} from '../../ai/Strategy.ts';
import {escapeHtml as e,dieMarkup} from '../art.ts';
import {icon} from '../Icons.ts';
import type {GameView} from '../../engine/types.ts';
export function combatDock(s:GameView,selected:number,target:number,pending:boolean,stop:number,blitz:boolean){
 const from=territories[selected],to=territories[target],a=s.board[selected].armies,d=s.board[target].armies;
 const last=s.lastBattle?.from===selected&&s.lastBattle.to===target?s.lastBattle:null,legal=canAttack(s,selected,target);
 return `<div class="atlas-attack-strip"><strong title="${e(from.name)}">${e(from.short)} ${a}</strong>${icon('move')}<strong title="${e(to.name)}">${e(to.short)} ${d}</strong><b class="odds" title="Probabilità di conquista">${Math.round(conquestOdds(a,d)*100)}%</b>
 <button class="secondary" data-action="roll" ${pending||!legal?'disabled':''}>Attacca</button><button class="primary" data-action="blitz" ${!legal?'disabled':''}>${icon('bolt')}${blitz?'Ferma Blitz':'Blitz'}</button></div>
 <details class="attack-options"><summary>Soglia Blitz e dadi</summary><div class="blitz-stepper"><button data-blitz-step="-1" aria-label="Riduci soglia">−</button><span>Stop Blitz · <b id="blitz-limit">${stop}</b></span><button data-blitz-step="1" aria-label="Aumenta soglia">+</button></div><p>Superstiti attesi · ${conquestEstimate(a,d).survivors.toFixed(1)}</p>${last?`<div class="combat-preview"><div>${last.attack!.map((n,i)=>dieMarkup(n,'#B8322F',i)).join('')}</div>vs<div>${last.defense!.map((n,i)=>dieMarkup(n,'#F2E7D3',i)).join('')}</div></div>`:''}</details>`;
}
export function moveDock(s:GameView,from:number,to:number,count:number){
 const bounds=moveBounds(s,from,to);count=Math.max(bounds.min,Math.min(bounds.max,count));const conquest=s.phase==='POST_CONQUEST_MOVE';
 return {count,content:`<div class="move-heading"><h2 class="sr-only">${icon('move')}${conquest?'Territorio conquistato':'Spostamento'}</h2><p>${e(territories[from].name)} → ${e(territories[to].name)}</p></div><label class="move-label" for="move-range">${conquest?`Aggiuntivi (${s.pending!.transferred??0} carri già trasferiti)`:'Carri da spostare'} <strong id="move-number">${count}</strong></label><input type="range" id="move-range" min="${bounds.min}" max="${bounds.max}" value="${count}" aria-label="${conquest?'Carri aggiuntivi':'Armate da spostare'}"/><div class="move-shortcuts">${['Min','−1','+1','+5','Max'].map(n=>`<button class="secondary" data-move="${n}" aria-label="${n==='Min'?'Minimo':n==='Max'?'Massimo':n}">${n}</button>`).join('')}</div><button class="primary full" data-action="confirm-move">Conferma spostamento</button>`};
}
