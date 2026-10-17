import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import preset from '#presets/default';
import { repositoryFile } from '../../../util/testHelpers.js';

const fixture = `
.b {
  animation: opacity 0ms calc(1000ms);
}
`;

const expected = '.b{animation:opacity 0s calc(1s)}';

test('it should keep quote', () => {
  const processor = postcss(preset({ disable: ['calc'] }));

  return processor
    .process(fixture, { from: repositoryFile })
    .then((r) => assert.strictEqual(r.css, expected));
});
