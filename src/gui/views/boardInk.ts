import type {Territory} from '../../data/mapGraph.ts';
import {territoryColors} from '../art.ts';

export function ocean(height:number){
 return `<defs>
 <linearGradient id="ocean" x2="0%" y2="100%"><stop stop-color="#171f29"/><stop offset=".37" stop-color="#053445"/><stop offset=".57" stop-color="#087d91"/><stop offset=".8" stop-color="#074556"/><stop offset="1" stop-color="#101e2b"/></linearGradient>
 <pattern id="ocean-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#c2edf0" opacity=".14"/></pattern>
 <pattern id="triangles" width="12" height="10" patternUnits="userSpaceOnUse"><path d="m1 2 3 5 3-5zm6 6 2-4 2 4z" fill="#40bbd4" opacity=".22"/></pattern>
 <linearGradient id="fade" x2="0%" y2="100%"><stop stop-color="#aaa"/><stop offset=".45" stop-color="black"/><stop offset=".68" stop-color="#444"/><stop offset="1" stop-color="white"/></linearGradient>
 <mask id="ocean-pattern"><rect width="1240" height="${height}" fill="url(#fade)"/></mask>
 <pattern id="land-grain" width="384" height="384" patternUnits="userSpaceOnUse"><image width="384" height="384" href="./art/territory-ink.png"/></pattern>
 </defs><rect x="-4000" y="-4000" width="9200" height="9200" fill="#101e2b"/><rect width="1240" height="${height}" fill="url(#ocean)"/><rect width="1240" height="${height}" fill="url(#triangles)" mask="url(#ocean-pattern)"/><rect width="1240" height="${height}" fill="url(#ocean-grid)"/>
 <g aria-hidden="true" class="water-names" pointer-events="none"><text x="475" y="335">OCEANO ATLANTICO</text><text x="811" y="468">OCEANO INDIANO</text><text x="1015" y="359">PACIFICO</text></g>`;
}
export function legend(continents:readonly {id:string;name:string;bonus:number}[],territories:readonly Territory[]){
 return `<g class="board-legend" pointer-events="none" transform="translate(196 482)"><rect width="115" height="${24+continents.length*17}" rx="4" fill="#122535" stroke="#6290a0"/><text x="7" y="14">CONTINENTE · BONUS</text>${continents.map((c,i)=>`<g transform="translate(6 ${20+i*17})"><rect width="103" height="14" rx="2" fill="${territoryColors[territories.find(t=>t.continent===c.id)!.id]}"/><text x="4" y="10">${c.name.toUpperCase()}</text><text x="85" y="10">+${c.bonus}</text></g>`).join('')}</g>`;
}
