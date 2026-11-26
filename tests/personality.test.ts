import test from 'node:test';
import assert from 'node:assert/strict';
import {botPolicy} from '../src/ai/policy.ts';
import {profileOf,setProfileLevel,profiles} from '../src/ai/Profile.ts';

test('ogni personalità ha le sue caselle consigliate, non tutte accese',()=>{
 assert.equal(botPolicy({personality:'stratega'}).breakBonus,false);
 assert.equal(botPolicy({personality:'incursore'}).reserve,false);
 assert.equal(botPolicy({personality:'incursore'}).defend,true);
 assert.equal(botPolicy({personality:'conquistatore'}).weakBorders,false);
 assert.ok(Object.values(botPolicy()).filter(v=>v===true).length===8,'Equilibrato resta con tutte le caselle');
 assert.equal(botPolicy({personality:'stratega',breakBonus:true}).breakBonus,true,'Una scelta esplicita vince sul preset');
});

test('Equilibrato coincide con il comportamento storico a ogni livello',()=>{
 for(const level of ['facile','medio','difficile','survival'] as const){
  setProfileLevel(level);
  assert.deepEqual(profileOf(botPolicy()),profiles.equilibrato);
 }
 setProfileLevel('medio');
});

test('Facile mantiene lo stile ma attenuato; dal Medio in su lo stile è pieno',()=>{
 setProfileLevel('facile');
 const easy=profileOf(botPolicy({personality:'incursore'}));
 setProfileLevel('survival');
 const hard=profileOf(botPolicy({personality:'incursore'}));
 setProfileLevel('medio');
 assert.ok(easy.breaker>1&&easy.breaker<hard.breaker,'Il Facile rompe i bonus più di Equilibrato ma meno del Survival');
 setProfileLevel('facile');
 assert.ok(profileOf(botPolicy({personality:'conquistatore'})).continent<1.3,'Il Facile non diventa un costruttore di continenti efficiente');
 assert.ok(profileOf(botPolicy({personality:'stratega'})).garrison<=1,'Il Facile non aggiunge guarnigioni extra');
 setProfileLevel('medio');
});
