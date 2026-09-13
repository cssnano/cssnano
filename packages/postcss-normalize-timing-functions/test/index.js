import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS, processor } = processCSSFactory(plugin);

const properties = [
  ['animation', (v) => `animation:fade 3s ${v}`],
  ['-webkit-animation', (v) => `-webkit-animation:fade 3s ${v}`],
  ['animation-timing-function', (v) => `animation-timing-function:${v}`],
  [
    '-webkit-animation-timing-function',
    (v) => `-webkit-animation-timing-function:${v}`,
  ],
  ['transition', (v) => `transition:color 3s ${v}`],
  ['-webkit-transition', (v) => `-webkit-transition:color 3s ${v}`],
  ['transition-timing-function', (v) => `transition-timing-function:${v}`],
  [
    '-webkit-transition-timing-function',
    (v) => `-webkit-transition-timing-function:${v}`,
  ],
];

function testPassthrough(fixture) {
  for (const [prop, template] of properties) {
    test(`${prop}: ${fixture}`, passthroughCSS(template(fixture)));
  }
}

testPassthrough('var(--anim1)');
testPassthrough('VAR(--anim1)');

test('should pass through broken syntax', passthroughCSS('h1{animation:}'));

test(
  'should preserve nested blocks in an unrecognized timing function',
  passthroughCSS('h1{animation:fade 3s steps(10, calc(1 + (2)))}')
);

test(
  'should reduce recognized functions without touching unrelated functions',
  processCSS(
    'animation-timing-function:cubic-bezier(0,0,1,1),FOO(steps(1, start))',
    'animation-timing-function:linear,FOO(step-start)'
  )
);

test(
  'should preserve malformed timing-function arguments',
  passthroughCSS('h1{animation:fade 3s cubic-bezier(0,/*x*/0,1)}')
);

test(
  'nested blocks do not hide top-level commas',
  processCSS(
    'animation:fade 3s cubic-bezier(0, 0, 1, 1), FOO([a,b], {c:d})',
    'animation:fade 3s linear, FOO([a,b], {c:d})'
  )
);

test(
  'unknown nested content is preserved',
  passthroughCSS('h1{animation:fade 3s FOO(steps(1, start()), [a,b], {c:d})}')
);

test(
  'should supports multiple timing functions (animation-timing-function)',
  processCSS(
    'h1{animation-timing-function: cubic-bezier(0, 0, 1, 1), cubic-bezier(0, 0, 1, 1), steps(1, start)}',
    'h1{animation-timing-function: linear, linear, step-start}'
  )
);

test(
  'should supports multiple timing functions (transition-timing-function)',
  processCSS(
    'h1{transition-timing-function: cubic-bezier(0, 0, 1, 1), cubic-bezier(0, 0, 1, 1), steps(1, start)}',
    'h1{transition-timing-function: linear, linear, step-start}'
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

test('mismatched and unclosed delimiters fail closed', async () => {
  const root = postcss.root();
  root.append(
    postcss.decl({
      prop: 'animation-timing-function',
      value: 'cubic-bezier(0, 0, 1, 1]',
    })
  );
  const result = await processor(root);
  assert.strictEqual(result.root.nodes[0].value, 'cubic-bezier(0, 0, 1, 1]');
});

test('an unrelated malformed block prevents all value transformations', async () => {
  const root = postcss.root();
  root.append(
    postcss.decl({
      prop: 'animation-timing-function',
      value: 'cubic-bezier(0,0,1,1), foo(',
    })
  );
  const result = await processor(root);
  assert.strictEqual(result.root.nodes[0].value, 'cubic-bezier(0,0,1,1), foo(');
});
