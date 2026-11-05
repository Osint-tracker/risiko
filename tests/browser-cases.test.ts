import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {browserCases,runBrowserCases} from '../scripts/browser-cases.mjs';

test('suite browser: esegue tutti gli scenari anche dopo un exit 1 o un errore di avvio',async()=>{
 const seen:string[]=[];
 const results=await runBrowserCases(async(name:string)=>{seen.push(name);if(name==='one')return 1;if(name==='two')throw Error('browser unavailable');return 0;},['one','two','three']);
 assert.deepEqual(seen,['one','two','three']);assert.deepEqual(results.map(r=>r.passed),[false,false,true]);assert.deepEqual(results.map(r=>r.code),[1,1,0]);
 assert.match(results[1].error!,/browser unavailable/);
});
test('suite browser: codice mancante non diventa un falso successo',async()=>{
 const results=await runBrowserCases(async()=>null,['interrupted']);assert.equal(results[0].passed,false);assert.equal(results[0].code,1);
});
test('suite browser: 11 casi distinti coprono classico, Antartide, carte, ripresa e combattimento',()=>{
 assert.equal(new Set(browserCases).size,11);
 for(const name of ['home-setup-3','setup-4','setup-5','antarctica-3','antarctica-4','antarctica-5','human-combat','antarctica-combat','bot-cards','board-resume','reinforcement-undo'])assert.ok(browserCases.includes(name));
});
test('contratto selettori: carte della mano distinte dal vassoio in ogni accesso browser',()=>{
 const script=readFileSync('scripts/browser-test.mjs','utf8');
 assert.doesNotMatch(script,/locator\(['"`]\[data-card=/,'Un data-card globale diventa ambiguo quando la carta è selezionata');
 assert.match(script,/\.cards-window \.hand \.territory-card\[data-card=/);
 assert.match(script,/\.cards-window \.tris-tray \[data-remove-card=/);
});
