import test from 'ava';
import processCSS from './_processCSS';

test(
    'ie 6 underscore hack',
    processCSS,
    'h1 { margin-top: 1px\\9; }',
    'h1 { }',
    {target: 'ie8', unaffected: 'chrome58'}
);
