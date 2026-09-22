import { describe, test } from 'node:test';
import postcssScss from 'postcss-scss';
import vars from 'postcss-simple-vars';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('Selectors', () => {
  test(
    'should remove comment between class and attribute selector while preserving string inside attribute',
    processCSS(
      '.a /*comment*/ [attr="/* not a comment */"]{color:#000}',
      '.a [attr="/* not a comment */"]{color:#000}'
    )
  );

  test(
    'should remove comment preceding selector comma and trim whitespace',
    processCSS(
      '.a [attr="/* not a comment */"] /*comment*/, .b {color:#000}',
      '.a [attr="/* not a comment */"], .b {color:#000}'
    )
  );

  // A comment separates tokens like whitespace; removal must not fuse its
  // neighbors.
  test(
    'should keep adjacent type selectors separated when the comment between them is removed',
    processCSS('div/*c*/span{color:red}', 'div span{color:red}')
  );

  test(
    'should keep the attribute modifier separated from the value when the comment between them is removed',
    // Selector engines resolve `[attr=val/*c*/i]` as case-insensitive on
    // `val`.
    processCSS('[attr=val/*c*/i]{color:red}', '[attr=val i]{color:red}')
  );

  test(
    'should preserve An+B operands when a comment between them is removed',
    // `2n` and `+1` re-tokenize exactly as the joined `2n+1`.
    processCSS(
      ':nth-child(2n/*c*/+1){color:red}',
      ':nth-child(2n+1){color:red}'
    )
  );

  test(
    'should remove all whitespace before a comma after multiple comments',
    processCSS('.a /*first*/ /*second*/ , .b{color:#000}', '.a, .b{color:#000}')
  );

  test(
    'should remove comment inside :not() preceding attribute selector',
    processCSS(
      ':not(/*comment*/ [attr="/* not a comment */"]){color:#000}',
      ':not( [attr="/* not a comment */"]){color:#000}'
    )
  );

  test(
    'should not insert a separator where tokens fuse identically when a comment is removed',
    processCSS('.x/*comment*/.y{color:#000}', '.x.y{color:#000}')
  );

  test(
    'should remove comment inside pseudo-class argument before class selector',
    processCSS(':not(/*comment*/.foo){color:#000}', ':not(.foo){color:#000}')
  );

  test(
    'should preserve escaped comment delimiters in selectors',
    processCSS(
      '.foo\\/\\*bar\\*\\/\\\\\\n\\"baz/*remove*/.qux{color:red}',
      '.foo\\/\\*bar\\*\\/\\\\\\n\\"baz.qux{color:red}'
    )
  );

  test(
    'should preserve comment-like text in quoted and unquoted attributes',
    processCSS(
      '[data-a="/*quoted*/"] [data-b=foo\\/\\*bar\\*\\/]/*remove*/[data-c=foo]{color:red}',
      '[data-a="/*quoted*/"] [data-b=foo\\/\\*bar\\*\\/][data-c=foo]{color:red}'
    )
  );

  test(
    'should remove comments in nested selector functions and blocks',
    processCSS(
      ':is(.a/*one*/, :not([x="/*two*/"]/*three*/)) > ns|*/*four*/{color:red}',
      ':is(.a, :not([x="/*two*/"])) > ns|*{color:red}'
    )
  );

  test(
    'should preserve comments in functional pseudo raw arguments',
    processCSS(
      ':raw(/*!keep*/ "/*keep*/" [x=foo\\/\\*keep\\*\\/])/*!keep*/{color:red}',
      ':raw(/*!keep*/ "/*keep*/" [x=foo\\/\\*keep\\*\\/])/*!keep*/{color:red}'
    )
  );

  test(
    'should preserve selected comments in selectors with exact spacing',
    processCSS(
      '.a /*keep*/ > /*remove*/ .b, .c/*keep*/+.d{color:red}',
      '.a /*keep*/ > .b, .c/*keep*/+.d{color:red}',
      { remove: (comment) => comment.trim() === 'remove' }
    )
  );

  test(
    'should preserve commas inside quoted attribute values',
    processCSS(
      '[data="x , y"]/*remove*/.a{color:red}',
      '[data="x , y"].a{color:red}'
    )
  );

  test(
    'should remove comments consistently across repeated selectors in a selector list',
    processCSS('.a/*remove*/, .a/*remove*/{color:red}', '.a, .a{color:red}')
  );

  const setRawSelectorWithoutComments = {
    postcssPlugin: 'set-raw-selector-without-comments',
    Rule(rule) {
      rule.raws.selector = { raw: '.a   .b', value: '.a .b' };
    },
  };

  test(
    'should pass through raw selector metadata lacking comments',
    processCSSFactory([setRawSelectorWithoutComments, plugin]).processCSS(
      '.a .b{color:red}',
      '.a   .b{color:red}'
    )
  );
});

