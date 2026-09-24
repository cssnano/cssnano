import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

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
  'should not match a Unicode lookalike keyframes at-rule',
  passthroughCSS('@Keyframes a{0%{color:#fff}}@Keyframes b{0%{color:#fff}}')
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
  'should handle duplication within media queries',
  passthroughCSS(
    [
      '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@media (max-width:400px){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '.spin{animation:1s spin infinite linear}',
    ].join('')
  )
);

test(
  'should handle duplication within supports rules',
  passthroughCSS(
    [
      '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '.spin{animation:1s spin infinite linear}',
    ].join('')
  )
);

test(
  'should handle duplication within supports rules & media queries',
  passthroughCSS(
    [
      '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@media (max-width:400px){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '.spin{animation:1s spin infinite linear}',
    ].join('')
  )
);

test(
  'should handle duplication within nested at-rules',
  passthroughCSS(
    [
      '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@media (max-width:400px){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '@media (max-width: 400px){@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}}',
      '.spin{animation:1s spin infinite linear}',
    ].join('')
  )
);

test(
  'should not crash on potential circular references',
  processCSS(
    `.hi{animation:hi 2s infinite linear}@-webkit-keyframes hi{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}.ho{animation:ho 2s infinite linear}@-webkit-keyframes ho{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}@keyframes ho{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}@keyframes hi{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}`,
    `.hi{animation:hi 2s infinite linear}.ho{animation:hi 2s infinite linear}@-webkit-keyframes ho{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}@keyframes hi{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}`
  )
);

test('should serialize each keyframes body only once when entering candidate collection', async () => {
  let toStringCalls = 0;
  const input = [
    '@keyframes a{0%{color:#fff}to{color:#000}}',
    '@keyframes b{0%{color:#fff}to{color:#000}}',
    '@keyframes c{0%{color:#fff}to{color:#000}}',
    '@keyframes d{0%{color:#fff}to{color:#000}}',
  ].join('');

  const root = postcss.parse(input);
  for (const node of root.nodes) {
    if (node.type === 'atrule' && node.nodes) {
      const origToString = node.nodes.toString;
      node.nodes.toString = function (...args) {
        toStringCalls++;
        return origToString.apply(this, args);
      };
    }
  }

  await postcss([plugin()]).process(root, { from: undefined });

  assert.strictEqual(toStringCalls, 4);
  assert.strictEqual(
    root.toString(),
    '@keyframes d{0%{color:#fff}to{color:#000}}'
  );
});

test('should serialize interleaved matching and non-matching candidates linearly and merge accurately', async () => {
  let toStringCalls = 0;
  const input = [
    '@keyframes a{0%{top:0}}',
    '@keyframes b{0%{left:0}}',
    '@keyframes c{0%{top:0}}',
    '@keyframes d{0%{left:0}}',
    'div{animation:a 1s, b 2s}',
  ].join('');

  const root = postcss.parse(input);
  for (const node of root.nodes) {
    if (node.type === 'atrule' && node.nodes) {
      const origToString = node.nodes.toString;
      node.nodes.toString = function (...args) {
        toStringCalls++;
        return origToString.apply(this, args);
      };
    }
  }

  await postcss([plugin()]).process(root, { from: undefined });

  assert.strictEqual(toStringCalls, 4);
  assert.strictEqual(
    root.toString(),
    '@keyframes c{0%{top:0}}@keyframes d{0%{left:0}}div{animation:c 1s, d 2s}'
  );
});

test(
  'should merge identical keyframes within the same media query',
  processCSS(
    '@media (max-width:400px){@keyframes a{0%{opacity:0}to{opacity:1}}@keyframes b{0%{opacity:0}to{opacity:1}}}',
    '@media (max-width:400px){@keyframes b{0%{opacity:0}to{opacity:1}}}'
  )
);

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
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}:root{--animation:a;--my-animation:a}',
    '@keyframes b{0%{color:#fff}to{color:#000}}:root{--animation:a;--my-animation:a}'
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
  'should not corrupt arguments inside functions in animation declarations',
  processCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}div{animation:a 1s steps(4,jump-start),b 1s var(--foo,a)}',
    '@keyframes b{0%{opacity:0}}div{animation:b 1s steps(4,jump-start),b 1s var(--foo,a)}'
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

test(
  'should isolate vendor prefixed keyframes replacements from standard keyframes',
  processCSS(
    '@-webkit-keyframes a{from{opacity:0}to{opacity:1}}@-webkit-keyframes b{from{opacity:0}to{opacity:1}}@keyframes c{from{opacity:0}to{opacity:1}}@keyframes a{from{opacity:0}to{opacity:1}}div{-webkit-animation:a 1s;animation:c 1s}',
    '@-webkit-keyframes b{from{opacity:0}to{opacity:1}}@keyframes a{from{opacity:0}to{opacity:1}}div{-webkit-animation:b 1s;animation:a 1s}'
  )
);

test(
  'should not leak keyframe replacements across conditional rule scopes',
  processCSS(
    '@media (max-width:400px){@keyframes a{from{top:0}to{top:10px}}@keyframes b{from{top:0}to{top:10px}}}div{animation:a 1s}@keyframes a{from{left:0}to{left:100px}}',
    '@media (max-width:400px){@keyframes b{from{top:0}to{top:10px}}}div{animation:a 1s}@keyframes a{from{left:0}to{left:100px}}'
  )
);

test(
  'should reject multi-token at-rules and not merge them',
  passthroughCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b extra{0%{opacity:0}}div{animation:a 1s}'
  )
);

test(
  'should reject non-ident and non-string tokens in at-rules',
  passthroughCSS(
    '@keyframes a{0%{opacity:0}}@keyframes 123{0%{opacity:0}}div{animation:a 1s}'
  )
);

