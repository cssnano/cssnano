import { test, describe } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('invalid-value handling', () => {
  test(
    'should pass through a value whose component is unclear',
    passthroughCSS('h1{columns:calc(2em + 1px)}')
  );

  test(
    'should pass through two values naming the same component',
    passthroughCSS('h1{columns:3 4}')
  );

  test(
    'should pass through a count that is not an integer',
    passthroughCSS('h1{columns:2.5}')
  );

  test(
    'should pass through a width that is not a length',
    passthroughCSS('h1{columns:50%}')
  );

  test(
    'should preserve decimal, exponent, and percentage values as invalid counts',
    passthroughCSS('h1{columns:2.5 1e2 50%}')
  );

  test(
    'should recognize an escaped length unit and preserve its spelling',
    processCSS('h1{columns:3 12\\65 m}', 'h1{columns:12\\65 m 3}')
  );

  test('should classify ordinary length units case-insensitively', () => {
    return Promise.all([
      processCSS('h1{columns:3 12em}', 'h1{columns:12em 3}')(),
      processCSS('h1{columns:3 12EM}', 'h1{columns:12EM 3}')(),
    ]);
  });

  test('should classify decimal and exponent-form dimensions', () => {
    return Promise.all([
      processCSS('h1{columns:3 .5em}', 'h1{columns:.5em 3}')(),
      processCSS('h1{columns:3 1e2em}', 'h1{columns:1e2em 3}')(),
    ]);
  });

  test(
    'should preserve an escaped unknown dimension unit',
    passthroughCSS('h1{columns:12\\66 oo 2}')
  );

  test(
    'should preserve quoted strings and URLs as unclassifiable terms',
    passthroughCSS('h1{columns:"a b" url(foo)}')
  );

  test(
    'should preserve malformed but tokenizable values',
    passthroughCSS('h1{columns:12em [foo / bar]}')
  );

  test(
    'should not lose a valid fallback longhand after an invalid shorthand with zero count',
    passthroughCSS('a{columns:1px 0;column-width:2px}')
  );

  test(
    'should not lose a valid fallback longhand after an invalid shorthand with unvalidated unit',
    passthroughCSS('a{columns:1foo 2;column-width:2px}')
  );

  test(
    'should pass through zero column count in shorthand',
    passthroughCSS('a{columns:0}')
  );

  test(
    'should pass through zero count with valid width in shorthand',
    passthroughCSS('a{columns:1px 0}')
  );

  test(
    'should pass through negative column count in shorthand',
    passthroughCSS('a{columns:1px -2}')
  );

  test(
    'should pass through unvalidated dimension unit in shorthand',
    passthroughCSS('a{columns:1foo 2}')
  );

  test(
    'should pass through negative column width in shorthand',
    passthroughCSS('a{columns:-1px 2}')
  );

  test(
    'should not merge longhands when column-count is zero',
    passthroughCSS('a{column-width:2px;column-count:0}')
  );

  test(
    'should not merge longhands when column-count is negative',
    passthroughCSS('a{column-width:2px;column-count:-1}')
  );

  test(
    'should not merge longhands when column-count is a float',
    passthroughCSS('a{column-width:2px;column-count:2.5}')
  );

  test(
    'should not merge longhands when column-width is an unvalidated dimension unit',
    passthroughCSS('a{column-width:1foo;column-count:2}')
  );

  test(
    'should not merge longhands when column-width is negative',
    passthroughCSS('a{column-width:-2px;column-count:2}')
  );

  test(
    'should not merge longhands when column-width is zero',
    passthroughCSS('a{column-width:0px;column-count:2}')
  );

  test(
    'should pass through zero column width in shorthand',
    passthroughCSS('a{columns:0px 2}')
  );

  test(
    'should merge column-count with explicit positive sign',
    processCSS('a{column-width:10em;column-count:+2}', 'a{columns:10em +2}')
  );

  test(
    'should recognize explicit positive sign for count in shorthand',
    passthroughCSS('a{columns:10em +2}')
  );

  test(
    'should not discard a valid longhand when followed by an invalid shorthand with zero count',
    passthroughCSS('a{column-width:2px;columns:1px 0}')
  );

  test(
    'should not discard a valid longhand when followed by an invalid shorthand with unvalidated unit',
    passthroughCSS('a{column-width:2px;columns:1foo 2}')
  );
});

