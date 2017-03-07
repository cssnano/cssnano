import test from 'ava';
import processCSS from './_processCSS';

test(
    'ie 5.5-7 trailing comma hack',
    processCSS,
    'h1, { color: red }',
    '',
    {target: 'ie6', unaffected: 'ie8'}
);

test(
    'ie 5.5-7 trailing slash hack',
    processCSS,
    'h1\\ { color: red }',
    '',
    {target: 'ie6', unaffected: 'ie8'}
);
