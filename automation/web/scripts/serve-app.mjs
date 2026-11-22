// Builds the web app for the tests and serves it on http://localhost:5174.
//
// Every run builds into a NEW folder in the system temp directory, so a folder
// of an earlier run that Windows still has locked can never make the build fail
// (vite has to empty its output folder first: "ENOTEMPTY / EPERM").
// The app itself is in ../../web; its `.env.e2e` points the API to /api-e2e on
// the same origin (the tests mock it).
import {spawn, spawnSync} from 'node:child_process';
import {mkdtempSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const PORT = '5174';
const PREFIX = 'aloca-e2e-';
const web = resolve(dirname(fileURLToPath(import.meta.url)), '../../../web');
const vite = join(web, 'node_modules', 'vite', 'bin', 'vite.js');

// builds of earlier runs (best effort: one still locked is simply left)
for (const name of readdirSync(tmpdir())) {
  if (name.startsWith(PREFIX)) {
    try {
      rmSync(join(tmpdir(), name), {recursive: true, force: true});
    } catch {
      // locked: ignore
    }
  }
}

const outDir = mkdtempSync(join(tmpdir(), PREFIX));

const build = spawnSync(process.execPath, [vite, 'build', '--mode', 'e2e', '--outDir', outDir, '--emptyOutDir'], {
  cwd: web,
  stdio: 'inherit',
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
  process.on(signal, () => preview.kill());
}
