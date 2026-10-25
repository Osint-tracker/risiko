# Analisi del log GitHub Actions e revisione della build

## Causa confermata dai log completi

L’archivio `logs_109069217317.zip` contiene il log aggregato `0_build.txt` e i log dei singoli passaggi. Nel file `build/5_Run android-actions_setup-android@v3.txt`, righe 957–977, la sequenza conclusiva è:

```text
Accept? (y/N): All SDK package licenses accepted
[command]/usr/local/lib/android/sdk/cmdline-tools/16.0/bin/sdkmanager tools
Warning: Failed to find package 'tools'
Error: The process '/usr/local/lib/android/sdk/cmdline-tools/16.0/bin/sdkmanager' failed with exit code 1
```

La causa immediata è la richiesta del vecchio pacchetto SDK `tools`, non disponibile nell’indice consultato da sdkmanager. Le licenze sono state accettate; il fallimento avviene nel comando successivo. Il precedente avviso «Wrong version in preinstalled sdkmanager» descrive la sostituzione degli strumenti preinstallati, ma non è il messaggio fatale.

L’action di preparazione SDK interrompe il job prima di installazione npm, test e compilazione. L’avviso finale sull’assenza di `artifacts/browser/` è una conseguenza: i test del browser non sono stati eseguiti. Gli avvisi di deprecazione Node non sono la causa dell’arresto.

Questo run usa ancora il workflow precedente: include `android-actions/setup-android@v3` e non include il passaggio nominato `Prepara SDK Android 36` della correzione. Il log non dimostra un fallimento del workflow aggiornato.

Il primo allegato `Untitled_Document.md` era troncato durante la prima licenza; i nuovi log consentono ora di identificare il comando fallito.

## Modifiche applicate

- Runner fissato a `ubuntu-24.04`; uso diretto di `cmdline-tools/latest/bin/sdkmanager` dell’SDK preinstallato. Eliminata l’action che scaricava una versione diversa degli strumenti.
- Verifica esplicita del percorso SDK, accettazione non interattiva delle licenze e installazione di piattaforma 36, Build Tools 36.0.0 e platform-tools.
- La pipeline `yes | sdkmanager --licenses` controlla il codice di **sdkmanager**. L’eventuale SIGPIPE di `yes` dopo la chiusura di stdin non causa un falso fallimento; un errore di sdkmanager resta bloccante.
- Testo integrale delle licenze in un file separato; in caso di errore vengono mostrate le ultime 50 righe.
- Nomi leggibili dei passaggi, stdout/stderr salvati per ogni comando, annotazione del codice di errore, artifact `log-compilazione` caricato anche quando un comando fallisce.
- Gradle avviato con `sh`, `--stacktrace` e `--console=plain`; errore esplicito se una compilazione apparentemente riuscita non produce l’APK.

La correzione già preparata rimuove l’action che eseguiva `sdkmanager tools`. Lo script sostitutivo richiede esclusivamente `platforms;android-36`, `build-tools;36.0.0` e `platform-tools`: quest’ultimo è un pacchetto distinto da `tools`. I test controllano l’elenco esatto dei pacchetti richiesti. Questo elimina la richiesta che ha causato il fallimento osservato; il completamento dell’intera build APK deve ancora essere verificato su GitHub.

## Verifica e prossimo run

Sei test locali sugli script verificano successo, conservazione dei log, propagazione degli errori e SDK assente con un eseguibile simulato. La suite completa passa con 36 test. Verificate anche sintassi Bash e struttura YAML.

SDK reale, TypeScript/Vite con dipendenze installate, Chromium e APK restano da verificare: in questo ambiente la connessione al proxy non è disponibile e l’SDK non è installato.

Aggiornare i quattro file operativi indicati nel README oppure sostituire i sorgenti con il nuovo archivio. Avviare un nuovo workflow sul commit aggiornato. In caso di errore scaricare l’artifact **log-compilazione** dalla pagina del run; in alternativa usare il menu del job → **Download log archive**, oppure copiare le ultime righe del passaggio rosso. Non occorre copiare l’intera pagina con le licenze.
