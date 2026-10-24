import { test } from 'node:test';
import {
  normalizeWhitespacePlugins,
  processCSSFactory,
} from '../../../../util/testHelpers.js';

const { processCSS, passthroughCSS } = processCSSFactory(
  normalizeWhitespacePlugins()
);

test(
  'should preserve an escaped tab character used as an IE hack',
  passthroughCSS('div{display:none\\\t}')
);

test(
  'should preserve an escaped tab character and drop redundant trailing whitespace',
  processCSS('div{display:none\\\t   }', 'div{display:none\\\t}')
);

test(
  'should preserve non-CSS whitespace after an IE hack',
  processCSS('div{display:none \\9\u00a0}', 'div{display:none\\9\u00a0}')
);

test(
  'should not let a trailing backslash followed by a newline become an escape of the closing brace',
  passthroughCSS('div{display:none\\\n}')
);

test(
  'should not treat an escaped backslash as a dangling escape',
  passthroughCSS('div{content:"x"\\\\}')
);

test(
  'should preserve an escaped tab character in the last declaration of an at-rule',
  passthroughCSS('@font-face{src:url(a)\\\t}')
);

test(
  'should preserve an escaped tab character in a custom property that is the last declaration',
  passthroughCSS(':root{--x:1;--y:red\\\t}')
);

test(
  'normalize-whitespace keeps the whitespace around `\\9` inside a string',
  passthroughCSS('div{content:"a \\9 b"}')
);

test(
  'keeps the space that a `\\9` escape folds in when a hex digit follows, since `\\9 a` is not `\\9a`',
  processCSS('div{width:1px\\9 a}', 'div{width:1px\\9 a}')
);

test(
  'drops the space a `\\9` escape folds in before a letter that is not a hex digit, since `\\9 g` is `\\9g`',
  processCSS('div{width:1px\\9 g}', 'div{width:1px\\9g}')
);

test(
  'keeps the whitespace after the space a `\\9` escape folds in before a letter, since it separates two components',
  processCSS('div{width:1px\\9   solid}', 'div{width:1px\\9  solid}')
);

test(
  'keeps the whitespace after the space a `\\9` escape folds in before a hex digit, since it separates two components',
  processCSS('div{width:1px\\9  a}', 'div{width:1px\\9  a}')
);

test(
  'drops the whitespace after a `\\9` escape before a comma, which separates components by itself',
  processCSS('div{font-family:a\\9  ,b}', 'div{font-family:a\\9,b}')
);

test(
  'unhacks every `\\9` in a value, keeping the space each one folds in',
  processCSS('div{width:1px\\9 1px\\9 a}', 'div{width:1px\\9 1px\\9 a}')
);
