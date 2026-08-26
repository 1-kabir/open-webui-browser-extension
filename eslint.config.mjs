import tseslint from '@typescript-eslint/eslint-plugin'
import parser from '@typescript-eslint/parser'
import svelteParser from 'svelte-eslint-parser'

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ]
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: { parser: svelteParser, parserOptions: { parser } },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ]
    }
  }
]
