# Rapporto di verifica

La versione precedente ha superato la CI GitHub ed è stata installata e provata dall’utente. Questo rapporto distingue le verifiche locali della nuova versione 1.1 dai collaudi ancora da eseguire sulla nuova build.

## Eseguito nell’ambiente di lavoro

- 53 test automatici: 3 sui dati, 20 sul motore/IA originale, 9 sul rendering e le interazioni, 13 su presentazione e comportamento umano, 2 sul Worker con persistenza simulata e 6 sugli script CI.
- Script CI: conservazione di stdout/stderr e del codice di uscita, licenze con chiusura anticipata di stdin, propagazione degli errori di licenze/installazione, diagnostica per SDK assente. Questi test usano uno `sdkmanager` simulato, non scaricano l’SDK. Sintassi Bash e struttura YAML controllate localmente.
- Diciotto partite complete simulate (nove con IA originale e nove con personalità): ogni difficoltà su ciascun tavolo da 3, 4 e 5 giocatori. Tutte giungono a una conclusione legale; gli invarianti vengono controllati dopo ogni azione.
- Setup verificato su 60 distribuzioni iniziali e 30 schieramenti completi con passaggi di mano. Confermati 35/30/25 carri finali e massimo tre piazzamenti per mano; verificato anche un rinforzo normale di 30 carri.
- Grafo bidirezionale, 42 territori, 164 punti, totali continentali, 16 obiettivi distinti da 86, mazzo da 44 carte.
- Confronto delle appartenenze degli obiettivi con la matrice pubblicata, mantenendo visibili le tre discrepanze descritte in FONTI.md.
- Tris, limite 130, inferiorità di dadi, protezione nei primi quattro giri, guarnigioni e loro eccezione, spostamenti adiacenti, limite sette carte, riciclo del mazzo, eliminazione e acquisizione delle carte.
- Dadi 3v3 enumerati esattamente; probabilità di conquista con arresto per inferiorità di dadi.
- Scadenza del timer in rinforzo e post-conquista, pausa, prima sdadata, avanzamento soglie con ancora eliminata, chiusura, vittoria immediata per obiettivo.
- Serializzazione JSON e ripresa deterministica; redazione di carte, obiettivi e livelli ciechi nelle viste pubbliche.
- Worker: salvataggio prima della pubblicazione e degli effetti; ACK esatto, duplicati ignorati, timer sospeso, pausa/ripresa durante gli effetti, recupero alla scadenza del watchdog e mancata applicazione dell’azione quando la persistenza fallisce. I test usano un adattatore di persistenza in memoria, non IndexedDB reale.
- Rendering: lobby, difficoltà cieca, tavolo, escaping del nome, nuove carte militari e tris selezionato, obiettivo, risultati, contatori di setup, segnalini con numero interno, territori piazzabili, finestre flottanti e pausa durante un trasferimento obbligatorio.
- Presentazione: origine/destinazione e risultati autentici; ordine spostamento/pesca/sdadata; nessuna pesca senza conquista o a sette carte; nessuna identità di carte dei bot nei messaggi; sequenze di timeout limitate a otto secondi.
- IA: tempi contestuali con casualità separata, compatibilità senza contesto salvato, sortite disperate condizionali con limite di lanci e cooldown; contesto privato escluso dalle viste pubbliche.
- Build web locale tramite rimozione delle annotazioni TypeScript. Tutti gli import locali della build sono risolti.
- Controllo statico del manifest sorgente: landscape, backup disabilitato e rimozione del permesso Internet.
- Anteprima SVG/PNG della plancia prodotta dal renderer dell’app e ispezionata. Non è una schermata del browser né una prova su Android.

Output dei test: `test-results.txt`. I test del renderer usano un DOM minimo simulato e non dimostrano layout, pinch o comportamento del browser.

## Non eseguito / non verificato per la versione 1.1

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
