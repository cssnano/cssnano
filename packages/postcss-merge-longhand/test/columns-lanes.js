import assert from 'node:assert/strict';
import { test, suite } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import { reduceColumns } from '../src/lib/decl/columns.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

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
