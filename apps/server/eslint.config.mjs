import tseslint from 'typescript-eslint';

/** Tight Socket.io-oriented gates. Broader client lint stays in apps/client. */
export default tseslint.config(
  {
    ignores: ['dist/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'React belongs in apps/client.',
            },
            {
              name: 'react-dom',
              message: 'React belongs in apps/client.',
            },
            {
              name: 'aniquizz-client',
              message: 'Do not import the SPA package from the server.',
            },
          ],
          patterns: [
            {
              group: ['react/*', 'react-dom/*'],
              message: 'React belongs in apps/client.',
            },
            {
              regex: String.raw`(^|/|\\)apps[/\\]client([/\\]|$)`,
              message: 'Do not import apps/client from the server.',
            },
            {
              regex: String.raw`(\.\./)+client([/\\]|$)`,
              message: 'Do not import apps/client from the server.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts', '**/*.integration.test.ts', 'src/test/**'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
);
