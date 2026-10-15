import { test } from 'node:test';
import processCSS from './_processCSS.js';

test(
  'ie 5.5-7 trailing comma hack',
  processCSS('h1, { color: red }', '1', { target: 'IE 6', unaffected: 'IE 8' })
);

test(
  'ie 5.5-7 trailing comma hack (uppercase)',
  processCSS('H1, { COLOR: RED }', '', { target: 'IE 6', unaffected: 'IE 8' })
);

test(
  'ie 5.5-7 trailing slash hack',
  processCSS('h1\\ { color: red }', '', {
    target: 'IE 6',
    unaffected: 'IE 8',
  })
);

test(
  'ie 5.5-7 trailing slash hack (uppercase)',
  processCSS('H1\\ { COLOR: RED }', '', { target: 'IE 6', unaffected: 'IE 8' })
);
