import type {Territory} from '../data/mapGraph.ts';
// A coastline intersection keeps route anchors out of territory centres.
function anchor(t:Territory,towards:Territory){
 const tokens=t.path.match(/[MLQZ]|-?\d+(?:\.\d+)?/g)??[];
 const dx=towards.x-t.x,dy=towards.y-t.y;let first:number[]|null=null,last:number[]|null=null,best=Infinity;
 function edge(a:number[],b:number[]){
  const ex=b[0]-a[0],ey=b[1]-a[1],den=dx*ey-dy*ex;if(Math.abs(den)<1e-8)return;
  const px=a[0]-t.x,py=a[1]-t.y,u=(px*ey-py*ex)/den,v=(px*dy-py*dx)/den;
  if(u>0&&v>=0&&v<=1&&u<best)best=u;
 }
 for(let i=0;i<tokens.length;){
  const token=tokens[i++];if(token==='Z'){if(last&&first)edge(last,first);last=null;continue;}
  if(token==='Q'){
   const control=[Number(tokens[i++]),Number(tokens[i++])],end=[Number(tokens[i++]),Number(tokens[i++])];const start:number[]|null=last;
   if(start){for(let step=1;step<=12;step++){const u=step/12,v=1-u;const p:number[]=[v*v*start[0]+2*v*u*control[0]+u*u*end[0],v*v*start[1]+2*v*u*control[1]+u*u*end[1]];edge(last!,p);last=p;}}
   else last=end;
   continue;
  }
  const move=token==='M';if(token==='M'||token==='L'){const p=[Number(tokens[i++]),Number(tokens[i++])];if(move){first=p;last=p;}else{if(last)edge(last,p);last=p;}}
 }
 const u=Number.isFinite(best)?best:Math.min(20/Math.max(1,Math.hypot(dx,dy)),.2);
 return {x:t.x+dx*u,y:t.y+dy*u};
}
export function seaRoute(a:Territory,b:Territory){
 if(a.id===0&&b.id===29)return {path:`M${a.x-28} ${a.y}Q80 ${a.y-30} 0 ${a.y}M1240 ${b.y}Q1130 ${b.y-30} ${b.x+25} ${b.y}`,anchors:[{x:a.x-28,y:a.y},{x:b.x+25,y:b.y}]};
 const start=anchor(a,b),end=anchor(b,a),dx=end.x-start.x,dy=end.y-start.y,len=Math.max(1,Math.hypot(dx,dy)),bend=Math.min(28,len*.16);
 return {path:`M${start.x} ${start.y}Q${(start.x+end.x)/2-dy/len*bend} ${(start.y+end.y)/2+dx/len*bend} ${end.x} ${end.y}`,anchors:[start,end]};
}
