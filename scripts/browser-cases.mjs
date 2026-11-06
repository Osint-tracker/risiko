export const browserCases=['home-setup-3','board-resume','reinforcement-undo','map-gestures','setup-4','setup-5','human-combat','bot-cards','antarctica-3','antarctica-4','antarctica-5','antarctica-combat'];

// Do not stop at the first failed scenario: surface every independent failure
// in one CI run, while keeping the final job failed if any scenario fails.
export async function runBrowserCases(run,cases=browserCases){
 const results=[];
 for(const name of cases){
  const start=Date.now();
  try{const code=await run(name);results.push({name,code:code??1,passed:code===0,durationMs:Date.now()-start});}
  catch(error){results.push({name,code:1,passed:false,durationMs:Date.now()-start,error:String(error)});}
 }
 return results;
}
