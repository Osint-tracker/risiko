# RisiKo Offline — Regular per Android

Gioco single-player in italiano con 2–4 avversari IA, 20 giri e sdadata. Il tavolo e la mappa SVG sono ricostruiti seguendo lo screenshot fornito dall’utente: oceano turchese, coste e isole, giocatori a sinistra, comandi a destra e fase/timer in alto. È una ricostruzione indipendente, non l’app ufficiale e non una replica pixel per pixel.

## Stato della consegna

- Implementati motore, dati, tre strategie IA, modalità cieca, timer, interfaccia, log, salvataggio e profilo locale.
- Build web locale prodotta e controllata; test automatici del motore e del rendering eseguiti. Vedi [rapporto di verifica](docs/VERIFICA.md).
- **APK non prodotto in questo ambiente:** SDK Android e dipendenze npm/Gradle non sono disponibili; accesso di rete e avvio del browser sono stati bloccati dall’ambiente. Il progetto Android e la procedura di build sono inclusi, ma non vengono presentati come collaudati su dispositivo.
- La build React/Vite e il controllo completo TypeScript richiedono `npm install`; non sono stati eseguiti qui. La build locale indipendente dalle dipendenze usa lo stesso motore, Worker e interfaccia.

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

È inclusa anche una workflow GitHub Actions per build, test e caricamento dell’APK come artifact. Non è stata pubblicata né eseguita su un account esterno.

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
