# Correzione home 1.3.1

Il pannello delle impostazioni era stretto fra intestazione, pulsante GIOCA e nota inferiore: su uno schermo basso rimaneva spazio per una sola riga.

Ora scorre l'intero pannello. GIOCA e Riprendi sono accanto al titolo, senza un blocco fisso in fondo. In orizzontale, fino a 600 px di altezza, l'illustrazione laterale lascia spazio alle impostazioni. Da 760 px di larghezza opzioni partita e avversari sono affiancati; sotto questa soglia sono impilati. I controlli principali hanno un'altezza minima di 44 px e la posizione di scorrimento viene conservata quando si modifica una difficoltà o la modalità.

Aprire `home-preview-1.3.1.html` in orizzontale: l'anteprima contiene il markup e i CSS aggiornati, senza codice di gioco. Lo scorrimento è utilizzabile, i pulsanti sono statici.

Verifiche eseguite: TypeScript, 13 test UI esistenti, build React/Vite, asset offline e sincronizzazione Capacitor completati. Test browser esteso con controlli sullo spazio del pannello, assenza di una seconda area scorrevole e accessibilità dell'ultimo bot a 844×390, 932×260 e 640×300. Il controllo browser resta da eseguire nella CI: non è stato dichiarato superato localmente. Le 80 verifiche complete della 1.3 sono riportate nel rapporto precedente; per questa correzione di layout sono stati ripetuti i 13 test UI interessati.

Estrarre l'aggiornamento cumulativo 1.3.1 e sovrascrivere i file negli stessi percorsi del repository, senza aggiungere una cartella esterna. Eseguire il workflow `android.yml` per verificare il browser e ottenere il nuovo APK. Versione Android 1.3.1, versionCode 6. Sono inclusi tutti i miglioramenti precedenti e la modalità Antartide.
