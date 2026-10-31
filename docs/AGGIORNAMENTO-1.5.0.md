# RisiKo Offline 1.5.0

## Menu e orientamento

Home a colonna unica, turchese con profilo, immagine, pulsante arancione GIOCA, ripresa e righe cliccabili per statistiche, configurazione, Survival, audio e regole. GIOCA apre la preparazione della partita; non avvia una partita prima di consentire la configurazione. Nessun pulsante fittizio per shop o multiplayer.

Il plugin locale GameOrientation mantiene menu e preparazione verticali e richiede landscape solo sul tavolo. Nel browser non viene forzato l’orientamento del dispositivo. La schermata “ruota il dispositivo” si applica esclusivamente al tavolo. Non richiede nuove dipendenze scaricabili.

L’anteprima HTML allegata è statica: rappresenta il markup prodotto dalla home, non esegue una partita né i pulsanti del menu.

## Evidenziazioni

Tolto il riempimento dorato sottostante e l’attenuazione automatica dei territori estranei all’attacco. Restano l’origine, i bersagli legalmente attaccabili, l’effetto di impatto e i “+” di piazzamento. L’overlay obiettivo rimane una scelta esplicita del giocatore.

## IA

- `LegacyStrategy.ts` conserva il comportamento Facile e permette confronti con la versione precedente.
- Rinforzi: confronto di investimenti da uno a tutti i carri disponibili, inclusi attacchi inizialmente impossibili. Il piano dei piazzamenti sopravvive al salvataggio in BotContext; viene scartato se non corrisponde più a fase, riserva o proprietà. Nel setup viene sempre rispettata la mano di tre carri.
- Campagna continentale: preferenza per un continente in base a quota già posseduta, costo di conquista e bonus ricorrente. Obiettivo Torneo, carta, bonus avversari, eliminazioni e difesa continuano a concorrere alla scelta.
- Medio: valutazione tattica con probabilità esatte, costo dei fallimenti e possibile seconda conquista.
- Difficile: fino a quattro candidati, 24 campionamenti ciascuno, campagne fino a cinque tentativi e risposta degli avversari.
- Survival: fino a sei candidati, 48 campionamenti ciascuno, campagne fino a otto tentativi e risposte più profonde. È il massimo budget di ricerca disponibile, non una modalità con dadi, rinforzi o coalizioni artificialmente favorevoli.
- Le simulazioni comprendono insuccessi e aggiornano armate, proprietà e rinforzi dopo le conquiste. La risposta avversaria usa obiettivi campionati dalle mosse pubbliche; non legge gli obiettivi segreti. Campiona possibili Tris dalle dimensioni pubbliche delle mani ed esclude gli obiettivi già assegnati nella simulazione. Non simula l’intera partita o ogni possibile Tris futuro.
- Prima dei rinforzi, Difficile e Survival confrontano distribuzioni concentrate, miste e difensive: fino a 5/8 candidati più la distribuzione base, con 12/24 campagne campionate ciascuno. Il piano viene calcolato una volta e consumato durante i piazzamenti, invece di ripetere tutta la ricerca per ogni carro.
- Attacco: confronto esplicito tra fermarsi dopo un combattimento e proseguire la campagna. La scelta usa la media dei campioni, senza scegliere a posteriori soltanto esiti fortunati. Anche la probabilità di interrompere un attacco sfavorevole dopo un lancio viene rispettata.
- La previsione campionata viene combinata con la valutazione tattica esatta, penalizzando la variabilità delle campagne. Attaccare e fermarsi usano lo stesso orizzonte di risposta avversaria.
- Occupazione: lo stesso pianificatore decide le truppe da trasferire sia nelle simulazioni sia nella partita, confrontando entrambi i fronti e il rischio di perdere i passaggi dei continenti. Un ulteriore test verifica che l’Africa del Nord non venga svuotata davanti a forze europee superiori.
- Spostamento finale: ricerca delle distanze dal fronte attraverso territori propri, avanzando di un solo collegamento legale. Anche un passaggio interno-intermedio può ora essere utile.
- Traccia diagnostica `attackDecision`: candidati, probabilità, punteggi e numero di campioni, senza ingombrare l’interfaccia.

Le preferenze continuano a guidare la strategia: disattivare “interrompi bonus” può cambiare effettivamente il bersaglio, come verificato da uno scenario dedicato. Nessuna preferenza obbliga a mosse illegali. La tregua configurata sospende gli attacchi. Le sortite casuali restano al 3% per Medio e 2% per Difficile, soltanto con massimo otto territori e meno di tre rinforzi totali nel turno, oltre alle condizioni di cooldown già esistenti. Survival non aggiunge sortite casuali.

## Regole e compatibilità

Un umano contro 2–4 bot; solo Torneo, obiettivi da 86 punti. Antartide opzionale e disattivata per impostazione iniziale. Il badge da 12 non limita le armate. Countdown di 45 minuti predefiniti, alternativa Regular/Sdadata. Nessuna modifica ai dadi, ai bonus o al limite di 130 armate per giocatore.

I salvataggi 1.4 restano caricabili: il piano IA è un campo facoltativo e viene creato alla prima decisione utile. L’icona fornita dall’utente resta inclusa.

## Verifica e distribuzione

- TypeScript: superato.
- Suite completa: 110 test passati, zero saltati; comprende regole, Antartide, animazioni, UI, Worker e nuovi scenari IA/orientamento.
- Build Vite e `cap sync android`: riusciti. Verifica statica del pacchetto offline e sintassi dello script browser: superate.
- Test browser aggiornato per home verticale, configurazione separata e selezione Survival. Esecuzione locale bloccata prima del caricamento della pagina da `listen EPERM 0.0.0.0:4173`; non viene dichiarata superata. Il workflow GitHub continua a eseguirla e a produrre screenshot e trace.
- APK non compilato localmente: il workflow Android effettua la compilazione e verifica anche il nuovo plugin nativo. Build web e sincronizzazione non sostituiscono una prova di rotazione sul telefono.

Versione Android 1.5.0, versionCode 9. Estrarre lo ZIP e sostituire i file con lo stesso percorso nella radice del repository. Non creare una sottocartella contenente il progetto. Avviare il workflow Android e installare l’APK prodotto dopo il completamento dei check.

## Benchmark finale

36 partite complete con invarianti controllate dopo ogni azione: mappe classica/Antartide, 3/4/5 giocatori, avversari v1.4 medi/difficili e una politica opportunista che concentra le armate. Due serie con semi distinti, riportate integralmente in `benchmark-1.5.0.json`.

| Livello | Prima serie | Seconda serie | Totale |
|---|---:|---:|---:|
| Medio | 3/6 | 4/6 | 7/12 |
| Difficile | 4/6 | 3/6 | 7/12 |
| Survival | 6/6 | 4/6 | 10/12 |

L’attesa di riferimento a forza uguale è circa 3,13 vittorie su 12, dato il numero variabile di avversari. Il campione non certifica una difficoltà contro giocatori umani e non garantisce che più ricerca vinca ogni confronto. La strategia va ancora valutata nelle partite reali: Survival ha il massimo budget di ricerca, non vantaggi artificiali.

Decisioni su questo ambiente: media 9.18 ms, 95° percentile 56.58 ms, massimo 394.11 ms nella seconda serie. Sono incluse anche fasi semplici: non è una misura di FPS o della latenza su telefono. Le simulazioni restano nel Worker e riutilizzano probabilità e riepiloghi; le modalità superiori dedicano più calcolo alle scelte complesse.
