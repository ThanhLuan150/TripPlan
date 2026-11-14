import js from '@eslint/js';
import {defineConfig} from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {ignores: ['dist/', 'coverage/', 'node_modules/']},
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', {allowConstantExport: true}],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true},
      ],
    },
  },
  {
    // test helpers export components and functions side by side
    files: ['src/__tests__/**'],
    rules: {'react-refresh/only-export-components': 'off'},
  },
  {
    // Node-side config files
    files: ['*.config.{js,ts}'],
    languageOptions: {globals: globals.node},
  },
]);
