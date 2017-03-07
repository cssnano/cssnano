import test from 'ava';
import processCSS from './_processCSS';

test(
    'firefox empty body hack',
    processCSS,
    'body:empty h1 { color: red }',
    '',
    {target: 'firefox2', unaffected: 'chrome58'}
);
