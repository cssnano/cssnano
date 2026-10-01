import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import { trackAtRuleSerializations } from './helpers/trackAtRuleSerializations.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should merge keyframe identifiers',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}',
    '@keyframes b{0%{color:#fff}to{color:#000}}'
  )
);

test(
  'should merge keyframe identifiers (2)',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@KEYFRAMES b{0%{color:#fff}to{color:#000}}',
    '@KEYFRAMES b{0%{color:#fff}to{color:#000}}'
  )
);

test(
  'should merge multiple keyframe identifiers',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}@keyframes c{0%{color:#fff}to{color:#000}}',
    '@keyframes c{0%{color:#fff}to{color:#000}}'
  )
);

test(
  'should update relevant animation declarations',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}',
    '@keyframes b{0%{color:#fff}to{color:#000}}div{animation:b .2s ease}'
  )
);

test(
  'should update relevant animation declarations (2)',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}div{ANIMATION:a .2s ease}',
    '@keyframes b{0%{color:#fff}to{color:#000}}div{ANIMATION:b .2s ease}'
  )
);

test(
  'should update relevant animation declarations (3)',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}@keyframes c{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}',
    '@keyframes c{0%{color:#fff}to{color:#000}}div{animation:c .2s ease}'
  )
);

test(
  'should not merge vendor prefixed keyframes',
  passthroughCSS(
    '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}'
  )
);

test(
  'should merge duplicated keyframes with the same name',
  processCSS(
    '@keyframes a{0%{opacity:1}to{opacity:0}}@keyframes a{0%{opacity:1}to{opacity:0}}',
    '@keyframes a{0%{opacity:1}to{opacity:0}}'
  )
);

test(
  'should pass through animation properties without a name component',
  passthroughCSS(
    '.ui.indeterminate.loader:after{-webkit-animation-direction:reverse;animation-direction:reverse;-webkit-animation-duration:1.2s;animation-duration:1.2s}'
  )
);

test(
  'should handle duplicated definitions',
  processCSS(
    [
      '.checkbox input[type=checkbox]:checked + .checkbox-material:before{-webkit-animation:rippleOn 500ms;-o-animation:rippleOn 500ms;animation:rippleOn 500ms}',
      '.checkbox input[type=checkbox]:checked + .checkbox-material .check:after{-webkit-animation:rippleOn 500ms forwards;-o-animation:rippleOn 500ms forwards;animation:rippleOn 500ms forwards}',
      '@-webkit-keyframes rippleOn{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@-o-keyframes rippleOn{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@keyframes rippleOn{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@-webkit-keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@-o-keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@keyframes rippleOn{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
    ].join(''),
    [
      '.checkbox input[type=checkbox]:checked + .checkbox-material:before{-webkit-animation:rippleOff 500ms;-o-animation:rippleOff 500ms;animation:rippleOff 500ms}',
      '.checkbox input[type=checkbox]:checked + .checkbox-material .check:after{-webkit-animation:rippleOff 500ms forwards;-o-animation:rippleOff 500ms forwards;animation:rippleOff 500ms forwards}',
      '@-webkit-keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@-o-keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
    ].join('')
  )
);

test(
  'should not crash on potential circular references',
  processCSS(
    `.hi{animation:hi 2s infinite linear}@-webkit-keyframes hi{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}.ho{animation:ho 2s infinite linear}@-webkit-keyframes ho{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}@keyframes ho{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}@keyframes hi{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}`,
    `.hi{animation:hi 2s infinite linear}@-webkit-keyframes hi{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}.ho{animation:hi 2s infinite linear}@keyframes hi{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}`
  )
);

test('should serialize each keyframes body only once when entering candidate collection', async () => {
  const input = [
    '@keyframes a{0%{color:#fff}to{color:#000}}',
    '@keyframes b{0%{color:#fff}to{color:#000}}',
    '@keyframes c{0%{color:#fff}to{color:#000}}',
    '@keyframes d{0%{color:#fff}to{color:#000}}',
  ].join('');

  const root = postcss.parse(input);
  const getSerializationCalls = trackAtRuleSerializations(root);

  await postcss([plugin()]).process(root, { from: undefined });

  assert.strictEqual(getSerializationCalls(), 4);
  assert.strictEqual(
    root.toString(),
    '@keyframes d{0%{color:#fff}to{color:#000}}'
  );
});

