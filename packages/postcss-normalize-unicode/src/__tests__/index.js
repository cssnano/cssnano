import test from 'ava';
import plugin from '..';
import {usePostCSSPlugin, processCSSFactory} from '../../../../util/testHelpers';

const {passthroughCSS, processCSS} = processCSSFactory(plugin);

function fixture (range) {
    return `@font-face{font-family:test;unicode-range:${range}}*{font-family:test}`;
}

test(
    'should convert a unicode range to a wildcard range',
    processCSS,
    fixture('U+2B00-2BFF'), // Miscellaneous Symbols and Arrows
    fixture('U+2B??')
);

test(
    'should convert a unicode range to a wildcard range (2)',
    processCSS,
    fixture('U+1E00-1EFF'), // Latin Extended Additional
    fixture('U+1E??')
);

test(
    'should convert a unicode range to a wildcard range (3)',
    processCSS,
    fixture('U+2120-212F'),
    fixture('U+212?')
);

test(
    'should convert a unicode range to a wildcard range (4)',
    processCSS,
    fixture('U+2100-21FF'),
    fixture('U+21??')
);

test(
    'should convert a unicode range to a wildcard range (5)',
    processCSS,
    fixture('U+2000-2FFF'),
    fixture('U+2???')
);

test(
    'should pass through a unicode range that cannot be reduced',
    passthroughCSS,
    fixture('U+0-7F') // Basic Latin
);

test(
    'should pass through a unicode range that cannot be reduced (2)',
    passthroughCSS,
    fixture('U+2125-2128')
);

test(
    'should pass through a unicode range that cannot be reduced (3)',
    passthroughCSS,
    fixture('U+2012-2F12')
);

test(
    'should pass through a unicode range that cannot be reduced (4)',
    passthroughCSS,
    fixture('U+2002-2FF2')
);

test(
    'should pass through css variables',
    passthroughCSS,
    fixture('var(--caseInsensitive)')
);

test(
    'should pass through initial',
    passthroughCSS,
    fixture('initial')
);

test(
    'should upcase the unicode-range property/value pair',
    processCSS,
    '@font-face{font-family:test;UNICODE-RANGE:u+07-f}*{font-family:test}',
    '@font-face{font-family:test;UNICODE-RANGE:U+07-F}*{font-family:test}'
);

test(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
