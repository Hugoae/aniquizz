import tseslint from 'typescript-eslint';

/** Same three gates as the server: equality, no `any`, no floating promises. */
export default tseslint.config(
  {
    ignores: ['dist/**'],
  },
  {
    files: ['src/**/*.ts'],
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
              message: '@aniquizz/shared must stay framework-agnostic (no React).',
            },
            {
              name: 'react-dom',
              message: '@aniquizz/shared must stay framework-agnostic (no React).',
            },
            {
              name: 'express',
              message: '@aniquizz/shared must stay framework-agnostic (no Express).',
            },
            {
              name: '@prisma/client',
              message: '@aniquizz/shared must stay framework-agnostic (no Prisma).',
            },
            {
              name: '@aniquizz/database',
              message: '@aniquizz/shared must not import the database package.',
            },
            {
              name: 'socket.io',
              message: '@aniquizz/shared must stay framework-agnostic (no Socket.io runtime).',
            },
            {
              name: 'socket.io-client',
              message: '@aniquizz/shared must stay framework-agnostic (no Socket.io runtime).',
            },
          ],
          patterns: [
            {
              group: [
                'react/*',
                'react-dom/*',
                'express/*',
                '@prisma/*',
                '@aniquizz/database/*',
                'socket.io/*',
                'socket.io-client/*',
              ],
              message: '@aniquizz/shared must stay framework-agnostic.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts'],
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
