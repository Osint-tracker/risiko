# 1.4.1 — Leggibilità, home e fluidità

## Plancia

Rimosso il ridimensionamento inverso dei carri e delle etichette. In precedenza `fitMapTargets()` ingrandiva i simboli quando la mappa veniva rimpicciolita, mantenendoli quasi costanti in pixel e causando sovrapposizioni. Ora carri, numeri, nomi e simboli “+” condividono le coordinate della mappa: lo zoom li ingrandisce insieme ai territori. Solo le hitbox invisibili rimangono di almeno 44 px.

Il tavolo usa quattro righe di layout: giocatori, plancia, comandi di fase e preferenze. Il gruppo zoom è orizzontale, a sinistra della colonna laterale; Cronologia resta dentro quella colonna. I comandi laterali possono scorrere sugli schermi molto bassi. Safe area applicata al contenitore esterno, senza conteggiarla di nuovo dentro la plancia.

I nomi hanno dimensione in unità della mappa. Nella panoramica sono più piccoli: ingrandendo diventano leggibili senza coprire i territori vicini. Il pulsante NOMI resta disponibile.

## Home

Dall’ultimo riferimento fornito: sfondo azzurro/turchese, griglia e triangoli, header blu scuro, profilo con emblema R e pannelli bordati chiari. GIOCA arancione con sottotitolo “Entra in battaglia”, Riprendi verde, controlli blu. Resta un singolo pannello scorrevole per le impostazioni su telefono. Nessuna aggiunta di shop, multiplayer, abbonamenti o funzioni estranee al gioco offline.

Anteprima statica: `home-preview-1.4.1.html`. Non è una sessione interattiva del gioco.

## Prestazioni e tempi

- Il normale tick da 50 ms aggiorna soltanto contatori; non clona più board e cronologia a ogni tick. Scadenze e comandi reali continuano a produrre uno stato isolato.
- Il Worker invia piccoli messaggi CLOCK ogni secondo. La UI cambia soltanto il testo dei timer; non ricostruisce la mappa né le finestre aperte.
- Ogni azione, pausa, cambio fase e conquista continua a essere salvata prima della pubblicazione. I checkpoint che aggiornano esclusivamente il tempo passano da uno a cinque secondi: un arresto improvviso senza azioni intermedie può perdere al massimo quel tratto di tempo, non armate o mosse già confermate.
- L’SVG già montato viene riutilizzato all’inizio della presentazione, invece di ricostruirlo due volte per azione.
- Panning e pinch raggruppati con requestAnimationFrame. Il trascinamento usa la matrice SVG effettiva, correggendo la sottostima causata dagli spazi vuoti laterali.
- Eliminati i passaggi SVG di morfologia/blur dei continenti durante il movimento; restano contorni e texture.
- Durate a ritmo Normale: piazzamento 360 ms (prima 800), movimento 520 ms (800), battaglia 1800 ms (2500), Tris 850 ms, pesca 1600 ms, Sdadata 1500 ms. Il lancio dadi normale resta di 350 ms. Veloce accelera anche le presentazioni umane; Istantaneo salta quelle dei bot e mantiene quelle umane a velocità doppia.
- Strategia e pause di ragionamento dei bot a ritmo Normale non sono state indebolite. Il selettore resta disponibile per chi preferisce turni veloci.

Un microbenchmark locale con 4000 eventi e 500 tick è sceso da circa 1611 ms a meno di 1 ms per il solo aggiornamento dell’orologio (`performance-1.4.1.json`). Non è una misura di FPS o prestazioni del telefono; la fluidità Android va valutata sul dispositivo.

## Verifiche

- `npm run typecheck`: superato.
- `npm test`: 98 test, zero errori e zero saltati.
- Dopo l’ultima correzione al trascinamento: 21 test UI/animazioni ripetuti, tutti passati.
- `npm run android:sync`: build Vite e sincronizzazione Capacitor riuscite.
- Verifica statica del pacchetto offline e sintassi dello script browser: superate.
- Aggiunti al test browser controlli geometrici per le fasce HUD, separazione zoom/Cronologia e scala proporzionale dei carri. La suite browser resta nel workflow GitHub; non è stata rilanciata localmente dopo la richiesta dell’utente di interrompere quel lavoro. Nessun test viene saltato nel workflow.

Regole, opzione Antartide, obiettivi Torneo, nuova icona con cane e salvataggi restano compatibili. Versione Android 1.4.1, versionCode 8. Il nuovo APK viene generato dal workflow GitHub.
