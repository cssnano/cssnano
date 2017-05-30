import test from 'ava';
import processCss from './_processCss';

test(
    'should convert milliseconds to seconds',
    processCss,
    'h1{transition-duration:500ms}',
    'h1{transition-duration:.5s}',
);

test(
    'should not convert negative milliseconds to seconds',
    processCss,
    'h1{animation-duration:-569ms}',
    'h1{animation-duration:-569ms}',
);

test(
    'should not remove the unit from zero values (duration)',
    processCss,
    'h1{transition-duration:0s}',
    'h1{transition-duration:0s}',
);

test(
    'should remove unnecessary plus signs',
    processCss,
    'h1{width:+14px}',
    'h1{width:14px}',
);

test(
    'should strip the units from length properties',
    processCss,
    'h1{margin:0em 0% 0px 0pc}',
    'h1{margin:0}',
);

test(
    'should trim trailing zeros',
    processCss,
    'h1{width:109.00000000000px}',
    'h1{width:109px}',
);

test(
    'should trim trailing zeros + unit',
    processCss,
    'h1{width:0.00px}',
    'h1{width:0}',
);

test(
    'should not mangle flex basis',
    processCss,
    'h1{flex-basis:0%}',
    'h1{flex-basis:0%}',
);

test(
    'should not mangle values without units',
    processCss,
    'h1{z-index:1}',
    'h1{z-index:1}',
);

test(
    'should not mangle values outside of its domain',
    processCss,
    'h1{background:url(a.png)}',
    'h1{background:url(a.png)}',
);

test(
    'should optimise fractions',
    processCss,
    'h1{opacity:1.}h2{opacity:.0}',
    'h1{opacity:1}h2{opacity:0}',
);

test(
    'should optimise fractions with units',
    processCss,
    'h1{width:10.px}h2{width:.0px}',
    'h1{width:10px}h2{width:0}',
);

test(
    'should optimise fractions inside calc',
    processCss,
    'h1{width:calc(10.px + .0px)}',
    'h1{width:10px}',
);

test(
    'should handle leading zero in rem values',
    processCss,
    '.one{top:0.25rem}',
    '.one{top:.25rem}',
);

test(
    'should handle slash separated values',
    processCss,
    '.one{background:50% .0%/100.0% 100.0%}',
    '.one{background:50% 0/100% 100%}',
);

test(
    'should handle comma separated values',
    processCss,
    '.one{background:50% .0%,100.0% 100.0%}',
    '.one{background:50% 0,100% 100%}',
);

test(
    'should not mangle duration values',
    processCss,
    '.long{animation-duration:2s}',
    '.long{animation-duration:2s}',
);

test(
    'should not mangle padding values',
    processCss,
    'h1{padding:10px 20px 30px 40px}h2{padding:10px 20px 30px}h3{padding:10px 20px}h4{padding:10px}',
    'h1{padding:10px 20px 30px 40px}h2{padding:10px 20px 30px}h3{padding:10px 20px}h4{padding:10px}',
);

test(
    'should trim leading zeroes from negative values',
    processCss,
    'h1,h2{letter-spacing:-0.1rem}',
    'h1,h2{letter-spacing:-.1rem}',
);

test(
    'should support viewports units',
    processCss,
    'h1,h2{letter-spacing:-0.1vmin}',
    'h1,h2{letter-spacing:-.1vmin}',
);
