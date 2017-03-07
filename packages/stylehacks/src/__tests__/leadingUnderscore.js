import test from 'ava';
import processCSS from './_processCSS';

test(
    'ie 6 underscore hack',
    processCSS,
    'h1 { _color: red }',
    'h1 { }',
    {target: 'ie6', unaffected: 'ie7'}
);

test(
    'ie 6 hyphen hack',
    processCSS,
    'h1 { -color: red }',
    'h1 { }',
    {target: 'ie6', unaffected: 'ie7'}
);
