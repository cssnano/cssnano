'use strict';

module.exports.name = 'cssnano/postcss-minify-font-values';
module.exports.tests = [{
    message: 'should unquote font names',
    fixture: 'h1{font-family:"Helvetica Neue"}',
    expected: 'h1{font-family:Helvetica Neue}'
}, {
    message: 'should unquote and join identifiers with a slash, if numeric',
    fixture: 'h1{font-family:"Bond 007"}',
    expected: 'h1{font-family:Bond\\ 007}'
}, {
    message: 'should not unquote if it would produce a bigger identifier',
    fixture: 'h1{font-family:"Call 0118 999 881 999 119 725 3"}',
    expected: 'h1{font-family:"Call 0118 999 881 999 119 725 3"}'
}, {
    message: 'should not unquote font names if they contain keywords',
    fixture: 'h1{font-family:"slab serif"}',
    expected: 'h1{font-family:"slab serif"}'
}, {
    message: 'should minimise space inside a legal font name',
    fixture: 'h1{font-family:Lucida     Grande}',
    expected: 'h1{font-family:Lucida Grande}'
}, {
    message: 'should minimise space around a list of font names',
    fixture: 'h1{font-family:Arial, Helvetica, sans-serif}',
    expected: 'h1{font-family:Arial,Helvetica,sans-serif}'
}, {
    message: 'should dedupe font family names',
    fixture: 'h1{font-family:Helvetica,Arial,Helvetica,sans-serif}',
    expected: 'h1{font-family:Helvetica,Arial,sans-serif}'
}, {
    message: 'should discard the rest of the declaration after a keyword',
    fixture: 'h1{font-family:Arial,sans-serif,Arial,"Trebuchet MS"}',
    expected: 'h1{font-family:Arial,sans-serif}'
}, {
    message: 'should convert the font shorthand property',
    fixture: 'h1{font:italic small-caps normal 13px/150% "Helvetica Neue", sans-serif}',
    expected: 'h1{font:italic small-caps normal 13px/150% Helvetica Neue,sans-serif}'
}, {
    message: 'should convert shorthand with zero unit line height',
    fixture: 'h1{font:italic small-caps normal 13px/1.5 "Helvetica Neue", sans-serif}',
    expected: 'h1{font:italic small-caps normal 13px/1.5 Helvetica Neue,sans-serif}',
}, {
    message: 'should convert the font shorthand property, unquoted',
    fixture: 'h1{font:italic Helvetica Neue,sans-serif,Arial}',
    expected: 'h1{font:italic Helvetica Neue,sans-serif}'
}, {
    message: 'should join identifiers in the shorthand property',
    fixture: 'h1{font:italic "Bond 007",sans-serif}',
    expected: 'h1{font:italic Bond\\ 007,sans-serif}'
}, {
    message: 'should join non-digit identifiers in the shorthand property',
    fixture: 'h1{font:italic "Bond !",serif}',
    expected: 'h1{font:italic Bond\\ !,serif}'
}, {
    message: 'should correctly escape special characters at the start',
    fixture: 'h1{font-family:"$42"}',
    expected: 'h1{font-family:\\$42}'
}, {
    message: 'should not escape legal characters',
    fixture: 'h1{font-family:€42}',
    expected: 'h1{font-family:€42}',
    options: {normalizeCharset: false}
}, {
    message: 'should not join identifiers in the shorthand property',
    fixture: 'h1{font:italic "Bond 007 008 009",sans-serif}',
    expected: 'h1{font:italic "Bond 007 008 009",sans-serif}'
}, {
    message: 'should escape special characters if unquoting',
    fixture: 'h1{font-family:"Ahem!"}',
    expected: 'h1{font-family:Ahem\\!}'
}, {
    message: 'should not escape multiple special characters',
    fixture: 'h1{font-family:"Ahem!!"}',
    expected: 'h1{font-family:"Ahem!!"}'
}, {
    message: 'should not mangle legal unquoted values',
    fixture: 'h1{font-family:\\$42}',
    expected: 'h1{font-family:\\$42}'
}, {
    message: 'should not mangle font names',
    fixture: 'h1{font-family:Glyphicons Halflings}',
    expected: 'h1{font-family:Glyphicons Halflings}'
}];
