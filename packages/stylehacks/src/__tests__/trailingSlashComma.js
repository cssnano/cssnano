import processCSS from './_processCSS';

test(
  'ie 5.5-7 trailing comma hack',
  processCSS('h1, { color: red }', '1', { target: 'ie6', unaffected: 'ie8' })
);

test(
  'ie 5.5-7 trailing comma hack (uppercase)',
  processCSS('H1, { COLOR: RED }', '', { target: 'ie6', unaffected: 'ie8' })
);

test(
  'ie 5.5-7 trailing slash hack',
  processCSS('h1\\ { color: red }', '', {
    target: 'ie6',
    unaffected: 'ie8',
  })
);

test(
  'ie 5.5-7 trailing slash hack (uppercase)',
  processCSS('H1\\ { COLOR: RED }', '', { target: 'ie6', unaffected: 'ie8' })
);
