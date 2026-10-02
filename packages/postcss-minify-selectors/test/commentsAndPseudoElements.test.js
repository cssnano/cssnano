import assert from 'node:assert/strict';
import { test, suite } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import { isInvalidSelector } from '../src/lib/isInvalidSelector.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

suite('comments and pseudo-elements', () => {
  test(
    'should treat whitespace around ordinary comments as a descendant combinator',
    processCSS(
      'h1 /**/ p,.a /* comment */ .b{color:blue}',
      '.a .b,h1 p{color:blue}'
    )
  );

  test(
    'should not turn a comment between compounds into a descendant combinator',
    passthroughCSS('div/**/span{color:blue}')
  );

  test(
    'should leave an ordinary comment inside a compound selector',
    passthroughCSS('.a/**/.b{color:blue}')
  );

  test(
    'should keep an important comment inside a compound selector',
    passthroughCSS('.a/*!k*/.b{color:blue}')
  );

  test(
    'should remove ordinary comments around explicit combinators',
    processCSS('h1/**/>/**/p{color:blue}', 'h1>p{color:blue}')
  );

  test(
    'should preserve comment before relative combinator in :has()',
    processCSS(
      ':has( /*! preserved */ > .x){color:blue}',
      ':has(/*! preserved */>.x){color:blue}'
    )
  );

  test(
    'should preserve comments around relative combinators in :has()',
    processCSS(
      ':has( /*! preserved */ > /*! preserved */ .x){color:blue}',
      ':has(/*! preserved */>/*! preserved */.x){color:blue}'
    )
  );

  test(
    'should preserve comment before plus relative combinator in :has()',
    processCSS(
      ':has( /*! preserved */ + .x){color:blue}',
      ':has(/*! preserved */+.x){color:blue}'
    )
  );

  test(
    'should not be responsible for normalising comments',
    processCSS(
      'h1 /*!test comment*/, h2{color:blue}',
      'h1 /*!test comment*/,h2{color:blue}'
    )
  );

  test(
    'should not be responsible for normalising coments (2)',
    processCSS(
      '/*!test   comment*/h1, h2{color:blue}',
      '/*!test   comment*/h1,h2{color:blue}'
    )
  );

  test(
    'should preserve rules with empty selector lists containing only comments across commas',
    passthroughCSS('/* c1 */ , /* c2 */{color:blue}')
  );

  test(
    'should preserve rules with empty selector lists containing only important comments across commas',
    passthroughCSS('/*! c1 */ , /*! c2 */{color:blue}')
  );

  test(
    'should transform ::before to :before',
    processCSS('h1::before{color:blue}', 'h1:before{color:blue}')
  );

  test(
    'should transform ::before to :before (2)',
    processCSS('h1::BEFORE{color:blue}', 'h1:BEFORE{color:blue}')
  );

  test(
    'should transform ::after to :after',
    processCSS('h1::after{color:blue}', 'h1:after{color:blue}')
  );

  test(
    'should transform ::first-letter to :first-letter',
    processCSS('h1::first-letter{color:blue}', 'h1:first-letter{color:blue}')
  );

  test(
    'should transform ::first-line to :first-line',
    processCSS('h1::first-line{color:blue}', 'h1:first-line{color:blue}')
  );
});

suite('string handling', () => {
  test(
    'should not change strings',
    passthroughCSS(
      ':not([attr="  h1       a + b /* not a comment */ end of :not  from 100% "]){color:blue}'
    )
  );

  test(
    'should not change strings (2)',
    passthroughCSS(
      ':not([attr="  h1       a + b /* not a comment */ not end of `:not`:  )  from 100% "]){color:blue}'
    )
  );

  test(
    'should not change strings (3)',
    passthroughCSS('[a=":not( *.b, h1, h1 )"]{color:blue}')
  );

  test(
    'should not change strings (4)',
    passthroughCSS(
      '[a="escaped quotes \\" h1, h1, h1 \\" h1, h1, h1"]{color:blue}'
    )
  );

  test(
    'should not change strings (5)',
    passthroughCSS(
      "[a='escaped quotes \\' h1, h1, h1 \\' h1, h1, h1']{color:blue}"
    )
  );

  test('should not change strings (6)', passthroughCSS("[a='½']{color:blue}"));
});

suite('edge cases', () => {
  test(
    'should transform qualified attribute selector inside not',
    processCSS(
      ':not( *[href="foo"] ){color:blue}',
      ':not([href=foo]){color:blue}'
    )
  );

  test(
    'should not mangle attribute selectors',
    processCSS(
      '[class*=" icon-"]+.label, [class^="icon-"]+.label{color:blue}',
      '[class*=" icon-"]+.label,[class^=icon-]+.label{color:blue}'
    )
  );

  test(
    'should not mangle attribute selectors (2)',
    processCSS(
      '.control-group-inline>input[type="radio"]{color:blue}',
      '.control-group-inline>input[type=radio]{color:blue}'
    )
  );

  test(
    'should not mangle quoted attribute selectors that contain =',
    passthroughCSS('.parent>.child[data-attr~="key1=1"]{color:blue}')
  );

  test(
    'should not mangle .from/#from etc',
    passthroughCSS('#from,.from{color:blue}')
  );

  test(
    'should not mangle pseudo classes',
    passthroughCSS(
      '.btn-group>.btn:last-child:not(:first-child),.btn-group>.dropdown-toggle:not(:first-child){color:blue}'
    )
  );

  test(
    'should not mangle pseudo classes (2)',
    passthroughCSS(
      '.btn-group>.btn-group:first-child:not(:last-child)>.btn:last-child,.btn-group>.btn-group:first-child:not(:last-child)>.dropdown-toggle{color:blue}'
    )
  );

  test(
    'should not throw on polymer mixins',
    passthroughCSS('--my-toolbar-theme:{color:blue};')
  );

  test(
    'should not throw on polymer mixins (2)',
    passthroughCSS('paper-button{--paper-button-ink-color:#009688}')
  );

  test(
    'should not unquote a single hyphen as an attribute value',
    passthroughCSS('[title="-"]{color:blue}')
  );

  test(
    'should handle case insensitive attribute selectors with extra spaces',
    processCSS('[title="foo"   i    ]{color:blue}', '[title=foo i]{color:blue}')
  );

  test(
    'should not remove quotes around an empty attribute selector',
    passthroughCSS('[title=""]{color:blue}')
  );

  // A comment is not a descendant combinator, so it must not invalidate the
  // compound it sits in.
  test(
    'should keep a compound with a comment between class selectors inside :is()',
    passthroughCSS(':is(.a/**/.b,.c){color:blue}')
  );

  test(
    'should keep a compound with a comment before a class selector inside :where()',
    passthroughCSS(':where(a/**/.b,.c){color:blue}')
  );

  test(
    'should keep a compound with a comment before a pseudo-class inside :is()',
    passthroughCSS(':is(.a/**/:hover,.c){color:blue}')
  );

  test(
    'should keep a /*! preserved comment inside a compound in :is()',
    passthroughCSS(':is(.a/*!k*/.b,.c){color:blue}')
  );

  test('should not report a compound with a comment between class selectors as invalid', () => {
    assert.equal(isInvalidSelector('.a/**/.b'), false);
  });

  test(
    'should still drop an invalid type selector after a comment-separated compound inside :is()',
    processCSS(':is(a/**/b,.c){color:blue}', ':is(.c){color:blue}')
  );
});
