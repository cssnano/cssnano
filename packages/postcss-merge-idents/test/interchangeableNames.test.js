import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import { trackAtRuleSerializations } from './helpers/trackAtRuleSerializations.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

const body = '0%{opacity:0}to{opacity:1}';
const otherBody = '0%{opacity:1}to{opacity:0}';

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
    `@keyframes longer{${body}}@keyframes \\61{${body}}div{animation:longer,y}`,
    `@keyframes \\61{${body}}div{animation:\\61,y}`
  )
);

test(
  'should separate a replacement name ending in a hex escape from an ident-like component after it',
  // `\61 1s` would be the single name a1s.
  processCSS(
    `@keyframes longer{${body}}@keyframes \\61{${body}}div{animation:longer 1s}`,
    `@keyframes \\61{${body}}div{animation:\\61  1s}`
  )
);

test(
  'should not add a space after a replacement name ending in a hex escape when a comma follows after whitespace',
  processCSS(
    `@keyframes longer{${body}}@keyframes \\61{${body}}div{animation:longer ,y}`,
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

test(
  'should not add a space after a replacement hex escape that already includes its terminating space',
  // `\61 ` ends the ident itself, so the whitespace after it is the separator.
  processCSS(
    `@keyframes longer{${body}}@keyframes \\61 {${body}}div{animation:longer 1s}`,
    `@keyframes \\61 {${body}}div{animation:\\61  1s}`
  )
);

test(
  'should not add a space after a replacement ending in an escaped space when whitespace follows',
  // An escaped space is part of the ident but absorbs nothing after it.
  processCSS(
    `@keyframes longer{${body}}@keyframes a\\ {${body}}div{animation:longer 1s}`,
    `@keyframes a\\ {${body}}div{animation:a\\  1s}`
  )
);

test(
  'should separate a replacement ending in an escaped space from a string reference it replaces',
  // `a\ 1s` would be the single name "a 1s".
  processCSS(
    `@keyframes "x"{${body}}@keyframes a\\ {${body}}div{animation:"x"1s}`,
    `@keyframes a\\ {${body}}div{animation:a\\  1s}`
  )
);

test(
  'should keep the identifier definition when merging with a string-named definition',
  // A string reference costs two bytes more and is less widely supported.
  processCSS(
    `@keyframes b{${body}}@keyframes "a"{${body}}div{animation:b 1s}`,
    `@keyframes b{${body}}div{animation:b 1s}`
  )
);

test(
  'should respell a string reference as the identifier of the kept definition',
  processCSS(
    `@keyframes b{${body}}@keyframes "a"{${body}}div{animation:"a" 1s}`,
    `@keyframes b{${body}}div{animation:b 1s}`
  )
);

test('should respell the name in an animation value that has a comment', () => {
  // postcss exposes a comment-free value, which the rewrite replaces; the
  // contract is the components and their order, not the spacing left behind.
  const output = run(
    `@keyframes a{${body}}@keyframes b{${body}}div{animation:a /* x */ 1s}`
  );
  assert.equal(
    output.replaceAll(/\s+/gv, ' '),
    `@keyframes b{${body}}div{animation:b 1s}`
  );
});

test(
  'should keep a valid empty keyframes rule over a block-less statement, which defines no keyframes',
  processCSS(
    `@keyframes b{}@keyframes a;.x{animation:a,b}`,
    `@keyframes b{}@keyframes a;.x{animation:a,b}`
  )
);

test(
  'should not merge a block-less counter style statement with an empty counter style rule',
  processCSS(
    `@counter-style b{}@counter-style a;ol{list-style:a}`,
    `@counter-style b{}@counter-style a;ol{list-style:a}`
  )
);

test(
  'should merge names defined in different cascade layers because the layer only picks which definition wins, and both bodies are equal',
  processCSS(
    `@layer L1{@keyframes a{${body}}}@layer L2{@keyframes b{${body}}}.x{animation:a}`,
    `@layer L1{}@layer L2{@keyframes b{${body}}}.x{animation:b}`
  )
);

for (const prefix of ['-webkit-', '-moz-', '-o-']) {
  for (const prop of ['animation', 'animation-name']) {
    test(
      `should rewrite a renamed keyframes name in ${prefix}${prop}`,
      processCSS(
        `@keyframes a{${body}}@keyframes b{${body}}.x{${prefix}${prop}:a}`,
        `@keyframes b{${body}}.x{${prefix}${prop}:b}`
      )
    );
  }
}

test(
  'should leave @-ms-keyframes rules alone because no animation property prefix renames their references',
  processCSS(
    `@-ms-keyframes a{${body}}@-ms-keyframes b{${body}}div{-ms-animation-name:a}`,
    `@-ms-keyframes a{${body}}@-ms-keyframes b{${body}}div{-ms-animation-name:a}`
  )
);

test(
  'should leave an unknown at-rule whose name ends in keyframes alone',
  processCSS(
    `@my-keyframes a{${body}}@my-keyframes b{${body}}div{animation-name:a}`,
    `@my-keyframes a{${body}}@my-keyframes b{${body}}div{animation-name:a}`
  )
);

test(
  'should merge vendor-prefixed keyframes rules of a recognized prefix',
  processCSS(
    `@-webkit-keyframes a{${body}}@-webkit-keyframes b{${body}}div{-webkit-animation-name:b}`,
    `@-webkit-keyframes b{${body}}div{-webkit-animation-name:b}`
  )
);

test(
  'should keep the shorter name when merging so the output is not longer than the input',
  processCSS(
    `@keyframes a{${body}}@keyframes very-long-name{${body}}p{animation:a}q{animation:a}`,
    `@keyframes a{${body}}p{animation:a}q{animation:a}`
  )
);

test(
  'should break a name length tie by cascade priority',
  processCSS(
    `@keyframes a{${body}}@keyframes b{${body}}p{animation:a}`,
    `@keyframes b{${body}}p{animation:b}`
  )
);

test(
  'should keep an identifier over a shorter string name',
  processCSS(
    `@keyframes "a"{${body}}@keyframes bcd{${body}}p{animation:"a"}`,
    `@keyframes bcd{${body}}p{animation:bcd}`
  )
);

test(
  'should keep a name used as an attr() fallback in an animation-name',
  processCSS(
    `@keyframes a{${body}}@keyframes b{${body}}p{animation-name:attr(data-x type(<custom-ident>),a)}`,
    `@keyframes a{${body}}p{animation-name:attr(data-x type(<custom-ident>),a)}`
  )
);

test(
  'should merge names whose prefixed and unprefixed definitions differ in the same way',
  processCSS(
    `@-webkit-keyframes x{${body}}@keyframes x{${otherBody}}@-webkit-keyframes y{${body}}@keyframes y{${otherBody}}div{-webkit-animation:x;animation:x}`,
    `@-webkit-keyframes y{${body}}@keyframes y{${otherBody}}div{-webkit-animation:y;animation:y}`
  )
);

test(
  'should merge names that an @media rule redefines with the same body',
  processCSS(
    `@keyframes a{${body}}@keyframes b{${body}}@media (min-width:600px){@keyframes a{${otherBody}}@keyframes b{${otherBody}}}div{animation:a}`,
    `@keyframes b{${body}}@media (min-width:600px){@keyframes b{${otherBody}}}div{animation:b}`
  )
);

// The last definition wins, so `a` resolves to `otherBody` and `b` to `body`.
test(
  'should not merge names whose definitions share bodies in a different cascade order',
  passthroughCSS(
    `@keyframes a{${body}}@keyframes a{${otherBody}}@keyframes b{${otherBody}}@keyframes b{${body}}div{animation:a}`
  )
);

// Unlayered definitions win, so `a` resolves to `body` and `b` to `otherBody`.
test(
  'should not merge names whose definitions share bodies in a different layer order',
  passthroughCSS(
    `@keyframes a{${body}}@layer l{@keyframes a{${otherBody}}@keyframes b{${body}}}@keyframes b{${otherBody}}div{animation:a}`
  )
);
