import test from 'ava';
import processCss from './_processCss';

test(
    'should merge column values',
    processCss,
    'h1{column-width:12em;column-count:auto}',
    'h1{columns:12em}'
);

test(
    'should minify column values',
    processCss,
    'h1{column-width:auto;column-count:auto}',
    'h1{columns:auto}'
);

test(
    'should merge column-width with columns',
    processCss,
    'h1{columns:12em auto;column-width:11em}',
    'h1{columns:11em}'
);

test(
    'should merge column width and column count',
    processCss,
    'h1{column-width:6em;column-count:3}',
    'h1{columns:6em 3}'
);

test(
    'should pass through column width',
    processCss,
    'h1{column-width:6em}'
);

test(
    'should pass through column count',
    processCss,
    'h1{column-count:3}'
);

test(
    'should reduce inherit',
    processCss,
    'h1{column-width:inherit;column-count:inherit}',
    'h1{columns:inherit}'
);

test(
    'should pass through auto',
    processCss,
    'h1{columns:auto}'
);

test(
    'should not merge declarations with hacks',
    processCss,
    'h1{column-width:12em;_column-count:auto}'
);

test(
    'should preserve nesting level',
    processCss,
    'section{h1{column-width:12em;column-count:auto}}',
    'section{h1{columns:12em}}'
);

test(
    'should save fallbacks for column-width if after goes custom css props',
    processCss,
    'h1{column-width:12em;column-width:var(--variable)}',
    'h1{column-width:12em;column-width:var(--variable)}'
);
