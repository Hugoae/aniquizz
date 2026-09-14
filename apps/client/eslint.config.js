import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

/** Demote jsx-a11y recommended from error to warn until a dedicated cleanup. */
const jsxA11yWarnRules = Object.fromEntries(
  Object.entries(jsxA11y.flatConfigs.recommended.rules).map(([rule, setting]) => {
    if (setting === 'off' || (Array.isArray(setting) && setting[0] === 'off')) {
      return [rule, setting];
    }
    if (Array.isArray(setting)) {
      return [rule, ['warn', ...setting.slice(1)]];
    }
    return [rule, 'warn'];
  }),
);

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11yWarnRules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@aniquizz/database',
              message:
                'The SPA must not import Prisma or @aniquizz/database. Call the server over HTTP or Socket.io.',
            },
            {
              name: '@prisma/client',
              message: 'The SPA must not import Prisma. Call the server over HTTP or Socket.io.',
            },
            {
              name: 'express',
              message: 'Express belongs in apps/server.',
            },
            {
              name: 'socket.io',
              message: 'Use socket.io-client in the SPA, not the Socket.io server package.',
            },
            {
              name: 'aniquizz-server',
              message: 'Do not import the server package from the client.',
            },
          ],
          patterns: [
            {
              group: ['@aniquizz/database/*', '@prisma/*', 'express/*', 'socket.io/*'],
              message: 'The SPA must not import server/database packages.',
            },
            {
              regex: String.raw`(^|/|\\)apps[/\\]server([/\\]|$)`,
              message: 'Do not import apps/server from the client.',
            },
            {
              regex: String.raw`(\.\./)+server([/\\]|$)`,
              message: 'Do not import apps/server from the client.',
            },
          ],
        },
      ],
    },
  },
);
