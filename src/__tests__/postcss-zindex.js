import test from 'ava';
import processCss from './_processCss';

test(
    'should optimise large z-index values',
    processCss,
    'h1{z-index:9999}',
    'h1{z-index:1}',
);

test(
    'should optimise multiple ascending z-index values',
    processCss,
    'h1{z-index:150}h2{z-index:350}h3{z-index:600}',
    'h1{z-index:1}h2{z-index:2}h3{z-index:3}',
);

test(
    'should optimise multiple descending z-index values',
    processCss,
    'h1{z-index:600}h2{z-index:350}h3{z-index:150}',
    'h1{z-index:3}h2{z-index:2}h3{z-index:1}',
);

test(
    'should optimise multiple unsorted z-index values',
    processCss,
    'h1{z-index:5}h2{z-index:500}h3{z-index:40}h4{z-index:2}',
    'h1{z-index:2}h2{z-index:4}h3{z-index:3}h4{z-index:1}',
);

test(
    'should optimise !important z-index values',
    processCss,
    'h1{z-index:1337!important}h2{z-index:9001!important}',
    'h1{z-index:1!important}h2{z-index:2!important}',
);

test(
    'should not optimise negative z-index values',
    processCss,
    'h1{z-index:-1}h2{z-index:-2}',
    'h1{z-index:-1}h2{z-index:-2}',
);

test(
    'should not convert 0 values',
    processCss,
    'h1{z-index:0}h2{z-index:10}',
    'h1{z-index:0}h2{z-index:1}',
);

test(
    'should not mangle inherit',
    processCss,
    'h1{z-index:inherit}',
    'h1{z-index:inherit}',
);

test(
    'should not mangle auto',
    processCss,
    'h1{z-index:auto}h2{z-index:2000}',
    'h1{z-index:auto}h2{z-index:1}',
);
