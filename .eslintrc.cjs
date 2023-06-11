// TypeScript ESM project with prettier configured to make formatting lintable.

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:import/recommended'],
  rules: {
    'prettier/prettier': 'error',
    'import/no-unresolved': 'off',
    'import/order': ['error', { 'newlines-between': 'always' }],
  },
  ignorePatterns: ['dist', 'node_modules'],
};