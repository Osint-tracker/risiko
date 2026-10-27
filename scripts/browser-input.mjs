import assert from 'node:assert/strict';

// Pick a point that a real pointer can reach. force:true sends the pointer to
// the covering element; it does not dispatch a click to an obscured SVG path.
export async function clickTerritory(page, id) {
 const territory=page.locator(`[data-territory="${id}"]`);
 const point=await territory.evaluate(element=>{
  const box=element.getBoundingClientRect(),hit=element.querySelector('.territory-hit')?.getBoundingClientRect();
  const points=hit?[[hit.x+hit.width/2,hit.y+hit.height/2]]:[];
  const left=Math.max(1,box.left),right=Math.min(innerWidth-1,box.right);
  const top=Math.max(1,box.top),bottom=Math.min(innerHeight-1,box.bottom);
  for(let y=top+2;y<bottom;y+=4)for(let x=left+2;x<right;x+=4)points.push([x,y]);
  const centres=[...(element.ownerSVGElement?.querySelectorAll('.territory-hit')??[])].map(hit=>{
   const r=hit.getBoundingClientRect();return {element:hit.closest('[data-territory]'),x:r.x+r.width/2,y:r.y+r.height/2};
  });
  for(const [x,y] of points){
   if(x<0||y<0||x>=innerWidth||y>=innerHeight)continue;
   const nearest=centres.map(c=>({...c,d:Math.hypot(x-c.x,y-c.y)})).filter(c=>c.d<=22).sort((a,b)=>a.d-b.d)[0];
   if(nearest&&nearest.element!==element)continue;
   if(document.elementFromPoint(x,y)?.closest('[data-territory]')===element)return {x:x-box.x,y:y-box.y};
  }
  return null;
 });
 assert.ok(point,`Territorio ${id}: nessun punto raggiungibile dal puntatore; controllare sovrapposizioni o inquadratura.`);
 await territory.click({position:point,timeout:5000});
}

export async function browserDiagnostics(page) {
 return page.evaluate(()=>({
  table:document.querySelector('.game-table')?.dataset,
  effects:document.querySelector('#effects')?.innerHTML.slice(0,500),
  toast:document.querySelector('#toast')?.textContent,
  paused:!!document.querySelector('.pause-card'),
  placeable:[...document.querySelectorAll('.territory.placeable')].map(el=>{
   const r=el.querySelector('.territory-hit').getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
   return {id:el.getAttribute('data-territory'),x,y,hit:document.elementFromPoint(x,y)?.outerHTML.slice(0,250)};
  })
 }));
}
