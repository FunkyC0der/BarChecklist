const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier/flat');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ['dist/**', 'coverage/**', 'src/types/database.generated.ts'],
    plugins: { prettier: prettierPlugin },
    rules: { 'prettier/prettier': 'error' },
  },
]);
