# Aggiornamento 1.4.0

## Regole confermate

Un solo umano, 2–4 bot; tutti gli obiettivi sono Torneo da 86 punti. Difesa fino a tre dadi, distribuzione iniziale entro il 50% di ogni continente, 35/30/25 armate iniziali e mani da tre. Restano 130 carri per giocatore e nessun limite di 12 per territorio: argento da 5, oro da 10 e indicatore da 12 sono decorazioni.

Antartide resta selezionabile e spenta di default: due territori, bonus di due rinforzi, obiettivi invariati. I sei punti polari sono fuori obiettivo. Nessuna funzione multiplayer o Pass & Play.

Regular mantiene 20 giri e Sdadata. Countdown offre 30/45/60 minuti, con 45 predefiniti. Il tempo inizia dopo la preparazione ed esclude pausa e presentazioni animate. Alla scadenza si applica la classifica esistente, compresi gli spareggi; il completamento dell’obiettivo continua a vincere immediatamente. Il trasferimento minimo di una conquista pendente viene conservato.

Dopo l’ultimo rinforzo umano si preme **Inizia attacco**. Prima di quel pulsante si possono annullare i piazzamenti recenti, recuperando armate, riserva e inferenze del motore. Sono esclusi preparazione iniziale e scambi carte. Salvataggio e ripresa conservano la cronologia Undo; il passaggio di fase la chiude.

I +2 delle carte possedute contribuiscono alla riserva secondo il motore precedente; l’evidenziazione mostra quali carte contribuiscono al bonus del Tris selezionato. Non impone una nuova destinazione dei rinforzi.

## Interfaccia e presentazioni

Tema blu profondo/antracite/ambra, pulsanti cremisi e conferme verdi. Le impostazioni della home usano un unico pannello scorrevole; sui telefoni le statistiche sono espandibili in fondo. Top HUD con tutti i giocatori, fasi, timer e Countdown; widget dell’obiettivo sempre disponibile, punti sulla mappa e riepilogo bonus continentali.

Carri vettoriali di tre quarti con cingoli, torretta e riflessi; cifre in scudo separato con il font locale `risiko-counter.ttf`. Il font è quello incorporato nel progetto, ricostruito in precedenza, non un font ufficiale identificato. Confini interni sottili, sagome continentali marcate, rotte marittime curve e hitbox minime di 44 px con selezione del centro più vicino nelle sovrapposizioni.

Dadi rossi/blu ordinati in verticale, rotolamento 350 ms, confronto di coppie, esiti, probabilità esatta di conquista e Blitz arrestabile sotto una soglia scelta. Freccia animata di attacco, clash, marcia dei carri e variazioni numeriche. Finestre di attacco e trasferimento restano compatte e trascinabili. Il minimo di conquista viene trasferito subito nel motore e non appare a zero durante la presentazione.

Carte e obiettivo restano consultabili durante le mosse dei bot. A fine partita vengono rivelati tutti gli obiettivi e l’andamento dei punti. I dati di andamento dei bot sono nascosti nelle viste di gioco fino alla conclusione.

La Sdadata continua a usare **due dadi** e la soglia del regolamento esistente; la nuova cerimonia non ne modifica le regole. Un controllo bloccato da tre conquiste non tenta di animare dadi inesistenti.

## Audio e bot

Il campione locale `public/audio/clash.wav` resta incluso. Web Audio sintetizza piazzamento, rimbalzi dei dadi, conquista, pesca/scambio carte e inizio turno umano; frusci e impatti usano anche rumore filtrato. Audio sbloccato tramite gesto, mute/volume persistenti, vibrazione Android disattivata inizialmente e attivabile nelle impostazioni. I suoni programmati si fermano alla pausa o allo smontaggio dell’interfaccia.

Velocità Normale/Veloce/Istantaneo: l’ultima salta le presentazioni dei bot, mantenendo quelle dell’umano. Personalità equilibrato, stratega, incursore e conquistatore introducono piccoli pesi strategici, conservando pianificazione, difesa, opportunità e impostazioni precedenti.

Sortite disperate invariate: solo con **al massimo 8 territori e meno di 3 rinforzi complessivi** nel turno, inclusi tris e continenti; probabilità facile 6%, medio 3%, difficile 2%. Restano cooldown e limiti dei lanci.

Benchmark 90 partite contro la IA congelata precedente, a parità di difficoltà e con rotazione dei posti: medio 31/45 vittorie, difficile 39/45. Sono prove deterministiche di confronto, non una garanzia sul singolo incontro. Dati e semi in `docs/benchmark-ai-1.4.json`; comando `npm run benchmark:ai`.

## Salvataggi e statistiche

IndexedDB rimane il salvataggio principale e precede la pubblicazione della mossa. Il Worker invia inoltre lo snapshot completo al thread UI, che aggiorna localStorage. In assenza di un salvataggio principale, una copia locale valida può essere ripristinata. Quota localStorage esaurita: avviso senza annullare il salvataggio IndexedDB riuscito.

Statistiche per partita concluse salvate usando l’ID partita, senza duplicazione alla ripresa: partite, vittorie, percentuale, media punti tavolo, vittorie per RisiKo!/Sdadata e distribuzione dei dadi umani in attacco/difesa. I dadi di Sdadata non entrano nell’istogramma. Le vecchie partite senza dati dadi non vengono inventate.

**86 punti obiettivo** completano RisiKo!; il punteggio tavolo premiante di **100** già previsto dal motore resta per classifica/statistiche. La schermata finale distingue le due misure.

## Icona richiesta

La seconda foto fornita (mappa, logo e cane) è inclusa senza ritocchi in `public/app-icon.jpg` e `android/app/src/main/res/drawable-nodpi/app_icon_art.jpg`. Android usa risorse legacy e adaptive con margine di sicurezza; il launcher applica la propria maschera tonda o squadrata. La stessa immagine è usata come favicon.

## Verifiche e build

Vedere `VERIFICHE-1.4.txt` per l’esito finale. La build web e `cap sync android` sono eseguibili localmente. L’avvio del server del test Playwright in questo ambiente è bloccato da `listen EPERM` sulla porta 4173: non equivale a un test browser passato. La suite browser resta obbligatoria nel workflow GitHub, insieme a TypeScript, test motore/UI e build APK. Non è stato disabilitato né forzato alcun controllo per aggirarla.

Non è disponibile un Android SDK locale utilizzabile per produrre e verificare l’APK; il workflow `.github/workflows/android.yml` configura SDK 36 e JDK 21. La versione Android è 1.4.0, versionCode 7.

Il riferimento ufficiale ha restituito una restrizione geografica da questo ambiente. Grafica e suoni sono ricostruiti dalle specifiche/riferimenti dell’utente; non è stata verificata una replica pixel per pixel né sono stati estratti suoni ufficiali.
