import { test } from 'node:test';
import { processCSSFactory } from '../../../../../util/testHelpers.js';
import { onlyTransform } from '../onlyTransform.js';

// PostCSS keeps the character after a block's final backslash in the block's
// trailing whitespace, not in the value. A move that leaves it behind lets the
// backslash escape the `;` or `}` that now follows, which changes the CSS.
const { processCSS, passthroughCSS } = processCSSFactory(
  onlyTransform(['mergeRules'])
);

test(
  'mergeRules keeps the space a final backslash escapes when it moves the declaration into another rule',
  processCSS(
    'a{color:red}a{margin:initial\\ }',
    'a{color:red;margin:initial\\ }'
  )
);

test(
  'mergeRules keeps the space a final backslash escapes when it appends a declaration after it',
  processCSS(
    'a{margin:initial\\ }a{color:red}',
    'a{margin:initial\\ ;color:red}'
  )
);

test(
  'mergeRules keeps the tab a final backslash escapes when it moves the declaration',
  processCSS(
    'a{color:red}a{margin:initial\\\t}',
    'a{color:red;margin:initial\\\t}'
  )
);

test(
  'mergeRules keeps the newline after a final backslash, which leaves it an invalid escape, when it moves the declaration',
  processCSS(
    'a{color:red}a{margin:initial\\\n}',
    'a{color:red;margin:initial\\\n}'
  )
);

test(
  'mergeRules leaves the whitespace after an escaped space as written when no rule merges, since nothing moves',
  passthroughCSS('a{margin:initial\\  }b{color:red}')
);
