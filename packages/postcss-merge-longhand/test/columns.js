import assert from 'node:assert/strict';
import { test, suite } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import { reduceColumns } from '../src/lib/decl/columns.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should merge column values',
  processCSS('h1{column-width:12em;column-count:auto}', 'h1{columns:12em}')
);

test(
  'should merge column values (uppercase)',
  processCSS('h1{COLUMN-WIDTH:12em;COLUMN-COUNT:auto}', 'h1{columns:12em}')
);

test(
  'should minify column values',
  processCSS('h1{column-width:auto;column-count:auto}', 'h1{columns:auto}')
);

test(
  'should minify column values (uppercase)',
  processCSS('h1{COLUMN-WIDTH:auto;COLUMN-COUNT:auto}', 'h1{columns:auto}')
);

test(
  'should minify column values 1 (uppercase)',
  processCSS('h1{column-width:AUTO;column-count:AUTO}', 'h1{columns:AUTO}')
);

test(
  'should merge column-width with columns',
  processCSS('h1{columns:12em auto;column-width:11em}', 'h1{columns:11em}')
);

test(
  'should merge column-width with columns (uppercase)',
  processCSS('h1{COLUMNS:12em auto;COLUMN-WIDTH:11em}', 'h1{columns:11em}')
);

test(
  'should merge column-width with columns (uppercase) #1',
  processCSS('h1{columns:12em AUTO;column-width:11em}', 'h1{columns:11em}')
);

test(
  'should merge column width and column count',
  processCSS('h1{column-width:6em;column-count:3}', 'h1{columns:6em 3}')
);

test(
  'should merge column width and column count (uppercase)',
  processCSS('h1{COLUMN-WIDTH:6em;COLUMN-COUNT:3}', 'h1{columns:6em 3}')
);

test(
  'should pass through column width',
  passthroughCSS('h1{column-width:6em}')
);

test(
  'should pass through column width (uppercase)',
  passthroughCSS('h1{COLUMN-WIDTH:6em}')
);

test('should pass through column count', passthroughCSS('h1{column-count:3}'));

test(
  'should pass through column count (uppercase)',
  passthroughCSS('h1{COLUMN-COUNT:3}')
);

test(
  'should reduce inherit',
  processCSS(
    'h1{column-width:inherit;column-count:inherit}',
    'h1{columns:inherit}'
  )
);

test(
  'should reduce inherit (uppercase)',
  processCSS(
    'h1{COLUMN-WIDTH:inherit;COLUMN-COUNT:inherit}',
    'h1{columns:inherit}'
  )
);

test(
  'should reduce inherit 1 (uppercase)',
  processCSS(
    'h1{COLUMN-WIDTH:INHERIT;COLUMN-COUNT:INHERIT}',
    'h1{columns:inherit}'
  )
);

test('should pass through auto', passthroughCSS('h1{columns:auto}'));

test(
  'should pass through auto (uppercase)',
  processCSS('h1{COLUMNS:auto}', 'h1{columns:auto}')
);

test(
  'should pass through auto 1 (uppercase)',
  processCSS('h1{columns:AUTO}', 'h1{columns:auto}')
);

test(
  'should not merge declarations with hacks',
  passthroughCSS('h1{column-width:12em;_column-count:auto}')
);

test(
  'should not merge declarations with hacks (uppercase)',
  passthroughCSS('h1{COLUMN-WIDTH:12em;_COLUMN-COUNT:auto}')
);

test(
  'should preserve nesting level',
  processCSS(
    'section{h1{column-width:12em;column-count:auto}}',
    'section{h1{columns:12em}}'
  )
);

test(
  'should preserve nesting level (uppercase)',
  processCSS(
    'section{h1{COLUMN-WIDTH:12em;COLUMN-COUNT:auto}}',
    'section{h1{columns:12em}}'
  )
);

test(
  'should save fallbacks for column-width if after goes custom css props',
  processCSS(
    'h1{column-width:12em;column-width:var(--variable)}',
    'h1{column-width:12em;column-width:var(--variable)}'
  )
);

test(
  'should save fallbacks for column-width if after goes custom css props (uppercase)',
  processCSS(
    'h1{COLUMN-WIDTH:12em;COLUMN-WIDTH:var(--variable)}',
    'h1{COLUMN-WIDTH:12em;COLUMN-WIDTH:var(--variable)}'
  )
);

test(
  'should save fallbacks for column-width if after goes custom css props 1 (uppercase)',
  processCSS(
    'h1{column-width:12em;column-width:VAR(--variable)}',
    'h1{column-width:12em;column-width:VAR(--variable)}'
  )
);

test(
  'should not explode columns with custom properties',
  passthroughCSS('h1{columns:var(--variable)}')
);

