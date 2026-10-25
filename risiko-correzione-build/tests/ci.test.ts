import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const scripts = fileURLToPath(new URL('../scripts/', import.meta.url));
function fixture(t: any) {
  const dir = mkdtempSync(join(tmpdir(), 'risiko-ci-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  return dir;
}
const options = {skip: process.platform === 'win32'};
test('CI: stdout/stderr vengono conservati e il codice di errore non è mascherato', options, t => {
  const dir = fixture(t);
  const run = spawnSync('bash', [join(scripts, 'ci-run.sh'), 'failure', 'bash', '-c', 'echo output; echo problema >&2; exit 23'], {cwd: dir, encoding: 'utf8'});
  assert.equal(run.status, 23);
  assert.equal(readFileSync(join(dir, 'artifacts/logs/failure.log'), 'utf8'), 'output\nproblema\n');
  assert.match(run.stdout, /::error.*codice 23/);
});
test('CI: un comando riuscito mantiene il codice zero', options, t => {
  const dir = fixture(t);
  const run = spawnSync('bash', [join(scripts, 'ci-run.sh'), 'success', 'bash', '-c', 'echo riuscito'], {cwd: dir, encoding: 'utf8'});
  assert.equal(run.status, 0);
  assert.doesNotMatch(run.stdout, /::error/);
});
for (const [name, licenseExit, installExit] of [['successo', 0, 0], ['errore licenze', 17, 0], ['errore installazione', 0, 19]] as const) {
  test(`CI SDK: ${name}, senza mascherare gli errori`, options, t => {
    const dir = fixture(t);
    const sdk = join(dir, 'android sdk');
    mkdirSync(join(sdk, 'cmdline-tools/latest/bin'), {recursive: true});
    writeFileSync(join(sdk, 'cmdline-tools/latest/bin/sdkmanager'), `#!/usr/bin/env bash
case "$1" in
  --version) echo 20.0 ;;
  --licenses) read -r answer; [ "$answer" = y ] || exit 99; echo testo-licenza; exit ${licenseExit} ;;
  *) printf '%s\\n' "$@" > installed.txt; exit ${installExit} ;;
esac
`, {mode: 0o755});
    const run = spawnSync('bash', [join(scripts, 'ci-android-sdk.sh')], {cwd: dir, encoding: 'utf8', env: {...process.env, ANDROID_HOME: sdk}});
    assert.equal(run.status, licenseExit || installExit, run.stderr);
    assert.match(readFileSync(join(dir, 'artifacts/logs/android-licenses.log'), 'utf8'), /testo-licenza/);
    if (!licenseExit) {
      assert.equal(readFileSync(join(dir, 'installed.txt'), 'utf8'), 'platforms;android-36\nbuild-tools;36.0.0\nplatform-tools\n');
      assert.doesNotMatch(run.stdout, /testo-licenza/);
    }
  });
}
test('CI SDK: diagnostica esplicita quando il runner non contiene sdkmanager', options, t => {
  const dir = fixture(t);
  const run = spawnSync('bash', [join(scripts, 'ci-android-sdk.sh')], {cwd: dir, encoding: 'utf8', env: {...process.env, ANDROID_HOME: join(dir, 'missing')}});
  assert.equal(run.status, 1);
  assert.match(run.stderr, /SDK Android preinstallato non trovato/);
});
