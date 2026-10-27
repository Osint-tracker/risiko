import {diceHistogram} from './TournamentStats.ts';
import {objectivePoints} from '../data/mapGraph.ts';
import {owned} from '../engine/RisikoRulesEngine.ts';
import {botPolicy} from '../ai/policy.ts';
import type { GameState } from '../engine/types.ts';
import { assertState, ranks, upgradeConquestSave } from '../engine/RisikoRulesEngine.ts';
export type ResultRecord = {
  antarctica?: boolean;
  objectivePoints?: number;
  dice?: number[];
  id: string;
  date: number;
  name: string;
  rank: number;
  points: number;
  reason: string;
  duration: number;
  players: number;
};
export type Profile = {
  name: string;
  results: ResultRecord[];
};
export class StorageService {
  private promise: Promise<IDBDatabase> | null = null;
  private open() {
    return this.promise ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('risiko-offline', 1);
      req.onupgradeneeded = () => {
        for (const name of ['game', 'profile', 'results']) if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async get<T>(store: string, key: string): Promise<T | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, 'readonly'),
        r = t.objectStore(store).get(key);
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => reject(r.error);
    });
  }
  async save(state: GameState): Promise<void> {
    assertState(state);
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['game', 'results'], 'readwrite');
      tx.objectStore('game').put(state, 'current');
      if (state.phase === 'GAME_OVER') {
        const ranking = ranks(state),
          rank = ranking.findIndex(r => r.player === 0);
        const result: ResultRecord = {
          id: state.id,
          antarctica: state.antarctica===true,
          date: Date.now(),
          name: state.players[0].name,
          rank: rank + 1,
          points: ranking[rank].points,
          objectivePoints: objectivePoints(state.players[0].objective,owned(state,0)),
          dice: diceHistogram(state),
          reason: state.reason!,
          duration: state.elapsedMs,
          players: state.players.length
        };
        tx.objectStore('results').put(result, state.id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Salvataggio interrotto'));
    });
  }
  async load(): Promise<GameState | null> {
    const s = await this.get<GameState>('game', 'current');
    if (!s) return null;
    const upgraded = upgradeConquestSave(s);
    if (upgraded !== s) await this.save(upgraded);
    let changed=false;
    if(!upgraded.manualReinforcement){upgraded.manualReinforcement=true;changed=true;}
    for(const player of upgraded.players)if(!player.botPolicy){player.botPolicy=botPolicy();changed=true;}
    if(upgraded.turnReinforcements===undefined){
      let start=upgraded.log.length-1;while(start>=0&&upgraded.log[start].type!=='onTurnChanged')start--;
      upgraded.turnReinforcements=upgraded.reinforcements+upgraded.log.slice(start+1).filter(e=>e.player===upgraded.active&&e.action==='reinforce').reduce((n,e)=>n+(e.count??0),0);
      changed=true;
    }
    if(changed)await this.save(upgraded);
    return upgraded;
  }
  async profile(): Promise<Profile> {
    const db = await this.open();
    const name = (await this.get<string>('profile', 'name')) ?? 'Comandante';
    const results = await new Promise<ResultRecord[]>((resolve, reject) => {
      const req = db.transaction('results', 'readonly').objectStore('results').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return {
      name,
      results: results.sort((a, b) => b.date - a.date)
    };
  }
  async setName(name: string) {
    const db = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('profile', 'readwrite');
      tx.objectStore('profile').put(name, 'name');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
