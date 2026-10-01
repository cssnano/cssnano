import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import { trackAtRuleSerializations } from './helpers/trackAtRuleSerializations.js';

const { processCSS } = processCSSFactory(plugin);

const body = '0%{opacity:0}to{opacity:1}';

/**
 * @param {string} css
 * @return {string}
 */
function run(css) {
  return postcss([plugin()]).process(css, { from: undefined }).css;
}

test('should merge the string and identifier spellings of one name with a third name in a single pass', () => {
  const input = `@keyframes bounce{${body}}@keyframes "fade"{${body}}@keyframes fade{${body}}`;
  assert.equal(run(input), `@keyframes fade{${body}}`);
});

test('should leave nothing to merge on a second pass over string and identifier spellings of one name', () => {
  const input = `@keyframes bounce{${body}}@keyframes "fade"{${body}}@keyframes fade{${body}}`;
  const once = run(input);
  assert.equal(run(once), once);
});

test(
  'should merge a string named keyframes rule with an identifier named one',
  processCSS(
    `@keyframes "x"{${body}}@keyframes a{${body}}div{animation:"x" 1s}`,
    `@keyframes a{${body}}div{animation:a 1s}`
  )
);

test(
  'should not add a space after a replacement name ending in a hex escape when a comma follows',
  processCSS(
    `@keyframes x{${body}}@keyframes \\61{${body}}div{animation:x,y}`,
    `@keyframes \\61{${body}}div{animation:\\61,y}`
  )
);

test(
  'should separate a replacement name ending in a hex escape from an ident-like component after it',
  // `\61 1s` would be the single name a1s.
  processCSS(
    `@keyframes x{${body}}@keyframes \\61{${body}}div{animation:x 1s}`,
    `@keyframes \\61{${body}}div{animation:\\61  1s}`
  )
);

test(
  'should not add a space after a replacement name ending in a hex escape when a comma follows after whitespace',
  processCSS(
    `@keyframes x{${body}}@keyframes \\61{${body}}div{animation:x ,y}`,
    `@keyframes \\61{${body}}div{animation:\\61 ,y}`
  )
);

test('should not serialize bodies when names are defined in different condition containers', async () => {
  const input = `@keyframes a{${body}}@media (min-width:1px){@keyframes b{${body}}}div{animation:a 1s}`;
  const root = postcss.parse(input);
  const getSerializationCalls = trackAtRuleSerializations(root);

  await postcss([plugin()]).process(root, { from: undefined });

  assert.strictEqual(getSerializationCalls(), 0);
  assert.strictEqual(root.toString(), input);
});
