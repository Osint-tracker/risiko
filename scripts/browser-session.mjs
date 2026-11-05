import assert from 'node:assert/strict';

// Only for tests of the real Pause UI. Fixture replacement does not need to
// pause a disposable game: navigate away first so its Worker cannot overwrite
// the next IndexedDB fixture or race the menu with a turn-summary dialog.
export async function pauseBrowserGame(page,timeout=10000){
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){
  if(await page.locator('.pause-card').isVisible())return;
  const pause=page.locator('#dialogs [data-action="pause"]');
  const close=page.locator('#dialogs [data-action="close"]');
  const control=await pause.isVisible()?pause:await close.isVisible()?close:page.locator('[data-action="game-menu"]');
  try{
   // A state update can replace this control or open a summary after the
   // visibility check. Re-read the UI instead of retrying a covered menu for 30s.
   await control.click({timeout:Math.min(750,Math.max(1,deadline-Date.now()))});
  }catch(error){
   if(error?.name!=='TimeoutError')throw error;
  }
 }
 assert.ok(await page.locator('.pause-card').isVisible(),'Pausa non raggiungibile: controllare il dialogo attivo e la stabilità dei comandi.');
}

export async function leaveGameForFixture(page,neutralURL){
 await page.goto(neutralURL);
 // A same-origin static resource has no app/Worker. Only after navigation has
 // completed may the caller write the next fixture into IndexedDB.
}
