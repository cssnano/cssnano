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
  'should not output JS functions',
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
    `.hi{animation:hi 2s infinite linear}.ho{animation:ho 2s infinite linear}@-webkit-keyframes ho{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}@keyframes hi{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}`
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
