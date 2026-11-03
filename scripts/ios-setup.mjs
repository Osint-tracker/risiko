import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
if(process.platform!=='darwin'){
 console.error('La build per iPhone richiede macOS con Xcode 26 o successivo. Usa un Mac oppure il workflow GitHub iOS. L’app prodotta è per iPhone, non per Mac.');process.exit(1);
}
function run(command,args){const result=spawnSync(command,args,{stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);}
const xcode=spawnSync('xcodebuild',['-version'],{encoding:'utf8'});
if(xcode.status!==0||Number(xcode.stdout.match(/Xcode (\d+)/)?.[1]??0)<26){console.error('Seleziona Xcode 26+ in Xcode > Settings > Locations > Command Line Tools.');process.exit(1);}
const version='8.0.0',installed='node_modules/@capacitor/ios/package.json';
// iOS-only dependency: Android installs and the shared lockfile stay unchanged.
// A fresh npm ci can prune it; rerunning this command reinstalls the exact version.
if(!existsSync(installed)||JSON.parse(readFileSync(installed,'utf8')).version!==version){
 run('npm',['install','--no-save','--package-lock=false','--ignore-scripts',`@capacitor/ios@${version}`]);
}
run('npm',['run','build']);
// Mechanical asset conversion, preserving the artwork already used by Android.
run('sips',['-s','format','png','-z','1024','1024','public/app-icon.jpg','--out','ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png']);
run(process.execPath,['node_modules/@capacitor/cli/bin/capacitor','sync','ios']);
run(process.execPath,['scripts/verify-ios.mjs','--synced']);
console.log('Progetto iPhone pronto: npm run ios:open. Seleziona il tuo Team in Signing & Capabilities prima di installare o archiviare.');
