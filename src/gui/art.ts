import {cards, territories, objectives} from '../data/mapGraph.ts';
export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as Record<string,string>)[c]);
export const tankShape = 'M1.8 16.5Q1.7 12 4.3 10.2Q6.8 8.3 8.9 8.3L9.2 6.4Q10.6 3.6 13 3.2H17.4Q18.6 3.2 19.1 4.8L38.5 5.3Q41.3 5.4 41.4 8V10Q41.1 12 39.4 12.3L35.1 12.8L34.9 19.4Q34.5 23.7 30.2 24H7.4Q2 23.8 1.8 19.1Z';
export function counterFontSize(count: number, signed = false): number {
  const digits=String(Math.abs(count)).length+(signed?1:0);
  return digits<=2?15:digits===3?12:10;
}
export function armyToken(count: number, color: string) {
  return `<svg class="army-token" viewBox="0 0 44 27" aria-label="${count} carri"><path d="${tankShape}" fill="${color}" stroke="#dfe2d2" stroke-width="1.15"/><text x="17" y="20" text-anchor="middle" style="font-size:${counterFontSize(count)}px">${count}</text></svg>`;
}
export const territoryColors = [
  '#a77d37','#956536','#b77519','#af994e','#b76631','#b08744','#a8391e','#a45128','#b96c24',
  '#387b66','#528679','#749989','#38775e',
  '#9a538a','#664a79','#926090','#653c71','#744780','#8b6080','#773b75',
  '#876124','#986e32','#aa903e','#8b592c','#794920','#b49245',
  '#829a4b','#27653d','#487e36','#8c9e38','#4e863b','#315f35','#57865b','#688743','#235a37','#8b9d4b','#287343','#367361',
  '#914774','#963b78','#993c7b','#a4478c'
];
const military: Record<string,string> = {
  cannone: '<path d="M7 10h22l5-4h5v7H23l-4 5H7zM6 22l9-8 4 2-9 9z"/><circle cx="26" cy="22" r="6" fill="none" stroke="currentColor" stroke-width="3"/><path d="M26 17v10m-5-5h10" stroke="currentColor" stroke-width="1.5"/>',
  fante: '<circle cx="21" cy="6" r="4"/><path d="M16 12h10l3 10-4 1-2-7v10l4 10h-5l-3-8-2 8h-5l4-12V16l-5 7-3-2zM31 6h2v28h-2z"/>',
  cavaliere: '<path d="M5 19l6-8 13 2 6-7 8 3-2 9-6 1-4 9H11L8 35H4l3-11zM24 25l6 10h-5l-7-9M11 26l5 9h-4L8 29M13 11l-4-6-5 2 3 10z"/><circle cx="22" cy="5" r="4"/><path d="M19 9h6l-1 12h-8l2-4z"/>',
};
export function militaryIcon(symbol: string) {
  return `<svg viewBox="0 0 44 40" class="military-icon" aria-label="${symbol}">${military[symbol] ?? military.cannone}</svg>`;
}
function silhouette(id: number) {
  const t = territories[id], n = t.path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const xs = n.filter((_,i) => i % 2 === 0), ys = n.filter((_,i) => i % 2 === 1);
  const x = Math.min(...xs)-4, y = Math.min(...ys)-4, w = Math.max(...xs)-x+4, h = Math.max(...ys)-y+4;
  return `<svg class="card-country" viewBox="${x} ${y} ${w} ${h}" aria-hidden="true"><path d="${t.path}" fill="${territoryColors[id]}" stroke="#d8edb6" stroke-width="1"/></svg>`;
}
export function cardFace(id?: number) {
  if (id === undefined) return '<div class="card-face card-back"><span>RisiKo!</span><small>OFFLINE</small></div>';
  const c = cards[id];
  if (c.symbol === 'jolly') return `<div class="card-face card-jolly">${['cavaliere','fante','cannone'].map(s => `<div>${militaryIcon(s)}</div>`).join('')}<strong>JOLLY</strong></div>`;
  return `<div class="card-face"><div class="card-symbol">${militaryIcon(c.symbol)}</div>${silhouette(c.territory!)}<strong>${escapeHtml(territories[c.territory!].name)}</strong><small>${c.symbol}</small></div>`;
}
export function objectiveMap(id: number) {
  const goal = objectives[id-1];
  return `<div class="objective-card"><svg class="objective-mini" viewBox="220 45 840 580" role="img" aria-label="Mappa obiettivo ${id}"><rect x="0" y="0" width="1240" height="690" fill="#065266"/>${territories.map(t => `<path d="${t.path}" fill="${goal.territories.includes(t.id)?'#b5dc58':'#bae4ea'}" stroke="#398b87" stroke-width="1"/>`).join('')}</svg><span class="objective-id">${id}</span></div>`;
}
const pipPositions: Record<number,number[][]> = {
  1:[[15,15]],2:[[8,8],[22,22]],3:[[8,8],[15,15],[22,22]],4:[[8,8],[22,8],[8,22],[22,22]],
  5:[[8,8],[22,8],[15,15],[8,22],[22,22]],6:[[8,7],[22,7],[8,15],[22,15],[8,23],[22,23]]
};
export function pips(n: number) {
  return `<svg viewBox="0 0 30 30" aria-hidden="true">${(pipPositions[n]??[]).map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.5"/>`).join('')}</svg>`;
}
export function dieMarkup(n: number, color: string, index = 0) {
  const other = [1,2,3,4,5,6].filter(x=>x!==n && x!==7-n);
  return `<span class="visual-die" role="img" aria-label="Dado ${n}" style="--die-color:${color};--i:${index};--pip-color:${color==='#f0d846'?'#173340':'white'}"><span class="die-cube">${[n,7-n,...other].map((v,i)=>`<span class="die-face face-${i}">${pips(v)}</span>`).join('')}</span></span>`;
}
