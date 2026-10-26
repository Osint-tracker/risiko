import { createGame, applyCommand, advanceClock, project, random, assertState } from './RisikoRulesEngine.js';
import { chooseBotCommand } from '../ai/BotAI.js';
import { StorageService } from '../services/StorageService.js';
                                                                 
const ctx = self                                         ;
const storage = new StorageService();
let state                   = null,
  speed = 1,
  lastTick = performance.now(),
  nextBot = 0,
  busy = Promise.resolve(),
  dirtyClock = 0;
let publishedGameId = '',
  publishedCount = 0;
const post = (message         ) => ctx.postMessage(message);
const publish = () => {
  if (state) post({
    type: 'STATE',
    state: project(state, 0)
  });
};
async function commit(next           ) {
  await storage.save(next);
  state = next;
  const start = publishedGameId === next.id ? publishedCount : 0;
  for (const event of next.log.slice(start)) post({
    type: event.type,
    event
  });
  publishedGameId = next.id;
  publishedCount = next.log.length;
  publish();
}
function enqueue(f                     ) {
  busy = busy.then(f).catch(e => {
    if (state) {
      state.paused = true;
      publish();
    }
    post({
      type: 'ERROR',
      message: e instanceof Error ? e.message : String(e)
    });
  });
}
ctx.onmessage = ({
  data
}) => enqueue(async () => {
  switch (data.type) {
    case 'INIT':
      {
        post({
          type: 'PROFILE',
          profile: await storage.profile()
        });
        try {
          state = await storage.load();
          if (state) {
            state.paused = true;
            publishedGameId = state.id;
            publishedCount = state.log.length;
            publish();
          }
          post({
            type: 'READY',
            hasGame: !!state && state.phase !== 'GAME_OVER'
          });
        } catch (e) {
          state = null;
          post({
            type: 'READY',
            hasGame: true
          });
          post({
            type: 'ERROR',
            message: 'Il salvataggio non è compatibile o è danneggiato. Puoi sostituirlo creando una nuova partita.'
          });
        }
        break;
      }
    case 'NEW':
      {
        const next = createGame(data.config              );
        await commit(next);
        await storage.setName(next.players[0].name);
        lastTick = performance.now();
        nextBot = 0;
        break;
      }
    case 'RESUME':
      if (state) {
        assertState(state);
        state.paused = false;
        lastTick = performance.now();
        await commit(state);
      }
      break;
    case 'PAUSE':
      if (state) {
        state = advanceClock(state, Math.max(0, performance.now() - lastTick));
        state.paused = true;
        await commit(state);
      }
      break;
    case 'SPEED':
      speed = [1, 2, 4, 0].includes(data.speed) ? data.speed : 1;
      break;
    case 'PROFILE':
      post({
        type: 'PROFILE',
        profile: await storage.profile()
      });
      break;
    case 'COMMAND':
      {
        if (!state) throw new Error('Nessuna partita attiva.');
        if (state.lastCommandId === data.id) return;
        if (data.revision !== state.revision) throw new Error('Il turno è cambiato. Riprova.');
        if (!state.players[state.active].human) throw new Error('Attendi il tuo turno.');
        const now = performance.now();
        const timed = advanceClock(state, now - lastTick);
        lastTick = now;
        if (timed.revision !== state.revision) {
          await commit(timed);
          return;
        }
        const next = applyCommand(timed, 0, data.command           );
        next.lastCommandId = data.id;
        await commit(next);
        break;
      }
  }
});
let ticking = false;
setInterval(() => {
  if (ticking) return;
  ticking = true;
  enqueue(async () => {
    try {
      const now = performance.now(),
        delta = Math.max(0, now - lastTick);
      lastTick = now;
      if (!state || state.paused || state.phase === 'GAME_OVER') return;
      const oldRevision = state.revision;
      state = advanceClock(state, delta);
      dirtyClock += delta;
      if (state.revision !== oldRevision) {
        await commit(state);
        dirtyClock = 0;
        return;
      }
      const p = state.players[state.active];
      if (!p.human && now >= nextBot) {
        const rngState = {
          rng: state.aiRng
        };
        const command = chooseBotCommand(project(state, p.id), p.difficulty, () => random(rngState));
        const next = applyCommand(state, p.id, command);
        next.aiRng = rngState.rng;
        await commit(next);
        nextBot = performance.now() + (speed === 0 ? 0 : command.type === 'ATTACK' ? 850 / speed : 260 / speed);
        dirtyClock = 0;
      } else if (dirtyClock >= 1000) {
        await commit(state);
        dirtyClock = 0;
      }
    } finally {
      ticking = false;
    }
  });
}, 50);
