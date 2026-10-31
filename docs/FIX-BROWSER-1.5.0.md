# Correzione test browser 1.5.0

Il log con `Cannot read properties of null (reading 'y')` proviene dal controllo del layout dopo il setup. La riserva iniziale è già stata piazzata; il bot è in ATTACK, con velocità Istantaneo. Le misure con chiamate Playwright separate possono riferirsi a nodi che un aggiornamento della schermata ha appena sostituito. `boundingBox()` può così restituire null, prima ancora che venga controllata una sovrapposizione.

## Modifiche

- `scripts/browser-test.mjs`: il setup continua a essere completato tramite tocchi reali. Per misurare layout e zoom viene poi caricata, attraverso il normale salvataggio IndexedDB, una posizione valida con il turno umano e dieci minuti disponibili. Nessun bot può cambiare il DOM durante queste misure.
- `scripts/browser-layout.mjs`: lettura sincrona di tutte le geometrie in un solo `page.evaluate`. Verifica esplicita di presenza, visibilità e dimensioni prima di leggere le coordinate. Restano i controlli di sovrapposizione HUD, separazione zoom/Cronologia e overflow. Carro e viewBox vengono anch'essi letti nello stesso snapshot.
- `tests/browser-layout.test.ts`: copertura di geometrie valide, elementi mancanti, elementi nascosti, sovrapposizioni, overflow e lettura atomica.

Non sono stati introdotti click forzati, attese arbitrarie o controlli saltati. Nessuna modifica al gioco, ai bot o alle regole.

## Installazione

Estrarre la patch nella radice del repository, mantenendo i percorsi:

- **Sostituire** `scripts/browser-test.mjs`.
- **Aggiungere** `scripts/browser-layout.mjs` e `tests/browser-layout.test.ts`.
- Questo documento può essere mantenuto in `docs/`.

Non creare una sottocartella con un secondo progetto. Eseguire nuovamente il workflow Android. È disponibile anche lo ZIP del progetto completo già corretto.

## Verifiche

27 test mirati (input browser, geometria, UI e orientamento) superati, zero saltati. Sintassi JavaScript verificata. La posizione usata per le misure è stata validata con `assertState`.

La suite Playwright completa è stata tentata, ma questo ambiente blocca il server locale con `listen EPERM 0.0.0.0:4173`. Non viene dichiarata superata: rimane obbligatoria nel workflow GitHub, con screenshot e trace in caso di errore. La versione resta 1.5.0 perché la modifica riguarda esclusivamente i test.