describe('CSS-wide keywords and invalid declarations beside mergeable values', () => {
  test(
    'merges identical CSS-wide keyword pair into single shorthand keyword',
    processCSS(
      'h1{column-width:inherit;column-count:inherit}',
      'h1{columns:inherit}'
    )
  );

  test(
    'merges identical initial keyword pair into single shorthand initial',
    processCSS(
      'h1{column-width:initial;column-count:initial}',
      'h1{columns:initial}'
    )
  );

  test(
    'does not merge when only one component is a CSS-wide keyword',
    passthroughCSS('h1{column-width:inherit;column-count:3}')
  );

  test(
    'does not merge when components use different CSS-wide keywords',
    passthroughCSS('h1{column-width:inherit;column-count:unset}')
  );

  test(
    'aborts entire family merge when an invalid negative width declaration is present',
    passthroughCSS('h1{column-width:12em;column-count:3;column-width:-5px}')
  );

  test(
    'aborts merge when count is zero or non-integer',
    passthroughCSS('h1{column-width:12em;column-count:0}')
  );

  test(
    'aborts merge when count is a float',
    passthroughCSS('h1{column-width:12em;column-count:2.5}')
  );
});

describe('columns order-independent validation and merging', () => {
  test(
    'merges longhands when preceding columns shorthand starts with count then calc()',
    processCSS(
      'a{columns:2 calc(100px);column-width:100px;column-count:2}',
      'a{columns:100px 2}'
    )
  );

  test(
    'merges longhands when preceding columns shorthand starts with calc() then count',
    processCSS(
      'a{columns:calc(100px) 2;column-width:100px;column-count:2}',
      'a{columns:100px 2}'
    )
  );

  test(
    'rejects columns shorthand with two counts and leaves rule untouched',
    passthroughCSS('a{columns:2 3;column-width:100px;column-count:2}')
  );

  test(
    'rejects columns shorthand with two widths and leaves rule untouched',
    passthroughCSS('a{columns:100px 200px;column-width:100px;column-count:2}')
  );

  test(
    'preserves standalone valid count and calc() columns in either order',
    passthroughCSS('a{columns:2 calc(100px)}')
  );

  test(
    'merges longhands overriding earlier var()-containing columns shorthand',
    processCSS(
      'a{columns:2 calc(var(--x));column-width:100px;column-count:2}',
      'a{columns:100px 2}'
    )
  );

  test(
    'preserves earlier static columns shorthand as fallback for later var() columns',
    passthroughCSS('a{columns:100px 2;columns:2 calc(var(--x))}')
  );

  test(
    'preserves merged static columns as fallback for later var() columns',
    processCSS(
      'a{column-width:100px;column-count:2;columns:2 calc(var(--x))}',
      'a{columns:100px 2;columns:2 calc(var(--x))}'
    )
  );

  test(
    'rejects two-term columns with a CSS-wide keyword and keeps preceding column-width',
    passthroughCSS('a{column-width:100px;columns:2 initial}')
  );

  test(
    'rejects two-term columns with an inherited keyword and keeps preceding column-width',
    passthroughCSS('a{column-width:100px;columns:100px inherit}')
  );

  test(
    'rejects two-term columns starting with a CSS-wide keyword',
    passthroughCSS('a{columns:initial 2}')
  );

  test(
    'preserves a single-term columns CSS-wide keyword',
    passthroughCSS('a{columns:initial}')
  );
});
