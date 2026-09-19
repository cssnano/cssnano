import { test, suite } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

suite('columns order-independent validation and merging', () => {
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

suite('container at-rule declaration merging', () => {
  test(
    'merges box longhands inside @page at-rules',
    processCSS(
      '@page{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px}',
      '@page{margin:10px}'
    )
  );

  test(
    'merges box overrides onto preceding shorthand inside @page at-rules',
    processCSS(
      '@page{margin:0;margin-top:10px;margin-bottom:10px}',
      '@page{margin:10px 0}'
    )
  );

  test(
    'minifies box shorthand identities inside @page at-rules',
    processCSS('@page{margin:10px 10px 10px 10px}', '@page{margin:10px}')
  );

  test(
    'merges box longhands inside @position-try at-rules',
    processCSS(
      '@position-try --custom{margin-top:5px;margin-right:5px;margin-bottom:5px;margin-left:5px}',
      '@position-try --custom{margin:5px}'
    )
  );

  test(
    'merges column longhands inside @page at-rules',
    processCSS(
      '@page{column-width:100px;column-count:2}',
      '@page{columns:100px 2}'
    )
  );

  test(
    'merges column longhands inside @position-try at-rules',
    processCSS(
      '@position-try --custom{column-width:100px;column-count:2}',
      '@position-try --custom{columns:100px 2}'
    )
  );

  test(
    'merges border-radius longhands inside @page at-rules',
    processCSS(
      '@page{border-top-left-radius:5px;border-top-right-radius:5px;border-bottom-right-radius:5px;border-bottom-left-radius:5px}',
      '@page{border-radius:5px}'
    )
  );

  test(
    'merges border-radius longhands inside @position-try at-rules',
    processCSS(
      '@position-try --custom{border-top-left-radius:5px;border-top-right-radius:5px;border-bottom-right-radius:5px;border-bottom-left-radius:5px}',
      '@position-try --custom{border-radius:5px}'
    )
  );

  test(
    'reduces physical border longhands inside @page at-rules to component shorthands',
    processCSS(
      '@page{border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red}',
      '@page{border-color:red;border-style:solid;border-width:1px}'
    )
  );

  test(
    'merges box longhands inside nested at-rules under CSS Nesting',
    processCSS(
      'a{@media (min-width:600px){margin-top:10px;margin-bottom:10px;margin-left:10px;margin-right:10px}}',
      'a{@media (min-width:600px){margin:10px}}'
    )
  );

  test(
    'merges box longhands inside nested @supports at-rules under CSS Nesting',
    processCSS(
      'a{@supports (display:grid){margin-top:10px;margin-bottom:10px;margin-left:10px;margin-right:10px}}',
      'a{@supports (display:grid){margin:10px}}'
    )
  );

  test(
    'merges column longhands inside nested @container at-rules under CSS Nesting',
    processCSS(
      'a{@container card (min-width:400px){column-width:100px;column-count:2}}',
      'a{@container card (min-width:400px){columns:100px 2}}'
    )
  );
});

suite('stale raws.value clearing during in-place mutation', () => {
  test('clears raws.value when minifying a box singleton in-place', async () => {
    const root = postcss.parse('a{margin:10px 10px 10px 10px}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first?.nodes?.[0]
    );
    decl.raws.value = {
      raw: '10px 10px 10px 10px /*keep*/',
      value: '10px 10px 10px 10px',
    };

    await postcss([plugin()]).process(root, { from: undefined });

    assert.strictEqual(decl.value, '10px');
    assert.strictEqual(decl.raws.value, undefined);
  });

  test('clears raws.value when normalizing a columns singleton in-place', async () => {
    const root = postcss.parse('a{columns:100px auto}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first?.nodes?.[0]
    );
    decl.raws.value = {
      raw: '100px auto /*raw*/',
      value: '100px auto',
    };

    await postcss([plugin()]).process(root, { from: undefined });

    assert.strictEqual(decl.value, '100px');
    assert.strictEqual(decl.raws.value, undefined);
  });

  test('clears raws.value when minifying a border singleton in-place', async () => {
    const root = postcss.parse('a{border-width:10px 10px 10px 10px}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first?.nodes?.[0]
    );
    decl.raws.value = {
      raw: '10px 10px 10px 10px /*raw*/',
      value: '10px 10px 10px 10px',
    };

    await postcss([plugin()]).process(root, { from: undefined });

    assert.strictEqual(decl.value, '10px');
    assert.strictEqual(decl.raws.value, undefined);
  });
});

suite('border-spacing two-axis shorthand identities', () => {
  test(
    'collapses identical horizontal and vertical border-spacing values',
    processCSS('table{border-spacing:10px 10px}', 'table{border-spacing:10px}')
  );

  test(
    'preserves unequal horizontal and vertical border-spacing values',
    passthroughCSS('table{border-spacing:10px 20px}')
  );

  test(
    'collapses identical border-spacing with zero dimensions',
    processCSS('table{border-spacing:0 0}', 'table{border-spacing:0}')
  );

  test(
    'rejects negative border-spacing values and leaves them untouched',
    passthroughCSS('table{border-spacing:-5px -5px}')
  );

  test(
    'rejects percentage border-spacing values and leaves them untouched',
    passthroughCSS('table{border-spacing:10% 10%}')
  );

  test(
    'folds border-spacing inside container at-rules',
    processCSS('@page{border-spacing:10px 10px}', '@page{border-spacing:10px}')
  );

  test(
    'collapses identical calc() border-spacing values',
    processCSS(
      'table{border-spacing:calc(10px) calc(10px)}',
      'table{border-spacing:calc(10px)}'
    )
  );

  test(
    'does not collapse var() substitution border-spacing values',
    passthroughCSS('table{border-spacing:var(--a) var(--a)}')
  );

  test(
    'does not collapse zero length and unitless zero border-spacing values',
    passthroughCSS('table{border-spacing:0px 0}')
  );
});

suite('border parsing validity and parseWsc contracts', () => {
  test(
    'passes through invalid border-top declaration with multiple style keywords (none solid)',
    passthroughCSS('a{border-top:none solid}')
  );

  test(
    'passes through invalid border-top with multiple styles alongside other longhands',
    passthroughCSS('a{border-top:none solid;border-top-color:red}')
  );

  test(
    'passes through invalid border shorthand with duplicate style keywords (none solid)',
    passthroughCSS('a{border:none solid}')
  );
});
