# RisiKo Offline 1.6.0

## Interfaccia

Statistiche, cronologia delle partite, regole, audio, strategie e risultati usano la stessa navigazione verticale della home: fondo cartografico azzurro, righe blu, pulsanti arancioni, ritorno al menu. La cronologia usa schede espandibili al posto di una tabella orizzontale. Anche la preparazione rimane a colonna singola in landscape nel browser: scorre l'intero pannello, senza una seconda striscia compressa.

Durante la partita carte, obiettivo, attacco e spostamento mantengono finestre compatte e la plancia visibile, con la nuova palette. La pagina strategie indica esplicitamente che le preferenze valgono per il prossimo tavolo; una partita salvata conserva quelle scelte alla creazione. Il nuovo codice IA si applica anche ai salvataggi esistenti.

## Correzioni IA

Le modifiche riguardano Medio, Difficile e Survival. Facile e le regole restano invariati.

- **Occasioni concrete prima delle previsioni:** un nuovo livello tattico identifica conquiste immediate dell'obiettivo, completamenti di continenti, interruzioni dei bonus nemici ed eliminazioni. Per le normali incursioni richiede almeno il 90% di probabilità di conquista e al massimo tre difensori; considera il rischio aggiuntivo alla frontiera di partenza. Le occasioni vantaggiose così individuate non vengono annullate dalla simulazione di mani avversarie ipotetiche. Le altre decisioni restano al pianificatore stocastico, con budget maggiore in Survival.
- **Difesa dei continenti posseduti:** riserva una parte dei rinforzi agli accessi minacciati, portando prima le guarnigioni deboli a tre dadi difensivi quando la riserva lo permette; poi valuta quanto i carri aggiuntivi riducono la probabilità di conquista nemica. Tutti i piani alternativi devono mantenere questi piazzamenti. Tre carri non garantiscono di resistere a dodici: sono il primo passo e non un limite alla difesa.
- **Errore nel conteggio delle minacce:** prima della conquista, l'esposizione della destinazione era valutata rispetto al suo proprietario nemico. Questo escludeva erroneamente alcune armate ostili confinanti. Ora la valutazione è relativa al bot che sta attaccando.
- **Occupazione:** il trasferimento volontario protegge almeno tre difensori sui passaggi di un continente sotto minaccia, quando possibile; la distribuzione considera entrambi i fronti. Resta il movimento obbligatorio previsto dal motore.
- **Tempo effettivo:** le pause di ragionamento potevano durare 2–15 secondi e consumavano il turno. Ora i livelli potenziati usano attese normalmente inferiori a un secondo, adattate al tempo restante e alla quantità di mosse da completare. Le animazioni continuano a non consumare il cronometro. Istantaneo resta disponibile.
- **Tris:** verificata l'esecuzione di due scambi consecutivi prima dei piazzamenti. Il vecchio motore già superava il test sul singolo Tris: non è stato aggiunto un bonus artificiale o alterato il valore delle carte. La riduzione delle attese evita di sottrarre tempo alla sequenza del turno.

Restano le sortite rare su Medio (3%) e Difficile (2%), soltanto con non più di otto territori e meno di tre rinforzi ricevuti nel turno, alle altre condizioni già previste. Nessun accesso a obiettivi segreti, dadi futuri o armate aggiuntive.

## Verifica basata sugli errori segnalati

`tests/adversarial-ai.test.ts` contiene 14 test. Otto gruppi coprono 216 decisioni di attacco: tre difficoltà, tre dimensioni del tavolo, tre rapporti di forza, otto accessi ad Antartide/Oceania/Europa. Gli altri verificano la difesa europea davanti a stack da dodici, piazzamenti reali e persistenti in Antartide/Oceania, Tris consecutivi, occupazione e tempi.

Confronto riproducibile: i primi 12 test, senza cambiare gli assert, sono stati eseguiti sul pacchetto 1.5.0 corretto per il browser: **4 passati, 8 falliti**. La 1.6.0 supera tutti e 14. Questo dimostra la correzione dei casi riprodotti, non che ogni posizione di gioco sia risolta ottimamente.

La nuova arena (`npm run benchmark:arena`) usa tre avversari scritti separatamente dal pianificatore: costruttore di continenti, incursore e finalizzatore dell'obiettivo. Avanza anche il cronometro in base al tempo di calcolo e alle attese. Registra turni scaduti e occasioni economiche di interrompere bonus ignorate, oltre alle vittorie. Gli snapshot delle occasioni ignorate vengono salvati per ulteriori regressioni. Report di 18 partite: `benchmark-arena-1.6.0.json`; nessun timeout del candidato e nessuna occasione ignorata rilevata da questo controllo. Le vittorie contro questi avversari non certificano la forza contro un umano.

Il controllo delle occasioni nell'arena è volutamente limitato: fronti con almeno otto carri contro non più di due difensori su un continente avversario completo quando il bot sceglie di terminare l'attacco. Non sostituisce una revisione di tutte le decisioni. I tempi di calcolo misurati riguardano questa macchina, non un telefono Android.

## Build e consegna

TypeScript, suite automatica completa, build Vite di produzione e sincronizzazione Capacitor verificati; esito dettagliato in `VERIFICHE-1.6.0.txt`. Versione Android 1.6.0, versionCode 10.

Il browser end-to-end locale non può partire: il sandbox rifiuta l'ascolto su porta 4173 (`listen EPERM`). Anche Chromium locale è bloccato su una chiamata socket. Il controllo browser resta obbligatorio nel workflow GitHub; non viene saltato né dichiarato superato. Conservata la correzione delle misure HUD atomiche e della fixture stabile della 1.5.0. Aggiunto il percorso browser home → statistiche → menu → preparazione.

Le anteprime HTML in questa consegna sono statiche: mostrano il markup e CSS dell'app, con cronologia espandibile; i pulsanti dell'app non eseguono azioni. L'APK sarà compilato dal workflow Android dopo i check.
