import {assertState} from '../engine/RisikoRulesEngine.ts';
import type {GameState} from '../engine/types.ts';
export const snapshotKey='risiko-autosave-v1';
// Browser-side bridge: localStorage is intentionally unavailable in a Worker.
export function writeLocalSnapshot(state:GameState):boolean{
 try{assertState(state);localStorage.setItem(snapshotKey,JSON.stringify(state));return true;}catch{return false;}
}
export function readLocalSnapshot():GameState|null{
 try{const raw=localStorage.getItem(snapshotKey);if(!raw)return null;const state=JSON.parse(raw);assertState(state);return state;}catch{return null;}
}
