import { describe, test } from 'node:test';

import { processCSSFactory } from '../../../util/testHelpers.js';

import plugin from '../src/index.js';

const { passthroughCSS } = processCSSFactory(plugin);

describe('Special comments preservation', () => {
  test(
    'should preserve special comment trailing an !important declaration',
    passthroughCSS('h1{font-weight:700!important/*!test comment*/}')
  );

  test(
    'should preserve special comment preceding a property in a rule',
    passthroughCSS('h1{/*!test comment*/font-weight:700}')
  );

  test(
    'should preserve top-level special comments before and after a rule',
    passthroughCSS('/*!test comment*/h1{font-weight:700}/*!test comment*/')
  );

  test(
    'should preserve special comment between property colon and declaration value',
    passthroughCSS('h1{font-weight:/*!test comment*/700}')
  );

  test(
    'should preserve special comment between space-separated values without inserting extra space',
    passthroughCSS('h1{margin:10px/*!test*/20px}')
  );

  test(
    'should preserve whitespace and multiple special comments in multi-value declarations',
    passthroughCSS(
      'h1{margin:10px /*!test*/ 20px /*!test*/ 30px /*!test*/ 40px}'
    )
  );

  test(
    'should preserve special comments surrounding the universal selector *',
    passthroughCSS('/*!comment*/*/*!comment*/{margin:10px}')
  );

  test(
    'should preserve special comments inside a comma-separated selector list',
    passthroughCSS('h1,/*!comment*/h2,h3/*!comment*/{margin:20px}')
  );

  test(
    'should preserve special comment between at-rule name and identifier parameter',
    passthroughCSS('@keyframes /*!test*/ fade{0%{opacity:0}to{opacity:1}}')
  );

  test(
    'should preserve special comment within at-rule media query prelude',
    passthroughCSS(
      '@media only screen /*!desktop*/ and (min-width:900px){body{margin:0 auto}}'
    )
  );

  test(
    'should preserve special comment between at-rule prelude and block brace',
    passthroughCSS(
      '@media only screen and (min-width:900px)/*!test*/{body{margin:0 auto}}'
    )
  );

  test(
    'should preserve special comment between declaration property and colon in raws.between',
    passthroughCSS('h1{margin/*!test*/:20px}')
  );

  test(
    'should preserve special comment inside !important annotation in raws.important',
    passthroughCSS('h1{margin:20px! /*! test */ important}')
  );

  test(
    'should preserve special comment preceding a selector list comma',
    passthroughCSS('h1 /*!test comment*/, h2{color:#00f}')
  );

  test(
    'should preserve special comment within descendant combinator selectors',
    passthroughCSS('h1 /*!test comment*/ span, h2{color:#00f}')
  );
});
