import { describe, test } from 'node:test';
import {
  processCSSFactory,
  withTargets,
} from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeLonghand');

const { passthroughCSS, processCSS } = processCSSFactory([
  plugin(withTargets('chrome 120, firefox 120, safari 17')),
]);

describe('grid placement longhand merging', () => {
  describe('grid-row and grid-column', () => {
    test(
      'omits an auto end after a line number, which the end defaults to',
      processCSS('a{grid-row-start:1;grid-row-end:auto}', 'a{grid-row:1}')
    );

    test(
      'omits an end that repeats a custom identifier start, which the end defaults to',
      processCSS('a{grid-row-start:a;grid-row-end:a}', 'a{grid-row:a}')
    );

    test(
      'keeps an auto end after a custom identifier start, because omitting it would make the end repeat the identifier',
      processCSS(
        'a{grid-row-start:a;grid-row-end:auto}',
        'a{grid-row:a / auto}'
      )
    );

    test(
      'keeps two distinct lines separated by a slash',
      processCSS('a{grid-row-start:1;grid-row-end:2}', 'a{grid-row:1 / 2}')
    );

    test(
      'omits an auto end after a span, because only a bare custom identifier defaults the end',
      processCSS(
        'a{grid-row-start:span 2;grid-row-end:auto}',
        'a{grid-row:span 2}'
      )
    );

    test(
      'keeps an auto start with an identifier end, because an omitted end would not be the identifier',
      processCSS(
        'a{grid-row-start:auto;grid-row-end:a}',
        'a{grid-row:auto / a}'
      )
    );

    test(
      'keeps identifiers case-sensitive, so A and a are different lines',
      processCSS('a{grid-row-start:A;grid-row-end:a}', 'a{grid-row:A / a}')
    );

    test(
      'merges an integer with an identifier in either order',
      processCSS('a{grid-row-start:1 a;grid-row-end:auto}', 'a{grid-row:1 a}')
    );

    test(
      'merges a negative line number, which counts from the end',
      processCSS('a{grid-row-start:-1;grid-row-end:auto}', 'a{grid-row:-1}')
    );

    test(
      'keeps a zero line number because the grammar forbids zero',
      passthroughCSS('a{grid-row-start:0;grid-row-end:auto}')
    );

    test(
      'keeps a non-integer line number because the grammar forbids it',
      passthroughCSS('a{grid-row-start:1.5;grid-row-end:auto}')
    );

    test(
      'keeps a bare span because it needs a count or an identifier',
      passthroughCSS('a{grid-row-start:span;grid-row-end:auto}')
    );

    test(
      'keeps a span with a zero count because the count must be positive',
      passthroughCSS('a{grid-row-start:span 0;grid-row-end:auto}')
    );

    test(
      'merges grid-column the same way as grid-row',
      processCSS(
        'a{grid-column-start:auto;grid-column-end:auto}',
        'a{grid-column:auto}'
      )
    );

    test(
      'merges equal CSS-wide keywords',
      processCSS(
        'a{grid-row-start:inherit;grid-row-end:inherit}',
        'a{grid-row:inherit}'
      )
    );

    test(
      'keeps mixed CSS-wide keywords because a shorthand takes one for all',
      passthroughCSS('a{grid-row-start:inherit;grid-row-end:1}')
    );

    test(
      'keeps a var() line because its type is unknown',
      passthroughCSS('a{grid-row-start:var(--r);grid-row-end:auto}')
    );

    test(
      'merges the normal and the important longhands separately',
      processCSS(
        'a{grid-row-start:1!important;grid-row-end:auto!important;grid-row-start:2;grid-row-end:3}',
        'a{grid-row:1!important;grid-row:2 / 3}'
      )
    );

    test(
      'keeps the longhands when a grid-area shorthand that resets them is present',
      passthroughCSS('a{grid-row-start:1;grid-row-end:2;grid-area:a}')
    );
  });

  describe('grid-area', () => {
    test(
      'merges the important grid-row pair beside a grid-area that took the normal longhands, and gives grid-area precedence over grid-row for them',
      processCSS(
        'a{grid-row-start:1;grid-row-end:2;grid-column-start:3;grid-column-end:4;grid-row-start:5!important;grid-row-end:6!important}',
        'a{grid-area:1 / 3 / 2 / 4;grid-row:5 / 6!important}'
      )
    );

    test(
      'merges four equal custom identifiers into one name',
      processCSS(
        'a{grid-row-start:a;grid-column-start:a;grid-row-end:a;grid-column-end:a}',
        'a{grid-area:a}'
      )
    );

    test(
      'omits the trailing slots that the grammar fills from the earlier ones',
      processCSS(
        'a{grid-row-start:a;grid-column-start:b;grid-row-end:a;grid-column-end:b}',
        'a{grid-area:a / b}'
      )
    );

    test(
      'keeps a column end that differs from the column start it would copy',
      processCSS(
        'a{grid-row-start:a;grid-column-start:b;grid-row-end:a;grid-column-end:auto}',
        'a{grid-area:a / b / a / auto}'
      )
    );

    test(
      'keeps an auto column start, which the row identifier would otherwise fill in',
      processCSS(
        'a{grid-row-start:a;grid-column-start:auto;grid-row-end:a;grid-column-end:auto}',
        'a{grid-area:a / auto}'
      )
    );

    test(
      'keeps four line numbers because none of the slots is filled from another',
      processCSS(
        'a{grid-row-start:1;grid-column-start:2;grid-row-end:3;grid-column-end:4}',
        'a{grid-area:1 / 2 / 3 / 4}'
      )
    );

    test(
      'keeps only the row start when the others are initial and a line number',
      processCSS(
        'a{grid-row-start:1;grid-column-start:auto;grid-row-end:auto;grid-column-end:auto}',
        'a{grid-area:1}'
      )
    );

    test(
      'keeps the row longhands and the grid-area longhands when a grid-row shorthand is present, but still merges the column pair that grid-row does not reset',
      processCSS(
        'a{grid-row-start:1;grid-column-start:2;grid-row-end:3;grid-column-end:4;grid-row:1 / 3}',
        'a{grid-row-start:1;grid-row-end:3;grid-column:2 / 4;grid-row:1 / 3}'
      )
    );
  });
});
