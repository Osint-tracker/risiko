# Correzione del timeout nel setup Antartide — 1.3.1

Il log indica `completeSetup` richiamato nel ciclo Antartide: il test aspetta un cambio di revisione dopo un clic forzato sul centro del primo territorio umano.

A 844×390, con la mappa estesa a 815 unità di altezza, il centro dei Territori del Nord Ovest (primo territorio umano con il seme 41 a tre giocatori) finisce nella zona della barra informativa del setup. Un `click({force:true})` non consegna l'evento all'elemento sottostante: salta il controllo di intercettazione, ma il puntatore colpisce comunque l'elemento che lo copre. Il mancato piazzamento lascia invariata la revisione e il test va in timeout. Il log da solo non contiene la traccia del puntatore; la diagnosi deriva anche dalla disposizione SVG/CSS e dalla distribuzione deterministica della fixture.

## Correzione

- Le barre informative superiori (`reference-topbar` e `reference-round`) lasciano passare i tocchi alla mappa. I pulsanti, i pannelli interattivi e la pausa mantengono il proprio comportamento.
- I test individuano un punto realmente raggiungibile del territorio tramite `elementFromPoint`, partendo dal centro e cercando un altro punto visibile se necessario.
- Il clic usa i normali controlli Playwright, senza `force:true` e senza eventi sintetici che aggirino l'interfaccia.
- Ogni piazzamento deve aumentare esattamente di uno il numero di armate sul territorio e avanzare la revisione. I conteggi finali restano rigorosi.
- Gli attacchi classici e polari usano lo stesso controllo dei tocchi.
- In caso di errore vengono stampati nel log fase, revisione, effetti, pausa, messaggi e elementi sovrapposti ai territori piazzabili. Gli stessi dati sono salvati in `artifacts/browser/failure-state.json`, oltre allo screenshot e alla traccia esistenti.

## Applicazione

Estrarre `risiko-fix-test-antartide-1.3.1.zip` e sostituire i file negli stessi percorsi della radice del repository. Includere il **nuovo** `scripts/browser-input.mjs`, oltre a `scripts/browser-test.mjs` e `src/gui/styles.css`. Caricare anche il test e questa documentazione inclusi nel pacchetto. Eseguire nuovamente `android.yml` sul commit aggiornato.

Anche il pacchetto cumulativo 1.3.1 e il progetto completo sono stati aggiornati con la correzione.

## Verifiche

TypeScript, build React/Vite, verifica statica degli asset e sincronizzazione Capacitor completati. 19 test mirati superati: interfaccia, timeline ed helper dei tocchi. I tre nuovi test dell'helper coprono centro libero, centro coperto con altro punto accessibile e territorio completamente coperto. Sono test con geometria/DOM simulati, non una dichiarazione di successo del browser reale.

Il tentativo locale del test completo Playwright si arresta prima di caricare l'app con `listen EPERM` sulla porta 4173. Il controllo browser completo e la compilazione APK devono quindi essere confermati dal workflow GitHub. La durata massima non è stata aumentata e le asserzioni del setup non sono state rimosse.
