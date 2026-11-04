import {readdir,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
export async function buildPwa(){
 const files=[];async function walk(dir){for(const e of await readdir(join('dist',dir),{withFileTypes:true})){const path=join(dir,e.name);if(e.isDirectory())await walk(path);else if(!['sw.js','sw-template.js','.DS_Store'].includes(e.name))files.push(path.replaceAll('\\','/'));}}
 await walk('');files.sort();
 const template=await readFile('public/sw-template.js','utf8'),hash=createHash('sha256').update(template);
 for(const file of files)hash.update(file).update(await readFile(join('dist',file)));
 const version=hash.digest('hex').slice(0,20);
 await writeFile('dist/sw.js',template.replace('__PRECACHE_FILES__',JSON.stringify(files)).replace('__PRECACHE_VERSION__',JSON.stringify(version)));
 await rm('dist/sw-template.js',{force:true});await writeFile('dist/.nojekyll','');
 console.log(`PWA: ${files.length} file offline, revisione ${version}.`);
}
