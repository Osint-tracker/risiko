# Provenienza, correzioni e limiti di fedeltà

## Riferimento primario

MHT “RisiKo! Online - Come si gioca” allegato dall’utente. URL della pagina salvata:
https://www.risikogame.it/RisikoPlay/app/mp/the-game/how-to-play

Non vengono distribuiti account, cookie o pannelli personali contenuti nella cattura MHT. Il testo delle sole sezioni di regolamento è estratto in `regole-mht.txt`.

## Integrazioni e modalità

- Regular da 20 giri, Standard 3/4/5 giocatori:
  https://www.risikogame.it/RisikoPlay/app/gui/tournaments/rules-standard
- Regolamento Master/Challenge per gli aspetti assenti nel MHT:
  https://forum.egcommunity.it/rol/Master%20Regolamento%20di%20Gioco.pdf
- Regolamento Challenge, consultato durante la pianificazione:
  https://www.titanirisiko.it/docs/risiko_challenge.pdf
- Chiarimenti sui tris e sul limite di carte:
  https://forum.egcommunity.it/risiko-club-ufficiali/68566-domanda-importante-regolamento-risiko.html

## Obiettivi

Descrizioni di appartenenza continentale/territoriale e matrice di sovrapposizione:
https://www.pubblisconto.it/risiko/dokuwiki/doku.php?id=avanzate_i

I territori sono elencati integralmente nel sorgente. Per gli obiettivi descritti tramite fasce, la ricostruzione è incrociata con le intersezioni degli altri obiettivi, non generata cercando combinazioni casuali da 86 punti. Tutti gli obiettivi sommano 86; coincidono 117 delle 120 coppie della matrice pubblicata.

Tre celle della matrice contrastano con le descrizioni territoriali della stessa pagina:

| Coppia | Matrice pubblicata | Calcolo dalle appartenenze |
|---|---:|---:|
| Letto / Siberiana | 24 | 36 |
| Ciclista / Formula 1 | 70 | 74 |
| Tre A / Siberiana | 53 | 54 |

Questi valori non sono stati corretti tacitamente: il test conserva la matrice originale e dichiara le tre eccezioni. Ad esempio Letto e Siberiana condividono Sud America (12), Africa del Nord/Egitto/Congo/Africa Orientale (18) e Medio Oriente (6), per 36 punti. La pagina contiene anche il riferimento “simile al 13” per Tappeto, pur descrivendo la sostituzione del Sud America nell’obiettivo Tre A: l’implementazione usa Asia + Africa + Ucraina + Europa Meridionale, coerente con 86 e con le sovrapposizioni.

Questa è una verifica documentale e matematica; non viene dichiarato eseguito un confronto visivo indipendente di tutte le 16 carte originali ad alta risoluzione.

## Grafica e carte

La nuova geometria SVG e il tavolo prendono come riferimento il JPG `1000090459.jpg` allegato dall’utente. Le barre di browser e sistema operativo non fanno parte dell’app. Coste, isole, colori, texture triangolare, reticolo, rosa dei venti e pannelli sono ricreati come codice locale. Non vengono contattati i server ufficiali e non vengono copiati i loro script.

La corrispondenza grafica non è pixel-perfect. Le sagome sono una ricostruzione vettoriale e i punti di controllo sono originali. I nomi completi sono accessibili tramite selezione/titolo; alcune etichette brevi favoriscono la leggibilità.

L’associazione fra simboli e carte territorio non è presente nel MHT. Si usa una distribuzione locale di 14 cannoni, 14 fanti, 14 cavalieri e 2 Jolly. Questo dettaglio non è dichiarato identico al mazzo fisico.

## Probabilità

Il valore del prompt iniziale per le perdite 3 contro 3 era errato. L’enumerazione dei 46.656 lanci possibili, con pareggi alla difesa, produce perdite attese di 1,893132716 per l’attaccante e 1,106867284 per il difensore. Le probabilità di conquista rispettano anche l’interruzione obbligatoria per inferiorità di dadi.
