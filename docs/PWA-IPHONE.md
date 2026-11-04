# RisiKo PWA su iPhone — senza firma Apple da rinnovare

La PWA è la versione web installabile dello stesso gioco: icona sulla Home, finestra dedicata, bot e partite offline dopo il primo download completo. Non richiede Mac, Xcode, Apple Developer Program o rinnovi di firma. Non è un APK o un IPA.

## Pubblicarla gratis su GitHub Pages

1. Nel repository GitHub esistente sostituisci i file con gli stessi percorsi. Mantieni `.github/`, `public/`, `src/`, `scripts/`, `tests/`, `package.json` e `package-lock.json`. Non caricare una seconda cartella `risiko-offline` dentro al repository.
2. Per GitHub Pages sul piano gratuito usa un repository pubblico. Apri **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Apri **Actions → Pubblica PWA su GitHub Pages → Run workflow** sul branch che contiene l'aggiornamento.
4. Il workflow esegue controlli TypeScript, suite automatica, build, verifica del pacchetto offline e prove browser Chromium/WebKit. Pubblica solo se i controlli passano.
5. Apri l'indirizzo mostrato dal job **deploy** o in **Settings → Pages**. Di norma sarà `https://TUO-UTENTE.github.io/NOME-REPOSITORY/`; usa il link effettivo mostrato da GitHub.

Il workflow Android resta disponibile e separato. Il sito non è stato pubblicato da questa sessione: occorre eseguire il workflow nel tuo repository. Non è necessario scaricare un nuovo APK per usare la PWA.

## Installarla sull'iPhone

1. Apri il link del sito in **Safari**, con Internet attivo.
2. Attendi **✓ Pronto offline** nella home. Il primo avvio deve scaricare anche motore, mappa, font e audio.
3. Tocca **Condividi → Aggiungi alla schermata Home**. Se compare l'opzione **Apri come app web**, lasciala attiva.
4. Avvia RisiKo dalla nuova icona. Controlla che sia pronto offline anche in questa finestra prima di disconnetterti: Safari e l'app installata possono gestire diversamente i dati tra versioni di iOS.
5. Prova ad avviarlo in modalità aereo. Le partite non richiedono una connessione.

La schermata **Installa e offline** contiene le stesse istruzioni e lo stato della cache. Non aprire i file HTML direttamente dall'app File: la PWA richiede un sito HTTPS (GitHub Pages lo fornisce).

## Rotazione su iPhone

Safari non offre alle PWA lo stesso controllo della rotazione disponibile all'app nativa. È stata quindi aggiunta una **rotazione assistita della plancia**, attiva di default:

- menu, impostazioni e statistiche restano verticali;
- quando inizi o riprendi una partita con il viewport verticale, la vista di gioco viene disposta in orizzontale in una cornice locale;
- gira l'iPhone con il lato superiore verso sinistra per leggerla comodamente;
- se iOS ruota già il viewport in landscape, la rotazione assistita viene rimossa automaticamente: non viene applicata due volte;
- tornando alla home, la cornice torna verticale;
- puoi disattivarla in **Installa e offline** e usare solo la rotazione fisica del dispositivo.

Questo adatta l'interfaccia: non forza né sblocca l'orientamento del sistema operativo. Il gioco nella cornice dispone di un vero viewport orizzontale, così layout, coordinate SVG, finestre e hitbox continuano a usare il proprio sistema di coordinate.

**Android nativo resta sul plugin GameOrientation esistente.** Non carica la cornice iPhone, non registra il Service Worker e non attiva le impostazioni PWA. Anche iOS nativo resta sul suo plugin. Sul web non Apple viene tentata l'API di orientamento del browser, se consentita; altrimenti vale la rotazione fisica.

## Salvataggi e backup

Il salvataggio automatico locale continua a funzionare. Nella versione web, apri **Salvataggi e backup**:

- **Prepara backup**, poi **Scarica file JSON** oppure **Condividi / Salva in File**. Conserva il file in File/iCloud Drive o su un altro dispositivo.
- Per ripristinare, scegli **Importa un backup**. L'app controlla il formato, mostra data, nome, numero di partite e stato del tavolo; solo **Sostituisci e ripristina** applica il file.
- Il ripristino sostituisce partita e statistiche in un'unica transazione. In caso di errore di scrittura vengono conservati i dati precedenti. La partita importata riparte in pausa.
- Il file include stato completo, obiettivi dei bot, dadi/RNG, carte, memoria IA, eventuale Undo e statistiche. Non viene caricato su un server. Preferenze audio e installazione non fanno parte del backup.

Esporta prima di eliminare l'icona, cancellare dati Safari, cambiare dominio o percorso del sito. L'assenza di scadenza della firma non garantisce che iOS conservi indefinitamente i dati locali: spazio insufficiente o cancellazioni possono rimuoverli. La richiesta di conservazione al browser è facoltativa e può non essere concessa.

## Aggiornamenti

Riesegui il workflow Pages dopo aver aggiornato i sorgenti. La nuova cache viene preparata separatamente dalla vecchia; non si ricarica automaticamente una partita in corso. Nella home apri **Installa e offline → Controlla aggiornamenti**; quando disponibile compare **Aggiorna alla nuova versione**. Applica l'aggiornamento da lì. I dati della partita rimangono in IndexedDB, separati dai file dell'app.

Serve Internet per installare o aggiornare. Dopo il download completo si può tornare offline. Mantieni lo stesso URL per continuare a trovare i salvataggi, oppure trasferiscili con il backup.

## Verifiche e limiti di questa consegna

Test automatici su cache completa/incompleta, aggiornamenti, percorsi sotto `/risiko/`, backup validi/corrotti, transazioni annullate, orientamento e protezione Android. La suite browser PWA prova anche tocchi nella cornice ruotata, ritorno ai menu, importazione/esportazione, avvio senza rete, Worker e audio.

La verifica browser completa non è stata eseguita localmente: questo ambiente blocca l'apertura del server (`listen EPERM`). I test Chromium/WebKit sono inclusi nel workflow Pages e devono passare prima della pubblicazione. WebKit automatizzato non sostituisce una prova sul tuo iPhone: verifica rotazione, zoom, trascinamento e audio dopo l'installazione.
