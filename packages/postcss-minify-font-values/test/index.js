var test = require('tape');
var postcss = require('postcss');
var plugin = require('../');
var name = require('../package.json').name;

var tests = [{
    message: 'should not unquote font names with a leading number',
    fixture: 'h1{font-family:"11880-icons"!important;}',
    expected: 'h1{font-family:"11880-icons"!important;}'
}, {
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
    expected: 'h1{font-family:€42}'
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
}, {
    message: 'should not mangle font names (2)',
    fixture: 'h1{font-family:FF Din Pro,FF Din Pro Medium}',
    expected: 'h1{font-family:FF Din Pro,FF Din Pro Medium}'
}, {
    message: 'should handle rem values',
    fixture: 'h1{font:bold 2.2rem/.9 "Open Sans Condensed", sans-serif}',
    expected: 'h1{font:700 2.2rem/.9 Open Sans Condensed,sans-serif}'
}, {
    message: 'should pass through when it doesn\'t find a font property',
    fixture: 'h1{color:black;text-decoration:none}',
    expected: 'h1{color:black;text-decoration:none}'
}, {
    message: 'should not remove duplicates',
    fixture: 'h1{font-family:Helvetica,Helvetica}',
    expected: 'h1{font-family:Helvetica,Helvetica}',
    options: {removeDuplicates: false}
}, {
    message: 'should not remove after keyword',
    fixture: 'h1{font-family:serif,Times}',
    expected: 'h1{font-family:serif,Times}',
    options: {removeAfterKeyword: false}
}, {
    message: 'should not remove quotes',
    fixture: 'h1{font-family:"Glyphicons Halflings", "Arial"}',
    expected: 'h1{font-family:"Glyphicons Halflings","Arial"}',
    options: {removeQuotes: false}
}];

function process (css, options) {
    return postcss(plugin(options)).process(css).css;
}

test(name, function (t) {
    t.plan(tests.length);

    tests.forEach(function (test) {
        var options = test.options || {};
        t.equal(process(test.fixture, options), test.expected, test.message);
    });
});

test('should use the postcss plugin api', function (t) {
    t.plan(2);
    t.ok(plugin().postcssVersion, 'should be able to access version');
    t.equal(plugin().postcssPlugin, name, 'should be able to access name');
});
