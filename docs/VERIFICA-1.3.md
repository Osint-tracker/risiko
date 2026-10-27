# Verifica 1.3.0 — 27 ottobre 2026

## Controlli completati

- `npm run typecheck`: TypeScript 5.9.3, nessun errore.
- `npm test`: **80 test, 80 superati**, nessun test fallito o saltato. Output in `test-results-1.3.txt`.
- `npm run build`: build React/Vite di produzione riuscita.
- `node scripts/verify-package.mjs`: asset locali, import risolti, nessun endpoint remoto hardcoded; manifest sorgente landscape senza permesso Internet.
- `npx cap sync android`: completato, inclusi audio WAV e font incorporato.
- Sintassi degli script browser/benchmark e Bash CI controllata.

La suite copre regole, setup, dati, bot, audio con AudioContext simulato, rendering con adattatore DOM, timeline reale con orologio/SVG simulati, persistenza del Worker con adattatore in memoria e script CI. Queste verifiche non equivalgono a un collaudo completo su Android.

## Antartide

- Grafo simmetrico a 44 territori, sette continenti; le tre rotte esterne richieste e il collegamento fra i due settori.
- Bonus di due rinforzi solo con entrambi i territori; attacchi in entrambe le direzioni e spostamento adiacente con guarnigione.
- Sessanta distribuzioni iniziali (20 semi per 3/4/5 giocatori), numeri bilanciati, totali 35/30/25, mano massima di tre e mai entrambi i territori antartici a un giocatore iniziale.
- Due carte nuove con ID 44/45; i jolly mantengono ID 42/43. Tris, bonus territorio, conservazione del mazzo, serializzazione, modalità e punteggio fuori obiettivo.
- Scenari in cui medio e difficile completano il continente e il difficile rinforza la frontiera minacciata da Africa/Oceania.
- **Sei partite complete** con tutti i bot medi o difficili, su tavoli da 3, 4 e 5; invarianti controllati dopo ogni azione.
- Selezione facoltativa dalla home, rendering di 44 territori, ripresa con inquadratura estesa; nessuna modifica al grafo, mazzo e obiettivi classici quando la modalità è disattivata.

## Confronto IA classica

Eseguito prima dell’aggiunta dell’Antartide, contro una copia della IA 1.2.1 conservata in `tests/fixtures`. Ogni partita contiene un nuovo bot e gli altri bot della versione precedente, allo stesso livello. 45 partite per livello: 3 dimensioni del tavolo × 5 semi × 3 rotazioni. Le rotazioni non sono esaustive per i tavoli da 4/5. È un benchmark deterministico, non una stima della percentuale di vittoria contro persone.

| Livello | Vittorie nuova IA | Punti medi nuova IA | Punti medi avversari |
|---|---:|---:|---:|
| Medio | 29/45 | 69,42 | 19,02 |
| Difficile | 40/45 | 77,60 | 16,56 |

90 partite concluse legalmente. Dati per partita in `benchmark-ai-1.3.json`. Riproduzione: `npm run benchmark:ai` (report in `artifacts/ai/benchmark.json`). Non si è eseguito un confronto contro la vecchia IA nella mappa Antartide, che quella versione non supporta.

Le sortite sono verificate alle soglie 8/9 territori, 2/3 rinforzi e 6%/3%/2%, incluse carte/bonus nel totale, campionamento unico, persistenza, cooldown e interruzione. La tregua impedisce gli attacchi e consente i rinforzi. Le caselle delle strategie sono trasferite dal menu alla configurazione dei bot.

## Controlli ancora da eseguire nel workflow e sul telefono

Il test Playwright locale non ha raggiunto l’app: il server termina con `listen EPERM` sulla porta 4173. Anche l’avvio diretto di Chromium su un’anteprima statica termina con `setsockopt: Operation not permitted`. Le richieste di permesso supplementare non hanno prodotto un’esecuzione completata. **Il test browser non è dichiarato superato.**

`android.yml` include già i test browser per home, strategie, setup classico e polare 3/4/5, font, finestre, carte durante i turni bot, conquista, ripresa e asset offline. Produce screenshot, traccia Playwright e video nell’artifact `verifica-interfaccia`. Il video sarà disponibile solo dopo l’esecuzione del workflow.

L’SDK Android non è installato in questo ambiente: **nessun APK 1.3 è stato compilato localmente**. Il workflow compila il nuovo APK dopo i controlli. L’effettiva resa delle animazioni e l’audio sul telefono vanno controllati su quella build.

## Anteprime

`antarctica-preview.png`/`.svg`: render statico della geometria usata dal renderer, controllato visivamente. Le due tonalità glaciali, la divisione centrale e le tre rotte riprendono il riferimento dell’utente. Non è uno screenshot dell’APK.

`home-preview.html` e `antarctica-preview.html`: markup dell’interfaccia con gli stessi CSS e font incorporato, senza codice di gioco. Aprirli in un browser in orizzontale per vedere il layout statico. Non sostituiscono i test d’interazione.