test('should serialize interleaved matching and non-matching candidates linearly and merge accurately', async () => {
  const input = [
    '@keyframes a{0%{top:0}}',
    '@keyframes b{0%{left:0}}',
    '@keyframes c{0%{top:0}}',
    '@keyframes d{0%{left:0}}',
    'div{animation:a 1s, b 2s}',
  ].join('');

  const root = postcss.parse(input);
  const getSerializationCalls = trackAtRuleSerializations(root);

  await postcss([plugin()]).process(root, { from: undefined });

  assert.strictEqual(getSerializationCalls(), 4);
  assert.strictEqual(
    root.toString(),
    '@keyframes c{0%{top:0}}@keyframes d{0%{left:0}}div{animation:c 1s, d 2s}'
  );
});

test(
  'should update animation-name longhand declarations',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}div{animation-name:a}',
    '@keyframes b{0%{color:#fff}to{color:#000}}div{animation-name:b}'
  )
);

test(
  'should not corrupt non-name animation properties',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes other{0%{color:#fff}to{color:#000}}div{animation-fill-mode:forwards;animation-timing-function:ease;animation-direction:normal;animation-duration:1s;animation-iteration-count:infinite;animation-play-state:running}',
    '@keyframes other{0%{color:#fff}to{color:#000}}div{animation-fill-mode:forwards;animation-timing-function:ease;animation-direction:normal;animation-duration:1s;animation-iteration-count:infinite;animation-play-state:running}'
  )
);

test(
  'should not corrupt custom properties containing animation in their name',
  passthroughCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}:root{--animation:a;--my-animation:a}'
  )
);

test(
  'should not overwrite keywords colliding with animation shorthand components',
  processCSS(
    '@keyframes a{0%{opacity:0}}@keyframes other{0%{opacity:0}}div{animation:a 1s forwards}',
    '@keyframes other{0%{opacity:0}}div{animation:other 1s forwards}'
  )
);

test(
  'should support escaped identifier keyframe names',
  processCSS(
    '@keyframes \\61{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}div{animation:\\61 .2s ease}',
    '@keyframes b{0%{color:#fff}to{color:#000}}div{animation:b .2s ease}'
  )
);

test(
  'should support string keyframe names',
  processCSS(
    '@keyframes "slide"{0%{color:#fff}to{color:#000}}@keyframes "fade"{0%{color:#fff}to{color:#000}}div{animation:"slide" .2s ease}',
    '@keyframes "fade"{0%{color:#fff}to{color:#000}}div{animation:"fade" .2s ease}'
  )
);

test(
  'should not merge into a keyframe name that is redefined with a different body',
  passthroughCSS(
    '@keyframes b{0%{opacity:0}}@keyframes a{0%{opacity:0}}@keyframes a{0%{opacity:1}}div{animation:b 1s}'
  )
);

// `a` is defined in both families, `b` only in the prefixed one and `c` only
// in the unprefixed one. A browser may treat the prefixed at-rule as an alias
// of the unprefixed one, so no two of them are interchangeable.
test(
  'should not merge names whose vendor prefixed and standard definitions differ',
  passthroughCSS(
    '@-webkit-keyframes a{from{opacity:0}to{opacity:1}}@-webkit-keyframes b{from{opacity:0}to{opacity:1}}@keyframes c{from{opacity:0}to{opacity:1}}@keyframes a{from{opacity:0}to{opacity:1}}div{-webkit-animation:a 1s;animation:c 1s}'
  )
);

test(
  'should not corrupt modern animation-composition keywords in animation shorthand',
  processCSS(
    '@keyframes a{0%{opacity:0}}@keyframes other{0%{opacity:0}}div{animation:a 1s add}',
    '@keyframes other{0%{opacity:0}}div{animation:other 1s add}'
  )
);

test(
  'should not corrupt replace and accumulate in animation shorthand',
  processCSS(
    '@keyframes a{0%{opacity:0}}@keyframes other{0%{opacity:0}}div{animation:a 1s replace, a 1s accumulate}',
    '@keyframes other{0%{opacity:0}}div{animation:other 1s replace, other 1s accumulate}'
  )
);

