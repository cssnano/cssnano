'use strict';
const { test } = require('uvu');
const { processCSSFactory } = require('../../../util/testHelpers.js');
const plugin = require('../src/index.js');

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should merge column values',
  processCSS('h1{column-width:12em;column-count:auto}', 'h1{columns:12em}')
);

test(
  'should merge column values (uppercase)',
  processCSS('h1{COLUMN-WIDTH:12em;COLUMN-COUNT:auto}', 'h1{columns:12em}')
);

test(
  'should minify column values',
  processCSS('h1{column-width:auto;column-count:auto}', 'h1{columns:auto}')
);

test(
  'should minify column values (uppercase)',
  processCSS('h1{COLUMN-WIDTH:auto;COLUMN-COUNT:auto}', 'h1{columns:auto}')
);

test(
  'should minify column values 1 (uppercase)',
  processCSS('h1{column-width:AUTO;column-count:AUTO}', 'h1{columns:AUTO}')
);

test(
  'should merge column-width with columns',
  processCSS('h1{columns:12em auto;column-width:11em}', 'h1{columns:11em}')
);

test(
  'should merge column-width with columns (uppercase)',
  processCSS('h1{COLUMNS:12em auto;COLUMN-WIDTH:11em}', 'h1{columns:11em}')
);

test(
  'should merge column-width with columns (uppercase) #1',
  processCSS('h1{columns:12em AUTO;column-width:11em}', 'h1{columns:11em}')
);

test(
  'should merge column width and column count',
  processCSS('h1{column-width:6em;column-count:3}', 'h1{columns:6em 3}')
);

test(
  'should merge column width and column count (uppercase)',
  processCSS('h1{COLUMN-WIDTH:6em;COLUMN-COUNT:3}', 'h1{columns:6em 3}')
);

test(
  'should pass through column width',
  passthroughCSS('h1{column-width:6em}')
);

test(
  'should pass through column width (uppercase)',
  passthroughCSS('h1{COLUMN-WIDTH:6em}')
);

test('should pass through column count', passthroughCSS('h1{column-count:3}'));

test(
  'should pass through column count (uppercase)',
  passthroughCSS('h1{COLUMN-COUNT:3}')
);

test(
  'should reduce inherit',
  processCSS(
    'h1{column-width:inherit;column-count:inherit}',
    'h1{columns:inherit}'
  )
);

test(
  'should reduce inherit (uppercase)',
  processCSS(
    'h1{COLUMN-WIDTH:inherit;COLUMN-COUNT:inherit}',
    'h1{columns:inherit}'
  )
);

test(
  'should reduce inherit 1 (uppercase)',
  processCSS(
    'h1{COLUMN-WIDTH:INHERIT;COLUMN-COUNT:INHERIT}',
    'h1{columns:inherit}'
  )
);

test('should pass through auto', passthroughCSS('h1{columns:auto}'));

test(
  'should pass through auto (uppercase)',
  processCSS('h1{COLUMNS:auto}', 'h1{columns:auto}')
);

test(
  'should pass through auto 1 (uppercase)',
  processCSS('h1{columns:AUTO}', 'h1{columns:auto}')
);

test(
  'should not merge declarations with hacks',
  passthroughCSS('h1{column-width:12em;_column-count:auto}')
);

test(
  'should not merge declarations with hacks (uppercase)',
  passthroughCSS('h1{COLUMN-WIDTH:12em;_COLUMN-COUNT:auto}')
);

test(
  'should preserve nesting level',
  processCSS(
    'section{h1{column-width:12em;column-count:auto}}',
    'section{h1{columns:12em}}'
  )
);

test(
  'should preserve nesting level (uppercase)',
  processCSS(
    'section{h1{COLUMN-WIDTH:12em;COLUMN-COUNT:auto}}',
    'section{h1{columns:12em}}'
  )
);

test(
  'should save fallbacks for column-width if after goes custom css props',
  processCSS(
    'h1{column-width:12em;column-width:var(--variable)}',
    'h1{column-width:12em;column-width:var(--variable)}'
  )
);

test(
  'should save fallbacks for column-width if after goes custom css props (uppercase)',
  processCSS(
    'h1{COLUMN-WIDTH:12em;COLUMN-WIDTH:var(--variable)}',
    'h1{COLUMN-WIDTH:12em;COLUMN-WIDTH:var(--variable)}'
  )
);

test(
  'should save fallbacks for column-width if after goes custom css props 1 (uppercase)',
  processCSS(
    'h1{column-width:12em;column-width:VAR(--variable)}',
    'h1{column-width:12em;column-width:VAR(--variable)}'
  )
);

test(
  'should not explode columns with custom properties',
  passthroughCSS('h1{columns:var(--variable)}')
);

test(
  'should preserve case of custom properties',
  passthroughCSS('h1{columns:var(--fooBar)}')
);

test(
  'should preserve case of custom properties (uppercase)',
  passthroughCSS('h1{COLUMN:var(--fooBar)}')
);

test(
  'should preserve case of custom properties 1 (uppercase)',
  passthroughCSS('h1{column:VAR(--fooBar)}')
);

test(
  'should merge column values duplicate columns',
  processCSS(
    'h1{column-width:12em;column-count:auto;columns:12em}',
    'h1{columns:12em}'
  )
);

test(
  'should merge column values duplicate columns (uppercase)',
  processCSS(
    'h1{COLUMN-WIDTH:12em;COLUMN-COUNT:auto;COLUMNS:12em}',
    'h1{columns:12em}'
  )
);

test(
  'should handle empty columns',
  processCSS('h1{columns:;}', 'h1{columns:;}')
);
test.run();
