# Rapporto di verifica

## Eseguito nell’ambiente di lavoro

- 30 test automatici: 3 sui dati, 20 sul motore/IA, 6 sul rendering e le interazioni a livello di componenti, 1 sull’integrazione del Worker con persistenza simulata.
- Nove partite complete simulate: ogni difficoltà su ciascun tavolo da 3, 4 e 5 giocatori. Tutte giungono a una conclusione legale; gli invarianti vengono controllati dopo ogni azione.
- Setup verificato su 60 distribuzioni (20 semi per ciascuna dimensione del tavolo).
- Grafo bidirezionale, 42 territori, 164 punti, totali continentali, 16 obiettivi distinti da 86, mazzo da 44 carte.
- Confronto delle appartenenze degli obiettivi con la matrice pubblicata, mantenendo visibili le tre discrepanze descritte in FONTI.md.
- Tris, limite 130, inferiorità di dadi, protezione nei primi quattro giri, guarnigioni e loro eccezione, spostamenti adiacenti, limite sette carte, riciclo del mazzo, eliminazione e acquisizione delle carte.
- Dadi 3v3 enumerati esattamente; probabilità di conquista con arresto per inferiorità di dadi.
- Scadenza del timer in rinforzo e post-conquista, pausa, prima sdadata, avanzamento soglie con ancora eliminata, chiusura, vittoria immediata per obiettivo.
- Serializzazione JSON e ripresa deterministica; redazione di carte, obiettivi e livelli ciechi nelle viste pubbliche.
- Worker: salvataggio prima della pubblicazione, eventi, rifiuto dei duplicati e mancata applicazione dell’azione quando la persistenza fallisce. Questo test usa un adattatore di persistenza in memoria, non IndexedDB reale.
- Rendering: lobby, difficoltà cieca, tavolo, escaping del nome, carte, obiettivo, risultati, conferma sostituzione salvataggio e pausa durante un trasferimento obbligatorio.
- Build web locale tramite rimozione delle annotazioni TypeScript. Tutti gli import locali della build sono risolti.
- Controllo statico del manifest sorgente: landscape, backup disabilitato e rimozione del permesso Internet.
- Anteprima SVG/PNG della plancia prodotta dal renderer dell’app e ispezionata. Non è una schermata del browser né una prova su Android.

Output dei test: `test-results.txt`. I test del renderer usano un DOM minimo simulato e non dimostrano layout, pinch o comportamento del browser.

## Non eseguito / non verificato

- Build React/Vite e typecheck semantico TypeScript: pacchetti npm non installati per indisponibilità della rete utilizzabile.
- Collaudo Playwright in Chromium: avvio negato dall’ambiente (`setsockopt: Operation not permitted`). Anche il server locale è stato bloccato (`listen EPERM`). Lo script E2E è incluso ma non viene conteggiato fra i test superati.
- Persistenza IndexedDB reale attraverso crash/reload: coperta nello script E2E da eseguire su una macchina che consenta il browser.
- APK, manifest risultante dalla fusione Android, firma e installazione: SDK Android e dipendenze di build non disponibili. Il controllo è sul manifest sorgente, non su un APK prodotto.
- Modalità aereo, orientamento su dispositivi fisici/emulatore, prestazioni e touch su Android.
- Confronto pixel-perfect con l’interfaccia ufficiale o confronto visivo ad alta risoluzione delle 16 carte originali.

## Completamento del collaudo su una macchina abilitata

```bash
npm install
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:ui
npx cap sync android
cd android
./gradlew assembleDebug
```

Installare l’APK su telefono/tablet, attivare la modalità aereo e verificare: nuova partita, zoom e pan, ripresa dopo chiusura, pausa durante post-conquista, timer, tutte le difficoltà, schermata risultati e persistenza delle statistiche. Ispezionare il manifest dell’APK per confermare l’assenza del permesso Internet.
