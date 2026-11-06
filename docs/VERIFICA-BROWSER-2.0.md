# Verifica browser: cause dei fallimenti e revisione della suite

## Cosa significa exit code 1

`ci-run.sh` conserva l'uscita del comando sottostante: `1` segnala un fallimento generico. Non identifica uno stesso difetto di SDK, npm o motore. Il messaggio precedente e lo stack identificano la causa concreta.

La vecchia suite era un unico percorso: un'asserzione fermava l'intero processo, lasciando ineseguiti i casi successivi. Dopo ciascuna correzione emergeva quindi il blocco seguente. I test Node con DOM simulato non verificavano l'unicità dei locator Playwright, le sovrapposizioni reali o tutte le temporizzazioni del browser. Il numero di unit test passati non certificava il percorso browser.

## Difetti identificati nei log

- Hitbox SVG sovrapposte e selettore del puntatore diverso tra app e test: corretti con risoluzione condivisa nello spazio dello schermo.
- Cambio di fixture attraverso il menu di una partita ancora attiva: navigazione a documento neutro prima della scrittura IndexedDB.
- Backdrop ancora interattivo durante l'uscita: dialogo immediatamente inerte, attesa della rimozione prima della misurazione dei territori.
- Ripresa dalla Home con proiezione già caricata: invalidazione della proiezione alla selezione dello slot per ridisegnare la plancia.
- Letture separate di fase, attore e pulsanti: snapshot atomico del piazzamento, con verifica invariata di numero di click e incremento delle armate.
- Carta presente nella mano e nel tris con lo stesso attributo: ora `data-card` identifica la carta nella mano e `data-remove-card` il comando di rimozione. I locator sono anche circoscritti a `.hand` e `.tris-tray`. Nessun `.first()` aggiunto per nascondere l'ambiguità.

La rimozione dal tris è idempotente, rimane disponibile durante gli effetti e restituisce il focus alla carta corrispondente nella mano.

## Suite attuale

`npm run test:ui` avvia `scripts/browser-suite.mjs`. Esegue in sequenza 12 processi browser indipendenti: Home/setup a 3, plancia/ripresa, rinforzi/Undo, setup a 4, setup a 5, combattimento umano, carte durante turno bot, Antartide a 3/4/5, combattimento polare, gesti della mappa.

Ogni processo crea un browser e un contesto nuovi: nessun salvataggio, velocità bot o pannello lasciato aperto dal caso precedente. All'interno dei casi che verificano persistenza, reload e ripresa la sessione viene conservata intenzionalmente. I controlli di animazione restano nel caso che esegue l'attacco.

Un fallimento non impedisce gli altri scenari; il comando complessivo restituisce comunque `1` se almeno un caso fallisce. Non sono stati introdotti click forzati, retry dell'intero test o `continue-on-error` nel workflow. Il seed della partita iniziale è fisso.

Il workflow esistente continua a usare `npm run test:ui`, quindi non richiede modifiche YAML. **Nel nuovo log deve comparire `node scripts/browser-suite.mjs`**. Se compare soltanto `node scripts/browser-test.mjs`, verificare che `package.json` del pacchetto sia stato sostituito nella radice corretta.

## Risultati e diagnosi

- `artifacts/browser/summary.json`: tutti gli esiti, exit code, durata e nome caso.
- `artifacts/browser/<nome-caso>/`: screenshot, video se richiesto dal workflow, trace Playwright e stato al fallimento.
- Il workflow Android carica già questa directory nell'artifact `verifica-interfaccia`, anche in caso di errore.
- Per rieseguire un caso: `UI_CASE=bot-cards node scripts/browser-test.mjs`.
- Per aprire una trace scaricata: `npx playwright show-trace percorso/trace.zip`.

## Limite della verifica locale

Questa consegna verifica localmente TypeScript, build, PWA e test Node, inclusi contratti delle carte e comportamento del runner dopo errori. L'esecuzione browser completa non è certificata in questo ambiente: il server locale/Chromium sono bloccati dalle restrizioni di esecuzione. Il riepilogo GitHub dei 12 casi è la verifica end-to-end necessaria; i controlli Node non la sostituiscono.

## Regressione gesti e rinforzi

Il caso `map-gestures` usa gli eventi touch di Chromium tramite CDP: trascinamento con un dito, pinch, passaggio a un solo dito, perdita della cattura e tre piazzamenti consecutivi nella stessa partita. Controlla che lo zoom non cambi durante il trascinamento, che il piazzamento riparta senza passare dalla Home e che l’SVG non venga mai staccato dal DOM durante gli aggiornamenti (MutationObserver). Il cambio alla fase Attacco deve conservare la stessa mappa.

I test Node `map-gestures.test.ts` coprono inoltre cancellazione, contatto primario dopo un pointerup mancante, reset su pausa/rotazione, pressione lunga, mouse e rimozione dei listener. `ui.test.ts` controlla che Escape, Chiudi e Continua sul riepilogo inviino esattamente un SUMMARY_ACK e consentano il comando PLACE successivo.
