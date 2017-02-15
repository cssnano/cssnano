import test from 'ava';
import processCss from './_processCss';

test(
    'should convert normal to 400',
    processCss,
    'h1{font-weight: normal}',
    'h1{font-weight:400}',
);

test(
    'should convert bold to 700',
    processCss,
    'h1{font-weight: bold}',
    'h1{font-weight:700}',
);

test(
    'should not update the font-style property',
    processCss,
    'h1{font-style: normal}',
    'h1{font-style:normal}',
);
