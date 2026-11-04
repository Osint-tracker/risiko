# RisiKo Offline 1.8.0 — PWA e correzione pannelli

## PWA

Manifest con icona dedicata, avvio standalone, Service Worker con precache del pacchetto completo e hash dei contenuti, pagina iPhone e workflow manuale GitHub Pages. Percorsi relativi compatibili con repository sotto-directory, inclusi font e audio. Nessuna nuova dipendenza npm.

La cache viene dichiarata pronta solo dopo la presenza di tutte le risorse. Un download fallito non promuove una versione incompleta. Gli aggiornamenti aspettano una scelta esplicita; la cache è separata per percorso e non cancella cache di altri siti dello stesso dominio.

Rotazione assistita solo nella versione web iPhone/iPad: cornice locale con viewport orizzontale durante la partita, verticale nei menu. Non simula un cambio dell'orientamento iOS: adatta la vista. Le app native continuano a usare esclusivamente i loro plugin. I comandi di backup sono disponibili nella versione web.

Backup JSON versionato, validato prima del ripristino, con conferma UI e transazione IndexedDB su partita/profilo/statistiche. Sono preservati anche i tempi frazionari generati dal cronometro reale, gli obiettivi e il RNG. Limite file 12 MB. Esportazione e importazione non inviano dati a servizi esterni.

Guida all'installazione: [PWA-IPHONE.md](PWA-IPHONE.md).

## Errore browser della 1.7.0

Il test arrivava correttamente al combattimento ma la finestra d'attacco copriva il pulsante zoom. Il posizionamento precedente usava margini fissi senza misurare i comandi.

Il nuovo posizionamento confronta rettangoli reali di zoom, barra laterale, comandi e barra giocatori, preferendo posizioni che non li coprono. Tiene conto anche di trascinamenti e ridimensionamenti, quindi si applica sia ad Android sia alla cornice PWA. In spazi estremamente stretti dà priorità ai pulsanti rispetto alle informazioni della barra giocatori.

La suite browser conserva i clic reali: nessun `force:true` o clic sintetico attraverso il pannello. Un controllo esplicito verifica che il pulsante zoom sia raggiungibile; il test continua a registrare ogni variazione di viewBox durante attacco e conquista per rilevare il rimbalzo.

## Consegna

Versione 1.8.0, build Android/iOS 12. Regole e IA invariate. Pacchetto sorgente con file alla radice e pacchetto web statico opzionale. I sorgenti non vanno copiati direttamente in un hosting statico: usare la build `dist` o il workflow Pages.

Esiti e limitazioni in `VERIFICHE-1.8.0.txt`. La pubblicazione richiede l'avvio del workflow dal repository dell'utente; non è stata effettuata da questa sessione. Compilazione iOS nativa e firma Apple restano separate e non servono alla PWA.