test(
  'should reject empty or comments-only parameters in keyframes at-rules',
  passthroughCSS(
    '@keyframes {0%{opacity:0}}@keyframes /* comment */ {0%{opacity:0}}'
  )
);

test(
  'should reject reserved keyword none as keyframes name',
  passthroughCSS(
    '@keyframes a{0%{opacity:0}}@keyframes none{0%{opacity:0}}div{animation:a 1s}'
  )
);

test(
  'should reject CSS-wide keywords as keyframes names',
  passthroughCSS(
    '@keyframes a{0%{opacity:0}}@keyframes inherit{0%{opacity:0}}@keyframes initial{0%{opacity:0}}@keyframes unset{0%{opacity:0}}@keyframes revert{0%{opacity:0}}@keyframes revert-layer{0%{opacity:0}}div{animation:a 1s}'
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
  'should correctly shadow outer merged definitions when nested conditional scope defines the same name',
  processCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}@media (min-width:600px){@keyframes a{0%{opacity:1}}div{animation:a 1s}}',
    '@keyframes b{0%{opacity:0}}@media (min-width:600px){@keyframes a{0%{opacity:1}}div{animation:a 1s}}'
  )
);

test(
  'should not rewrite reference when intermediate scope shadows target replacement name',
  processCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}@media (min-width:600px){@keyframes b{0%{opacity:1}}div{animation:a 1s}}',
    '@keyframes b{0%{opacity:0}}@media (min-width:600px){@keyframes b{0%{opacity:1}}div{animation:a 1s}}'
  )
);

test(
  'should resolve keyframes across cascade layers',
  processCSS(
    '@layer base{@keyframes a{0%{opacity:0}to{opacity:1}}@keyframes b{0%{opacity:0}to{opacity:1}}}div{animation:a 1s}',
    '@layer base{@keyframes b{0%{opacity:0}to{opacity:1}}}div{animation:b 1s}'
  )
);

test(
  'should resolve keyframes defined across different cascade layers',
  processCSS(
    '@layer base{@keyframes a{0%{opacity:0}to{opacity:1}}}@layer components{@keyframes b{0%{opacity:0}to{opacity:1}}}div{animation:a 1s}',
    '@layer base{}@layer components{@keyframes b{0%{opacity:0}to{opacity:1}}}div{animation:b 1s}'
  )
);

test(
  'should order nested layer names within their parent layer when merging',
  processCSS(
    '@layer l{@layer m{@keyframes a{0%{opacity:0}}}}@layer k{@keyframes a{0%{opacity:0}}}@layer m{@keyframes a{0%{opacity:0}}}div{animation:a 1s}',
    '@layer l{@layer m{}}@layer k{}@layer m{@keyframes a{0%{opacity:0}}}div{animation:a 1s}'
  )
);

test(
  'should keep escaped-dot layer names distinct from dotted nesting when ordering',
  processCSS(
    '@layer a\\.b{@keyframes k{0%{opacity:0}}}@layer c{@keyframes k{0%{opacity:0}}}@layer b{@keyframes k{0%{opacity:0}}}div{animation:k 1s}',
    '@layer a\\.b{}@layer c{}@layer b{@keyframes k{0%{opacity:0}}}div{animation:k 1s}'
  )
);

test(
  'should merge keyframes within identical escaped-dot layer names',
  processCSS(
    '@layer a\\.b{@keyframes a{0%{opacity:0}}}@layer a\\.b{@keyframes b{0%{opacity:0}}}div{animation:a 1s}',
    '@layer a\\.b{}@layer a\\.b{@keyframes b{0%{opacity:0}}}div{animation:b 1s}'
  )
);

test(
  'should preserve higher priority layer when conflicting layer order is declared',
  processCSS(
    '@layer low, high;@layer high{@keyframes a{0%{opacity:0}}}@layer low{@keyframes a{0%{opacity:0}}}div{animation:a 1s}',
    '@layer low, high;@layer high{@keyframes a{0%{opacity:0}}}@layer low{}div{animation:a 1s}'
  )
);

test(
  'should prefer unlayered keyframes over layered keyframes regardless of order',
  processCSS(
    '@keyframes a{0%{opacity:0}}@layer low{@keyframes a{0%{opacity:0}}}div{animation:a 1s}',
    '@keyframes a{0%{opacity:0}}@layer low{}div{animation:a 1s}'
  )
);

test(
  'should handle duplication within container queries',
  processCSS(
    '@container (min-width:400px){@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}div{animation:a 1s}}',
    '@container (min-width:400px){@keyframes b{0%{opacity:0}}div{animation:b 1s}}'
  )
);

test(
  'should not leak keyframes replacements across container query scopes',
  processCSS(
    '@container (min-width:400px){@keyframes a{from{top:0}to{top:10px}}@keyframes b{from{top:0}to{top:10px}}}div{animation:a 1s}@keyframes a{from{left:0}to{left:100px}}',
    '@container (min-width:400px){@keyframes b{from{top:0}to{top:10px}}}div{animation:a 1s}@keyframes a{from{left:0}to{left:100px}}'
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
  let toStringCalls = 0;
  const input = '@keyframes a{0%{top:0}}div{animation:a 1s}';
  const root = postcss.parse(input);
  for (const node of root.nodes) {
    if (node.type === 'atrule' && node.nodes) {
      const origToString = node.nodes.toString;
      node.nodes.toString = function (...args) {
        toStringCalls++;
        return origToString.apply(this, args);
      };
    }
  }

  await postcss([plugin()]).process(root, { from: undefined });

  assert.strictEqual(toStringCalls, 0);
  assert.strictEqual(root.toString(), input);
});
