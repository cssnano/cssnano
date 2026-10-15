const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const path = require('node:path');

test('require() loads cssnano', () => {
  const packagePath = path.resolve(__dirname, '..');
  const requireFromPackage = createRequire(
    path.join(packagePath, 'package.json')
  );
  assert.doesNotThrow(() => requireFromPackage('cssnano'));
});
