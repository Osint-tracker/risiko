# Correzione mappa, gesti e rinforzi — 2.0.0

## Installazione dei sorgenti

Estrarre questo aggiornamento nella radice del progetto, dove si trova `package.json`, sostituendo i file con lo stesso percorso e aggiungendo quelli nuovi. Non creare una seconda cartella `risiko-offline` dentro il progetto. L'archivio contiene solo i file modificati o nuovi per questa correzione; presuppone le precedenti correzioni browser già applicate.

Eseguire il workflow Android abituale per ottenere il nuovo APK. Questo ZIP contiene sorgenti, test e documentazione, non un APK. Non occorre cancellare i salvataggi.

## Cause e correzioni

- **SVG staccato durante gli aggiornamenti:** il vecchio render ricreava la scena con `innerHTML`, staccava l'SVG e poi reinseriva il vecchio nodo. Il browser può perdere la cattura del puntatore in questo passaggio. Ora la scena della plancia viene aggiornata sul posto, conservando i nodi montati. I sottoalberi identici vengono saltati.
- **Contatti rimasti registrati:** mancava il recupero da `lostpointercapture`. Un contatto residuo poteva trasformare il tocco successivo in pinch e impedirne la selezione. Il controller separato `mapGestures.ts` gestisce cancellazione, perdita della cattura, rilascio, nuovo contatto primario, pausa, perdita del focus, cambio dimensioni e smontaggio. Un dito trascina; due dita modificano lo zoom; il dito rimasto dopo un pinch trascina senza piazzare accidentalmente.
- **Ricalcoli del layout:** le etichette alternavano scritture e misurazioni per ciascun territorio. Ora le operazioni sono raggruppate; il ricalcolo delle etichette e delle hitbox viene rinviato alla fine del gesto. La camera continua a usare requestAnimationFrame.
- **Riepilogo turno:** Escape invia ora SUMMARY_ACK prima della chiusura, come i pulsanti Chiudi e Continua. Eliminato l'invio duplicato da Chiudi. Questo evita di lasciare il motore in attesa di una conferma dopo aver tolto il pannello.

Non sono state cambiate regole, IA, durata delle animazioni o formato dei salvataggi. I pulsanti +, le animazioni e le aree di tocco della mappa restano disponibili.

## Verifiche

- Suite Node completa: **193 test superati, 0 falliti**.
- TypeScript: superato.
- Build produzione: superata.
- Verifica PWA statica: superata, 23 risorse offline.
- Aggiunti test del controller e del comando di conferma del riepilogo.
- Aggiunto scenario browser isolato `map-gestures`: eventi touch Chromium, pinch, ritorno a un dito, perdita di cattura, rinforzi consecutivi e controllo che l'SVG non venga staccato. La suite browser contiene ora 12 scenari.

Il browser completo non è stato eseguito localmente: l'ambiente rifiuta l'apertura del server su localhost con EPERM. La verifica end-to-end resta quindi affidata a `npm run test:ui` nel workflow GitHub; i test Node non la sostituiscono. Non sono disponibili misure di FPS o latenza su un telefono fisico.
