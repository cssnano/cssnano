import { describe, test } from 'node:test';

import { processCSSFactory } from '../../../util/testHelpers.js';

import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('Whitespace normalization inside function arguments with comments', () => {
  test(
    'should preserve operator spacing around addition in calc() when preceded by a comment',
    processCSS('a{width:calc(10px /*c*/ + 20px)}', 'a{width:calc(10px + 20px)}')
  );

  test(
    'should preserve operator spacing around addition in calc() when followed by a comment',
    processCSS('a{width:calc(10px + /*c*/ 20px)}', 'a{width:calc(10px + 20px)}')
  );

  test(
    'should preserve operator spacing around addition in calc() when surrounded by comments',
    processCSS(
      'a{width:calc(10px /*c1*/ + /*c2*/ 20px)}',
      'a{width:calc(10px + 20px)}'
    )
  );

  test(
    'should preserve operator spacing around addition in calc() when comments touch the operator without whitespace',
    processCSS(
      'a{width:calc(10px/*c1*/+/*c2*/20px)}',
      'a{width:calc(10px + 20px)}'
    )
  );

  test(
    'should preserve operator spacing around subtraction in calc() when preceded by a comment',
    processCSS('a{width:calc(100% /*c*/ - 20px)}', 'a{width:calc(100% - 20px)}')
  );

  test(
    'should preserve operator spacing around subtraction in calc() when comments touch the operator without whitespace',
    processCSS(
      'a{width:calc(100%/*c1*/-/*c2*/20px)}',
      'a{width:calc(100% - 20px)}'
    )
  );

  test(
    'should preserve spacing around multiplication and division in calc() with comments',
    processCSS(
      'a{width:calc(10px /*c1*/ * 2 /*c2*/ / 4)}',
      'a{width:calc(10px * 2 / 4)}'
    )
  );

  test(
    'should preserve operator spacing in nested calc() expressions with comments',
    processCSS(
      'a{width:calc(calc(10px /*c*/ + 20px) * 2)}',
      'a{width:calc(calc(10px + 20px) * 2)}'
    )
  );

  test(
    'should preserve operator spacing in min() with nested calc() and comments',
    processCSS(
      'a{width:min(10px, calc(100% /*c*/ - 20px))}',
      'a{width:min(10px, calc(100% - 20px))}'
    )
  );

  test(
    'should preserve operator spacing in clamp() with nested expressions and comments',
    processCSS(
      'a{width:clamp(10px, /*c*/ 20px /*c*/ + 5px, 50px)}',
      'a{width:clamp(10px, 20px + 5px, 50px)}'
    )
  );

  test(
    'should preserve operator spacing in calc() when combined with var() and comments',
    processCSS(
      'a{width:calc(var(--base) /*c*/ + 10px)}',
      'a{width:calc(var(--base) + 10px)}'
    )
  );

  test(
    'should keep preserved special comments inside calc() byte-exact',
    passthroughCSS('a{width:calc(10px /*!keep*/ + 20px)}')
  );

  test(
    'should restore operator spacing when a comment follows a plus touching it on the left',
    processCSS('a{width:calc(10px+ /*c*/20px)}', 'a{width:calc(10px + 20px)}')
  );

  test(
    'should restore operator spacing when a comment touches a plus on the right',
    processCSS('a{width:calc(10px +/*c*/20px)}', 'a{width:calc(10px + 20px)}')
  );

  test(
    'should restore operator spacing when a comment touches a plus on the left',
    processCSS('a{width:calc(10px/*c*/+ 20px)}', 'a{width:calc(10px + 20px)}')
  );

  test(
    'should restore operator spacing when a comment touches a minus on the right',
    processCSS('a{width:calc(10px -/*c*/20px)}', 'a{width:calc(10px - 20px)}')
  );

  test(
    'should restore operator spacing when a comment touches a minus on the left',
    processCSS('a{width:calc(10px/*c*/- 20px)}', 'a{width:calc(10px - 20px)}')
  );

  test(
    'should restore operator spacing in nested calc() inside min() when a comment follows the operator',
    processCSS(
      'a{width:min(10px, calc(100%+ /*c*/20px))}',
      'a{width:min(10px, calc(100% + 20px))}'
    )
  );

  // Matching must consult the decoded spelling, not the raw token text.
  test(
    'should restore operator spacing when the math function name is spelled with escapes',
    processCSS(
      'a{width:c\\61 lc(10px+ /*c*/20px)}',
      'a{width:c\\61 lc(10px + 20px)}'
    )
  );

  // A bare parenthesis group inherits the math context without owning a
  // depth increment.
  test(
    'should restore operator spacing after a parenthesized group inside calc()',
    processCSS(
      'a{width:calc((1px + 2px)/*!k*/+ 3px)}',
      'a{width:calc((1px + 2px)/*!k*/ + 3px)}'
    )
  );

  test(
    'should keep operator spacing after a group when a comment before the operator is removed',
    processCSS(
      'a{width:calc((1px + 2px)/*c*/+ 3px)}',
      'a{width:calc((1px + 2px) + 3px)}'
    )
  );

  test(
    'should restore operator spacing after a nested parenthesized group',
    processCSS(
      'a{width:calc(calc((1px + 2px))/*!k*/+ 3px)}',
      'a{width:calc(calc((1px + 2px))/*!k*/ + 3px)}'
    )
  );

  // Newer <calc-sum> argument functions shared as cssnano-utils'
  // calcSumFunctions table.
  test(
    'should restore operator spacing in calc-size() when a comment touches the operator',
    processCSS(
      'a{width:calc-size(auto/*c*/+ 10px)}',
      'a{width:calc-size(auto + 10px)}'
    )
  );

  test(
    'should restore operator spacing in progress() when a comment touches the operator',
    processCSS(
      'a{line-height:progress(1/*c*/+ 0.5, 0, 1)}',
      'a{line-height:progress(1 + 0.5, 0, 1)}'
    )
  );

  test(
    'should restore operator spacing in random() when a comment touches the operator',
    processCSS(
      'a{width:random(--x, 1/*c*/+ 2, 10)}',
      'a{width:random(--x, 1 + 2, 10)}'
    )
  );

  test(
    'should restore operator spacing in calc-mix() when a comment touches the operator',
    processCSS(
      'a{width:calc-mix(1px/*c*/+ 2px, 3px + 4px)}',
      'a{width:calc-mix(1px + 2px, 3px + 4px)}'
    )
  );
});
