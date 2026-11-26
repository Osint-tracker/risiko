import assert from 'node:assert/strict';

// One synchronous browser evaluation: all rectangles belong to the same render.
// Separate locator.boundingBox() requests can observe nodes detached by a bot move.
export async function readBoardLayout(page) {
 return page.evaluate(()=>{
  const table=document.querySelector('.game-table');
  const selectors=['.board-top','.map-stage','.board-bottom','.players-row','.command-deck','.reference-zoom','.reference-sidebar'];
  const boxes=Object.fromEntries(selectors.map(selector=>{
   const element=table?.querySelector(selector);
   if(!element||!element.getClientRects().length)return [selector,null];
   const r=element.getBoundingClientRect();
   return [selector,{x:r.x,y:r.y,width:r.width,height:r.height}];
  }));
  return {phase:table?.getAttribute('data-phase'),active:table?.getAttribute('data-active'),revision:table?.getAttribute('data-revision'),boxes,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
 });
}

export function assertBoardLayout(snapshot) {
 const context=`fase ${snapshot.phase}, giocatore ${snapshot.active}, revisione ${snapshot.revision}`;
 for(const selector of ['.board-top','.map-stage','.board-bottom','.players-row','.command-deck','.reference-zoom','.reference-sidebar']) {
  const box=snapshot.boxes[selector];
  assert.ok(box&&[box.x,box.y,box.width,box.height].every(Number.isFinite)&&box.width>0&&box.height>0,`HUD assente o non visibile: ${selector} (${context}). Snapshot: ${JSON.stringify(snapshot)}`);
 }
 const box=selector=>snapshot.boxes[selector];
 const inside=(child,parent)=>child.x>=parent.x-1&&child.y>=parent.y-1&&child.x+child.width<=parent.x+parent.width+1&&child.y+child.height<=parent.y+parent.height+1;
 for(const selector of ['.reference-sidebar','.players-row','.reference-zoom','.board-bottom'])
  assert.ok(inside(box(selector),box('.map-stage')),`HUD fuori dalla plancia: ${selector} (${context})`);
 assert.ok(inside(box('.board-top'),box('.reference-sidebar')),'Turno fuori dal pannello destro');
 assert.ok(inside(box('.command-deck'),box('.board-bottom')),'Comandi fuori dalla barra inferiore');
 const rail=box('.reference-sidebar'),zoom=box('.reference-zoom'),players=box('.players-row'),commands=box('.board-bottom');
 assert.ok(zoom.x+zoom.width<=rail.x+1,'Zoom e Cronologia devono stare in colonne distinte');
 assert.ok(players.y+players.height<=zoom.y+1,'HUD sovrapposto: giocatori e zoom');
 assert.ok(Math.max(players.x+players.width,zoom.x+zoom.width)<=commands.x+1&&commands.x+commands.width<=rail.x+1,'HUD sovrapposto: pannelli laterali e comandi');
 assert.ok(snapshot.scrollWidth<=snapshot.viewportWidth+1,'La pagina non deve scorrere orizzontalmente');
}

export async function readMapScale(page) {
 const snapshot=await page.evaluate(()=>{
  const map=document.querySelector('#world-map'),token=map?.querySelector('[data-token="0"] .army-map-icon');
  return {viewBox:map?.getAttribute('viewBox'),tokenWidth:token?.getBoundingClientRect().width};
 });
 assert.ok(snapshot.viewBox&&Number.isFinite(snapshot.tokenWidth)&&snapshot.tokenWidth>0,`Mappa o carro non misurabile: ${JSON.stringify(snapshot)}`);
 const viewWidth=Number(snapshot.viewBox.trim().split(/[\s,]+/)[2]);
 assert.ok(Number.isFinite(viewWidth)&&viewWidth>0,`viewBox non valido: ${snapshot.viewBox}`);
 return {...snapshot,viewWidth};
}
