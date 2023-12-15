const js = require('@eslint/js');
const eslintConfigPrettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  {
    ignores: ['site/_site/**/*'],
  },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: [
      'packages/**/*.js',
      'example-cli-usage/**/*.js',
      'util/**/*.js',
      '.prettierrc.js',
      'eslint.config.js',
      'site/*.js',
    ],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      curly: 'error',
      'dot-notation': 'error',
      eqeqeq: 'error',
      'new-cap': 'error',
      'no-alert': 'error',
      'no-caller': 'error',
      'no-eval': 'error',
      'no-labels': 'error',
      'no-lonely-if': 'error',
      'no-new': 'error',
      'no-proto': 'error',
      'no-return-assign': 'error',
      'no-self-compare': 'error',
      'no-shadow': 'error',
      'no-useless-call': 'error',
      'no-var': 'error',
      'no-void': 'error',
      'no-warning-comments': 'error',
      radix: 'error',
      yoda: 'error',
    },
  },
  {
    files: ['packages/**/*.mjs', 'util/**/*.mjs', 'site/util/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2021,
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['site/src/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
