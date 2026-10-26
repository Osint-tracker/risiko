# Aggiornamento 1.2 — carte persistenti e conquista immediata

## Come aggiornare il repository

1. Estrai `risiko-aggiornamento-1.2.zip` sul computer.
2. Copia il contenuto nella cartella locale del repository dove si trova `package.json`, mantenendo i percorsi e sostituendo i file omonimi. Non creare una seconda cartella del progetto e non eliminare il repository.
3. Con GitHub Desktop verifica i file modificati, esegui Commit e Push. In alternativa modifica i file nei rispettivi percorsi già esistenti su GitHub.
4. Attendi il workflow `Build e verifica Android`, oppure avvialo da Actions → Run workflow. TypeScript, test, browser e compilazione APK devono risultare verdi.
5. Scarica l’artifact `risiko-offline-debug`, estrai e installa `app-debug.apk`. Versione Android: 1.2.0, versionCode 3.

`FILE-AGGIORNAMENTO-1.2.txt` elenca esattamente i file del pacchetto. Il progetto completo è disponibile come alternativa: non sovrapporre la sua cartella esterna dentro quella del repository.

## Comportamento nuovo

Le carte e l’obiettivo restano consultabili mentre giocano i bot. L’animazione avviene sulla plancia sottostante; la selezione delle carte rimane invariata. Il cambio tris è disponibile soltanto nella fase prevista dal regolamento.

Alla conquista vengono trasferiti automaticamente tanti carri quanti i dadi utilizzati nell’ultimo attacco. Sono già salvati, quindi pausa, ripresa e timeout non li trasferiscono nuovamente. Se rimangono carri spostabili, la finestra permette di aggiungerne da zero fino al limite legale. Il conteggio sulla mappa durante la scelta è un’anteprima; il trasferimento aggiuntivo viene salvato alla conferma. Se non ci sono aggiuntivi disponibili, non si apre alcuna finestra.

Frecce e scie sono sostituite da contorni luminosi e indicatori +N/−N. I dadi sono conservati; le variazioni dei carri vengono mostrate dopo il risultato. Il carro è una ricostruzione SVG della foto, con numeri interni adattati anche a tre cifre. Le opzioni di velocità e movimento ridotto sono rispettate.

## Salvataggi e interfacce interne

La struttura IndexedDB resta alla versione 1. `PendingMove.transferred` distingue i salvataggi nuovi da quelli precedenti: nei nuovi il minimo è già sul territorio conquistato. In `POST_CONQUEST_MOVE`, `MOVE.count` indica gli aggiuntivi e può essere zero; in `FORTIFY` indica come prima tutti i carri da spostare. Il caricamento converte e salva i vecchi stati pendenti prima di renderli disponibili. La presentazione `battle` espone `transferred` per sincronizzare il conteggio senza mostrare zero.

## Verifiche

64 test locali superati; dettagli e limiti in `VERIFICA.md`. Build web senza dipendenze verificata. Typecheck semantico, browser e APK non eseguibili in questo ambiente: sono richiesti nel workflow GitHub. Le immagini di anteprima sono render SVG statici, non schermate catturate da Android.
