import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import prettierPlugin from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**', 'src/types/database.generated.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    plugins: { prettier: prettierPlugin },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      'prettier/prettier': 'error',
      'react-refresh/only-export-components': [
        'error',
        {
          allowExportNames: [
            'useAuth',
            'useTeams',
            'useTeamRealtimeStatus',
            'useTodayRealtimeStatus',
          ],
        },
      ],
    },
  },
]);
