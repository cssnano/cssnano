import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should merge based on declarations',
  processCSS('h1{display:block}h2{display:block}', 'h1,h2{display:block}')
);

test(
  'should preserve an important comment in the first equal-declaration block',
  processCSS(
    '.a{/*!keep*/color:red}.b{color:red}',
    '.a{/*!keep*/}.a,.b{color:red}'
  )
);

test(
  'should preserve an important comment in the second equal-declaration block',
  processCSS(
    '.a{color:red}.b{/*!keep*/color:red}',
    '.a,.b{color:red}.b{/*!keep*/}'
  )
);

test(
  'should preserve important comments from both equal-declaration blocks',
  processCSS(
    '.a{/*!one*/color:red}.b{/*!two*/color:red}',
    '.a{/*!one*/}.a,.b{color:red}.b{/*!two*/}'
  )
);

test(
  'should not merge equal declarations with comments when selector length makes it unprofitable',
  passthroughCSS(
    '.very-long-selector-name-one{/*!keep*/color:red}.very-long-selector-name-two{color:red}'
  )
);

test(
  'should preserve comments when rules share multiple declarations',
  processCSS(
    '.a{/*!license*/color:red;font-size:12px}.b{color:red;font-size:12px}',
    '.a{/*!license*/}.a,.b{color:red;font-size:12px}'
  )
);

test(
  'should preserve an interspersed important comment while merging declarations',
  processCSS(
    '.a{color:red;/*!note*/font-size:12px}.b{color:red;font-size:12px}',
    '.a{/*!note*/}.a,.b{color:red;font-size:12px}'
  )
);

test(
  'should preserve an unimportant comment while merging declarations',
  processCSS(
    '.a{/*note*/color:red}.b{color:red}',
    '.a{/*note*/}.a,.b{color:red}'
  )
);

test(
  'should merge based on declarations (2)',
  processCSS(
    'h1{color:red;line-height:1.5;font-size:2em}h2{color:red;line-height:1.5;font-size:2em}',
    'h1,h2{color:red;line-height:1.5;font-size:2em}'
  )
);

test(
  'should preserve repeated declaration merge output',
  processCSS(
    '.one{color:red;display:grid;gap:1rem}.two{color:red;display:grid;gap:1rem;font-weight:700}.three{color:red;display:grid;gap:1rem}',
    '.one,.two,.three{color:red;display:grid;gap:1rem}.two{font-weight:700}'
  )
);

test(
  'should merge based on declarations, with a different property order',
  processCSS(
    'h1{color:red;line-height:1.5;font-size:2em}h2{font-size:2em;color:red;line-height:1.5}',
    'h1,h2{color:red;line-height:1.5;font-size:2em}'
  )
);

test(
  'should merge based on selectors',
  processCSS(
    'h1{display:block}h1{text-decoration:underline}',
    'h1{display:block;text-decoration:underline}'
  )
);

test(
  'should merge based on selectors (2)',
  processCSS(
    'h1{color:red;display:block}h1{text-decoration:underline}',
    'h1{color:red;display:block;text-decoration:underline}'
  )
);

test(
  'should merge based on selectors (3)',
  processCSS(
    'h1{font-size:2em;color:#000}h1{background:#fff;line-height:1.5}',
    'h1{font-size:2em;color:#000;background:#fff;line-height:1.5}'
  )
);
