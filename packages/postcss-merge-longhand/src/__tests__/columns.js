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
    'should pass through inherit',
    processCss,
    'h1{column-width:inherit;column-count:inherit}'
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
