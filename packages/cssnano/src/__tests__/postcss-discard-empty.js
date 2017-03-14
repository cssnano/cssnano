import test from 'ava';
import processCss from './_processCss';

test(
    'should remove empty @ rules',
    processCss,
    '@font-face;',
    '',
);

test(
    'should remove empty @ rules (2)',
    processCss,
    '@font-face {}',
    '',
);

test.skip(
    'should not mangle @ rules with parameters',
    processCss,
    '@charset "utf-8";',
    '@charset "utf-8";',
    {normalizeCharset: false},
);

test(
    'should remove empty rules',
    processCss,
    'h1{}h2{}h4{}h5,h6{}',
    '',
);

test(
    'should remove empty declarations',
    processCss,
    'h1{color:}',
    '',
);

test(
    'should remove null selectors',
    processCss,
    '{color:blue}',
    '',
);

test(
    'should remove null selectors in media queries',
    processCss,
    '@media screen, print {{}}',
    '',
);

test(
    'should remove empty media queries',
    processCss,
    '@media screen, print {h1,h2{}}',
    '',
);
