import {fileURLToPath, URL} from 'node:url';
import {defineConfig} from 'vite';

// Used only to bundle the specs: they import files of the web app with the
// same "@/" alias the app uses (web/src). (Not the app's vite.config.ts: its
// manual chunks do not fit a single spec bundle.)
export default defineConfig({
  resolve: {
    alias: {'@': fileURLToPath(new URL('../../web/src', import.meta.url))},
  },
});
