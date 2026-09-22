import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

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
