import {allTerritories as territories,allCards as cards} from '../../data/mapGraph.ts';
import {exchangeValue} from '../../engine/RisikoRulesEngine.ts';
import {escapeHtml as escape,cardFace} from '../art.ts';
import {icon} from '../Icons.ts';
import type {GameView} from '../../engine/types.ts';

function bonusTank(value:number){
 // Side profile of the bonus counter. The hull is the field for the number.
 return `<svg class="bonus-miniature" viewBox="0 0 200 78" role="img" aria-label="Bonus: ${value} armate">
 <defs><linearGradient id="bonus-enamel" x2="0" y2="100%"><stop stop-color="#4775db"/><stop offset=".36" stop-color="#3159ba"/><stop offset=".72" stop-color="#233e91"/><stop offset="1" stop-color="#294ca4"/></linearGradient></defs>
 <path d="M29 24H47V8Q47 5 51 5H90Q94 5 94 9H188Q192 9 192 12V16Q192 19 189 19H158L155 26H133L129 28Q147 32 147 49Q147 71 126 73H28Q5 73 5 50Q5 30 24 25Z" fill="url(#bonus-enamel)" stroke="#8aa5df" stroke-width="2.5" stroke-linejoin="round"/>
 <path d="M28 29H122Q141 29 141 49Q141 66 124 68H29Q12 68 12 50Q12 32 28 29Z" fill="#203e88" stroke="#5177c5" stroke-width="3"/>
 <path d="M17 51Q17 35 30 35H119" fill="none" stroke="#162e68" stroke-width="5" stroke-linecap="round"/>
 <text x="77" y="44" text-anchor="middle" dominant-baseline="central" fill="#fff" stroke="#17294c" stroke-width="1.3" paint-order="stroke" font-family="system-ui,sans-serif" font-size="39" font-weight="900">+${value}</text></svg>`;
}
export function cardsView(s:GameView,human:boolean,cardSelection:number[],pendingCommand:boolean){
 const hand=s.players[s.viewer].cards??[],allowed=human&&s.phase==='TRIS_EXCHANGE';
 const selected=cardSelection.filter(id=>hand.includes(id));
 const bonuses=selected.flatMap(id=>{const t=cards[id].territory;return t!==null&&s.board[t].owner===s.viewer?[territories[t].name]:[];});
 const value=exchangeValue(s,s.viewer,selected);
 const name=(id:number)=>escape(cards[id].territory===null?'Jolly':territories[cards[id].territory!].name);
 return `<h2>LE TUE CARTE</h2><details class="card-guide"><summary aria-label="Regole del tris">?</summary><p>Tre uguali: +8. Tre diversi: +10. Jolly e due uguali: +12. Ogni carta territorio posseduta vale altri +2.</p></details>
 <p class="card-instructions">Seleziona 3 CARTE compatibili<br>per ottenere ARMATE BONUS</p><span class="sr-only">Carte territorio</span>
 <div class="hand ${selected.length===3?'complete':''}">${hand.map(id=>`<button class="territory-card ${selected.includes(id)?'chosen':''}" data-card="${id}" aria-pressed="${selected.includes(id)}" aria-label="${name(id)} · ${cards[id].symbol}">${cardFace(id)}</button>`).join('')||'<div class="empty-state">NON HAI CARTE<br><small>Conquista un territorio per pescare a fine turno.</small></div>'}</div>
 <div class="tris-tray">${selected.map((id,i)=>`<button class="tris-slot" data-remove-card="${id}" aria-label="Rimuovi carta ${i+1}">${name(id)} ${icon('close')}</button>`).join('')}</div>
 <div class="card-bonus" aria-live="polite"><small>DOTAZIONE AGGIUNTIVA:</small>${bonusTank(value)}</div>
 ${value&&bonuses.length?`<p class="card-owned-bonus">Inclusi ${bonuses.map(n=>escape(n)+' +2').join(' · ')}</p>`:''}
 <button class="primary full trade-cards" data-action="exchange-selected" ${allowed&&value>0&&!pendingCommand?'':'disabled'}><span aria-hidden="true">✓</span><b>Usa le carte<br>selezionate</b></button>
 <p class="card-hint">${!allowed?'Puoi cambiare un tris soltanto all’inizio del tuo turno.':selected.length===3&&!value?'Queste tre carte non formano un tris.':''}</p>`;
}
