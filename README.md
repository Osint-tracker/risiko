# RisiKo Offline 1.3.1 — Regular e Antartide per Android

Gioco single-player in italiano con 2–4 avversari IA, 20 giri e sdadata. Il tavolo e la mappa SVG sono ricostruiti seguendo lo screenshot fornito dall’utente: oceano turchese, coste e isole, giocatori a sinistra, comandi a destra e fase/timer in alto. È una ricostruzione indipendente, non l’app ufficiale e non una replica pixel per pixel.

## Correzione home 1.3.1

Sui display in orizzontale alti al massimo 600 px, le impostazioni usano tutta la larghezza disponibile. Opzioni partita e avversari sono affiancati da 760 px di larghezza; sui display più stretti si dispongono in verticale. Scorre l’intero pannello, inclusi titolo e comandi, con GIOCA e Riprendi nella stessa barra. Nessuna piccola area di scorrimento interna. I cambi di opzione conservano la posizione di scorrimento.

[Anteprima statica aggiornata](docs/home-preview-1.3.1.html) · [Istruzioni e verifiche](docs/CORREZIONE-HOME-1.3.1.md).

## Novità 1.3

- Attacchi con mirino, flash, clash e suono sincronizzato.
- Home nei colori dei carri e impostazioni dei bot personalizzabili.
- Bot più attenti a territori deboli, continenti, riserve e contrattacchi.
- Sortite rare solo con al massimo 8 territori e meno di 3 rinforzi totali.
- Antartide opzionale: due territori, tre collegamenti intercontinentali, +2 rinforzi.

## Correzione grafica 1.2.1

Silhouette ricalcata dal nuovo dettaglio: corpo più pieno, canna larga e profilo superiore compatto. Cifre dritte e spesse, con carattere incorporato offline: il numero 1 è stato ridisegnato dal riferimento; gli altri numeri derivano da Open Sans ExtraBold. Il font originale non è identificabile con certezza dalla sola immagine sfocata. Anteprima: [token-preview-v1.2.1.png](docs/token-preview-v1.2.1.png).

Verifica della correzione: 14 test di rendering/animazione superati, build web locale e import verificati. Il controllo browser del caricamento del carattere è incluso nella CI, da eseguire su GitHub. Versione Android 1.2.1, versionCode 4.

## Aggiornamento 1.2

- Carte e obiettivo rimangono aperti durante attacchi e cambi di turno dei bot, con selezione e scorrimento conservati.
- Alla conquista vengono trasferiti subito i carri obbligatori (numero di dadi dell’ultimo attacco). La finestra compatta da 280–290 px permette di scegliere soltanto gli aggiuntivi, partendo da zero.
- Nessuna freccia sulla mappa: impulsi coordinati sui territori, indicatori colorati +N/−N e transizioni dei contatori. I dadi restano quelli della versione 1.1.
- Carro armato ridisegnato seguendo la foto, con numero interno adattato fino a tre cifre.
- Ripresa dei vecchi salvataggi post-conquista con trasferimento del minimo una sola volta.

Istruzioni: [AGGIORNAMENTO-1.2.md](docs/AGGIORNAMENTO-1.2.md). Rimangono tutte le funzioni della [versione 1.1](docs/AGGIORNAMENTO-1.1.md), compresi setup corretto e tempi umani dei bot.

## Stato della consegna 1.3

Nuova home, clash con audio locale, strategie configurabili per ciascun bot e modalità **Antartide** facoltativa. Istruzioni complete: [AGGIORNAMENTO-1.3.md](docs/AGGIORNAMENTO-1.3.md). Anteprima della mappa: [antarctica-preview.png](docs/antarctica-preview.png).

TypeScript, build React/Vite, verifica degli asset offline e sincronizzazione Capacitor completati localmente. Confronto di 90 partite con la precedente IA e test specifici dell’Antartide completati. Il collaudo browser e il nuovo APK restano da eseguire nel workflow GitHub: qui l’avvio del server e di Chromium è impedito dai permessi di rete/sistema e non è installato l’SDK Android. Dettagli nel [rapporto 1.3](docs/VERIFICA-1.3.md).

Le sezioni 1.2 e 1.2.1 sopra descrivono le verifiche storiche di quelle versioni.

## Prova locale senza installare pacchetti

Richiede Node 22.18+ (verificato con Node 24). Su un computer che consenta l’apertura di una porta locale:

```bash
node scripts/serve.mjs
```

Aprire `http://localhost:4173`. Il server serve soltanto i file locali. Non aprire direttamente `index.html` dal filesystem: Web Worker e IndexedDB richiedono un’origine supportata dal browser.

```bash
npm test
npm run build
node scripts/verify-package.mjs
```

Senza dipendenze installate, `npm run build` rimuove le annotazioni TypeScript tramite Node e crea `dist/`, senza scaricare nulla. Dopo `npm install` usa automaticamente Vite e il contenitore React. Il renderer imperativo è condiviso fra le due modalità per mantenere identico il comportamento.

## Compilazione APK

Prerequisiti sulla macchina di build: Node 22.18+, JDK 21, Android SDK Command-line Tools, piattaforma Android 36, Build Tools 36.0.0, curl, unzip e sha256sum. Occorre rete sulla macchina di build per scaricare dipendenze; il gioco installato non la usa.

