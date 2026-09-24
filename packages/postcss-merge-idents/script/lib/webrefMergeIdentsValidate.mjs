/**
 * @typedef {import('./webrefMergeIdents.mjs').MergeIdents} MergeIdents
 */

/** @type {string[]} */
const CSS_WIDE_KEYWORD_EXPECTATIONS = [
  'inherit',
  'initial',
  'revert',
  'revert-layer',
  'revert-rule',
  'unset',
];

/** @type {string[]} */
const KEYFRAMES_SHORTHAND_KEYWORD_EXPECTATIONS = [
  'alternate',
  'alternate-reverse',
  'auto',
  'backwards',
  'both',
  'ease',
  'ease-in',
  'ease-in-out',
  'ease-out',
  'forwards',
  'infinite',
  'linear',
  'none',
  'normal',
  'paused',
  'reverse',
  'running',
  'step-end',
  'step-start',
];

/** @type {string[]} */
const COUNTER_STYLE_KEYWORD_EXPECTATIONS = [
  'additive',
  'alphabetic',
  'auto',
  'bullets',
  'cyclic',
  'extends',
  'fixed',
  'inside',
  'none',
  'numbers',
  'numeric',
  'outside',
  'spell-out',
  'symbolic',
  'words',
];

/**
 * Checks that data contains at least the known keywords
 *
 * @param {MergeIdents} data
 * @return {void}
 */
export function validate(data) {
  expectAll(data.cssWideKeywords, CSS_WIDE_KEYWORD_EXPECTATIONS, [
    'the CSS-wide keywords',
  ]);
  expectAll(
    data.keyframes.shorthandKeywords,
    KEYFRAMES_SHORTHAND_KEYWORD_EXPECTATIONS,
    ['the keywords an animation value can hold']
  );
  expectAll(data.counterStyle.keywords, COUNTER_STYLE_KEYWORD_EXPECTATIONS, [
    'the keywords a list style value or counter style descriptor can hold',
  ]);
  for (const [name, expected] of /** @type {[string, number[]][]} */ ([
    ['counter()', [1]],
    ['counters()', [2]],
    ['target-counter()', [2]],
    ['target-counters()', [3]],
  ])) {
    const actual = data.counterStyle.functions.get(name);
    if (actual?.join() !== expected.join()) {
      throw new Error(
        `Expected ${name} to take a counter style at argument ${expected.join()}, got ${actual?.join() ?? 'nothing'}`
      );
    }
  }
}

/**
 * @param {string[]} actual
 * @param {string[]} expected
 * @param {string[]} what
 * @return {void}
 */
function expectAll(actual, expected, what) {
  for (const name of expected) {
    if (!actual.includes(name)) {
      throw new Error(`Expected ${what.join(' ')} to include ${name}`);
    }
  }
}
