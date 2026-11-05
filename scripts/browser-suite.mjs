import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {browserCases,runBrowserCases} from './browser-cases.mjs';
await mkdir('artifacts/browser',{recursive:true});
const results=await runBrowserCases(name=>new Promise((resolve,reject)=>{
 console.log(`\n[BROWSER] ${name}`);
 const child=spawn(process.execPath,['scripts/browser-test.mjs'],{stdio:'inherit',env:{...process.env,UI_CASE:name}});
 child.on('error',reject);child.on('close',(code,signal)=>{console.log(`[${code===0?'PASS':'FAIL'}] ${name}${signal?' ('+signal+')':''}`);resolve(code??1);});
}));
const failed=results.filter(r=>!r.passed);
await writeFile('artifacts/browser/summary.json',JSON.stringify({total:browserCases.length,passed:results.length-failed.length,failed:failed.length,results},null,2));
console.log(`\nBrowser: ${results.length-failed.length}/${results.length} scenari superati.`);
for(const r of failed)console.error(`FAIL ${r.name}: artifacts/browser/${r.name}/`);
process.exitCode=failed.length?1:0;