describe('At-rules, plugins, and custom properties', () => {
  test(
    'should remove comments within @media query parameters and normalize spacing',
    processCSS(
      '@media/*a*/screen/*b*/and/*c*/(min-width:/*d*/900px)/*e*/{color: red}',
      '@media screen and (min-width: 900px){color: red}'
    )
  );

  test(
    'should pass through declaration without comments',
    passthroughCSS('h1{color:#000;font-weight:700}')
  );

  test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

  test(
    'should pass through at rules without comments',
    passthroughCSS('@page{body{font-size:1em}}')
  );

  const { processCSS: singleLine } = processCSSFactory(plugin);

  test(
    'should work with single line comments',
    singleLine('//!wow\n//wow\nh1{//color:red\n}', '//!wow\nh1{\n}', {
      syntax: postcssScss,
    })
  );

  const { processCSS: otherPlugins } = processCSSFactory([vars(), plugin]);

  test(
    'should handle comments from other plugins',
    otherPlugins(
      '$color: red; :root { box-shadow: inset 0 -10px 12px 0 $color, /* some comment */ inset 0 0 5px 0 $color; }',
      ':root { box-shadow: inset 0 -10px 12px 0 red,  inset 0 0 5px 0 red; }'
    )
  );

  test(
    'should preserve whitespace-only custom property values',
    passthroughCSS(':root{--x: ;--empty:}')
  );

  test(
    'should preserve all whitespace characters in custom property values',
    passthroughCSS(':root{--x:\t\n\f\r }')
  );

  test(
    'should preserve whitespace around removed comments in custom properties',
    processCSS(':root{--x: \t/* remove */\n ;}', ':root{--x: \t \n ;}')
  );

  test(
    'should preserve comment-like text in custom property strings and URLs',
    processCSS(
      ':root{--x: url("/* keep */") /* remove */ ;--y:"/* keep */" }',
      ':root{--x: url("/* keep */")   ;--y:"/* keep */" }'
    )
  );

  // Deliberate contract: values without comments are left byte-for-byte
  // untouched.
  test(
    'should pass through declarations lacking comments without stripping whitespace',
    passthroughCSS(':root{--x: ;color: ;}')
  );

  test(
    'should pass through whitespace in declarations lacking comments',
    passthroughCSS('h1{color:  red  }')
  );

  test(
    'should pass through multiple spaces in values lacking comments',
    passthroughCSS('h1{margin: 10px   20px}')
  );

  test(
    'should strip comments from custom property declarations and normalize between to a space',
    processCSS(':root{--x: /*c*/ red;}', ':root{--x: red;}')
  );

  test(
    'should normalize between to a space when comment without space is stripped from custom property',
    processCSS(':root{--x:/*c*/red;}', ':root{--x: red;}')
  );

  test(
    'should normalize between to a space when multiple comments are stripped from custom property',
    processCSS(':root{--x: /*c1*/ /*c2*/ red;}', ':root{--x: red;}')
  );

  test(
    'should preserve special comments in custom property between',
    passthroughCSS(':root{--x: /*!keep*/ red;}')
  );

  test(
    'should preserve custom property between without space when clean',
    passthroughCSS(':root{--x:red;}')
  );

  test(
    'should preserve custom property between with space when clean',
    passthroughCSS(':root{--x: red;}')
  );
});
