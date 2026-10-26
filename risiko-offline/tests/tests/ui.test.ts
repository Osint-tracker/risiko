import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { mountGame } from '../src/gui/App.ts';
import { createGame, project, applyCommand, owned } from '../src/engine/RisikoRulesEngine.ts';
class MockWorker {
  static instance: MockWorker;
  onmessage: ((event: {
    data: any;
  }) => void) | null = null;
  onerror: any;
  messages: any[] = [];
  constructor() {
    MockWorker.instance = this;
  }
  postMessage(data: any) {
    this.messages.push(data);
  }
  terminate() {}
  emit(data: any) {
    this.onmessage?.({
      data
    });
  }
}
function fixture() {
  const callbacks: Record<string, Function> = {};
  let html = '';
  const root = {
    set innerHTML(v: string) {
      html = v;
    },
    get innerHTML() {
      return html;
    },
    querySelector() {
      return null;
    },
    addEventListener(type: string, f: Function) {
      callbacks[type] = f;
    },
    removeEventListener() {}
  };
  Object.assign(globalThis, {
    Worker: MockWorker,
    document: {
      hidden: false,
      addEventListener() {},
      removeEventListener() {}
    },
    history: {
      replaceState() {}
    }
  });
  const cleanup = mountGame(root as never),
    worker = MockWorker.instance;
  const click = (dataset: Record<string, string>) => callbacks.click({
    target: {
      closest: () => ({
        dataset,
        hasAttribute: () => false
      })
    }
  });
  worker.emit({
    type: 'PROFILE',
    profile: {
      name: 'Comandante',
      results: []
    }
  });
  worker.emit({
    type: 'READY',
    hasGame: false
  });
  return {
    root,
    worker,
    click,
    cleanup,
    callbacks
  };
}
test('lobby renders all bot slots, defaults and blind selectors without real levels', () => {
  const f = fixture();
  assert.match(f.root.innerHTML, /Regular/);
  assert.equal((f.root.innerHTML.match(/data-bot=/g) || []).length, 3);
  f.click({
    action: 'blind-all'
  });
  assert.equal((f.root.innerHTML.match(/Bot \? · livello segreto/g) || []).length, 3);
  f.click({
    count: '5'
  });
  assert.equal((f.root.innerHTML.match(/data-bot=/g) || []).length, 4);
  f.cleanup();
});
test('table renders 42 territories, hidden objectives, timer and battle controls', () => {
  const f = fixture();
  f.click({
    action: 'new'
  });
  const s = createGame({
    players: 4,
    name: '<script>alert(1)</script>',
    difficulties: ['casuale', 'casuale', 'casuale'],
    turnSeconds: 180,
    seed: 5
  });
  s.phase = 'ATTACK';
  s.round = 5;
  s.active = 0;
  f.worker.emit({
    type: 'STATE',
    state: project(s)
  });
  assert.equal((f.root.innerHTML.match(/data-territory=/g) || []).length, 42);
  assert.match(f.root.innerHTML, /&lt;script&gt;/);
  assert.doesNotMatch(f.root.innerHTML, /<script>alert/);
  assert.equal((f.root.innerHTML.match(/Bot \?/g) || []).length, 3);
  assert.match(f.root.innerHTML, /3:00/);
  f.click({
    action: 'objective'
  });
  assert.match(f.root.innerHTML, /RISERVATO AL COMANDANTE/);
  assert.match(f.root.innerHTML, /objective-mini/);
  f.click({
    action: 'close'
  });
  f.click({
    action: 'cards'
  });
  assert.match(f.root.innerHTML, /Carte territorio/);
  f.click({
    action: 'close'
  });
  const svg = f.root.innerHTML.match(/<svg id="world-map"[\s\S]*?<\/svg>/)![0];
  const css = readFileSync('src/gui/styles.css', 'utf8');
  mkdirSync('docs', {
    recursive: true
  });
  writeFileSync('docs/board-preview.svg', svg.replace('class="world-map ', 'class="world-map reference-table ').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace('<defs>', `<style>${css}</style><defs>`));
  f.cleanup();
});
test('new game requires confirmation before replacing a save', () => {
  const f = fixture();
  f.worker.emit({
    type: 'READY',
    hasGame: true
  });
  f.click({
    action: 'new'
  });
  assert.match(f.root.innerHTML, /verrà sostituita/);
  assert.ok(!f.worker.messages.some(x => x.type === 'NEW'));
  f.click({
    action: 'confirm-new'
  });
  assert.ok(f.worker.messages.some(x => x.type === 'NEW'));
  f.cleanup();
});
test('commands carry actor-independent revision and unique request id', () => {
  const f = fixture();
  f.click({
    action: 'new'
  });
  const s = createGame({
    players: 3,
    name: 'Test',
    difficulties: ['medio', 'medio'],
    turnSeconds: 180,
    seed: 3
  });
  s.phase = 'ATTACK';
  s.active = 0;
  s.round = 5;
  f.worker.emit({
    type: 'STATE',
    state: project(s)
  });
  f.click({
    action: 'next'
  });
  const command = f.worker.messages.find(m => m.type === 'COMMAND');
  assert.equal(command.revision, s.revision);
  assert.equal(command.command.type, 'NEXT');
  assert.match(command.id, /^[0-9a-f-]+$/);
  f.cleanup();
});
test('results reveal blind difficulty and all objectives only after conclusion', () => {
  const f = fixture();
  f.click({
    action: 'new'
  });
  const s = createGame({
    players: 3,
    name: 'Test',
    difficulties: ['casuale', 'casuale'],
    turnSeconds: 180,
    seed: 7
  });
  s.phase = 'GAME_OVER';
  s.winner = 1;
  s.reason = 'sdadata';
  f.worker.emit({
    type: 'STATE',
    state: project(s)
  });
  assert.match(f.root.innerHTML, /livello svelato/);
  assert.match(f.root.innerHTML, /Tutti gli obiettivi sono ora rivelati/);
  assert.doesNotMatch(f.root.innerHTML, /Bot \?/);
  f.cleanup();
});
test('background pause during compulsory conquest never traps the resume controls',()=>{
 const f=fixture();f.click({action:'new'});const s=createGame({players:3,name:'Test',difficulties:['medio','medio'],turnSeconds:180,seed:3});s.phase='POST_CONQUEST_MOVE';s.round=5;s.active=0;s.pending={from:0,to:1,min:3};s.board[0]={owner:0,armies:5};s.board[1]={owner:0,armies:0};f.worker.emit({type:'STATE',state:project(s)});assert.match(f.root.innerHTML,/Conferma spostamento/);s.paused=true;f.worker.emit({type:'STATE',state:project(s)});assert.match(f.root.innerHTML,/pause-card/);assert.doesNotMatch(f.root.innerHTML,/role="dialog"/);s.paused=false;f.worker.emit({type:'STATE',state:project(s)});assert.match(f.root.innerHTML,/Conferma spostamento/);f.cleanup();
});
