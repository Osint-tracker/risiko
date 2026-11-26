import {icon} from '../Icons.ts';
import {escapeHtml as e} from '../art.ts';
import {mapFor} from '../../data/mapGraph.ts';
export function atlasMap(){return `<svg viewBox="210 20 850 650" class="atlas-watermark" aria-hidden="true">${mapFor().territories.map(t=>`<path d="${t.path}"/>`).join('')}</svg>`;}
export function homeView(name:string,ready:boolean,hasGame:boolean,native:boolean,offlineReady=false,xp=0,round?:number,points?:number){
 const links=[['profile','chart','Statistiche'],['scenarios','mountain','Scenari'],['tutorial','shield','Tutorial'],['rules','info','Regole']];
 return `<main class="atlas-home"><section class="portal-column">
 <header class="atlas-account"><button class="atlas-profile" data-action="profiles"><span class="avatar-icon">${icon('user')}</span><span>${e(name)}<small>Liv. ${1+Math.floor(xp/500)} · ${xp.toLocaleString('it-IT')} XP</small></span></button><button class="atlas-settings" data-action="audio" aria-label="Impostazioni audio e vibrazione">${icon('gear')}</button></header>
 <div class="atlas-brand"><h1>RISIKO</h1><p>ATLANTE · TORNEO</p></div>
 <div class="atlas-hero">${atlasMap()}<img src="./mascot.png" alt="Comandante Breton con elmo e uniforme"/></div>
 <button class="primary portal-play" data-action="configure" ${ready?'':'disabled'}>${icon('play')}${ready?'Nuova partita':'Caricamento…'}</button>
 <button class="secondary portal-resume" data-action="slots" ${hasGame?'':'disabled'}><span>${icon('folder')} Continua${round===undefined?' partita':' · Giro '+round}</span>${points===undefined?'':`<small>${points}/86</small>`}</button>
 <nav class="portal-menu" aria-label="Menu principale">${links.map(([action,i,label])=>`<button data-action="${action}">${icon(i)}${label}</button>`).join('')}</nav>
 <footer class="atlas-more"><details><summary>Altro · Backup · Audio${native?'':' · Installa'}</summary><div><button data-action="backup">Backup</button><button data-action="audio">Audio e vibrazione</button>${native?'':`<button data-action="install">Installa offline</button><small>${offlineReady?'Pronto offline':'Preparazione offline in corso'}</small>`}</div></details></footer>
 </section></main>`;
}
