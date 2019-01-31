import test from 'ava';
import processCSS from './_processCSS';

test(
    'ie 5.5-6 * html hack',
    processCSS,
    '* html h1 { color: red }',
    '',
    {target: 'ie6', unaffected: 'ie7'}
);

test(
    'ie 5.5-6 * html hack (uppercase)',
    processCSS,
    '* HTML H1 { color: red }',
    '',
    {target: 'ie6', unaffected: 'ie7'}
);
