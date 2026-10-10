import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

// Targets that all support the shorthands, so only the grammar decides.
const modern = processCSSFactory([
  plugin({ overrideBrowserslist: 'chrome 120, firefox 120, safari 17' }),
]);
const { passthroughCSS, processCSS } = modern;

/** @param {string} browsers */
function targeting(browsers) {
  return processCSSFactory([plugin({ overrideBrowserslist: browsers })]);
}

describe('gap longhand merging', () => {
  test(
    'merges equal row-gap and column-gap into a single-value gap',
    processCSS('a{row-gap:10px;column-gap:10px}', 'a{gap:10px}')
  );

  test(
    'merges in either source order',
    processCSS('a{column-gap:10px;row-gap:10px}', 'a{gap:10px}')
  );

  test(
    'puts the row-gap first even when column-gap is written first',
    processCSS('a{column-gap:20px;row-gap:10px}', 'a{gap:10px 20px}')
  );

  test(
    'merges the normal keyword',
    processCSS('a{row-gap:normal;column-gap:normal}', 'a{gap:normal}')
  );

  test(
    'merges a percentage and a unitless zero',
    processCSS('a{row-gap:5%;column-gap:0}', 'a{gap:5% 0}')
  );

  test(
    'merges mixed-case property names',
    processCSS('a{ROW-GAP:1em;Column-Gap:1em}', 'a{gap:1em}')
  );

  test(
    'collapses axes that differ only in ASCII case to the first spelling',
    processCSS('a{row-gap:1PX;column-gap:1px}', 'a{gap:1PX}')
  );

  test(
    'merges equal viewport units that every target parses',
    processCSS('a{row-gap:1vi;column-gap:1vi}', 'a{gap:1vi}')
  );

  test(
    'merges equal Q units in either spelling',
    processCSS('a{row-gap:1Q;column-gap:1q}', 'a{gap:1Q}')
  );

  test(
    'merges equal viewport units even where a target lacks them, since both longhands drop together',
    targeting('chrome 100').processCSS(
      'a{row-gap:1vi;column-gap:1vi}',
      'a{gap:1vi}'
    )
  );

  test(
    'keeps a viewport unit beside a unit every target parses, since only one longhand drops',
    targeting('chrome 100').passthroughCSS('a{row-gap:1vi;column-gap:1px}')
  );

  test(
    'merges equal CSS-wide keywords',
    processCSS('a{row-gap:inherit;column-gap:inherit}', 'a{gap:inherit}')
  );

  test(
    'keeps different CSS-wide keywords because a shorthand takes only one',
    passthroughCSS('a{row-gap:inherit;column-gap:initial}')
  );

  test(
    'keeps a CSS-wide keyword beside a length because a shorthand cannot mix them',
    passthroughCSS('a{row-gap:inherit;column-gap:1px}')
  );

  test(
    'merges the important lane on its own',
    processCSS(
      'a{row-gap:1px!important;column-gap:1px!important}',
      'a{gap:1px!important}'
    )
  );

  test(
    'keeps longhands of different importance apart because a shorthand carries one importance for both axes',
    passthroughCSS('a{row-gap:1px!important;column-gap:1px}')
  );

  test(
    'keeps a lone longhand because a shorthand would also set the other axis',
    passthroughCSS('a{row-gap:1px}')
  );

  test(
    'keeps a negative length because the browser ignores it and a shorthand would drop the other axis',
    passthroughCSS('a{row-gap:-1px;column-gap:1px}')
  );

  test(
    'keeps a unitless non-zero length because the browser ignores it',
    passthroughCSS('a{row-gap:10;column-gap:10px}')
  );

  test(
    'keeps a calc() length because the value is not compared',
    passthroughCSS('a{row-gap:calc(1px + 2px);column-gap:1px}')
  );

  test(
    'keeps a var() value because the browser resolves it later',
    passthroughCSS('a{row-gap:var(--g);column-gap:var(--g)}')
  );

  test(
    'merges after dropping an earlier duplicate that every target overrides',
    processCSS('a{row-gap:1px;row-gap:1rem;column-gap:1px}', 'a{gap:1rem 1px}')
  );

  test(
    'keeps longhands beside an existing gap shorthand, though they could merge, because a shorthand sharing their cascade leaves the family as written',
    passthroughCSS('a{gap:1px;row-gap:2px;column-gap:2px}')
  );

  test(
    'keeps a two-value row-gap because the browser ignores it and a gap shorthand would make it valid',
    passthroughCSS('a{row-gap:1px 2px;column-gap:1px}')
  );

  test(
    'keeps a gap value divided by a top-level slash because it is not one component',
    passthroughCSS('a{row-gap:1px/2px;column-gap:1px}')
  );

  test(
    'keeps longhands when a legacy grid-gap alias shares their cascade',
    passthroughCSS('a{row-gap:1px;grid-row-gap:2px;column-gap:1px}')
  );

  test(
    'keeps longhands when grid-column-gap alias shares their cascade',
    passthroughCSS('a{row-gap:1px;column-gap:1px;grid-column-gap:2px}')
  );

  test(
    'keeps longhands across an all reset',
    passthroughCSS('a{row-gap:1px;all:unset;column-gap:1px}')
  );

  test(
    'keeps longhands across a nested rule because later declarations would win over it',
    passthroughCSS('a{row-gap:1px;&:hover{row-gap:2px}column-gap:1px}')
  );

  test(
    'merges inside an at-rule block',
    processCSS(
      '@media print{a{row-gap:1px;column-gap:1px}}',
      '@media print{a{gap:1px}}'
    )
  );

  test(
    'keeps longhands when a target predates the gap shorthand',
    targeting('chrome 60').passthroughCSS('a{row-gap:1px;column-gap:1px}')
  );

  test(
    'keeps longhands when a target is not covered by compatibility data',
    targeting('chrome 120, op_mini all').passthroughCSS(
      'a{row-gap:1px;column-gap:1px}'
    )
  );
});

