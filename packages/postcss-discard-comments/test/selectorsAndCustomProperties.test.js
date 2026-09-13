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
    'should remove only a comment',
    processCSS(
      '.a /*comment*/ [attr="/* not a comment */"]{color:#000}',
      '.a [attr="/* not a comment */"]{color:#000}'
    )
  );

  test(
    'should remove only a comment 2',
    processCSS(
      '.a [attr="/* not a comment */"] /*comment*/, .b {color:#000}',
      '.a [attr="/* not a comment */"], .b{color:#000}'
    )
  );

  test(
    'should remove all whitespace before a comma after multiple comments',
    processCSS('.a /*first*/ /*second*/ , .b{color:#000}', '.a, .b{color:#000}')
  );

  test(
    'should remove only a comment 3',
    processCSS(
      ':not(/*comment*/ [attr="/* not a comment */"]){color:#000}',
      ':not( [attr="/* not a comment */"]){color:#000}'
    )
  );

  test(
    'should remove comments in selector',
    processCSS('.x/*comment*/.y{color:#000}', '.x.y{color:#000}')
  );

  test(
    'should remove comments in pseudo-class-function',
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
    'should reuse selector comment replacements for repeated raw selectors',
    processCSS('.a/*remove*/, .a/*remove*/{color:red}', '.a, .a{color:red}')
  );
});

describe('At-rules, plugins, and custom properties', () => {
  test(
    'should remove comments in @rule param',
    processCSS(
      '@media/*a*/screen/*b*/and/*c*/(min-width:/*d*/900px)/*e*/{color: red}',
      '@media screen and (min-width: 900px){color:red}'
    )
  );

  test(
    "should pass through when it doesn't find a comment",
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
      ':root{ box-shadow:inset 0 -10px 12px 0 red, inset 0 0 5px 0 red; }'
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
      ':root{--x:url("/* keep */")   ;--y:"/* keep */" }'
    )
  );

  test(
    'should not reuse custom property whitespace replacements for declarations',
    processCSS(':root{--x: ;color: ;}', ':root{--x: ;color:;}')
  );

  test(
    'should continue normalizing ordinary declaration values',
    processCSS('h1{color:  red  }', 'h1{color:red  }')
  );
});
