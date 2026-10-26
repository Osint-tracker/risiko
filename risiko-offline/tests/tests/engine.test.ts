import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyCommand, advanceClock, assertState, owned, total, reinforcement, canAttack, moveBounds, exchangeValue, project, ranks, random } from '../src/engine/RisikoRulesEngine.ts';
import { diceDistribution, conquestOdds, chooseBotCommand } from '../src/ai/BotAI.ts';
import { territories, objectives } from '../src/data/mapGraph.ts';
import type { GameState, Difficulty } from '../src/engine/types.ts';
const game = (seed = 5, n = 4) => createGame({
  players: n,
  name: 'Test',
  difficulties: Array(n - 1).fill('casuale'),
  turnSeconds: 180,
  seed
});
function active(s: GameState, phase: GameState['phase'] = 'ATTACK') {
  s.phase = phase;
  s.round = 5;
  s.active = 0;
  s.order = s.players.map(p => p.id);
  s.players.forEach(p => p.setupRemaining = 0);
  s.reinforcements = 0;
  return s;
}
function hand(s: GameState, p: number, ids: number[]) {
  for (const id of ids) {
    s.deck = s.deck.filter(c => c !== id);
    s.discard = s.discard.filter(c => c !== id);
    s.players.forEach(p => p.cards = p.cards.filter(c => c !== id));
  }
  s.players[p].cards.push(...ids);
}
test('setup: balanced territory counts, continent caps and armies for 3/4/5 players', () => {
  for (const n of [3, 4, 5]) for (let seed = 1; seed <= 20; seed++) {
    const s = game(seed, n);
    assertState(s);
    for (const p of s.players) {
      assert.ok([Math.floor(42 / n), Math.ceil(42 / n)].includes(owned(s, p.id).length));
      assert.equal(total(s, p.id) + p.setupRemaining, ({
        3: 35,
        4: 30,
        5: 25
      } as Record<number, number>)[n]);
      for (const c of ['na', 'sa', 'eu', 'af', 'as', 'oc']) assert.ok(owned(s, p.id).filter(i => territories[i].continent === c).length <= Math.floor(territories.filter(t => t.continent === c).length / 2));
    }
  }
});
test('invalid and out-of-turn commands are atomic', () => {
  const s = game(),
    before = JSON.stringify(s);
  assert.throws(() => applyCommand(s, (s.active + 1) % 4, {
    type: 'NEXT'
  }));
  assert.throws(() => applyCommand(s, s.active, {
    type: 'PLACE',
    territory: owned(s, s.active)[0],
    count: 4
  }));
  assert.equal(JSON.stringify(s), before);
});
test('reinforcements have no minimum of three', () => {
  const s = active(game());
  s.board.forEach((t, i) => t.owner = i === 0 ? 0 : i % 3 + 1);
  assert.equal(reinforcement(s, 0), 0);
});
test('tris values, territory bonuses, joker restrictions and 130 army cap', () => {
  const s = active(game(), 'TRIS_EXCHANGE');
  s.board.forEach((t, i) => t.owner = i === 41 ? 0 : i % 3 + 1);
  assert.equal(exchangeValue(s, 0, [0, 3, 6]), 8);
  assert.equal(exchangeValue(s, 0, [0, 1, 2]), 10);
  assert.equal(exchangeValue(s, 0, [42, 0, 3]), 12);
  assert.equal(exchangeValue(s, 0, [42, 0, 1]), 0);
  assert.equal(exchangeValue(s, 0, [42, 43, 0]), 0);
  assert.equal(exchangeValue(s, 0, [0, 0, 3]), 0);
  s.board[0].owner = 0;
  assert.equal(exchangeValue(s, 0, [0, 3, 6]), 10);
  hand(s, 0, [0, 3, 6]);
  s.board[41].armies = 128;
  const next = applyCommand(s, 0, {
    type: 'EXCHANGE',
    cards: [0, 3, 6]
  });
  assert.equal(next.reinforcements, 1);
  assert.equal(next.players[0].cards.length, 0);
});
test('maximum dice, no inferior dice attack, fourth-round protection', () => {
  const s = active(game());
  s.board[0] = {
    owner: 0,
    armies: 3
  };
  s.board[1] = {
    owner: 1,
    armies: 3
  };
  assert.equal(canAttack(s, 0, 1), false);
  s.board[0].armies = 4;
  assert.equal(canAttack(s, 0, 1), true);
  s.board.forEach((t, i) => {
    if (t.owner === 1 && i !== 1) t.owner = 2;
  });
  s.round = 4;
  assert.equal(canAttack(s, 0, 1), false);
  s.round = 5;
  assert.equal(canAttack(s, 0, 1), true);
  s.board[0].armies = 2;
  s.board[1].armies = 1;
  assert.equal(canAttack(s, 0, 1), true);
});
test('dice distributions include defense ties and exact 3v3 expectation', () => {
  const d = diceDistribution(3, 3);
  assert.ok(Math.abs(d.reduce((n, o) => n + o.probability, 0) - 1) < 1e-12);
  assert.ok(Math.abs(d.reduce((n, o) => n + o.attacker * o.probability, 0) - 1.8931327160493827) < 1e-12);
  assert.ok(Math.abs(conquestOdds(2, 1) - 15 / 36) < 1e-12);
  assert.equal(conquestOdds(3, 3), 0);
  assert.ok(conquestOdds(12, 3) > .9);
});
test('seeded battle sorts dice, compares pairs and conserves losses', () => {
  const s = active(game());
  s.board[0] = {
    owner: 0,
    armies: 10
  };
  s.board[1] = {
    owner: 1,
    armies: 10
  };
  const a = applyCommand(s, 0, {
      type: 'ATTACK',
      from: 0,
      to: 1
    }),
    b = applyCommand(s, 0, {
      type: 'ATTACK',
      from: 0,
      to: 1
    });
  assert.deepEqual(a, b);
  const e = a.lastBattle!;
  assert.equal(e.attack!.length, 3);
  assert.equal(e.defense!.length, 3);
  let lost = 0;
  for (let i = 0; i < 3; i++) if (e.attack![i] <= e.defense![i]) lost++;
  assert.equal(a.board[0].armies, 10 - lost);
  assert.equal(a.board[1].armies, 10 - (3 - lost));
});
test('border garrison and mandatory conquest exception', () => {
  const s = active(game(), 'FORTIFY');
  s.board[0] = {
    owner: 0,
    armies: 5
  };
  s.board[1] = {
    owner: 0,
    armies: 2
  };
  s.board[3].owner = 1;
  assert.deepEqual(moveBounds(s, 0, 1), {
    min: 1,
    max: 3
  });
  assert.throws(() => applyCommand(s, 0, {
    type: 'MOVE',
    from: 0,
    to: 1,
    count: 4
  }));
  s.phase = 'POST_CONQUEST_MOVE';
  s.board[0].armies = 4;
  s.board[1].armies = 0;
  s.pending = {
    from: 0,
    to: 1,
    min: 3
  };
  assert.deepEqual(moveBounds(s, 0, 1), {
    min: 3,
    max: 3
  });
  const n = applyCommand(s, 0, {
    type: 'MOVE',
    from: 0,
    to: 1,
    count: 3
  });
  assert.equal(n.board[0].armies, 1);
  assert.equal(n.board[1].armies, 3);
  assert.equal(n.phase, 'ATTACK');
});
test('strategic movement is adjacent and ends the turn', () => {
  const s = active(game(), 'FORTIFY');
  s.board[0] = {
    owner: 0,
    armies: 5
  };
  s.board[1] = {
    owner: 0,
    armies: 2
  };
  s.board[41].owner = 0;
  assert.throws(() => applyCommand(s, 0, {
    type: 'MOVE',
    from: 0,
    to: 41,
    count: 1
  }));
  const n = applyCommand(s, 0, {
    type: 'MOVE',
    from: 0,
    to: 1,
    count: 1
  });
  assert.notEqual(n.active, 0);
});
test('seven-card cap: no forced tris at five; draw once; recycle discards', () => {
  const s = active(game(), 'TRIS_EXCHANGE');
  hand(s, 0, [0, 1, 2, 3, 4]);
  assert.doesNotThrow(() => applyCommand(s, 0, {
    type: 'NEXT'
  }));
  s.phase = 'FORTIFY';
  s.conquests = 3;
  let n = applyCommand(s, 0, {
    type: 'NEXT'
  });
  assert.equal(n.players[0].cards.length, 6);
  hand(s, 0, [5, 6]);
  n = applyCommand(s, 0, {
    type: 'NEXT'
  });
  assert.equal(n.players[0].cards.length, 7);
  const x = active(game(), 'FORTIFY');
  x.discard = x.deck;
  x.deck = [];
  x.conquests = 1;
  n = applyCommand(x, 0, {
    type: 'NEXT'
  });
  assert.equal(n.players[0].cards.length, 1);
  assert.equal(n.discard.length, 0);
  assertState(n);
});
test('timer: complete compulsory tasks, no automatic card exchange, skip attacks', () => {
  const s = active(game(), 'TRIS_EXCHANGE');
  s.reinforcements = 4;
  s.remainingMs = 1;
  hand(s, 0, [0, 3, 6]);
  const before = total(s, 0),
    n = advanceClock(s, 1);
  assert.equal(total(n, 0), before + 4);
  assert.notEqual(n.active, 0);
  assert.equal(n.players[0].cards.length, 3);
  assert.equal(n.remainingMs, 180000);
  assertState(n);
  const frozen = structuredClone(s);
  frozen.paused = true;
  assert.deepEqual(advanceClock(frozen, 900000), frozen);
  const setup = game();
  assert.equal(advanceClock(setup, 900000).phase, 'SETUP_PLACEMENT');
});
test('timeout post-conquest performs mandatory transfer before finishing', () => {
  const s = active(game(), 'POST_CONQUEST_MOVE');
  s.board[0] = {
    owner: 0,
    armies: 4
  };
  s.board[1] = {
    owner: 0,
    armies: 0
  };
  s.pending = {
    from: 0,
    to: 1,
    min: 3
  };
  s.conquests = 1;
  const n = applyCommand(s, 0, {
    type: 'TIMEOUT'
  });
  assert.equal(n.board[0].armies, 1);
  assert.equal(n.board[1].armies, 3);
  assert.notEqual(n.active, 0);
  assertState(n);
});
test('sdadata begins only on last active player of round 20 and skips 3 conquests', () => {
  const s = active(game(), 'FORTIFY');
  s.round = 20;
  s.active = 2;
  s.conquests = 3;
  const n = applyCommand(s, 2, {
    type: 'NEXT'
  });
  assert.equal(n.sdadata, null);
  n.phase = 'FORTIFY';
  n.conquests = 3;
  const last = applyCommand(n, 3, {
    type: 'NEXT'
  });
  assert.equal(last.sdadata?.threshold, 4);
  assert.equal(last.round, 21);
  assert.equal(last.active, 0);
  assert.equal(last.lastSdadata, null);
});
test('sdadata thresholds advance on anchor rotation, including eliminated anchor', () => {
  let s = active(game(), 'FORTIFY');
  s.round = 21;
  s.sdadata = {
    started: true,
    anchor: 3,
    threshold: 4
  };
  s.active = 2;
  s.conquests = 3;
  let n = applyCommand(s, 2, {
    type: 'NEXT'
  });
  assert.equal(n.sdadata?.threshold, 5);
  n.phase = 'FORTIFY';
  n.conquests = 3;
  n = applyCommand(n, 3, {
    type: 'NEXT'
  });
  assert.equal(n.sdadata?.threshold, 5);
  s.board.forEach(t => {
    if (t.owner === 3) t.owner = 1;
  });
  s.players[3].eliminated = true;
  n = applyCommand(s, 2, {
    type: 'NEXT'
  });
  assert.equal(n.active, 0);
  assert.equal(n.sdadata?.threshold, 5);
});
test('projection hides other cards/objectives and blind levels until game over', () => {
  const s = game();
  hand(s, 1, [0, 3, 6]);
  const v = project(s);
  assert.equal(v.players[1].difficulty, '?');
  assert.equal(v.players[1].objective, undefined);
  assert.equal(v.players[1].cards, undefined);
  assert.equal(v.players[1].cardCount, 3);
  for (const field of ['rng', 'aiRng', 'deck', 'discard', 'beliefs']) assert.ok(!(field in v));
  s.phase = 'GAME_OVER';
  assert.ok(project(s).players[1].objective);
  assert.notEqual(project(s).players[1].difficulty, '?');
});
test('JSON save/resume preserves subsequent dice, cards and AI choices', () => {
  let s = active(game());
  s.board[0] = {
    owner: 0,
    armies: 12
  };
  s.board[1] = {
    owner: 1,
    armies: 12
  };
  const loaded = JSON.parse(JSON.stringify(s));
  assertState(loaded);
  assert.deepEqual(applyCommand(s, 0, {
    type: 'ATTACK',
    from: 0,
    to: 1
  }), applyCommand(loaded, 0, {
    type: 'ATTACK',
    from: 0,
    to: 1
  }));
});
test('all three strategies complete legal games at each table size', () => {
  for (const n of [3, 4, 5]) for (const level of ['facile', 'medio', 'difficile'] as Difficulty[]) {
    let s = game(100 + n, n),
      actions = 0;
    while (s.phase !== 'GAME_OVER' && actions < 18000) {
      const rnd = {
        rng: s.aiRng
      };
      const c = chooseBotCommand(project(s, s.active), level, () => random(rnd));
      s = applyCommand(s, s.active, c);
      s.aiRng = rnd.rng;
      assertState(s);
      actions++;
    }
    assert.equal(s.phase, 'GAME_OVER', `${n}/${level} after ${actions} actions, ${s.phase} round ${s.round}`);
    assert.equal(ranks(s).length, n);
  }
});
test('objective completion wins in the conquest action, before an optional move', () => {
  let s = active(game(55));
  const goal = objectives[s.players[0].objective - 1].territories;
  const to = goal.find(t => territories[t].neighbors.some(n => goal.includes(n)))!,
    from = territories[to].neighbors.find(n => goal.includes(n))!;
  s.board.forEach((cell, i) => {
    cell.owner = goal.includes(i) ? 0 : 1;
    cell.armies = 1;
  });
  s.board[to] = {
    owner: 1,
    armies: 1
  };
  const outside = s.board.flatMap((t, i) => t.owner === 1 && i !== to ? [i] : []);
  s.board[outside[0]].owner = 2;
  s.board[outside[1]].owner = 3;
  s.board[from].armies = 50;
  for (let tries = 0; tries < 30 && s.phase !== 'GAME_OVER'; tries++) s = applyCommand(s, 0, {
    type: 'ATTACK',
    from,
    to
  });
  assert.equal(s.phase, 'GAME_OVER');
  assert.equal(s.reason, 'risiko');
  assert.equal(s.winner, 0);
  assert.equal(ranks(s)[0].points, 100);
  assert.ok(s.board[to].armies >= 1);
  assertState(s);
});
test('elimination transfers random cards only up to seven, excess goes to discard', () => {
  let s = active(game(40));
  s.board.forEach((t, i) => {
    if (t.owner === 1) t.owner = 2;
  });
  s.board[0] = {
    owner: 0,
    armies: 50
  };
  s.board[1] = {
    owner: 1,
    armies: 1
  };
  hand(s, 0, [0, 1, 2, 3, 4, 5]);
  hand(s, 1, [6, 7, 8, 9]);
  for (let i = 0; i < 20 && !s.players[1].eliminated; i++) s = applyCommand(s, 0, {
    type: 'ATTACK',
    from: 0,
    to: 1
  });
  assert.equal(s.players[1].eliminated, true);
  assert.equal(s.players[0].cards.length, 7);
  assert.equal(s.players[1].cards.length, 0);
  assert.equal(s.discard.length, 3);
  assertState(s);
});
test('sdadata rolls exactly two dice and closes when sum meets threshold', () => {
  let found = false;
  for (let seed = 1; seed < 100 && !found; seed++) {
    const s = active(game(seed), 'FORTIFY');
    s.round = 23;
    s.sdadata = {
      started: true,
      anchor: 3,
      threshold: 7
    };
    const n = applyCommand(s, 0, {
      type: 'NEXT'
    });
    assert.equal(n.lastSdadata!.attack!.length, 2);
    const sum = n.lastSdadata!.attack!.reduce((a, b) => a + b, 0);
    assert.equal(n.phase === 'GAME_OVER', sum <= 7);
    found = n.phase === 'GAME_OVER';
  }
  assert.ok(found);
});