describe('overscroll-behavior longhand merging', () => {
  test(
    'merges equal axes into a single keyword',
    processCSS(
      'a{overscroll-behavior-x:contain;overscroll-behavior-y:contain}',
      'a{overscroll-behavior:contain}'
    )
  );

  test(
    'merges different axes into x then y',
    processCSS(
      'a{overscroll-behavior-y:none;overscroll-behavior-x:auto}',
      'a{overscroll-behavior:auto none}'
    )
  );

  test(
    'keeps an unknown keyword because the browser ignores it',
    passthroughCSS('a{overscroll-behavior-x:contain;overscroll-behavior-y:foo}')
  );

  test(
    'keeps the legacy chain keyword because the shorthand predates it only in some targets',
    passthroughCSS('a{overscroll-behavior-x:chain;overscroll-behavior-y:chain}')
  );

  test(
    'keeps longhands when a target predates the shorthand',
    targeting('chrome 50').passthroughCSS(
      'a{overscroll-behavior-x:none;overscroll-behavior-y:none}'
    )
  );
});

describe('flex-flow longhand merging', () => {
  test(
    'merges direction and wrap in grammar order',
    processCSS(
      'a{flex-wrap:wrap;flex-direction:column}',
      'a{flex-flow:column wrap}'
    )
  );

  test(
    'omits the initial row direction',
    processCSS('a{flex-direction:row;flex-wrap:wrap}', 'a{flex-flow:wrap}')
  );

  test(
    'omits the initial nowrap value',
    processCSS(
      'a{flex-direction:column-reverse;flex-wrap:nowrap}',
      'a{flex-flow:column-reverse}'
    )
  );

  test(
    'writes row when both values are initial because the shorthand needs a component',
    processCSS('a{flex-direction:row;flex-wrap:nowrap}', 'a{flex-flow:row}')
  );

  test(
    'merges equal CSS-wide keywords',
    processCSS(
      'a{flex-direction:inherit;flex-wrap:inherit}',
      'a{flex-flow:inherit}'
    )
  );

  test(
    'keeps an unknown direction keyword',
    passthroughCSS('a{flex-direction:sideways;flex-wrap:wrap}')
  );

  test(
    'keeps a wrap keyword in the direction slot',
    passthroughCSS('a{flex-direction:wrap;flex-wrap:wrap}')
  );

  test(
    'keeps longhands when a vendor-prefixed alias shares their cascade',
    passthroughCSS(
      'a{-webkit-flex-direction:column;flex-direction:column;flex-wrap:wrap}'
    )
  );

  test(
    'keeps longhands when a target predates the shorthand',
    targeting('chrome 20').passthroughCSS(
      'a{flex-direction:column;flex-wrap:wrap}'
    )
  );
});

describe('overflow longhand merging', () => {
  test(
    'merges equal axes into a single keyword',
    processCSS('a{overflow-x:hidden;overflow-y:hidden}', 'a{overflow:hidden}')
  );

  test(
    'merges equal clip axes',
    processCSS('a{overflow-x:clip;overflow-y:clip}', 'a{overflow:clip}')
  );

  test(
    'merges for any target because the one-value form is CSS 2',
    targeting('ie 9').processCSS(
      'a{overflow-x:auto;overflow-y:auto}',
      'a{overflow:auto}'
    )
  );

  test(
    'keeps different axes because the two-value form is newer than the longhands',
    passthroughCSS('a{overflow-x:hidden;overflow-y:auto}')
  );

  test(
    'keeps an unknown keyword',
    passthroughCSS('a{overflow-x:foo;overflow-y:foo}')
  );

  test(
    'keeps the longhands beside an existing overflow shorthand',
    passthroughCSS('a{overflow:auto;overflow-x:hidden;overflow-y:hidden}')
  );

  test(
    'keeps a repeated longhand because the first may be a fallback',
    passthroughCSS('a{overflow-x:hidden;overflow-x:clip;overflow-y:clip}')
  );
});

describe('pair longhand spellings', () => {
  test(
    'keeps longhands written with a CSS escape because they may name an alias',
    passthroughCSS('a{row-gap:1px;\\63olumn-gap:1px}')
  );

  test(
    'keeps longhands when a vendor-prefixed overflow alias is present',
    passthroughCSS(
      'a{-ms-overflow-x:hidden;overflow-x:hidden;overflow-y:hidden}'
    )
  );

  test(
    'keeps longhands beside a hack because it may target another browser',
    passthroughCSS('a{row-gap:1px;column-gap:1px;_column-gap:2px}')
  );
});

describe('logical longhands sharing the cascade', () => {
  test(
    'keeps overflow longhands around overflow-inline because it maps to an axis',
    passthroughCSS(
      'a{overflow-x:hidden;overflow-inline:scroll;overflow-y:hidden}'
    )
  );

  test(
    'keeps overflow longhands around overflow-block because it maps to an axis',
    passthroughCSS(
      'a{overflow-x:hidden;overflow-block:scroll;overflow-y:hidden}'
    )
  );

  test(
    'keeps overscroll-behavior longhands around overscroll-behavior-inline',
    passthroughCSS(
      'a{overscroll-behavior-x:none;overscroll-behavior-inline:auto;overscroll-behavior-y:none}'
    )
  );

  test(
    'keeps overscroll-behavior longhands around overscroll-behavior-block',
    passthroughCSS(
      'a{overscroll-behavior-x:none;overscroll-behavior-block:auto;overscroll-behavior-y:none}'
    )
  );
});
