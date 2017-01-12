import test from 'ava';
import processCss from './_processCss';

test.skip(
    'should remove leading zeroes from reduced calc values',
    processCss,
    `.box { margin: calc(-.5 * 1rem); }`,
    `.box{margin:-.5rem}`
);
