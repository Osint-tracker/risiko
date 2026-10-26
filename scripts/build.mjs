import {stripTypeScriptTypes} from 'node:module';
import {readdir,readFile,writeFile,mkdir,rm,cp,access} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url).pathname;process.chdir(root);
let vite=false;try{await access('node_modules/vite/bin/vite.js');vite=true;}catch{}
if(vite){const run=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{stdio:'inherit'});process.exit(run.status??1);}
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory()){await mkdir(join('dist',path),{recursive:true});await walk(path);}else if(path.endsWith('.ts')&&!path.endsWith('/react.ts')){const source=await readFile(path,'utf8');const js=stripTypeScriptTypes(source,{mode:'strip'}).replace(/(["'][^"']+)\.ts(["'])/g,'$1.js$2');await writeFile(join('dist',path.replace(/\.ts$/,'.js')),js);}else if(path.endsWith('.css'))await cp(path,join('dist',path));}}
await mkdir('dist/src',{recursive:true});await walk('src');await cp('public','dist',{recursive:true});await writeFile('dist/index.html',(await readFile('index.html','utf8')).replace('./src/react.ts','./src/main.js'));
console.log('Build locale completata: dist/ (core UI TypeScript, senza dipendenze). Con npm install viene usata la build React/Vite.');
