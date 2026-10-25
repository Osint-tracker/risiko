                                                    
import { assertState, ranks } from '../engine/RisikoRulesEngine.js';
                            
             
               
               
               
                 
                 
                   
                  
  
                       
               
                          
  
export class StorageService {
          promise                              = null;
          open() {
    return this.promise ??= new Promise             ((resolve, reject) => {
      const req = indexedDB.open('risiko-offline', 1);
      req.onupgradeneeded = () => {
        for (const name of ['game', 'profile', 'results']) if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async get   (store        , key        )                    {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, 'readonly'),
        r = t.objectStore(store).get(key);
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => reject(r.error);
    });
  }
  async save(state           )                {
    assertState(state);
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['game', 'results'], 'readwrite');
      tx.objectStore('game').put(state, 'current');
      if (state.phase === 'GAME_OVER') {
        const ranking = ranks(state),
          rank = ranking.findIndex(r => r.player === 0);
        const result               = {
          id: state.id,
          date: Date.now(),
          name: state.players[0].name,
          rank: rank + 1,
          points: ranking[rank].points,
          reason: state.reason ,
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
  async load()                            {
    const s = await this.get           ('game', 'current');
    if (s) assertState(s);
    return s;
  }
  async profile()                   {
    const db = await this.open();
    const name = (await this.get        ('profile', 'name')) ?? 'Comandante';
    const results = await new Promise                ((resolve, reject) => {
      const req = db.transaction('results', 'readonly').objectStore('results').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return {
      name,
      results: results.sort((a, b) => b.date - a.date)
    };
  }
  async setName(name        ) {
    const db = await this.open();
    return new Promise      ((resolve, reject) => {
      const tx = db.transaction('profile', 'readwrite');
      tx.objectStore('profile').put(name, 'name');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
