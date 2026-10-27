# Aggiornamento 1.3 — Clash, strategie e Antartide

Questo pacchetto comprende anche le correzioni 1.2/1.2.1: carte persistenti durante i turni dei bot, trasferimento minimo immediato alla conquista, finestra compatta per gli aggiuntivi, silhouette e font incorporato dei carri, correzione del test di pausa.

## Cosa cambia

- Attacchi: mirino sul territorio di partenza, lampo bianco/giallo sul bersaglio, esplosione e onde concentriche. Nessuna freccia di spostamento. I risultati dei dadi restano quelli calcolati dal motore prima dell’animazione.
- Audio: impatto originale locale in WAV sincronizzato al clash, attivazione dal primo tocco, volume e mute conservati sul dispositivo. Nella home, **Audio → Prova il clash**. L’audio effettivo sul dispositivo Android va provato dopo l’installazione.
- Home: pannelli nei colori rosso, giallo e nero, carri nei sei colori richiesti, impostazioni scorrevoli e pulsante GIOCA separato.
- Bot medi e difficili: valutazione delle probabilità di conquista, frontiere vulnerabili, completamento dei continenti anche fuori obiettivo, interruzione dei bonus, contrasto al consolidamento, contenimento del leader, eliminazioni e riserve. Ricerca fino a due mosse per il medio, tre per il difficile; quest’ultimo considera anche il contrattacco nemico. Non leggono carte o obiettivi nascosti degli avversari.
- **Strategia** accanto a ogni bot: otto priorità selezionabili, tregua iniziale da zero a tre giri, applicazione a tutti e ripristino. Durante la tregua il bot non attacca, ma rinforza e difende. Restano i tempi di riflessione e la velocità selezionabile.

## Sortite disperate: condizione concordata

La probabilità NON si applica indiscriminatamente a ogni turno. Viene valutata una sola volta dopo i cambi tris, solo se il bot possiede **al massimo 8 territori e riceve meno di 3 rinforzi complessivi nel turno**, inclusi bonus continentali e carte.

In tali condizioni: facile 6%, medio 3%, difficile 2%. Dal quinto giro; almeno tre turni personali fra due episodi. Il bersaglio viene scelto dopo il piazzamento. L’episodio termina dopo massimo tre lanci, alla conquista, quando la forza scende a metà di quella iniziale o quando l’attacco non è più legale. Il controllo già effettuato viene salvato: riprendere la partita non permette nuovi tentativi casuali nello stesso turno.

## Modalità Antartide

Spuntare **Modalità Antartide** nel menu prima di creare una nuova partita. La scelta appartiene alla partita e viene conservata nel salvataggio; il menu non trasforma una partita già iniziata.

- 44 territori, sette continenti, 46 carte: due nuove carte territorio e gli stessi due jolly.
- **Antartide Occidentale** confina con Argentina e Antartide Orientale.
- **Antartide Orientale** confina con Antartide Occidentale, Africa del Sud e Australia Orientale.
- Tutti i collegamenti sono bidirezionali, per attacchi e spostamenti legali.
- Controllare entrambi i territori dà **2 armate aggiuntive per turno**.
- Il continente si trova sotto l’Africa, con due tonalità azzurro ghiaccio, texture della plancia e rotte marittime tratteggiate.
- Distribuzione iniziale bilanciata: 14–15 territori a 3 giocatori, 11 a 4, 8–9 a 5. Mai entrambi i territori antartici allo stesso giocatore all’inizio. Restano 35/30/25 carri totali e mani da massimo tre piazzamenti.
- Adattamento di punteggio adottato: i due nuovi territori valgono 3 punti ciascuno, come nell’immagine, **fuori obiettivo**. I 16 obiettivi classici e i relativi 86 punti rimangono invariati. I punti fuori obiettivo contano nello spareggio finale. Anche i valori dei territori preesistenti rimangono invariati.
- I bot valutano bonus, frontiere e percorsi della mappa selezionata, compresa l’Antartide. I vecchi salvataggi restano classici.

## Come aggiornare GitHub senza duplicare i file

1. Estrai `risiko-aggiornamento-1.3.zip` sul computer.
2. Nella cartella locale del repository, copia **il contenuto** estratto e accetta la sostituzione dei file esistenti, rispettando i percorsi. Non inserire una nuova cartella `risiko-aggiornamento-1.3` dentro il repository.
3. Controlla che `package.json`, `src`, `scripts`, `android` e `.github` siano ancora nella radice del repository. Assicurati che il file nascosto `.github/workflows/android.yml` venga aggiornato.
4. Esegui commit e push. Il workflow **Build e verifica Android** esegue test, build web, browser e compilazione APK. Puoi avviarlo anche da Actions → Run workflow sullo stesso branch aggiornato.
5. Quando il workflow è verde, scarica `risiko-offline-debug`, estrai `app-debug.apk` e installalo sul telefono.

Il pacchetto completo `risiko-offline-progetto.zip` è un’alternativa all’aggiornamento cumulativo. Non occorre caricare entrambi. Il nuovo APK ha versione 1.3.0, versionCode 5. Per aggiornare l’app mantenendo i dati serve una firma compatibile: se Android rifiuta l’aggiornamento, non disinstallare prima di aver valutato la perdita del salvataggio locale.

## Anteprime e verifiche

`antarctica-preview.png` è un render SVG statico della mappa, non una schermata Android. `home-preview.html` e `antarctica-preview.html` mostrano il markup e gli stili dell’interfaccia; sono anteprime statiche senza logica di gioco. La registrazione delle animazioni viene prodotta dal test browser in CI nell’artifact `verifica-interfaccia`, cartella `video`.

Esiti e limiti dei controlli in `VERIFICA-1.3.md`.
