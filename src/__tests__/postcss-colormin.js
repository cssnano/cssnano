import test from 'ava';
import processCss from './_processCss';

test(
    'should minify color values',
    processCss,
    'h1{color:yellow}',
    'h1{color:#ff0}',
);

test(
    'should minify color values (2)',
    processCss,
    'h1{box-shadow:0 1px 3px rgba(255, 230, 220, 0.5)}',
    'h1{box-shadow:0 1px 3px rgba(255,230,220,.5)}',
);

test(
    'should minify color values (3)',
    processCss,
    'h1{background:hsla(134, 50%, 50%, 1)}',
    'h1{background:#40bf5e}',
);

test(
    'should minify color values (4)',
    processCss,
    'h1{text-shadow:1px 1px 2px #000000}',
    'h1{text-shadow:1px 1px 2px #000}',
);

test(
    'should minify color values in background gradients',
    processCss,
    'h1{background:linear-gradient(#ff0000,yellow)}',
    'h1{background:linear-gradient(red,#ff0)}',
);

test(
    'should minify color values in background gradients (2)',
    processCss,
    'h1{background:linear-gradient(yellow, orange), linear-gradient(black, rgba(255, 255, 255, 0))}',
    'h1{background:linear-gradient(#ff0,orange),linear-gradient(#000,hsla(0,0%,100%,0))}',
);

test(
    'should minify color values in background gradients (3)',
    processCss,
    'h1{background:linear-gradient(0deg, yellow, black 40%, red)}',
    'h1{background:linear-gradient(0deg,#ff0,#000 40%,red)}',
);

test(
    'should not minify in font properties',
    processCss,
    'h1{font-family:black}',
    'h1{font-family:black}',
);

test(
    'should correctly parse multiple box shadow values',
    processCss,
    'h1{box-shadow:inset 0 1px 1px rgba(0, 0, 0, .075),0 0 8px rgba(102, 175, 233, .6)}',
    'h1{box-shadow:inset 0 1px 1px rgba(0,0,0,.075),0 0 8px rgba(102,175,233,.6)}',
);

test(
    'should make an exception for webkit tap highlight color (issue 1)',
    processCss,
    'h1{-webkit-tap-highlight-color:rgba(0,0,0,0)}',
    'h1{-webkit-tap-highlight-color:rgba(0,0,0,0)}',
);

test(
    'should still minify spaces in webkit tap highlight color',
    processCss,
    'h1{-webkit-tap-highlight-color:rgba(0, 0, 0, 0)}',
    'h1{-webkit-tap-highlight-color:rgba(0,0,0,0)}',
);

test(
    'should not crash on transparent in webkit tap highlight color',
    processCss,
    'h1{-webkit-tap-highlight-color:transparent}',
    'h1{-webkit-tap-highlight-color:transparent}',
);

test(
    'should not crash on inherit in webkit tap highlight color',
    processCss,
    'h1{-webkit-tap-highlight-color:inherit}',
    'h1{-webkit-tap-highlight-color:inherit}',
);

test(
    'should not minify in filter properties',
    processCss,
    'h1{filter:progid:DXImageTransform.Microsoft.gradient(startColorstr= #000000,endColorstr= #ffffff)}',
    'h1{filter:progid:DXImageTransform.Microsoft.gradient(startColorstr= #000000,endColorstr= #ffffff)}',
);
