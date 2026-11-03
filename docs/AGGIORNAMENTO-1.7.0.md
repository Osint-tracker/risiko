# RisiKo Offline 1.7.0 — camera stabile e progetto iPhone

## Zoom

Il gestore delle transizioni salvava l'inquadratura, passava alla mappa intera quando un territorio coinvolto era fuori dallo schermo o troppo vicino al bordo, quindi ripristinava la vista alla fine. Questo causava il rimbalzo durante piazzamenti, attacchi e mosse dei bot; poteva anche annullare un gesto di zoom fatto durante l'effetto.

Rimosso questo automatismo e il relativo ripristino. La camera rimane sotto il controllo del giocatore durante e dopo gli effetti, anche se interrotti da un aggiornamento dello stato. Il pulsante Centra mappa e la creazione di una nuova partita continuano a reimpostarla esplicitamente. Gli effetti lontani non costringono più a cambiare vista; il riquadro battaglia continua a mostrare territori e dadi.

Due test eseguono piazzamenti iniziali/rinforzi, attacchi fuori inquadratura, zoom durante gli effetti, completamento e cancellazione delle animazioni. Lo stesso test iniziale fallisce sulla 1.6.0 mostrando il passaggio temporaneo a `0 0 1240 690`. Anche la suite browser controlla le mutazioni della camera durante un attacco, non soltanto l'inquadratura finale.

## iPhone

Aggiunto `ios/App/App.xcodeproj`, target iPhone (non macOS), framework Capacitor Swift 8.0.0 via SPM, plugin locale GameOrientation e schema condiviso per compilazione CI. Menu verticali, plancia orizzontale; stessa icona generata dall'immagine già usata da Android.

Comandi: `npm run ios:setup`, `npm run ios:sync`, `npm run ios:open`, `npm run ios:verify`. La dipendenza npm iOS viene installata dal comando di preparazione con versione esatta, senza cambiare lockfile o dipendenze Android. Il workflow iOS manuale compila un archivio non firmato; non pubblica né genera un IPA installabile.

Procedura completa, requisiti Apple e limiti della verifica: [IPHONE.md](IPHONE.md).

## Compatibilità e verifiche

Regole, bot, salvataggi e comportamento Android invariati. Versione 1.7.0, build Android/iOS 11. Per aggiornare l'app Android mantenere identificatore e chiave di firma, senza disinstallare.

Esiti in `VERIFICHE-1.7.0.txt`. La suite browser locale rimane bloccata dall'ambiente che rifiuta l'ascolto su porta 4173. Xcode non è disponibile su Linux; il controllo statico iOS non equivale a una build nativa superata. Il workflow GitHub deve completare la verifica iOS prima della firma e della prova sul telefono.
