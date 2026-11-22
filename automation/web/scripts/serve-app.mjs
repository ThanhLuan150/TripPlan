// Builds the web app for the tests and serves it on http://localhost:5174.
//
// Every run builds into a NEW folder in the system temp directory, so a folder
// of an earlier run that Windows still has locked can never make the build fail
// (vite has to empty its output folder first: "ENOTEMPTY / EPERM").
// The app itself is in ../../web. It is built with VITE_API_URL pointing to /api-e2e on
// the same origin: the tests mock that address (nothing else is reachable).
import {spawn, spawnSync} from 'node:child_process';
import {mkdtempSync, readdirSync, rmSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const PORT = '5174';
const PREFIX = 'aloca-e2e-';
const API_URL = `http://localhost:${PORT}/api-e2e`;
const web = resolve(dirname(fileURLToPath(import.meta.url)), '../../../web');
const vite = join(web, 'node_modules', 'vite', 'bin', 'vite.js');

// Builds left by runs that were killed. Only the OLD ones (a day or more): a server of
// another terminal may still be serving a recent one, and deleting its folder gives a 404.
const DAY = 24 * 60 * 60 * 1000;
for (const name of readdirSync(tmpdir())) {
  if (!name.startsWith(PREFIX)) {
    continue;
  }
  const folder = join(tmpdir(), name);
  try {
    if (Date.now() - statSync(folder).mtimeMs > DAY) {
      rmSync(folder, {recursive: true, force: true});
    }
  } catch {
    // locked or already gone: ignore
  }
}

const outDir = mkdtempSync(join(tmpdir(), PREFIX));
// this run cleans up its own build when it ends (best effort)
const cleanUp = () => {
  try {
    rmSync(outDir, {recursive: true, force: true});
  } catch {
    // locked: it is removed by a later run once it is a day old
  }
};
process.on('exit', cleanUp);

const build = spawnSync(process.execPath, [vite, 'build', '--outDir', outDir, '--emptyOutDir'], {
  cwd: web,
  stdio: 'inherit',
  env: {...process.env, VITE_API_URL: API_URL},
});
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const preview = spawn(process.execPath, [vite, 'preview', '--outDir', outDir, '--port', PORT, '--strictPort'], {
  cwd: web,
  stdio: 'inherit',
});
preview.on('exit', code => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    preview.kill();
    process.exit(0);
  });
}
