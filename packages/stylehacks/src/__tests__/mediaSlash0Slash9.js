import test from 'ava';
import processCSS from './_processCSS';

test(
    'ie <= 8 media \\0screen\\,screen\\9 hack',
    processCSS,
    '@media \\0screen\\,screen\\9 { h1 { color: red } }',
    '',
    {target: 'ie6', unaffected: 'ie9'}
);
