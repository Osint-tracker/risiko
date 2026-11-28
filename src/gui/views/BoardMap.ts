import {ocean,legend,territoryName} from './boardInk.ts';
import {mapFor,objectives} from '../../data/mapGraph.ts';
import {seaRoute} from '../mapGeometry.ts';
import {canAttack,moveBounds,validTris,exchangeValue} from '../../engine/RisikoRulesEngine.ts';
import {allCards as cards} from '../../data/mapGraph.ts';
import {escapeHtml as escape,tankModel,armyBadge,territoryColors} from '../art.ts';
import type {GameView,GameConfig} from '../../engine/types.ts';
export type BoardMapContext={state:GameView|null;config:GameConfig;viewport:{x:number;y:number;w:number;h:number};selected:number|null;target:number|null;modal:string|null;inspected:number|null;mapLayer:string;objectiveView:boolean;presenting:boolean;human:boolean;cardSelection:number[]};
export function boardMap(context:BoardMapContext,preview=false){
 const {state,config,viewport,selected,target,modal,inspected,mapLayer,objectiveView,presenting,cardSelection}=context;
 const humanTurn=()=>context.human;

    const {territories,continents,seaLinks,height}=mapFor(preview?config:state??{});
    const labels: string[] = [];
    const spotlight=!preview&&humanTurn()&&selected!==null&&['ATTACK','FORTIFY'].includes(state!.phase);
    const reachable=(id:number)=>!spotlight?false:state!.phase==='ATTACK'?canAttack(state!,selected!,id):id!==selected&&moveBounds(state!,selected!,id).max>=1;
    const combo=!preview&&humanTurn()&&state?.phase==='TRIS_EXCHANGE'?(exchangeValue(state,state.viewer,cardSelection)>0?cardSelection:validTris(state,state.viewer,state.players[state.viewer].cards??[]).sort((a,b)=>b.value-a.value)[0]?.cards??[]):[];
    const bonusIds=combo.map(id=>cards[id].territory).filter((id):id is number=>id!==null&&state!.board[id].owner===state!.viewer);
    const s = state,
      goal = s?.players[s.viewer].objective ? objectives[s.players[s.viewer].objective! - 1].territories : [];
    return `<svg id="world-map" class="world-map ${preview ? 'preview' : ''}" viewBox="${preview ? `0 0 1240 ${height}` : `${viewport.x} ${viewport.y} ${viewport.w} ${viewport.h}`}" role="img" aria-label="Plancia interattiva: ${territories.length} territori">${ocean(height)}<g class="sea-links">${seaLinks.map(([a, b]) => {
      const route=seaRoute(territories[a],territories[b]);
      return `<path d="${route.path}"/>${route.anchors.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="2.3"/>`).join('')}`;
    }).join('')}</g><g class="continent-outlines" pointer-events="none">${continents.map(c=>`<g stroke="#359bbd" stroke-width="6" stroke-linejoin="round">${territories.filter(t=>t.continent===c.id).map(t=>`<path d="${t.path}" fill="none"/>`).join('')}</g>`).join('')}</g><g><g>${territories.map(t => {
      const cell = s?.board[t.id],
        p = cell ? s!.players[cell.owner] : null,
        c = continents.find(c => c.id === t.continent)!,
        dim = !preview && objectiveView && !goal.includes(t.id),
        legal = reachable(t.id);
      const landColor=mapLayer==='control'&&p?p.color:territoryColors[t.id]??c.color;
      const placeable = !preview && humanTurn() && !presenting && cell?.owner === s!.viewer && ['SETUP_PLACEMENT','REINFORCEMENT'].includes(s!.phase);
      if (!preview) labels.push(`<g data-token="${t.id}" class="territory-label ${dim ? 'dim' : ''}" pointer-events="none">${territoryName(t,landColor)}<g class="army-map-icon" data-x="${t.x}" data-y="${t.y}" transform="translate(${t.x-22} ${t.y-14}) scale(.7)">${tankModel(p?.color??'#899')}${armyBadge(cell?.armies??0,p?.color??'#899')}</g>${objectiveView?`<g class="objective-points" transform="translate(${t.x-18} ${t.y-49})"><rect width="40" height="17" rx="6"/><text x="20" y="12">+${goal.includes(t.id)?t.points:0} pt</text></g>`:''}${selected===t.id&&spotlight?`<circle class="source-ring" cx="${t.x}" cy="${t.y}" r="30"/>`:''}</g>`);
      return `<g data-territory="${t.id}" class="territory ${bonusIds.includes(t.id)?'card-bonus-territory':''} ${placeable ? 'placeable' : ''} ${dim ? 'dim' : ''} ${selected === t.id && !preview ? 'selected' : ''} ${target === t.id && !preview ? 'target' : ''} ${legal ? 'attackable' : ''} ${modal==='inspect'&&inspected!==null&&territories[inspected].neighbors.includes(t.id)?'inspected-neighbor':''} ${objectiveView && goal.includes(t.id) && !preview ? 'goal' : ''}" tabindex="${preview ? -1 : 0}" role="button" aria-label="${escape(t.name)}: ${t.points} punti${p ? `, ${escape(p.name)}, ${cell!.armies} armate` : ''}"><title>${escape(t.name)} · ${t.points} punti${p ? ` · ${escape(p.name)} · ${cell!.armies} carri` : ''}</title><path class="land" d="${t.path}" fill="${landColor}"/><path class="printed-grain" d="${t.path}" fill="url(#land-grain)" pointer-events="none"/><circle class="territory-hit" cx="${t.x}" cy="${t.y}" r="17" fill="transparent"/>${placeable?`<g class="placement-plus" transform="translate(${t.x+23} ${t.y-5})"><circle class="placement-plus-hit" r="22" fill="transparent"/><circle class="placement-plus-disc" r="10"/><path d="M-5 0H5M0-5V5"/></g>`:''}</g>`;
    }).join('')}</g></g>${labels.join('')}<g class="compass" transform="translate(537 526)"><circle r="37" fill="none" stroke="#75c4d9" stroke-width="2"/><circle r="31" fill="none" stroke="#75c4d9" stroke-width=".7"/><path d="M-25-25L0-10L25-25L10 0L25 25L0 10L-25 25L-10 0Z"/><path d="M0-43L9-9L43 0L9 9L0 43L-9 9L-43 0L-9-9Z"/><path d="M0-43L0 0L9-9ZM43 0L0 0L9 9ZM0 43L0 0L-9 9ZM-43 0L0 0L-9-9Z" style="fill:#b8edef;stroke:none"/><text x="0" y="-49">N</text><text x="49" y="4">E</text><text x="0" y="59">S</text><text x="-49" y="4">W</text></g>${legend(continents,territories)}</svg>`;
  
}
