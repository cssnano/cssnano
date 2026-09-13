import { describe, test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('Font shorthand property', () => {
  test(
    'should preserve functional font sizes with nested commas',
    processCSS(
      'h1{font:calc(1em + 2px)/min(2, max(1, 2)) "A, B", serif}',
      'h1{font:calc(1em + 2px)/min(2, max(1, 2)) A\\, B,serif}'
    )
  );

  test(
    'should keep numeric weights before the font size',
    processCSS(
      'h1{font:condensed oblique 25deg 753 12pt "Helvetica Neue", serif}',
      'h1{font:condensed oblique 25deg 753 12pt Helvetica Neue,serif}'
    )
  );

  test(
    'should recognize a unitless zero font size',
    processCSS(
      'h1{font:italic 0 "Helvetica Neue", serif}',
      'h1{font:italic 0 Helvetica Neue,serif}'
    )
  );

  test(
    'should convert the font shorthand property',
    processCSS(
      'h1{font:italic small-caps normal 13px/150% "Helvetica Neue", sans-serif}',
      'h1{font:italic small-caps normal 13px/150% Helvetica Neue,sans-serif}'
    )
  );

  test(
    'should convert shorthand with zero unit line height',
    processCSS(
      'h1{font:italic small-caps normal 13px/1.5 "Helvetica Neue", sans-serif}',
      'h1{font:italic small-caps normal 13px/1.5 Helvetica Neue,sans-serif}'
    )
  );

  test(
    'should convert the font shorthand property with upperlower keyword, unquoted',
    processCSS(
      'h1{font:italic Helvetica Neue,sans-serif,Arial}',
      'h1{font:italic Helvetica Neue,sans-serif}',
      { removeAfterKeyword: true }
    )
  );

  test(
    'should convert the font shorthand property with uppercase keyword, unquoted',
    processCSS(
      'h1{font:italic Helvetica Neue,SANS-SERIF,Arial}',
      'h1{font:italic Helvetica Neue,SANS-SERIF}',
      { removeAfterKeyword: true }
    )
  );

  test(
    'should join identifiers in the shorthand property',
    processCSS(
      'h1{font:italic "Bond 007",sans-serif}',
      'h1{font:italic Bond\\ 007,sans-serif}'
    )
  );

  test(
    'should join non-digit identifiers in the shorthand property',
    processCSS(
      'h1{font:italic "Bond !",serif}',
      'h1{font:italic Bond \\!,serif}'
    )
  );

  test(
    'should handle rem values',
    processCSS(
      'h1{font:bold 2.2rem/.9 "Open Sans Condensed", sans-serif}',
      'h1{font:700 2.2rem/.9 Open Sans Condensed,sans-serif}'
    )
  );

  test(
    "should pass through when it doesn't find a font property",
    passthroughCSS('h1{color:black;text-decoration:none}')
  );

  test(
    'should not mangle custom props',
    passthroughCSS(':root{--sans:Helvetica}header{font-family:var(--sans)}')
  );

  test(
    'should preserve spacing between font-size and quoted family name',
    processCSS(
      'h1{font:16px "Menlo", monospace}',
      'h1{font:16px Menlo,monospace}'
    )
  );
});

describe('Font weight minification', () => {
  test(
    'should minify font-weight',
    processCSS('h1{font-weight:bold}', 'h1{font-weight:700}')
  );

  test(
    'should minify font-weight #1',
    processCSS('h1{font-weight:normal}', 'h1{font-weight:400}')
  );

  test(
    'should minify uppercase font-weight',
    processCSS('h1{font-weight:BOLD}', 'h1{font-weight:700}')
  );

  test(
    'should minify uppercase font-weight #1',
    processCSS(
      'h1{font-style:normal;font-weight:normal}',
      'h1{font-style:normal;font-weight:400}'
    )
  );

  test(
    'should minify uppercase font-weight #2',
    processCSS(
      'h1{font-weight:normal;font-style:normal}',
      'h1{font-weight:400;font-style:normal}'
    )
  );

  test(
    'should pass through not minimized font-weight',
    passthroughCSS('h1{font-weight:500}', 'h1{font-weight:500}')
  );

  test(
    'should pass through not minimized font-weight #1',
    passthroughCSS('h1{font-weight:lighter}', 'h1{font-weight:lighter}')
  );

  test(
    'should pass through unrelated font lowercase properties',
    passthroughCSS('h1{font-style:normal}')
  );

  test(
    'should pass through unrelated font uppercase properties',
    passthroughCSS('h1{font-style:NORMAL}')
  );
});

describe('Variables and environments in font values', () => {
  test(
    'should minify font property',
    processCSS(
      'h1{font:BOLD italic 20px Times New Roman}',
      'h1{font:700 italic 20px Times New Roman}'
    )
  );

  test(
    'should minify font property #2',
    passthroughCSS('h1{font:var(--foo) 1.2em Fira Sans,serif}')
  );

  test(
    'should minify font property #3',
    passthroughCSS('h1{font:var(--foo) bold 16px/2 cursive}')
  );

  test(
    'should minify font property #4',
    passthroughCSS('h1{font:italic var(--foo) bold 16px/2 cursive}')
  );

  test(
    'should minify font property #5',
    passthroughCSS('h1{font:italic 1.2em "Helvetica Neue", var(--foo)}')
  );

  test(
    'should pass through environment variables in font shorthands',
    passthroughCSS(
      'h1{font:italic 16px/env(--line-height) "Helvetica Neue",serif}'
    )
  );

  test(
    'should minify font property #6',
    processCSS(
      'h1{font:oblique 10deg 10px "Helvetica Neue"}',
      'h1{font:oblique 10deg 10px Helvetica Neue}'
    )
  );

  test(
    'should pass through css variables in font',
    passthroughCSS('h1{font:var(--font-size)}')
  );

  test(
    'should pass through css variables in font #2',
    passthroughCSS('h1{font:var(--font-size) sans-serif}')
  );

  test(
    'should pass through css variables in font #3',
    passthroughCSS('h1{font:var(--font-family),sans-serif}')
  );

  test(
    'should pass through css variables in font #4',
    passthroughCSS('h1{font:italic 1.2em var(--foo)}')
  );

  test(
    'should pass through css variables in font #5',
    passthroughCSS('h1{font:italic 1.2em sans-serif,var(--foo)}')
  );

  test(
    'should pass through css variables in font #6',
    passthroughCSS('h1{font:italic var(--foo),monospace}')
  );

  test(
    'should pass through css variables in font #7',
    passthroughCSS('h1{font:italic var(--foo) monospace}')
  );

  test(
    'should pass through css variables in font #8',
    passthroughCSS('h1{font:italic monospace,var(--foo)}')
  );

  test(
    'should pass through css variables in font #9',
    passthroughCSS('h1{font:italic monospace,var(--foo)}')
  );

  test(
    'should pass through css variables in font-weight',
    passthroughCSS('h1{font-weight:var(--font-size)}')
  );

  test(
    'should pass through css variables in font-family',
    passthroughCSS('h1{font-family:var(--font-size)}')
  );

  test(
    'should pass through css variables in font-family #2',
    passthroughCSS('h1{font-family:var(--font-size), Helvetica}')
  );

  test(
    'should pass through env variables in font-weight',
    passthroughCSS('h1{font-weight:env(--font-size)}')
  );

  test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
});
