import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should collapse multi-character whitespace after @media',
  processCSS('@media   screen {}', '@media screen{}')
);

test(
  'should collapse multi-character whitespace after @keyframes',
  processCSS('@keyframes   slidein {}', '@keyframes slidein{}')
);

test(
  'should collapse newlines and tabs to a single space in at-rule afterName',
  processCSS('@media\n\t(min-width: 1px) {}', '@media (min-width: 1px){}')
);

test(
  'should preserve comments while collapsing whitespace in at-rule afterName',
  processCSS(
    '@media   /* comment */   (min-width: 1px) {}',
    '@media /* comment */ (min-width: 1px){}'
  )
);

test(
  'should preserve empty afterName without inserting whitespace',
  passthroughCSS('@media(min-width:1px){}')
);
