import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync('dist/manifest.webmanifest','utf8'));
assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./pwa.html');assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'any');
for(const icon of manifest.icons){const data=readFileSync('dist/'+icon.src);const [w,h]=icon.sizes.split('x').map(Number);assert.equal(data.readUInt32BE(16),w);assert.equal(data.readUInt32BE(20),h);}
const sw=readFileSync('dist/sw.js','utf8'),files=JSON.parse(sw.match(/const FILES=(\[[^;]+?\]),VERSION=/)[1]);
for(const f of files){assert.ok(existsSync('dist/'+f),f);assert.ok(!f.startsWith('/'));}
for(const f of ['index.html','pwa.html','manifest.webmanifest','audio/clash.wav','icons/apple-touch-icon.png'])assert.ok(files.includes(f),f);
assert.ok(files.some(f=>f.includes('server.worker')));
for(const f of files.filter(f=>f.endsWith('.html'))){const html=readFileSync('dist/'+f,'utf8');assert.doesNotMatch(html,/(?:src|href)="\/(?!\/)/);}
for(const f of files.filter(f=>f.endsWith('.css')))assert.doesNotMatch(readFileSync('dist/'+f,'utf8'),/url\(["']?\/(?!\/)/);
console.log(`PWA verificata: ${files.length} risorse offline, percorsi relativi e icone PNG valide.`);
