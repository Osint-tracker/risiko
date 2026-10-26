import {createGame, applyCommand, advanceClock, project, random, assertState} from './RisikoRulesEngine.js';
import {humanDecision, decisionDelay} from '../ai/HumanBot.js';
import {makeTransition, PresentationGate} from './presentation.js';
import {StorageService} from '../services/StorageService.js';
                                                                           
const ctx = self                                         ;
const storage = new StorageService();
const gate = new PresentationGate();
let state                   = null, speed = 1, lastTick = performance.now(), dirtyClock = 0;
let busy = Promise.resolve(), ticking = false, presentationEnabled = false;
let publishedGameId = '', publishedCount = 0;
let previousBot                                           = null;
let planned                                                                                                              = null;
const post = (message         ) => ctx.postMessage(message);
const publish = () => { if (state) post({type: 'STATE', state: project(state, 0)}); };
function clearPresentation() { gate.clear(); planned = null; lastTick = performance.now(); }
async function commit(next           , before            ) {
  await storage.save(next);
  state = next;
  const start = publishedGameId === next.id ? publishedCount : 0;
  for (const event of next.log.slice(start)) post({type: event.type, event});
  publishedGameId = next.id;
  publishedCount = next.log.length;
  planned = null;
  const transition = presentationEnabled && before ? makeTransition(before, next, speed) : null;
  if (transition) {
    gate.begin(transition.id, performance.now());
    lastTick = performance.now();
    post({type: 'TRANSITION', transition});
  } else publish();
}
function enqueue(f                     ) {
  busy = busy.then(f).catch(e => {
    clearPresentation();
    if (state) { state.paused = true; publish(); }
    post({type: 'ERROR', message: e instanceof Error ? e.message : String(e)});
  });
}
ctx.onmessage = ({data}) => enqueue(async () => {
  switch (data.type) {
    case 'INIT': {
      presentationEnabled = data.presentation === true;
      post({type: 'PROFILE', profile: await storage.profile()});
      try {
        state = await storage.load();
        if (state) {
          state.paused = true;
          publishedGameId = state.id;
          publishedCount = state.log.length;
          publish();
        }
        post({type: 'READY', hasGame: !!state && state.phase !== 'GAME_OVER'});
      } catch {
        state = null;
        post({type: 'READY', hasGame: true});
        post({type: 'ERROR', message: 'Il salvataggio non è compatibile o è danneggiato. Puoi sostituirlo creando una nuova partita.'});
      }
      break;
    }
    case 'NEW': {
      clearPresentation(); previousBot = null;
      const next = createGame(data.config              );
      await commit(next);
      await storage.setName(next.players[0].name);
      lastTick = performance.now();
      break;
    }
    case 'PRESENTED':
      if (gate.finish(data.id)) { lastTick = performance.now(); dirtyClock = 0; publish(); }
      break;
    case 'RESUME':
      if (state) {
        clearPresentation(); assertState(state);
        await commit({...state, paused: false});
      }
      break;
    case 'PAUSE':
      if (state) {
        const next = gate.pending ? state : advanceClock(state, Math.max(0, performance.now() - lastTick));
        clearPresentation();
        await commit({...next, paused: true});
      }
      break;
    case 'SPEED':
      speed = [1, 2, 4, 0].includes(data.speed) ? data.speed : 1;
      planned = null;
      break;
    case 'PROFILE': post({type: 'PROFILE', profile: await storage.profile()}); break;
    case 'COMMAND': {
      if (!state) throw new Error('Nessuna partita attiva.');
      if (state.lastCommandId === data.id) return;
      if (gate.pending) return; // UI will unlock only after PRESENTED.
      if (data.revision !== state.revision) throw new Error('Il turno è cambiato. Riprova.');
      if (!state.players[state.active].human) throw new Error('Attendi il tuo turno.');
      const now = performance.now(), before = state;
      const timed = advanceClock(state, now - lastTick);
      lastTick = now;
      if (timed.revision !== state.revision) { await commit(timed, before); break; }
      const next = applyCommand(timed, 0, data.command           );
      next.lastCommandId = data.id;
      await commit(next, timed);
      break;
    }
  }
});
setInterval(() => {
  if (ticking) return;
  ticking = true;
  enqueue(async () => {
    try {
      const now = performance.now(), delta = Math.max(0, now - lastTick);
      lastTick = now;
      if (gate.pending) {
        if (gate.expired(now)) { clearPresentation(); publish(); }
        return;
      }
      if (!state || state.paused || state.phase === 'GAME_OVER') return;
      const before = state;
      const timed = advanceClock(state, delta);
      dirtyClock += delta;
      if (timed.revision !== before.revision) { await commit(timed, before); dirtyClock = 0; return; }
      state = timed;
      const p = state.players[state.active];
      if (!p.human) {
        if (!planned || planned.revision !== state.revision || planned.actor !== p.id) {
          const rngState = {rng: state.aiRng};
          const view = project(state, p.id);
          const decision = humanDecision(view, p.difficulty, () => random(rngState), state.botContexts?.[p.id]);
          const delay = decisionDelay(view, decision.command, previousBot?.actor === p.id ? previousBot.command : null, speed, Math.random);
          planned = {...decision, revision: state.revision, actor: p.id, aiRng: rngState.rng, due: now + delay};
        }
        if (now >= planned.due) {
          const decision = planned;
          const next = applyCommand(state, p.id, decision.command);
          next.aiRng = decision.aiRng;
          next.botContexts = {...state.botContexts, [p.id]: decision.context};
          await commit(next, state);
          previousBot = {actor: p.id, command: decision.command};
          dirtyClock = 0;
          return;
        }
      }
      if (dirtyClock >= 1000) {
        // Clock saves must not restart a bot's pending thinking interval.
        await storage.save(state); publish(); dirtyClock = 0;
      }
    } finally { ticking = false; }
  });
}, 50);
