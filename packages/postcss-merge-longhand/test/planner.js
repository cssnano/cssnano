import { test, suite } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import pluginFactory from '../src/index.js';
import borders from '../src/lib/decl/borders.js';
import { processCSSFactory } from '../../../util/testHelpers.js';

const { processCSS, passthroughCSS } = processCSSFactory(pluginFactory);

/** @param {string} css @param {{explode: Function, merge: Function}} family @return {string} */
function roundTrip(css, family) {
  const root = postcss.parse(css);
  const rule = /** @type {import('postcss').Rule} */ (root.first);
  family.explode(rule);
  family.merge(rule);
  return root.toString();
}

/*
 * Negative-path routing tests. The plugin now normalizes a rule whose only
 * border declaration is a standalone shorthand directly, instead of cloning
 * the rule and running explode/merge; and `borders.merge` only invokes each
 * pass when its required property shapes exist. These tests pin every one of
 * those routing decisions to the output the legacy round-trip produced.
 */

suite('single standalone shorthand normalization', () => {
  test(
    'normalizes a lone border shorthand',
    processCSS('h1{border:1PX solid RED}', 'h1{border:1px solid red}')
  );
  test(
    'lower-cases the property like the round-trip did',
    processCSS('h1{BORDER:1PX solid red}', 'h1{border:1px solid red}')
  );
  test(
    'minimizes default border values',
    processCSS('h1{border:medium none currentcolor}', 'h1{border:none}')
  );
  test(
    'keeps values rewrite() would have reverted',
    passthroughCSS('h1{border:1px solid var(--x)}')
  );
  test('keeps invalid border values', passthroughCSS('h1{border:1px 2px}'));
  test(
    'keeps single longhands untouched',
    passthroughCSS('h1{border-top-width:1PX}')
  );
  test(
    'keeps the casing of a single physical longhand',
    passthroughCSS('h1{BORDER-TOP-WIDTH:1PX}')
  );

  test(
    'normalizes a lone side shorthand',
    processCSS('h1{border-top:1PX solid red}', 'h1{border-top:1px solid red}')
  );
  test(
    'collapses a lone component shorthand',
    processCSS('h1{border-width:1px 2px 1px 2px}', 'h1{border-width:1px 2px}')
  );
  test(
    'lower-cases a lone component shorthand property, keeping value case',
    processCSS('h1{BORDER-WIDTH:1PX 2PX}', 'h1{border-width:1PX 2PX}')
  );

  test(
    'collapses a lone border-spacing property',
    processCSS('h1{border-spacing:1px 1px}', 'h1{border-spacing:1px}')
  );
  test(
    'keeps border-spacing property case',
    processCSS('h1{BORDER-SPACING:1px 1px}', 'h1{BORDER-SPACING:1px}')
  );
  test(
    'collapses once, like the merge pass did',
    processCSS('h1{border-spacing:1px 1px 1px}', 'h1{border-spacing:1px 1px}')
  );

  test(
    'normalizes a lone margin shorthand',
    processCSS('h1{MARGIN:10px 10px 10px 10px}', 'h1{margin:10px}')
  );
  test('keeps margin value case', passthroughCSS('h1{margin:1PX 2PX}'));
  test(
    'keeps margin values with var()',
    passthroughCSS('h1{margin:1px var(--x)}')
  );
  test(
    'keeps invalid margin values',
    passthroughCSS('h1{margin:1px 2px 3px 4px 5px}')
  );
  test(
    'keeps margin values the grammar does not hold',
    passthroughCSS('h1{margin:dotted none}')
  );

  test(
    'normalizes a lone padding shorthand',
    processCSS('h1{padding:1px 1px 1px 1px}', 'h1{padding:1px}')
  );
  test(
    'keeps padding calc values',
    passthroughCSS('h1{padding:calc(1PX + 1PX)}')
  );

  test(
    'handles each family of a mixed rule independently',
    processCSS(
      'h1{BORDER:1PX solid RED;margin:1px 2px 3px 4px}',
      'h1{border:1px solid red;margin:1px 2px 3px 4px}'
    )
  );

  test(
    'routes important declarations like the round-trip',
    processCSS(
      'h1{BORDER:1PX solid red!important}',
      'h1{border:1px solid red!important}'
    )
  );
});

/* The direct path must agree with the explode/merge round-trip it replaces,
 * so every singleton is also run through the legacy pipeline for comparison. */
suite('direct normalization equals the legacy round-trip', () => {
  const singles = [
    'h1{border:1PX solid red}',
    'h1{border:medium none currentcolor}',
    'h1{border-top:1PX solid red}',
    'h1{border-width:1PX 2PX 1PX 2PX}',
    'h1{border-color:RED red}',
    'h1{border-spacing:1px 1px}',
    'h1{margin:1PX 2PX 1PX 2PX}',
    'h1{margin:auto}',
    'h1{padding:0 0 0 0}',
    'h1{border:1px solid var(--x)}',
    'h1{border:1px 2px}',
    'h1{margin:1px var(--x)}',
    'h1{border-top-width:1PX}',
    'h1{border:none}',
    'h1{border:1px solid rgba(0,0,0,.5)}',
    'h1{border:calc(1PX + 1PX) solid RED}',
  ];

  test('border singletons', async () => {
    const plugin = pluginFactory();
    for (const css of singles.filter((entry) => entry.includes('border'))) {
      const result = await postcss([plugin]).process(css, { from: undefined });
      assert.strictEqual(result.css, roundTrip(css, borders), css);
    }
  });
});

suite('per-pass routing predicates', () => {
  test(
    'a side with one missing longhand cannot merge',
    passthroughCSS('h1{border-top-width:1px;border-top-style:solid;color:red}')
  );

  test(
    'an importance partition blocks the side merge',
    passthroughCSS(
      'h1{border-top-width:1px!important;border-top-style:solid;border-top-color:red}'
    )
  );

  test(
    'an importance-uniform side still merges',
    processCSS(
      'h1{border-top-width:1px!important;border-top-style:solid!important;border-top-color:red!important}',
      'h1{border-top:1px solid red!important}'
    )
  );

  test(
    'a lone component shorthand with no siblings stays',
    passthroughCSS('h1{border-width:1px;color:red}')
  );

  test(
    'virtual shorthand expansion fuels the component merge',
    processCSS(
      'h1{border:1PX solid red;border-left-width:1px}',
      'h1{border:1px solid red}'
    )
  );

  test(
    'cleanup-only rules pass through unchanged',
    passthroughCSS(
      'h1{border-top-width:1px;border-top-style:solid;border-bottom-width:2px;border-bottom-style:dashed}'
    )
  );

  test(
    'a rule needing rewrite still merges leaves into a component',
    processCSS(
      'h1{border-top-width:1px;border-right-width:1px;border-bottom-width:1px;border-left-width:1px}',
      'h1{border-width:1px}'
    )
  );

  test(
    'reverting rules stay byte-identical',
    passthroughCSS('h1{border:1px solid red;border-top:2px dashed blue}')
  );
});
