import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'apps/gateway/src/generated/**',
      '**/*.config.*',
      'scripts/**',
      // diretórios de RUNTIME (gitignorados) que podem conter .js do Chromium/LocalAuth —
      // sem estes ignores o `eslint .` quebra quando uma sessão wwebjs roda em dev (P-004)
      'apps/gateway/auth/**',
      '**/.wwebjs_auth/**',
      // saída de coverage do vitest (M3)
      '**/coverage/**',
      '**/.vitest/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['apps/gateway/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['apps/dashboard/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    rules: {
      // usamos `any` pontualmente em infra (auth state, parsers) — não bloquear
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  prettier,
);
