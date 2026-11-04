# Installazione nativa su iPhone

Per la versione gratuita senza rinnovi della firma e senza Mac, usa la [PWA](PWA-IPHONE.md). Le istruzioni seguenti riguardano solo la versione nativa con Xcode.

Questa versione contiene un progetto **iPhone**, non un'applicazione per Mac. Usa lo stesso gioco offline, motore, bot, grafica e icona di Android. Il Mac serve come macchina di compilazione e firma.

## APK e formato iOS

- `.apk`: solo Android. Non si può installare su iPhone, né convertirlo rinominandolo.
- `.ipa`: pacchetto iOS esportato e firmato per un metodo di distribuzione autorizzato. Un IPA qualsiasi non si installa semplicemente aprendolo sul telefono.
- TestFlight: Apple consegna e installa la build sull'iPhone tramite l'app TestFlight, dopo il caricamento da Xcode/App Store Connect.
- Un archivio `.xcarchive` non firmato o una build per simulatore **non sono installabili su iPhone**.

Il progetto incluso è destinato a iPhone con iOS 15 o successivo. Mac Catalyst e l'esecuzione come app iPhone su Mac sono disabilitati. Menu in verticale, partita in orizzontale. L'aptica via `navigator.vibrate` non è disponibile su Safari/WKWebView iPhone; il gioco e i suoni non dipendono da essa.

## Percorso A — installare sul proprio iPhone da un Mac

Occorrono un Mac compatibile con Xcode 26 o successivo, Xcode completo, Node.js 24, un Apple Account e l'iPhone. Xcode e le dipendenze richiedono internet per la preparazione; la partita funziona offline.

1. Estrai il pacchetto, apri Terminale nella cartella che contiene `package.json`.
2. Seleziona Xcode in **Xcode → Settings → Locations → Command Line Tools**. Completa l'eventuale prima installazione dei componenti iOS.
3. Esegui:

   ```sh
   npm ci
   npm run ios:setup
   npm run ios:open
   ```

   Il comando `ios:setup` installa `@capacitor/ios@8.0.0`, compila il gioco, genera l'icona PNG dalla stessa immagine Android e sincronizza Capacitor. La dipendenza iOS viene installata solo quando serve: non cambia le dipendenze richieste dal workflow Android. Il progetto usa Swift Package Manager, senza CocoaPods. Xcode scaricherà anche il framework nativo Capacitor.

4. In Xcode apri il target **App → Signing & Capabilities**, attiva **Automatically manage signing** e scegli il tuo **Team**. Aggiungi l'Apple Account nelle impostazioni di Xcode se necessario.
5. Se il Bundle Identifier `it.local.risiko` non è disponibile per il tuo Team, scegline uno univoco, per esempio `com.tuonome.risikooffline`. Cambialo sia nel target Xcode sia nel campo `appId` di `capacitor.config.json`, poi riesegui `npm run ios:sync`. Mantieni lo stesso identificatore per gli aggiornamenti successivi.
6. Collega l'iPhone, autorizza il computer sul telefono e abilita **Modalità sviluppatore** in Impostazioni → Privacy e sicurezza, quando richiesta (iOS 16+).
7. Scegli il tuo iPhone nella barra superiore di Xcode e premi **Run ▶**. Xcode firma e installa direttamente l'app: non serve esportare un IPA.

Con un Apple Account gratuito/Personal Team puoi fare prove personali, con limiti e firma di breve durata (normalmente sette giorni); potrebbe essere necessario reinstallare da Xcode. Per la distribuzione tramite TestFlight occorre l'iscrizione a pagamento all'Apple Developer Program.

## Percorso B — TestFlight, consigliato per installare e aggiornare comodamente

1. Usa un account iscritto all'**Apple Developer Program**, registra il Bundle ID e crea l'app corrispondente in App Store Connect. Identificatore e Team devono corrispondere al progetto.
2. Prepara e apri il progetto come sopra. Seleziona una destinazione iOS generica, non il simulatore.
3. In Xcode: **Product → Archive**. Nell'Organizer: **Distribute App → App Store Connect → Upload**.
4. Dopo l'elaborazione in App Store Connect, completa le informazioni richieste e abilita la build in **TestFlight**. Gli inviti a tester esterni possono richiedere la revisione beta di Apple.
5. Sull'iPhone installa **TestFlight** dall'App Store, accetta l'invito e premi **Installa**.

Le build TestFlight hanno una scadenza (normalmente 90 giorni). Per ogni nuovo caricamento incrementa il Build Number in Xcode; prima di ricompilare modifiche web esegui `npm run ios:sync`. Non è necessario pubblicare l'app nell'App Store per usare TestFlight.

## Se non hai un Mac

Il workflow manuale **Verifica build iPhone (non firmata)** (`.github/workflows/ios.yml`) usa un runner macOS di GitHub con Xcode 26 e verifica la compilazione del target iPhone. Avvialo da **Actions → Verifica build iPhone (non firmata) → Run workflow**.

L'artifact `iphone-archivio-non-firmato-NON-installabile` dimostra soltanto che la compilazione è riuscita: non sostituisce una build firmata per il telefono. Per distribuire via TestFlight occorrono comunque un account Apple Developer e una procedura di firma/caricamento, da un Mac accessibile oppure da un servizio CI configurato con i tuoi certificati/profili. Questa consegna non configura credenziali Apple, non esegue upload e non pubblica l'app.

## Stato di verifica della consegna

- Correzione zoom verificata con test sulle transizioni effettive dell'interfaccia, compreso il piazzamento iniziale; il test riproduce il difetto sulla 1.6.0.
- Progetto Xcode derivato dal template iOS ufficiale incluso in Capacitor CLI 8.0.0, configurato per iPhone e collegato al plugin locale di orientamento.
- Verificati staticamente configurazione, riferimenti, plist, storyboard e schema condiviso. `npm run ios:verify` è un controllo statico, non una compilazione Swift.
- **Non compilato né provato su iPhone in questo ambiente Linux.** Il download di `@capacitor/ios` è stato bloccato dai permessi di rete. La prima verifica nativa va eseguita su Mac o con il workflow iOS incluso. Nessun IPA firmato è incluso nello ZIP.
- Prove da fare sul dispositivo: apertura offline, menu verticale, rotazione in partita, ritorno ai menu, pausa/ripresa dopo background, salvataggio, dadi/audio, zoom e trascinamento durante gli effetti.

Documentazione: [Capacitor iOS](https://capacitorjs.com/docs/ios), [Apple Developer Program](https://developer.apple.com/programs/), [TestFlight](https://developer.apple.com/testflight/), [confronto iscrizioni Apple](https://developer.apple.com/support/compare-memberships/).