```bash
npm install
npm run typecheck
npm test
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

APK previsto: `android/app/build/outputs/apk/debug/app-debug.apk`.

Impostare `ANDROID_HOME` sul proprio Android SDK. Lo script `scripts/prepare-android.sh` installa i componenti SDK richiesti tramite `sdkmanager`, sincronizza Capacitor, compila e copia l’APK e il checksum in `artifacts/`. Le licenze SDK vanno accettate con gli strumenti Android sulla macchina di build.

Il launcher `android/gradlew` è un bootstrap sorgente per Gradle 8.14.3: scarica la distribuzione e ne confronta il checksum pubblicato. Non è incluso un wrapper JAR precompilato. Su Windows usare WSL oppure Android Studio con Gradle 8.14.3 e JDK 21.

È incluso un workflow GitHub Actions per build, test e caricamento dell’APK come artifact. Usa Node 24, JDK 21 e gli strumenti SDK preinstallati nel runner `ubuntu-24.04`, quindi installa i componenti Android 36. I download richiedono rete soltanto durante la compilazione.

### Se GitHub Actions fallisce

Il workflow conserva stdout e stderr di ogni comando nell’artifact **log-compilazione**, disponibile nella pagina del run anche in caso di errore. I testi delle licenze sono salvati separatamente in `android-licenses.log`; gli errori Gradle includono lo stack trace. Le verifiche restano obbligatorie: un loro errore blocca la consegna dell’APK.

Per aggiornare un repository esistente con questa correzione, sostituire `.github/workflows/android.yml` e aggiungere `scripts/ci-run.sh`, `scripts/ci-android-sdk.sh` e `tests/ci.test.ts`, conservando questi percorsi. Poi avviare un **nuovo run** da Actions → Build e verifica Android → Run workflow. «Re-run jobs» di un vecchio run riutilizza il vecchio commit.

I log completi del tentativo esterno confermano il fallimento del vecchio workflow su `sdkmanager tools`: il pacchetto non è stato trovato. Il workflow aggiornato elimina questa richiesta e usa solo i componenti necessari. Vedi [analisi e correzioni CI](docs/CORREZIONE-CI.md). La nuova build Android completa resta da verificare su GitHub.

## Uso

1. Scegli nome, 3–5 giocatori, difficoltà di ogni bot e tempo per turno (3 minuti per impostazione iniziale).
2. Durante il setup tocca i tuoi territori per piazzare un carro; la mano passa dopo tre carri o all’esaurimento della dotazione.
3. All’inizio del turno puoi cambiare un tris; poi piazza tutti i rinforzi.
4. Seleziona un tuo territorio e un nemico adiacente per combattere. Il blitz si può interrompere e si ferma ai limiti legali.
5. Dopo una conquista scegli le armate da trasferire. Alla fine puoi effettuare un solo spostamento adiacente.
6. Il pulsante con l’occhio evidenzia l’obiettivo; il cerchio concentrico apre la carta. Il pannello destro mostra anche carte e informazioni sul territorio selezionato.
7. Zoom con rotella, pulsanti o pinch; trascina per spostare la plancia. `NOMI` attiva/disattiva le etichette. Velocità bot 1×/2×/4×/rapida.
8. L’app salva dopo ogni azione; quando va in background si mette in pausa. Alla riapertura usa **Riprendi**. La creazione di un nuovo tavolo chiede conferma prima di sostituire il salvataggio.

I livelli dei bot casuali e gli obiettivi avversari vengono rivelati soltanto nei risultati. Dopo l’eliminazione del giocatore umano, i bot proseguono: puoi osservare e accelerare la conclusione.

## Regole e fedeltà

Il MHT fornito dall’utente è il riferimento prioritario. Le integrazioni approvate (130 carri, 7 carte, guarnigioni, protezione iniziale, spareggi, ecc.) sono riportate in [REGOLE.md](docs/REGOLE.md). La formula locale dell’esperienza è distinta dai livelli ufficiali.

La plancia ha 42 territori e 164 punti. Ogni obiettivo vale 86 punti. Le appartenenze dei 16 obiettivi sono ricostruite dalle descrizioni territoriali e confrontate con 120 sovrapposizioni pubblicate; tre discrepanze della fonte secondaria sono esplicitate in [FONTI.md](docs/FONTI.md), senza occultarle nei test.

Le geometrie, le icone e la texture sono ricostruzioni locali. Il mazzo ha 14 simboli di ciascun tipo più due Jolly; l’associazione specifica simbolo–territorio è una distribuzione locale bilanciata, non una trascrizione verificata delle carte fisiche. Il MHT non specifica queste associazioni.

## Architettura

- `src/data`: topologia stabile, geometria da riferimento, continenti, mazzo e obiettivi.
- `src/engine`: FSM deterministica, validazione, dadi, timer, sdadata e Worker autorevole. Le viste pubbliche escludono carte/obiettivi altrui, stato del generatore casuale e mazzo.
- `src/ai`: strategie Facile/Medio/Difficile, distribuzioni esatte dei dadi, probabilità di conquista e inferenza basata sulle sole azioni pubbliche.
- `src/services`: IndexedDB con transazioni; risultati idempotenti per ID partita.
- `src/gui`: interfaccia e interazione touch; ingresso React opzionale per la build Vite.
- `android`: host Capacitor, landscape e fullscreen, rimozione del permesso Internet nel manifest sorgente.

Gli eventi `onGameStateUpdate`, `onDiceRolled`, `onTurnChanged`, `onSdadataRoll`, `onGameOver` sono emessi dal Worker dopo il salvataggio. I comandi includono ID univoco e revisione per impedire doppie applicazioni. Il routing locale usa hash con i percorsi `/app/gui/user/home`, `/app/gui/game/table`, `/app/gui/game/results`, `/app/gui/profile/local`.

Compatibilità prevista: Android 7+ con Android System WebView aggiornato. La UI usa funzioni moderne del browser; è consigliato WebView 111+. Il comportamento effettivo su Android e in modalità aereo richiede ancora il collaudo indicato nel rapporto.
