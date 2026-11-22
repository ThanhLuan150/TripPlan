// Starts the web app's DEV server on http://localhost:5173 with the API address the tests mock.
//
// Use it instead of `npm run dev` while running Cypress against the dev server
// (`npm run cypress:dev`): without VITE_API_URL pointing to /api-e2e the app calls
// the real backend, gets 401 and signs itself out.
// Stop your normal dev server first (same port).
import {spawn} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const PORT = '5173';
const web = resolve(dirname(fileURLToPath(import.meta.url)), '../../../web');
const vite = join(web, 'node_modules', 'vite', 'bin', 'vite.js');

const dev = spawn(process.execPath, [vite, '--port', PORT, '--strictPort'], {
  cwd: web,
  stdio: 'inherit',
  env: {...process.env, VITE_API_URL: `http://localhost:${PORT}/api-e2e`},
});
dev.on('exit', code => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => dev.kill());
}
