import test from 'ava';
import processCss from './_processCss';

test(
    'should unquote font names',
    processCss,
    'h1{font-family:"Helvetica Neue"}',
    'h1{font-family:Helvetica Neue}',
);

test(
    'should unquote and join identifiers with a slash, if numeric',
    processCss,
    'h1{font-family:"Bond 007"}',
    'h1{font-family:Bond\\ 007}',
);

test(
    'should not unquote if it would produce a bigger identifier',
    processCss,
    'h1{font-family:"Call 0118 999 881 999 119 725 3"}',
    'h1{font-family:"Call 0118 999 881 999 119 725 3"}',
);

test(
    'should not unquote font names if they contain keywords',
    processCss,
    'h1{font-family:"slab serif"}',
    'h1{font-family:"slab serif"}',
);

test(
    'should minimise space inside a legal font name',
    processCss,
    'h1{font-family:Lucida     Grande}',
    'h1{font-family:Lucida Grande}',
);

test(
    'should minimise space around a list of font names',
    processCss,
    'h1{font-family:Arial, Helvetica, sans-serif}',
    'h1{font-family:Arial,Helvetica,sans-serif}',
);

test(
    'should dedupe font family names',
    processCss,
    'h1{font-family:Helvetica,Arial,Helvetica,sans-serif}',
    'h1{font-family:Helvetica,Arial,sans-serif}',
);

test.skip(
    'should discard the rest of the declaration after a keyword',
    processCss,
    'h1{font-family:Arial,sans-serif,Arial,"Trebuchet MS"}',
    'h1{font-family:Arial,sans-serif}',
);

test(
    'should convert the font shorthand property',
    processCss,
    'h1{font:italic small-caps normal 13px/150% "Helvetica Neue", sans-serif}',
    'h1{font:italic small-caps normal 13px/150% Helvetica Neue,sans-serif}',
);

test(
    'should convert shorthand with zero unit line height',
    processCss,
    'h1{font:italic small-caps normal 13px/1.5 "Helvetica Neue", sans-serif}',
    'h1{font:italic small-caps normal 13px/1.5 Helvetica Neue,sans-serif}',
);

test.skip(
    'should convert the font shorthand property, unquoted',
    processCss,
    'h1{font:italic Helvetica Neue,sans-serif,Arial}',
    'h1{font:italic Helvetica Neue,sans-serif}',
);

test(
    'should join identifiers in the shorthand property',
    processCss,
    'h1{font:italic "Bond 007",sans-serif}',
    'h1{font:italic Bond\\ 007,sans-serif}',
);

test(
    'should join non-digit identifiers in the shorthand property',
    processCss,
    'h1{font:italic "Bond !",serif}',
    'h1{font:italic Bond\\ !,serif}',
);

test(
    'should correctly escape special characters at the start',
    processCss,
    'h1{font-family:"$42"}',
    'h1{font-family:\\$42}',
);

test(
    'should not escape legal characters',
    processCss,
    'h1{font-family:€42}',
    'h1{font-family:€42}',
    {normalizeCharset: false},
);

test(
    'should not join identifiers in the shorthand property',
    processCss,
    'h1{font:italic "Bond 007 008 009",sans-serif}',
    'h1{font:italic "Bond 007 008 009",sans-serif}',
);

test(
    'should escape special characters if unquoting',
    processCss,
    'h1{font-family:"Ahem!"}',
    'h1{font-family:Ahem\\!}',
);

test(
    'should not escape multiple special characters',
    processCss,
    'h1{font-family:"Ahem!!"}',
    'h1{font-family:"Ahem!!"}',
);

test(
    'should not mangle legal unquoted values',
    processCss,
    'h1{font-family:\\$42}',
    'h1{font-family:\\$42}',
);

test(
    'should not mangle font names',
    processCss,
    'h1{font-family:Glyphicons Halflings}',
    'h1{font-family:Glyphicons Halflings}',
);
