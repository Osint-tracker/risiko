# Aggiornamento 1.1: giocabilità, animazioni e bot

## Come caricarlo su GitHub

L’archivio `risiko-aggiornamento-1.1.zip` contiene soltanto file nuovi o modificati, con i percorsi corretti. Estrarlo e aggiungere/sostituire il contenuto nella radice del repository esistente. Non creare una cartella esterna aggiuntiva. Non eliminare il resto del progetto. L’elenco preciso è incluso in `FILE-AGGIORNAMENTO-1.1.txt` nell’archivio.

Per modificare dal sito GitHub, aprire ogni file già esistente e usare la matita per sostituirne il contenuto; per i nuovi file usare **Add file → Create new file**, indicando il percorso completo. Per un aggiornamento di queste dimensioni è più comodo copiare il contenuto estratto nella cartella locale del repository e fare commit/push con GitHub Desktop.

Dopo il commit avviare **Actions → Build e verifica Android → Run workflow** sul branch aggiornato. Non usare «Re-run jobs» di un vecchio commit. Quando tutti i controlli passano, scaricare l’artifact `risiko-offline-debug`, estrarre l’APK e installarlo sul telefono. Il nuovo APK dichiara versione **1.1.0**, codice **2**. L’archivio completo `risiko-offline-progetto.zip` contiene anche tutte queste modifiche.

## Cosa cambia

- Attacchi: origine e destinazione evidenziate, impulso direzionale, bersaglio lampeggiante, dadi colorati con pallini e rotazioni, confronto dei risultati e perdite. Il pannello resta piccolo e può essere trascinato.
- Il risultato viene salvato prima dell’animazione; l’interfaccia mostra l’esito prima di continuare. Il timer non scende durante gli effetti. Il blitz aspetta la fine dei dadi ed è interrompibile.
- Finestre di combattimento e movimento flottanti, senza oscuramento della plancia. Carte e obiettivo usano pannelli compatti con sfondo leggermente attenuato.
- Setup: «Schierati», «Da piazzare» e «Questa mano» distinti, con nome del giocatore attivo. A tre giocatori sono 14 carri presenti e 21 da aggiungere, fino a 35. A quattro e cinque il totale è rispettivamente 30 e 25. Ogni mano iniziale permette massimo tre carri. I rinforzi normali hanno pulsanti +1/+3/+5/+10/Tutti.
- Durante i piazzamenti si illuminano i territori disponibili e compare il segno +. Ogni territorio mostra il numero dentro una sagoma di carro del colore del proprietario. Palette e texture statiche avvicinate alle immagini di riferimento.
- Carte: cannone, fante, cavaliere, jolly a tre fasce; sagoma e nome del territorio. Selezionare tre carte per visualizzare il bonus e confermare il tris.
- Obiettivo: carta con mappa completa, territori richiesti verde/giallo, altri azzurri e numero dell’obiettivo.
- Pesca: entrata, rotazione e uscita della carta verso la mano. Per il giocatore sono visibili territorio e simbolo; per i bot solo il dorso. La pesca resta subordinata a una conquista e al limite di sette carte.

## Ritmo dei bot

A 1× una decisione ordinaria richiede 2–4 secondi. Scelte incerte o conquiste costose richiedono 4–8 secondi, con il 5% di questi casi fra 8 e 15 secondi. Piazzamenti consecutivi sullo stesso territorio richiedono 0,4–0,9 secondi, cambi di territorio 1–2 secondi. Le animazioni si aggiungono a queste attese. Le attese si riducono quando sta per scadere il turno e non superano 30 secondi. 2×/4×/rapida sono opzionali; la velocità iniziale è sempre 1×.

Il temperamento varia la propensione al rischio. Perdite consistenti aumentano la prudenza, conquiste consecutive possono aumentare moderatamente l’aggressività, la preferenza per riconquistare un territorio perso scade dopo due propri turni. Le variazioni diminuiscono con la difficoltà.

Una sortita disperata può attivarsi dal quinto giro, con massimo tre territori e meno della metà delle armate medie degli avversari attivi. La probabilità per proprio turno è 6%/3%/1% per facile/medio/difficile; massimo tre lanci, arresto dopo aver perso metà della forza iniziale e almeno tre propri turni fra gli episodi. Sono sempre rispettati dadi, adiacenze e guarnigioni. Non vengono letti gli obiettivi o le carte avversarie.

## Persistenza e presentazione

Il contesto IA è salvato separatamente dalle informazioni pubbliche. I vecchi salvataggi senza questo campo ricevono il contesto al primo utilizzo. Lo schema del salvataggio resta versione 1.

Le transizioni usano ID partita/revisione. Solo una transizione può essere in attesa di conferma; un watchdog di 10 secondi recupera un’interfaccia interrotta. Le sequenze molto lunghe di piazzamenti automatici vengono compattate per territorio e limitate a otto secondi. Pausa, background e riapertura mostrano il risultato già salvato, senza ripetere azioni o carte. La preferenza del sistema per movimento ridotto viene rispettata.

## Verifica della nuova versione

53 test locali superati, incluse 18 partite simulate, setup completo per tutti i tavoli, riservatezza delle carte, tempi IA, pausa e watchdog. Build web locale senza dipendenze e verifica degli import riuscite.

Lo script Playwright esegue setup completi via tocchi a 3/4/5, verifica pannelli compatti, dadi e timer sospeso, conquista/spostamento/pesca, carte, obiettivo e ripresa dopo pausa nel lancio. Produce immagini e `trace.zip` nell’artifact `verifica-interfaccia`, anche per diagnosticare errori.

Il nuovo script browser, il controllo TypeScript completo, Vite e la build Android **devono ancora essere eseguiti nella CI GitHub**. Qui Chromium non può avviarsi e le dipendenze non sono scaricabili. L’anteprima SVG/PNG è una vista statica della mappa, non una schermata di Android. La somiglianza visiva è una ricostruzione locale, non una copia degli asset originali.

Sul telefono verificare soprattutto: fluidità dei dadi a 1×, leggibilità dei numeri nei carri, trascinamento delle finestre, selezione e scambio di un tris, animazione della carta, pausa durante un attacco e ripresa dello spostamento obbligatorio. Confermare che il ritmo naturale dei bot sia quello desiderato.
