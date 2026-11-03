import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const read=p=>readFileSync(p,'utf8'),root='ios/App/';
const project=read(root+'App.xcodeproj/project.pbxproj'),swift=read(root+'App/AppDelegate.swift'),storyboard=read(root+'App/Base.lproj/Main.storyboard');
const version=JSON.parse(read('package.json')).version,appId=JSON.parse(read('capacitor.config.json')).appId;
for(const match of project.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g))assert.equal(match[1].replaceAll('"',''),appId,'Allinea Bundle Identifier Xcode e appId in capacitor.config.json');
assert.match(project,new RegExp(`MARKETING_VERSION = ${version.replaceAll('.','\\.')};`));
assert.equal((project.match(/TARGETED_DEVICE_FAMILY = 1;/g)??[]).length,2,'Entrambe le configurazioni devono essere iPhone');
assert.match(project,/SUPPORTS_MACCATALYST = NO/);assert.match(project,/SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = NO/);
assert.match(storyboard,/customClass="GameViewController" customModule="App"/);
assert.match(swift,/registerPluginInstance\(GameOrientationPlugin\(\)\)/);assert.match(swift,/jsName = "GameOrientation"/);
assert.match(swift,/requestGeometryUpdate/);assert.match(swift,/supportedInterfaceOrientationsFor/);
assert.match(read(root+'CapApp-SPM/Package.swift'),/exact: "8\.0\.0"/);
assert.match(read(root+'App/Info.plist'),/<string>RisiKo Offline<\/string>/);
assert.ok(existsSync('public/app-icon.jpg'));
if(process.argv.includes('--synced')){
 assert.ok(existsSync(root+'App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png'),'Icona iOS non generata');
 assert.ok(existsSync(root+'App/public/index.html'),'Build web non copiata');
 const config=JSON.parse(read(root+'App/capacitor.config.json'));assert.equal(config.appId,appId);
 assert.ok(!config.server?.url,'iOS deve caricare gli asset offline, non un server remoto');
}
console.log('Configurazione iPhone verificata (controllo statico; non sostituisce compilazione Xcode e prova sul dispositivo).');
