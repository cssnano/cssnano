import test from 'ava';
import processCSS from './_processCSS';

test(
    'opera html:first-child hack',
    processCSS,
    'html:first-child h1 { color: red }',
    '',
    {target: 'opera9', unaffected: 'chrome58'}
);
