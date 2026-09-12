import { test, suite } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

suite('invalid value handling', () => {
  /* User agents ignore invalid values, so merging declaration might change the rendered result.
   */
  test(
    'should not let a margin declaration with two many values override the one before it',
    passthroughCSS('a{margin:1px;margin:1px 2em 0 1px 2em}')
  );

  test(
    'should not let an over-long padding override the one before it',
    passthroughCSS('a{padding:1px;padding:1px 2em 0 1px 2em}')
  );

  test(
    'should not let a multi-value longhand override the one before it',
    passthroughCSS('a{margin-left:1px;margin-left:1px 2em}')
  );

  test(
    'should not read a colour as a length',
    passthroughCSS('a{margin-left:1px;margin-left:red}')
  );

  test(
    'should not read a border style as a length',
    passthroughCSS('a{padding:5px;padding:dotted none}')
  );

  /* Functions the plugin cannot evaluate (calc, env, var) are assumed valid. */

  test(
    'should not read a url as a length',
    passthroughCSS(
      'a{padding-top:1px;padding-right:1px;padding-bottom:1px;padding-left:1px;padding-top:url(x)}'
    )
  );

  test(
    'should not merge a longhand when the resulting shorthand might have a different browser support',
    passthroughCSS('a{margin-left:1px;margin-left:rgb(0 0 0)}')
  );

  /* `revert-rule` is defined in the CSS spec but no browser implements it,
   * so the declaration counts as invalid and earlier declarations remain in effect. */
  test(
    'should not let a CSS-wide keyword no browser ships override the one before it',
    passthroughCSS('a{padding-top:1px;padding:revert-rule}')
  );

  test(
    'should pass through a length missing its unit',
    passthroughCSS('a{margin-top:1px;margin-top:5}')
  );

  test(
    'should pass through a negative padding',
    passthroughCSS('a{padding-top:1px;padding-top:-5px}')
  );

  test(
    'should pass through auto in a padding',
    passthroughCSS('a{padding-top:1px;padding-top:auto}')
  );

  test(
    'should not merge longhands around an invalid shorthand',
    passthroughCSS(
      'a{margin:red;margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}'
    )
  );

  test(
    'should not explode a shorthand the user agent ignores',
    passthroughCSS('a{margin:1px 2em 0 1px 2em;margin-top:5px}')
  );

  test(
    'should not discard a longhand an ignored shorthand appears to override',
    passthroughCSS('a{margin-left:1px;margin:red}')
  );

  test(
    'should pass through an invalid value when property name is uppercase',
    passthroughCSS('a{MARGIN-LEFT:1px;MARGIN-LEFT:red}')
  );

  test(
    'should not merge longhands around an unvalidated dimension unit',
    passthroughCSS(
      'a{margin-top:10px;margin-right:10foo;margin-bottom:10px;margin-left:10px}'
    )
  );

  test(
    'should not merge padding around an unvalidated dimension unit',
    passthroughCSS(
      'a{padding-top:10px;padding-right:10bar;padding-bottom:10px;padding-left:10px}'
    )
  );

  test(
    'should not merge important! longhands around a invalid shorthand',
    passthroughCSS(
      'a{padding:auto;padding-top:1px!important;padding-right:1px!important;padding-bottom:1px!important;padding-left:1px!important}'
    )
  );
});

/* The other direction: the check has to merge valid values. */
suite('valid values merge', () => {
  test(
    'should merge auto in a margin',
    processCSS(
      'a{margin-top:0;margin-right:auto;margin-bottom:0;margin-left:auto}',
      'a{margin:0 auto}'
    )
  );

  test(
    'should merge a negative margin',
    processCSS(
      'a{margin-top:-5px;margin-right:-5px;margin-bottom:-5px;margin-left:-5px}',
      'a{margin:-5px}'
    )
  );

  test(
    'should merge zero without a unit',
    processCSS(
      'a{padding-top:0;padding-right:0;padding-bottom:0;padding-left:0}',
      'a{padding:0}'
    )
  );

  test(
    'should merge a percentage',
    processCSS(
      'a{padding-top:10%;padding-right:10%;padding-bottom:10%;padding-left:10%}',
      'a{padding:10%}'
    )
  );

  test(
    'should merge a value it cannot resolve',
    processCSS(
      'a{margin-top:calc(1px + 2%);margin-right:calc(1px + 2%);margin-bottom:calc(1px + 2%);margin-left:calc(1px + 2%)}',
      'a{margin:calc(1px + 2%)}'
    )
  );

  test(
    'should merge a length in scientific notation',
    processCSS(
      'a{padding-top:1e2px;padding-right:1e2px;padding-bottom:1e2px;padding-left:1e2px}',
      'a{padding:1e2px}'
    )
  );

  test(
    'should merge the family a invalid declaration does not belong to',
    processCSS(
      'a{margin:red;padding-top:1px;padding-right:1px;padding-bottom:1px;padding-left:1px}',
      'a{margin:red;padding:1px}'
    )
  );

  test(
    'should merge a rule whose only invalid value is a stylehack',
    processCSS(
      'h1{margin-top:1px\\9;margin:4px 0 0 0}',
      'h1{margin-top:1px\\9;margin:4px 0 0}'
    )
  );
});
