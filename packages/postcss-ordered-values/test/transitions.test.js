import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'does not classify transition keyword functions as timing keywords',
  processCSS(
    'a{transition:ease() opacity 1s}',
    'a{transition:ease() opacity 1s}'
  )
);

test(
  'transition only classifies time dimensions as times',
  processCSS(
    'a{transition:opacity 10px ease 1s;transition:color 2deg ease 3;}',
    'a{transition:opacity 10px 1s ease;transition:color 2deg 3 ease;}'
  )
);

test('preserves uncertain animation and transition math', () => {
  const input =
    'a{animation:fade calc(1s +) ease 2s;transition:opacity calc(1s / 1s) ease 2s}';
  assert.strictEqual(
    postcss([plugin()]).process(input, { from: undefined }).css,
    input
  );
});

test('does not swap validated math durations and delays', () => {
  const input =
    'a{animation:calc(2s + 1s) fade ease 1s;transition:calc(2s + 1s) opacity ease 1s}';
  assert.strictEqual(
    postcss([plugin()]).process(input, { from: undefined }).css,
    'a{animation:fade calc(2s + 1s) ease 1s;transition:opacity calc(2s + 1s) ease 1s}'
  );
});

test('classifies nested comma-containing math durations', () => {
  const input =
    'a{animation:calc(min(1s, 2s) + 1s) fade ease 1s;transition:opacity min(calc(1s + 1s), 2s) ease 1s;transition:color calc(max(1s, 2s) - 1s) ease 1s}';
  assert.strictEqual(
    postcss([plugin()]).process(input, { from: undefined }).css,
    'a{animation:fade calc(min(1s, 2s) + 1s) ease 1s;transition:opacity min(calc(1s + 1s), 2s) ease 1s;transition:color calc(max(1s, 2s) - 1s) ease 1s}'
  );
});

test('orders time-returning modern math functions', () => {
  const input =
    'a{animation:round(1s, 1s) fade ease 1s;transition:opacity abs(1s) ease 2s}';
  assert.strictEqual(
    postcss([plugin()]).process(input, { from: undefined }).css,
    'a{animation:fade round(1s, 1s) ease 1s;transition:opacity abs(1s) ease 2s}'
  );
});

test('orders animation and transition with trigonometric and exponential calculations', () => {
  const input =
    'a{animation:calc(1s * sin(0)) fade ease 1s;transition:opacity calc(1s * sqrt(4)) ease 2s}';
  assert.strictEqual(
    postcss([plugin()]).process(input, { from: undefined }).css,
    'a{animation:fade calc(1s * sin(0)) ease 1s;transition:opacity calc(1s * sqrt(4)) ease 2s}'
  );
});

test(
  'orders animation and transition with round() math function',
  processCSS(
    'a{animation:calc(1s * round(2)) fade ease 1s;transition:opacity round(1s, 200ms) ease 2s}',
    'a{animation:fade calc(1s * round(2)) ease 1s;transition:opacity round(1s, 200ms) ease 2s}'
  )
);

test(
  'should pass through important comments (transition)',
  passthroughCSS('transition: ease-out width /*!wow*/ .5s 2s')
);

describe('Order', () => {
  test(
    'should order transition consistently (1)',
    passthroughCSS('transition: width .5s ease-out 2s')
  );

  test(
    'should order transition consistently (2)',
    processCSS(
      'transition: ease-out width .5s 2s',
      'transition: width .5s ease-out 2s'
    )
  );

  test(
    'should order transition consistently (2) (uppercase property and value)',
    processCSS(
      'TRANSITION: EASE-OUT WIDTH .5S 2S',
      'TRANSITION: WIDTH .5S EASE-OUT 2S'
    )
  );

  test(
    'should order transition consistently (3)',
    processCSS(
      'transition: ease-out .5s width 2s',
      'transition: width .5s ease-out 2s'
    )
  );

  test(
    'should order transition consistently (4)',
    processCSS(
      'transition: .5s 2s width ease-out',
      'transition: width .5s ease-out 2s'
    )
  );

  test(
    'should order transition consistently (5)',
    processCSS(
      'transition: .5s 2s width steps(5, start)',
      'transition: width .5s steps(5, start) 2s'
    )
  );

  test(
    'should order transition consistently (6)',
    processCSS(
      'transition: .5s 2s width cubic-bezier(0, 0.3, 0.6, 1)',
      'transition: width .5s cubic-bezier(0, 0.3, 0.6, 1) 2s'
    )
  );

  test(
    'should order transition consistently (6) (uppercase "cubic-bezier")',
    processCSS(
      'transition: .5s 2s width CUBIC-BEZIER(0, 0.3, 0.6, 1)',
      'transition: width .5s CUBIC-BEZIER(0, 0.3, 0.6, 1) 2s'
    )
  );

  test(
    'should order transition consistently (6) (linear timing function)',
    processCSS(
      'transition: .5s 2s width linear(0, 1)',
      'transition: width .5s linear(0, 1) 2s'
    )
  );

  test(
    'should order transition consistently (7)',
    processCSS(
      'transition: .5s 2s width ease-out,.8s 1s height ease',
      'transition: width .5s ease-out 2s,height .8s ease 1s'
    )
  );

  test(
    'should order transition consistently (8)',
    processCSS(
      '-webkit-transition: ease-out width .5s 2s',
      '-webkit-transition: width .5s ease-out 2s'
    )
  );

  test(
    'should pass through duplicate transition timing functions and times',
    passthroughCSS(
      'a{transition:width ease ease 1s;transition:width .5s 1s 2s 3s}'
    )
  );
});

test(
  'should pass through transition declarations with multiple property names',
  passthroughCSS('a{transition: 1s opacity transform}')
);

test(
  'should pass through transition declarations with string or invalid property names',
  passthroughCSS(
    'a{transition: 1s "opacity";transition: 1s "opacity" "transform";transition: 1s opacity "transform"}'
  )
);

test(
  'should pass through transition declarations with percentage or url property names',
  passthroughCSS(
    'a{transition: 1s 50%;transition: 1s opacity 50%;transition: 1s url(prop.svg)}'
  )
);

describe('Pass through', () => {
  test(
    'should abort ordering when a var is detected (transition)',
    passthroughCSS('transition: .5s 2s width var(--ease)')
  );

  test(
    'should abort ordering when a var is detected (transition) (uppercase "var")',
    passthroughCSS('transition: .5s 2s width VAR(--ease)')
  );
});