test(
  'should preserve case of custom properties',
  passthroughCSS('h1{columns:var(--fooBar)}')
);

test(
  'should preserve case of custom properties (uppercase)',
  passthroughCSS('h1{COLUMN:var(--fooBar)}')
);

test(
  'should preserve case of custom properties 1 (uppercase)',
  passthroughCSS('h1{column:VAR(--fooBar)}')
);

test(
  'should merge column values duplicate columns',
  processCSS(
    'h1{column-width:12em;column-count:auto;columns:12em}',
    'h1{columns:12em}'
  )
);

test(
  'should merge column values duplicate columns (uppercase)',
  processCSS(
    'h1{COLUMN-WIDTH:12em;COLUMN-COUNT:auto;COLUMNS:12em}',
    'h1{columns:12em}'
  )
);

test(
  'should handle empty columns',
  processCSS('h1{columns:;}', 'h1{columns:;}')
);

suite('support-dependent (env()) merge blocking', () => {
  test(
    'should save fallbacks for column-width that use env()',
    passthroughCSS(
      'h1{column-width:1px;column-width:env(safe-area-inset-bottom);column-count:2}'
    )
  );

  test(
    'should merge column values that only repeat a plain value',
    processCSS(
      'h1{column-width:2px;column-width:3px;column-count:2}',
      'h1{columns:3px 2}'
    )
  );
});

suite('count-only shorthand', () => {
  test(
    'should keep the column-width reset a count only shorthand performs',
    passthroughCSS('h1{columns:2}')
  );

  test(
    'should drop the auto a count only shorthand spells out',
    processCSS('h1{columns:2 auto}', 'h1{columns:2}')
  );

  test(
    'should drop the auto a count only shorthand spells out first',
    processCSS('h1{columns:auto 2}', 'h1{columns:2}')
  );
});

suite('column-height shorthand syntax', () => {
  test(
    'should pass through a shorthand that sets a column height',
    passthroughCSS('h1{columns:30em / 10em}')
  );

  test(
    'should pass through a shorthand that sets a column height without spaces',
    passthroughCSS('h1{columns:30em/10em}')
  );

  test(
    'should pass through a three component shorthand',
    passthroughCSS('h1{columns:30em 2 / 10em}')
  );

  test(
    'should not treat a slash inside calc as column-height syntax',
    passthroughCSS('h1{columns:calc(30em/2)}')
  );

  test(
    'should distinguish a top-level slash after a nested function',
    passthroughCSS('h1{columns:calc(30em/2) / 10em}')
  );

  test(
    'should preserve comments around a top-level slash',
    passthroughCSS('h1{columns:30em/**//10em}')
  );
});

suite('column-height merge blocking', () => {
  test(
    'should not merge longhands past a column height in the same rule',
    passthroughCSS('h1{column-height:5em;column-width:20em;column-count:2}')
  );

  test(
    'should not merge longhands when another rule sets a column height',
    passthroughCSS('h1{column-height:5em}h2{column-width:20em;column-count:2}')
  );

  test(
    'should not explode a shorthand when another rule sets a column height',
    passthroughCSS('h1{column-height:5em}h2{columns:2}')
  );
});

