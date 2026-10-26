# Correzione del carro — 1.2.1

La nuova sagoma segue il dettaglio fotografico fornito: corpo largo e pieno, torretta corta, canna spessa, contorno chiaro. Il numero è diritto e spesso, bianco con una piccola ombra scura. Nessun corsivo.

Per evitare sostituzioni del font su Android, il carattere viene incluso in `public/fonts/risiko-counter.ttf`. La cifra 1 è ridisegnata dal riferimento; le altre cifre sono un sottoinsieme di Open Sans ExtraBold. È una ricostruzione: il nome e i glifi esatti del font originale non sono ricavabili da questa sola fotografia sfocata. Licenza e provenienza in `public/fonts/LICENSE-counter.txt`.

L’anteprima `token-preview-v1.2.1.png` usa i contorni delle stesse cifre del carattere incorporato, senza dipendere dai font di sistema; è un render statico, non una schermata Android.

## Installazione nel repository

Estrarre `risiko-aggiornamento-1.2.1.zip` nella radice del progetto, dove si trova `package.json`. Sostituire i file omonimi conservando i percorsi; il pacchetto cumulativo include le modifiche della 1.2 ed è utilizzabile anche se quella versione non è ancora stata caricata. Eseguire Commit/Push e il workflow `android.yml`. Non eliminare il repository e non creare una seconda cartella di progetto.

Il workflow produce il nuovo APK 1.2.1 (versionCode 4). Build Android, TypeScript e test browser non sono eseguibili qui; sono richiesti su GitHub. In locale: 14 test di rendering/animazione superati, build web e verifica degli import completate. Nessuna modifica alle regole o ai salvataggi rispetto alla 1.2.
