import test from 'ava';
import processCss from './_processCss';

test(
    'should remove outdated vendor prefixes',
    processCss,
    'h1{-webkit-box-sizing:content-box;box-sizing:content-box}',
    'h1{box-sizing:content-box}',
);

test(
    'should not remove outdated vendor prefixes when minifying for older browsers',
    processCss,
    'h1{-webkit-box-sizing:content-box;box-sizing:content-box}',
    'h1{-webkit-box-sizing:content-box;box-sizing:content-box}',
    {autoprefixer: {browsers: 'Safari < 5'}},
);

test(
    'should not remove outdated vendor prefixes if disabled',
    processCss,
    'h1{-webkit-box-sizing:content-box;box-sizing:content-box}',
    'h1{-webkit-box-sizing:content-box;box-sizing:content-box}',
    {autoprefixer: false},
);