suite('invalid-value handling', () => {
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

suite('column-height merge blocking', () => {
  test(
    'should not merge longhands when another rule sets a column height with a slash',
    passthroughCSS('h1{columns:30em/10em}h2{column-width:20em;column-count:2}')
  );

  test(
    'should merge longhands when another rule contains a numerical division',
    processCSS(
      'h1{columns:calc(100%/3)}h2{column-width:20em;column-count:2}',
      'h1{columns:calc(100%/3)}h2{columns:20em 2}'
    )
  );

  test(
    'should merge longhands beside a shorthand containing a numerical division sign',
    processCSS(
      'h1{columns:calc(100%/3);column-width:20em;column-count:2}',
      'h1{columns:20em 2}'
    )
  );

  test(
    'should ignore slashes in nested square and curly blocks',
    processCSS(
      'h1{columns:calc(100%/3);column-width:20em;column-count:2}',
      'h1{columns:20em 2}'
    )
  );

  test(
    'should detect a top-level slash without whitespace',
    passthroughCSS('h1{columns:30em/**//10em}')
  );
});

suite('direct reduceColumns contract', () => {
  test('merges longhands into shorthand when called directly on a rule', () => {
    const root = postcss.parse('h1{column-width:12em;column-count:3}');
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    reduceColumns(rule);
    assert.strictEqual(rule.toString(), 'h1{columns:12em 3}');
  });

  test('preserves fallbacks when called directly on a rule', () => {
    const root = postcss.parse(
      'h1{column-width:12em;column-width:var(--w);column-count:3}'
    );
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    reduceColumns(rule);
    assert.strictEqual(
      rule.toString(),
      'h1{column-width:12em;column-width:var(--w);column-count:3}'
    );
  });

  test('normalizes a singleton columns shorthand directly on a rule', () => {
    const root = postcss.parse('h1{columns:3 auto}');
    const rule = /** @type {import('postcss').Rule} */ (root.first);
    reduceColumns(rule);
    assert.strictEqual(rule.toString(), 'h1{columns:3}');
  });
});

suite('unrelated border rollback interaction', () => {
  test(
    'reduces column pair when an unrelated border rewrite reverts on the same rule',
    processCSS(
      'h1{border:1px solid red;border-top:2px dashed blue;border-left-width:3px;column-width:12em;column-count:3}',
      'h1{border:1px solid red;border-top:2px dashed blue;border-left-width:3px;columns:12em 3}'
    )
  );
});

suite('ordered shorthand/longhand interleavings', () => {
  test(
    'supersedes earlier longhands when followed by a shorthand',
    processCSS(
      'h1{column-width:10em;column-count:2;columns:20em 3}',
      'h1{columns:20em 3}'
    )
  );

  test(
    'overrides one component of an earlier shorthand with a later longhand',
    processCSS('h1{columns:10em 2;column-width:20em}', 'h1{columns:20em 2}')
  );

  test(
    'overrides count of an earlier shorthand with a later longhand',
    processCSS('h1{columns:10em 2;column-count:4}', 'h1{columns:10em 4}')
  );

  test(
    'handles interleaved longhand, shorthand, and overriding longhand',
    processCSS(
      'h1{column-count:3;columns:10em 2;column-width:15em}',
      'h1{columns:15em 2}'
    )
  );

  test(
    'overrides both components of an earlier shorthand with subsequent longhands',
    processCSS(
      'h1{columns:10em 2;column-width:20em;column-count:4}',
      'h1{columns:20em 4}'
    )
  );
});

suite('important and non-important lanes', () => {
  test(
    'merges normal and important lanes independently in the same rule',
    processCSS(
      'h1{column-width:10em;column-count:2;column-width:20em !important;column-count:4 !important}',
      'h1{columns:10em 2;columns:20em 4 !important}'
    )
  );

  test(
    'leaves incomplete normal lane unmerged while merging complete important lane',
    processCSS(
      'h1{column-width:10em;column-width:20em !important;column-count:4 !important}',
      'h1{column-width:10em;columns:20em 4 !important}'
    )
  );

  test(
    'leaves incomplete important lane unmerged while merging complete normal lane',
    processCSS(
      'h1{column-width:10em;column-count:2;column-count:4 !important}',
      'h1{columns:10em 2;column-count:4 !important}'
    )
  );

  test(
    'does not cross-merge properties across different importance lanes',
    passthroughCSS('h1{column-width:10em;column-count:2 !important}')
  );
});

suite('fallback-sensitive var(), env(), and calc() cases', () => {
  test(
    'preserves earlier fallback and refuses merge when subsequent longhand uses var()',
    passthroughCSS('h1{column-width:12em;column-width:var(--w);column-count:3}')
  );

  test(
    'preserves earlier fallback when subsequent longhand uses calc()',
    processCSS(
      'h1{column-width:12em;column-width:calc(10em + 2em);column-count:3}',
      'h1{column-width:12em;columns:calc(10em + 2em) 3}'
    )
  );

  test(
    'refuses merge when one longhand introduces unsupported env() without partner support',
    passthroughCSS(
      'h1{column-width:12em;column-width:env(col-w);column-count:3}'
    )
  );

  test(
    'merges when both components share identical env() support requirements',
    processCSS(
      'h1{column-width:env(col-w);column-count:env(col-c)}',
      'h1{columns:env(col-w) env(col-c)}'
    )
  );

  test(
    'preserves unmergeable pair using var() after earlier mergeable pair',
    processCSS(
      'h1{column-width:10em;column-count:2;column-width:var(--w);column-count:var(--c)}',
      'h1{columns:10em 2;column-width:var(--w);column-count:var(--c)}'
    )
  );
});

suite(
  'CSS-wide keywords and invalid declarations beside mergeable values',
  () => {
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
  }
);

suite('equal-size versus larger replacement decisions', () => {
  test(
    'replaces with equal-size normalized shorthand when omitted initial value is dropped',
    processCSS('h1{column-width:auto;column-count:2}', 'h1{columns:2}')
  );

  test(
    'normalizes redundant initial value in shorthand',
    processCSS('h1{columns:12em auto}', 'h1{columns:12em}')
  );

  test(
    'normalizes both initial values in shorthand to single auto',
    processCSS('h1{columns:auto auto}', 'h1{columns:auto}')
  );
});