test(
  'should preserve dashed-ident timeline definitions referenced only as a timeline',
  passthroughCSS(
    '@keyframes --my-timeline{0%{opacity:0}}@keyframes other{0%{opacity:0}}div{animation:other 1s --my-timeline}'
  )
);

test(
  'should not merge dashed-ident keyframe names into different names in animation-name longhand',
  passthroughCSS(
    '@keyframes --a{0%{opacity:0}}@keyframes --b{0%{opacity:0}}div{animation-name:--a}'
  )
);

test(
  'should not merge dashed-ident keyframe names into different names in animation shorthand',
  passthroughCSS(
    '@keyframes --foo{0%{opacity:0}}@keyframes --bar{0%{opacity:0}}div{animation:--foo 1s}'
  )
);

test(
  'should deduplicate identical dashed-ident keyframe definitions',
  processCSS(
    '@keyframes --foo{0%{opacity:0}}@keyframes --foo{0%{opacity:0}}div{animation:--foo 1s}',
    '@keyframes --foo{0%{opacity:0}}div{animation:--foo 1s}'
  )
);

test(
  'should not rewrite keyframe names colliding with shorthand keywords in multiple animation lists',
  processCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}div{animation:1s forwards forwards, a 1s forwards}',
    '@keyframes b{0%{opacity:0}}div{animation:1s forwards forwards, b 1s forwards}'
  )
);

test(
  'should not merge keyframe names colliding with shorthand keywords into different names',
  passthroughCSS(
    '@keyframes ease{0%{opacity:0}}@keyframes b{0%{opacity:0}}div{animation:ease 1s}'
  )
);

test(
  'should not merge keyframe names colliding with shorthand keywords into another shorthand keyword',
  passthroughCSS(
    '@keyframes ease{0%{opacity:0}}@keyframes forwards{0%{opacity:0}}div{animation:ease 1s}'
  )
);

test(
  'should deduplicate identical keyframe definitions colliding with shorthand keywords',
  processCSS(
    '@keyframes ease{0%{opacity:0}}@keyframes ease{0%{opacity:0}}div{animation:ease 1s}',
    '@keyframes ease{0%{opacity:0}}div{animation:ease 1s}'
  )
);

test(
  'should update multiple animation references in a single declaration',
  processCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}div{animation:a 1s, a 2s}',
    '@keyframes b{0%{opacity:0}}div{animation:b 1s, b 2s}'
  )
);

test(
  'should update every name in an animation-name list',
  processCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}div{animation-name:a,b}',
    '@keyframes b{0%{opacity:0}}div{animation-name:b,b}'
  )
);

test('should not serialize at-rule body when container only has a single at-rule', async () => {
  const input = '@keyframes a{0%{top:0}}div{animation:a 1s}';
  const root = postcss.parse(input);
  const getSerializationCalls = trackAtRuleSerializations(root);

  await postcss([plugin()]).process(root, { from: undefined });

  assert.strictEqual(getSerializationCalls(), 0);
  assert.strictEqual(root.toString(), input);
});

test(
  'should not turn an invalid animation into a valid one when a string reference follows a hex escape',
  // `\66 "a"` is two names without a comma; `\66 b` would be the one name fb.
  processCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}div{animation:\\66 "a"}',
    '@keyframes b{0%{opacity:0}}div{animation:\\66  b}'
  )
);

test(
  'should keep a replaced string reference separate from a preceding escaped space',
  processCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}div{animation:foo\\ "a"}',
    '@keyframes b{0%{opacity:0}}div{animation:foo\\  b}'
  )
);

test(
  'should treat an escaped spelling and the plain spelling of a name as one name',
  processCSS(
    '@keyframes \\61{0%{opacity:0}}@keyframes a{0%{opacity:0}}div{animation:a 1s}',
    '@keyframes a{0%{opacity:0}}div{animation:a 1s}'
  )
);

test(
  'should not merge identical keyframes defined in separate @media blocks (conservative: separate blocks may have different conditions in effect)',
  passthroughCSS(
    '@media (min-width:1px){@keyframes a{0%{opacity:0}}}@media (min-width:1px){@keyframes b{0%{opacity:0}}}div{animation:b 1s}'
  )
);
