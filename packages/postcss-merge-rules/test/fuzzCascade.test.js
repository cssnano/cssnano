import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCascadeCoverage,
  checkCascade,
  generateCascadeCases,
} from '../script/lib/fuzzCascade.js';
import { computedStyles } from '../script/lib/cascadeOracle.js';
import { cascadeWinners } from '../script/lib/fuzzCrossBlock.js';

/** @param {string} css @param {string} element @param {object} [env] */
const styleOf = (css, element, env) =>
  computedStyles(css, env).get(element) ?? {};

/** @param {string} css @param {string} output */
const runOnce = (css, output) => (input) => ({
  css: input === css ? output : input,
  terminated: false,
});

test('cascade fuzzer generates deterministic cases', () => {
  assert.deepEqual(generateCascadeCases(7, 40), generateCascadeCases(7, 40));
});

test('cascade fuzzer cases cover every cascade feature and stay distinct', () => {
  assert.doesNotThrow(() =>
    assertCascadeCoverage(generateCascadeCases(7, 300))
  );
});

test('cascade coverage check rejects a corpus that misses a feature', () => {
  assert.throws(
    () => assertCascadeCoverage(generateCascadeCases(7, 3)),
    /missing/v
  );
});

test('computed styles let a more specific selector win over a later one', () => {
  assert.equal(styleOf('#i{color:red}.a{color:blue}', 'div.a#i').color, 'red');
});

test('computed styles give a selector list the specificity of its most specific matching selector', () => {
  assert.equal(
    styleOf('.a,#i{color:red}#i{color:blue}.a{color:green}', 'div.a#i').color,
    'blue'
  );
});

test('computed styles let a later shorthand reset an earlier longhand', () => {
  assert.equal(
    styleOf('.a{margin-top:1px;margin:0}', 'div.a')['margin-top'],
    '0'
  );
});

test('computed styles map a logical property to the physical side of the direction', () => {
  assert.equal(
    styleOf('.a{margin-left:0;margin-inline-start:1px}', 'div.a')[
      'margin-left'
    ],
    '1px'
  );
});

test('computed styles map a logical property by the direction the element itself sets', () => {
  assert.equal(
    styleOf('.a{direction:rtl;margin-inline-start:1px}', 'div.a')[
      'margin-right'
    ],
    '1px'
  );
});

test('computed styles map a logical property by the inherited direction', () => {
  assert.equal(
    styleOf('.a{margin-inline-start:1px}', 'div.a', { direction: 'rtl' })[
      'margin-right'
    ],
    '1px'
  );
});

test('computed styles let all reset every property except direction and custom properties', () => {
  assert.deepEqual(
    styleOf('.a{color:red;direction:rtl;--v:1px;all:unset}', 'div.a'),
    {
      '--v': '1px',
      'background-color': 'all:unset',
      'background-image': 'all:unset',
      color: 'all:unset',
      direction: 'rtl',
      'margin-bottom': 'all:unset',
      'margin-left': 'all:unset',
      'margin-right': 'all:unset',
      'margin-top': 'all:unset',
      top: 'all:unset',
    }
  );
});

test('computed styles compare standard property names ASCII case-insensitively', () => {
  assert.equal(styleOf('.a{color:red}.a{COLOR:blue}', 'div.a').color, 'blue');
});

test('computed styles keep custom property names case-sensitive', () => {
  assert.equal(styleOf('.a{--v:red}.a{--V:blue}', 'div.a')['--v'], 'red');
});

test('computed styles let unlayered declarations beat layered ones', () => {
  assert.equal(
    styleOf('.a{color:red}@layer l1{#i{color:blue}}', 'div.a#i').color,
    'red'
  );
});

test('computed styles order layers by where each name first appears', () => {
  assert.equal(
    styleOf(
      '@layer l2,l1;@layer l1{.a{color:red}}@layer l2{.a{color:blue}}',
      'div.a'
    ).color,
    'red'
  );
});

test('computed styles reverse layer order for important declarations', () => {
  assert.equal(
    styleOf(
      '@layer l1{.a{color:red!important}}@layer l2{.a{color:blue!important}}',
      'div.a'
    ).color,
    'red'
  );
});

test('computed styles skip @media print on screen and apply it in print', () => {
  const css = '.a{color:red}@media print{.a{color:blue}}';
  assert.deepEqual(
    [styleOf(css, 'div.a').color, styleOf(css, 'div.a', { print: true }).color],
    ['red', 'blue']
  );
});

test('computed styles reject a selector outside the generated grammar', () => {
  assert.throws(() => computedStyles('.a .b{color:red}'), /selector/v);
});

// The selector-keyed cross-block oracle sees `.b` red before and after, so
// it accepts this reordering; an element with both classes turns blue.
test('cascade check reports a join that moves a declaration across a conflicting rule for an element both selectors match', () => {
  const css = '.a{color:red}.b{color:blue}.c{color:red}';
  const output = '.a,.c{color:red}.b{color:blue}';
  assert.deepEqual(
    [
      cascadeWinners(css).get('.c color') ===
        cascadeWinners(output).get('.c color'),
      checkCascade(css, runOnce(css, output))?.reason,
    ],
    [true, 'computed style changed']
  );
});

test('cascade check accepts a join across a rule that sets an unrelated property', () => {
  const css = '.a{color:red}.b{top:0}.c{color:red}';
  assert.equal(
    checkCascade(css, runOnce(css, '.a,.c{color:red}.b{top:0}')),
    undefined
  );
});

test('cascade check reports output that grows', () => {
  const css = '.a{color:red}';
  assert.equal(
    checkCascade(css, runOnce(css, '.a{color:red}.a{color:red}'))?.reason,
    'output grew'
  );
});

test('cascade check reports a second pass that changes the output', () => {
  const css = '.a{color:red}.b{color:red}';
  assert.equal(
    checkCascade(css, (input) => ({
      css: input === css ? '.b{color:red}.a{color:red}' : '.a,.b{color:red}',
      terminated: false,
    }))?.reason,
    'second pass changed the output'
  );
});

test('cascade check reports a run that did not terminate', () => {
  assert.equal(
    checkCascade('.a{color:red}', () => ({ css: undefined, terminated: true }))
      ?.reason,
    'did not terminate'
  );
});

test('cascade check names the element, environment and property that changed', () => {
  const css = '.a{color:red}.b{color:blue}.c{color:red}';
  const failure = checkCascade(
    css,
    runOnce(css, '.a,.c{color:red}.b{color:blue}')
  );
  assert.match(failure?.detail ?? '', /\.b\.c.*color/v);
});
