# Regole adottate

Priorità: MHT allegato dall’utente, poi integrazioni concordate nel piano. La modalità implementata è Regular, single-player, 3/4/5 partecipanti. Non sono implementati Countdown, multiplayer o servizi ufficiali.

## Confermate dal MHT

- Territori e obiettivi casuali; nessuno può iniziare con più della metà di un continente.
- Dotazione iniziale 35/30/25 armate per 3/4/5 giocatori.
- Rinforzi, attacchi opzionali, spostamento finale; bonus continenti 5/2/5/3/7/2 per Nord America/Sud America/Europa/Africa/Asia/Oceania.
- Fino a tre dadi per parte, ordinati; il difensore vince le parità. Trasferimento obbligatorio pari almeno ai dadi dell’ultimo attacco.
- Guarnigione di due sul confine nemico durante uno spostamento finale.
- Tris uguali 8, misto 10, Jolly più due uguali 12; riscossione prima del piazzamento.
- Una sola carta alla fine del turno se si è conquistato almeno un territorio.
- Punteggi territoriali trascritti: 164 punti complessivi, Afghanistan 4, India 3, Africa Orientale 5, Cina 7.
- Vittoria immediata completando l’obiettivo. Sdadata con due dadi, chiusura alla soglia o sotto; soglie 4,5,6,7, massimo 7; nessun lancio con almeno tre conquiste.

## Integrazioni approvate

- 20 giri ordinari. Prima sdadata alla fine del turno dell’ultimo giocatore attivo del giro 20. La soglia resta 4 per quella rotazione completa; sale quando il turno torna all’ancora iniziale. Se l’ancora viene eliminata, il suo posto virtuale resta il riferimento.
- 16 obiettivi distinti, da 86 punti; 100 punti al vincitore per RisiKo!. Spareggi: punti fuori obiettivo, poi ordine iniziale inverso.
- Rinforzi `floor(territori/3)`, senza minimo di tre. Truppe e bonus sono limitati dalla riserva residua entro 130; l’eccedenza non è accumulata per turni successivi.
- Piazzamento iniziale a gruppi di tre. Distribuzione equa ottenuta con campionamento casuale condizionato al limite continentale; obiettivi senza reinserimento.
- Attacco e difesa con massimo numero legale di dadi; vietata inferiorità di dadi dell’attaccante. Vietato attaccare l’ultimo territorio avversario nei giri 1–4.
- Uno spostamento strategico, solo fra territori propri direttamente confinanti.
- Nel trasferimento post-conquista si lasciano almeno due carri se il territorio d’origine confina con nemici; l’unica eccezione è il minimo obbligatorio. I confini si rivalutano dopo il cambio di proprietario.
- Massimo sette carte, nessun cambio obbligatorio a cinque. A sette non si pesca. Eliminando un giocatore, si prendono carte casuali fino al limite, scartando l’eccedenza. Si possono cambiare solo nel turno successivo.
- +2 armate per ogni carta territorio posseduta del tris. Le carte scartate si rimescolano quando il mazzo è esaurito.
- Il grafico italiano include Cina–Medio Oriente; esclude Afghanistan–India e Africa Orientale–Medio Oriente.

## Timer e persistenza

Timer ordinario configurabile 60–600 secondi, default 180. Non si applica al setup. Background e pausa sospendono tempo e bot. Alla scadenza: rinforzi ai territori propri meno presidiati (parità per ID), minimo movimento obbligatorio post-conquista, nessun attacco o spostamento facoltativo, normale pesca e sdadata. Nessun tris automatico.

La durata statistica è il tempo attivo; le partite abbandonate/sostituite non entrano nelle statistiche. Risultati registrati una sola volta per ID. Livello locale `1 + floor(XP/100)`; premi XP per posizione: 3 giocatori 50/25/10, 4 giocatori 70/50/25/10, 5 giocatori 90/70/50/25/10. Si tratta di una progressione locale.

Le regole fisiche relative ad arbitri, verbalizzazione delle azioni o sanzioni per mosse illegali sono sostituite dalla validazione del motore: un comando illegale non cambia la partita.
