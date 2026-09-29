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

test(
  'should collapse multi-character whitespace in statement-only @import',
  processCSS('@import   "test.css";', '@import "test.css";')
);

test(
  'should collapse multi-character whitespace in statement-only @charset',
  processCSS('@charset   "utf-8";', '@charset "utf-8";')
);

test(
  'should collapse multi-character whitespace in statement-only @namespace',
  processCSS(
    '@namespace   svg "http://www.w3.org/2000/svg";',
    '@namespace svg "http://www.w3.org/2000/svg";'
  )
);

test(
  'should collapse newlines and tabs in statement-only at-rules',
  processCSS('@import\n\t"test.css";', '@import "test.css";')
);

test(
  'should preserve comments while collapsing whitespace in statement-only at-rules',
  processCSS(
    '@import   /* comment */   "test.css";',
    '@import /* comment */ "test.css";'
  )
);

test(
  'should collapse multi-character whitespace after unknown at-rules',
  processCSS('@idEnt   foo {}', '@idEnt foo{}')
);

test(
  'should collapse multi-character whitespace after @container',
  processCSS('@container   (width > 500px) {}', '@container (width > 500px){}')
);

test(
  'should preserve single space before parenthesis after unknown at-rules',
  processCSS('@idEnt (foo) {}', '@idEnt (foo){}')
);

test(
  'should preserve single space before parenthesis after @container',
  processCSS('@container (width > 500px) {}', '@container (width > 500px){}')
);

test(
  'should collapse whitespace after mixed-case @idEnt with parenthesis',
  processCSS('@idEnt   (foo) {}', '@idEnt (foo){}')
);

test(
  'should collapse whitespace after uppercase @MEDIA with parenthesis',
  processCSS('@MEDIA   (min-width: 1px) {}', '@MEDIA (min-width: 1px){}')
);

test(
  'should collapse whitespace after mixed-case @Supports with parenthesis',
  processCSS('@Supports   (display: flex) {}', '@Supports (display: flex){}')
);
