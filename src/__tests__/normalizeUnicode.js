import test from 'ava';
import processCss, {passthrough} from './_processCss';

function fixture (range) {
    return `@font-face{font-family:test;unicode-range:${range}}*{font-family:test}`;
}

test(
    'should convert a unicode range to a wildcard range',
    processCss,
    fixture('u+2b00-2bff'), // Miscellaneous Symbols and Arrows
    fixture('u+2b??')
);

test(
    'should convert a unicode range to a wildcard range (2)',
    processCss,
    fixture('u+1e00-1eff'), // Latin Extended Additional
    fixture('u+1e??')
);

test(
    'should convert a unicode range to a wildcard range (3)',
    processCss,
    fixture('u+2120-212f'),
    fixture('u+212?')
);

test(
    'should convert a unicode range to a wildcard range (4)',
    processCss,
    fixture('u+2100-21ff'),
    fixture('u+21??')
);

test(
    'should convert a unicode range to a wildcard range (5)',
    processCss,
    fixture('u+2000-2fff'),
    fixture('u+2???')
);

test(
    'should pass through a unicode range that cannot be reduced',
    passthrough,
    fixture('u+0-7f') // Basic Latin
);

test(
    'should pass through a unicode range that cannot be reduced (2)',
    passthrough,
    fixture('u+2125-2128')
);

test(
    'should pass through a unicode range that cannot be reduced (3)',
    passthrough,
    fixture('u+2012-2f12')
);

test(
    'should pass through a unicode range that cannot be reduced (4)',
    passthrough,
    fixture('u+2002-2ff2')
);

test(
    'should pass through css variables',
    passthrough,
    fixture('var(--caseInsensitive)')
);

test(
    'should pass through initial',
    passthrough,
    fixture('initial')
);

test(
    'should downcase the unicode-range property/value pair',
    processCss,
    '@font-face{font-family:test;UNICODE-RANGE:U+07-F}*{font-family:test}',
    '@font-face{font-family:test;unicode-range:u+07-f}*{font-family:test}'
);
