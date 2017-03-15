import test from 'ava';
import plugin from '..';
import {
    usePostCSSPlugin,
    processCSSFactory,
    processCSSWithPresetFactory,
} from '../../../../util/testHelpers';

const {passthroughCSS, processCSS} = processCSSFactory(plugin);
const {
    processCSS: withDefaultPreset,
    passthroughCSS: passthroughDefault,
} = processCSSWithPresetFactory('default');

test(
    'should not unquote font names with a leading number',
    passthroughCSS,
    'h1{font-family:"11880-icons"!important;}'
);

test(
    'should unquote font names',
    processCSS,
    'h1{font-family:"Helvetica Neue"}',
    'h1{font-family:Helvetica Neue}'
);

test(
    'should unquote and join identifiers with a slash, if numeric',
    processCSS,
    'h1{font-family:"Bond 007"}',
    'h1{font-family:Bond\\ 007}'
);

test(
    'should not unquote if it would produce a bigger identifier',
    passthroughCSS,
    'h1{font-family:"Call 0118 999 881 999 119 725 3"}'
);

test(
    'should not unquote font names if they contain keywords',
    passthroughCSS,
    'h1{font-family:"slab serif"}'
);

test(
    'should minimise space inside a legal font name',
    processCSS,
    'h1{font-family:Lucida     Grande}',
    'h1{font-family:Lucida Grande}'
);

test(
    'should minimise space around a list of font names',
    processCSS,
    'h1{font-family:Arial, Helvetica, sans-serif}',
    'h1{font-family:Arial,Helvetica,sans-serif}'
);

test(
    'should dedupe font family names',
    processCSS,
    'h1{font-family:Helvetica,Arial,Helvetica,sans-serif}',
    'h1{font-family:Helvetica,Arial,sans-serif}'
);

test(
    'should discard the rest of the declaration after a keyword',
    processCSS,
    'h1{font-family:Arial,sans-serif,Arial,"Trebuchet MS"}',
    'h1{font-family:Arial,sans-serif}',
    {removeAfterKeyword: true}
);

test(
    'should convert the font shorthand property',
    processCSS,
    'h1{font:italic small-caps normal 13px/150% "Helvetica Neue", sans-serif}',
    'h1{font:italic small-caps normal 13px/150% Helvetica Neue,sans-serif}'
);

test(
    'should convert shorthand with zero unit line height',
    processCSS,
    'h1{font:italic small-caps normal 13px/1.5 "Helvetica Neue", sans-serif}',
    'h1{font:italic small-caps normal 13px/1.5 Helvetica Neue,sans-serif}'
);

test(
    'should convert the font shorthand property, unquoted',
    processCSS,
    'h1{font:italic Helvetica Neue,sans-serif,Arial}',
    'h1{font:italic Helvetica Neue,sans-serif}',
    {removeAfterKeyword: true}
);

test(
    'should join identifiers in the shorthand property',
    processCSS,
    'h1{font:italic "Bond 007",sans-serif}',
    'h1{font:italic Bond\\ 007,sans-serif}'
);

test(
    'should join non-digit identifiers in the shorthand property',
    processCSS,
    'h1{font:italic "Bond !",serif}',
    'h1{font:italic Bond\\ !,serif}'
);

test(
    'should correctly escape special characters at the start',
    processCSS,
    'h1{font-family:"$42"}',
    'h1{font-family:\\$42}'
);

test(
    'should not escape legal characters',
    passthroughDefault,
    'h1{font-family:€42}'
);

test(
    'should not join identifiers in the shorthand property',
    passthroughDefault,
    'h1{font:italic "Bond 007 008 009",sans-serif}'
);

test(
    'should escape special characters if unquoting',
    withDefaultPreset,
    'h1{font-family:"Ahem!"}',
    'h1{font-family:Ahem\\!}'
);

test(
    'should not escape multiple special characters',
    passthroughDefault,
    'h1{font-family:"Ahem!!"}'
);

test(
    'should not mangle legal unquoted values',
    passthroughDefault,
    'h1{font-family:\\$42}'
);

test(
    'should not mangle font names',
    passthroughDefault,
    'h1{font-family:Glyphicons Halflings}'
);

test(
    'should not mangle font names (2)',
    passthroughCSS,
    'h1{font-family:FF Din Pro,FF Din Pro Medium}'
);

test(
    'should handle rem values',
    processCSS,
    'h1{font:bold 2.2rem/.9 "Open Sans Condensed", sans-serif}',
    'h1{font:700 2.2rem/.9 Open Sans Condensed,sans-serif}'
);

test(
    'should pass through when it doesn\'t find a font property',
    passthroughCSS,
    'h1{color:black;text-decoration:none}'
);

test(
    'should not remove duplicates',
    passthroughCSS,
    'h1{font-family:Helvetica,Helvetica}',
    {removeDuplicates: false}
);

test(
    'should not remove after keyword',
    passthroughCSS,
    'h1{font-family:serif,Times}',
    {removeAfterKeyword: false}
);

test(
    'should not remove quotes',
    passthroughCSS,
    'h1{font-family:"Glyphicons Halflings","Arial"}',
    {removeQuotes: false}
);

test(
    'should not dedupe monospace',
    passthroughCSS,
    'font-family:monospace,monospace'
);

test(
    'should not dedupe monospace (2)',
    passthroughCSS,
    'font:italic small-caps normal 13px/150% monospace,monospace'
);

test(
    'should not mangle custom props',
    passthroughCSS,
    ':root{--sans:Helvetica}header{font-family:var(--sans)}'
);

test(
    'should minify font-weight',
    processCSS,
    'h1{font-weight:bold}',
    'h1{font-weight:700}'
);

test(
    'should pass through unrelated font properties',
    passthroughCSS,
    'h1{font-style:normal}'
);

test(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
