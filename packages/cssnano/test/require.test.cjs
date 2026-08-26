const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const path = require('node:path');

const packageNames = [
  'cssnano',
  'cssnano-preset-advanced',
  'cssnano-preset-default',
  'cssnano-preset-lite',
  'cssnano-utils',
  'postcss-colormin',
  'postcss-convert-values',
  'postcss-discard-comments',
  'postcss-discard-duplicates',
  'postcss-discard-empty',
  'postcss-discard-overridden',
  'postcss-discard-unused',
  'postcss-merge-idents',
  'postcss-merge-longhand',
  'postcss-merge-rules',
  'postcss-minify-font-values',
  'postcss-minify-gradients',
  'postcss-minify-params',
  'postcss-minify-selectors',
  'postcss-normalize-charset',
  'postcss-normalize-display-values',
  'postcss-normalize-positions',
  'postcss-normalize-repeat-style',
  'postcss-normalize-string',
  'postcss-normalize-timing-functions',
  'postcss-normalize-unicode',
  'postcss-normalize-url',
  'postcss-normalize-whitespace',
  'postcss-ordered-values',
  'postcss-reduce-idents',
  'postcss-reduce-initial',
  'postcss-reduce-transforms',
  'postcss-svgo',
  'postcss-unique-selectors',
  'postcss-zindex',
  'stylehacks',
];

for (const packageName of packageNames) {
  test(`require() loads ${packageName}`, () => {
    const packagePath = path.resolve(__dirname, '..', '..', packageName);
    const requireFromPackage = createRequire(
      path.join(packagePath, 'package.json')
    );
    assert.doesNotThrow(() => requireFromPackage(packageName));
  });
}
