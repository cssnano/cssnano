import { describe, test } from 'node:test';

import { processCSSFactory } from '../../../util/testHelpers.js';

import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

describe('Non-special comments removal', () => {
  test(
    'should remove comment trailing an !important declaration without space',
    processCSS(
      'h1{font-weight:700!important/*test comment*/}',
      'h1{font-weight:700!important}'
    )
  );

  test(
    'should remove comment preceding a property in a rule',
    processCSS('h1{/*test comment*/font-weight:700}', 'h1{font-weight:700}')
  );

  test(
    'should remove top-level standalone comments before and after a rule',
    processCSS(
      '/*test comment*/h1{font-weight:700}/*test comment*/',
      'h1{font-weight:700}'
    )
  );

  test(
    'should remove comment between property colon and declaration value',
    processCSS('h1{font-weight:/*test comment*/700}', 'h1{font-weight:700}')
  );

  test(
    'should replace comment between space-separated values with a single space',
    processCSS('h1{margin:10px/*test*/20px}', 'h1{margin:10px 20px}')
  );

  test(
    'should collapse multiple comments and surrounding whitespace into single spaces',
    processCSS(
      'h1{margin:10px /*test*/ 20px /*test*/ 30px /*test*/ 40px}',
      'h1{margin:10px 20px 30px 40px}'
    )
  );

  test(
    'should remove comments surrounding the universal selector *',
    processCSS('/*comment*/*/*comment*/{margin:10px}', '*{margin:10px}')
  );

  test(
    'should remove comments inside a comma-separated selector list',
    processCSS(
      'h1,/*comment*/ h2, h3/*comment*/{margin:20px}',
      'h1, h2, h3{margin:20px}'
    )
  );

  test(
    'should remove comment between at-rule name and identifier parameter',
    processCSS(
      '@keyframes /*test*/ fade{0%{opacity:0}to{opacity:1}}',
      '@keyframes fade{0%{opacity:0}to{opacity:1}}'
    )
  );

  test(
    'should remove comment within at-rule media query prelude',
    processCSS(
      '@media only screen /*desktop*/ and (min-width:900px){body{margin:0 auto}}',
      '@media only screen and (min-width:900px){body{margin:0 auto}}'
    )
  );

  test(
    'should remove comment between at-rule prelude and block brace',
    processCSS(
      '@media only screen and (min-width:900px)/*test*/{body{margin:0 auto}}',
      '@media only screen and (min-width:900px){body{margin:0 auto}}'
    )
  );

  test(
    'should remove comment between declaration property and colon in raws.between',
    processCSS('h1{margin/*test*/:20px}', 'h1{margin:20px}')
  );

  test(
    'should remove comment inside !important annotation in raws.important',
    processCSS(
      'h1{margin:20px! /* test */ important}',
      'h1{margin:20px!important}'
    )
  );

  test(
    'should remove non-special comments that have exclamation marks',
    processCSS(
      '/* This makes a heading black! Wow! */h1{color:#000}',
      'h1{color:#000}'
    )
  );

  test(
    'should remove block comments',
    processCSS(
      '/*\n\n# Pagination\n\n...\n\n*/.pagination{color:#000}',
      '.pagination{color:#000}'
    )
  );
});
