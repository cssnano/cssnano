import { test } from 'node:test';
import {
  processCSSFactory,
  presetEntryPlugin,
} from '../../../../util/testHelpers.js';
const plugin = presetEntryPlugin('discardUnused');

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should remove unused counter styles',
  processCSS('@counter-style custom{system:extends decimal;suffix:"> "}', '')
);

test(
  'should be aware of extensions',
  passthroughCSS(
    '@counter-style custom{system:extends decimal;suffix:"> "}@counter-style custom2{system:extends custom;suffix:"| "}a{list-style: custom2}'
  )
);

test(
  'should remove unused counters & keep used counters',
  processCSS(
    '@counter-style custom{system:extends decimal;suffix:"> "}@counter-style custom2{system:extends decimal;suffix:"| "}a{list-style: custom2}',
    '@counter-style custom2{system:extends decimal;suffix:"| "}a{list-style: custom2}'
  )
);

test(
  'should remove counter styles if they have no identifier',
  processCSS('@counter-style {system:extends decimal;suffix:"> "}', '')
);

test(
  'should remove unused keyframes',
  processCSS('@keyframes fadeOut{0%{opacity:1}to{opacity:0}}', '')
);

test(
  'should remove unused keyframes & keep used keyframes',
  processCSS(
    '@keyframes fadeOut{0%{opacity:1}to{opacity:0}}@keyframes fadeIn{0%{opacity:0}to{opacity:1}}a{animation-name:fadeIn}',
    '@keyframes fadeIn{0%{opacity:0}to{opacity:1}}a{animation-name:fadeIn}'
  )
);

test(
  'should recognize ASCII case-insensitive at-rules and descriptors',
  processCSS(
    '@KEYFRAMES fadeIn{0%{opacity:0}to{opacity:1}}@COUNTER-STYLE custom{SYSTEM:extends decimal} @FONT-FACE{FONT-FAMILY:Used;SRC:url(font.woff)}a{ANIMATION:fadeIn 1s;LIST-STYLE:custom;FONT-FAMILY:Used}',
    '@KEYFRAMES fadeIn{0%{opacity:0}to{opacity:1}}@COUNTER-STYLE custom{SYSTEM:extends decimal} @FONT-FACE{FONT-FAMILY:Used;SRC:url(font.woff)}a{ANIMATION:fadeIn 1s;LIST-STYLE:custom;FONT-FAMILY:Used}'
  )
);

test(
  'should not recognize Unicode lookalikes as discardable names',
  passthroughCSS(
    '@KEYFRAMES fade{0%{opacity:0}to{opacity:1}}@counter-ſtyle custom{system:extends decimal}@font-ſace{font-family:Used}a{animation:fade 1s}'
  )
);

test(
  'should remove keyframes if they have no identifier',
  processCSS('@keyframes {0%{opacity:0}to{opacity:1}}', '')
);

test(
  'should support multiple animations',
  passthroughCSS(
    '@keyframes one{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes two{0%{border-width:0;opacity:0}}.loader{animation:one 1250ms infinite linear,two .3s ease-out both}'
  )
);

test(
  'should remove unused fonts',
  processCSS(
    '@font-face {font-family:"Does Not Exist";src:url("fonts/does-not-exist.ttf") format("truetype")}',
    ''
  )
);

test(
  'should remove unused fonts (2)',
  processCSS(
    '@font-face {font-family:"Does Not Exist";src:url("fonts/does-not-exist.ttf") format("truetype")}@font-face {font-family:"Does Exist";src: url("fonts/does-exist.ttf") format("truetype")}',
    ''
  )
);

test(
  'should remove unused fonts & keep used fonts',
  processCSS(
    '@font-face {font-family:"Does Not Exist";src:url("fonts/does-not-exist.ttf") format("truetype")}@font-face {font-family:"Does Exist";src: url("fonts/does-exist.ttf") format("truetype")}body{font-family:"Does Exist",Helvetica,Arial,sans-serif}',
    '@font-face {font-family:"Does Exist";src: url("fonts/does-exist.ttf") format("truetype")}body{font-family:"Does Exist",Helvetica,Arial,sans-serif}'
  )
);

test(
  'should work with the font shorthand',
  passthroughCSS(
    '@font-face {font-family:"Does Exist";src: url("fonts/does-exist.ttf") format("truetype")}body{font: 10px/1.5 "Does Exist",Helvetica,Arial,sans-serif}'
  )
);

test(
  'should keep a font face whose quoted family is written unquoted in a rule',
  passthroughCSS(
    '@font-face {font-family:"Does Exist";src:url("fonts/does-exist.ttf") format("truetype")}body{font-family:Does Exist}'
  )
);

test(
  'should remove font faces if they have no font-family property',
  processCSS(
    '@font-face {src:url("fonts/does-not-exist.ttf") format("truetype")}',
    ''
  )
);

test(
  'should not remove fonts used with a different casing',
  passthroughCSS(
    '@font-face {font-family:"DoEs ExIst";src: url("fonts/does-exist.ttf") format("truetype")}body{font: 10px/1.5 "does exisT",Helvetica,Arial,sans-serif}'
  )
);

test(
  "shouldn't remove font fames",
  processCSS(
    [
      '@font-face {src:url("fonts/does-not-exist.ttf") format("truetype")}',
      '@keyframes {0%{opacity:0}to{opacity:1}}',
      '@counter-style custom{system:extends decimal;suffix:"> "}',
    ].join(''),
    '@font-face {src:url("fonts/does-not-exist.ttf") format("truetype")}',
    { fontFace: false }
  )
);

test(
  "shouldn't remove keyframes if they have no identifier",
  processCSS(
    [
      '@keyframes {0%{opacity:0}to{opacity:1}}',
      '@font-face {src:url("fonts/does-not-exist.ttf") format("truetype")}',
      '@counter-style custom{system:extends decimal;suffix:"> "}',
    ].join(''),
    '@keyframes {0%{opacity:0}to{opacity:1}}',
    { keyframes: false }
  )
);

test(
  "shouldn't remove unused counter styles",
  processCSS(
    [
      '@counter-style custom{system:extends decimal;suffix:"> "}',
      '@font-face {src:url("fonts/does-not-exist.ttf") format("truetype")}',
      '@keyframes {0%{opacity:0}to{opacity:1}}',
    ].join(''),
    '@counter-style custom{system:extends decimal;suffix:"> "}',
    { counterStyle: false }
  )
);

test(
  'should not crash with empty layers',
  processCSS('@layer a;', '@layer a;')
);

test(
  'should keep a keyframes whose escaped name decodes to the name an animation uses',
  passthroughCSS('@keyframes \\66oo{0%{opacity:0}}a{animation:foo 1s}')
);

test(
  'should keep a keyframes that an animation names with an escape',
  passthroughCSS('@keyframes foo{0%{opacity:0}}a{animation-name:\\66oo}')
);

test(
  'should keep a keyframes that an animation names with a string',
  passthroughCSS('@keyframes foo{0%{opacity:0}}a{animation-name:"foo"}')
);

test(
  'should keep a keyframes named by a string that an identifier references',
  passthroughCSS('@keyframes "foo"{0%{opacity:0}}a{animation-name:foo}')
);

test(
  'should remove an escaped keyframes that no animation names',
  processCSS(
    '@keyframes \\66oo{0%{opacity:0}}a{animation-name:bar}',
    'a{animation-name:bar}'
  )
);

test(
  'should compare keyframes names case-sensitively after decoding an escape',
  processCSS(
    '@keyframes \\46oo{0%{opacity:0}}a{animation-name:foo}',
    'a{animation-name:foo}'
  )
);

test(
  'should keep a keyframes whose escaped name follows a comment in the prelude',
  passthroughCSS('@keyframes /*c*/ \\66oo{0%{opacity:0}}a{animation-name:foo}')
);

test(
  'should keep an escaped keyframes that a later animation in a list names',
  passthroughCSS('@keyframes foo{0%{opacity:0}}a{animation:a 1s,\\66oo 2s}')
);

test(
  'should remove a keyframes whose prelude has several names, since no animation can name it',
  processCSS(
    '@keyframes foo bar{0%{opacity:0}}a{animation-name:foo}',
    'a{animation-name:foo}'
  )
);

test(
  'should keep keyframes when an animation value uses var(), which may name any of them',
  passthroughCSS(
    '@keyframes foo{0%{opacity:0}to{opacity:1}}:root{--a:foo}a{animation:var(--a) 1s}'
  )
);

test(
  'should keep a font face when a font-family value uses var(), which may name any family',
  passthroughCSS(
    '@font-face{font-family:Roboto;src:url(a.woff)}:root{--x:Roboto}a{font-family:var(--x)}'
  )
);

test(
  'should keep a font face when a font shorthand uses var(), which may name any family',
  passthroughCSS(
    '@font-face{font-family:Roboto;src:url(a.woff)}:root{--x:Roboto}a{font:12px var(--x)}'
  )
);

test(
  'should keep keyframes when an animation value uses env(), which may name any of them',
  passthroughCSS(
    '@keyframes foo{0%{opacity:0}to{opacity:1}}a{animation:env(--a) 1s}'
  )
);

test(
  'should keep keyframes when an animation-name value uses an untyped attr(), whose string may name any of them',
  passthroughCSS(
    '@keyframes foo{0%{opacity:0}to{opacity:1}}a{animation-name:attr(data-a)}'
  )
);

test(
  'should keep keyframes when an animation value uses a custom function, which may return any name',
  passthroughCSS(
    '@keyframes foo{0%{opacity:0}to{opacity:1}}a{animation:--pick() 1s}'
  )
);

test(
  'should keep a font face when a font-family value uses an untyped attr(), whose string may name any family',
  passthroughCSS(
    '@font-face{font-family:Roboto;src:url(a.woff)}a{font-family:attr(data-f)}'
  )
);

test(
  'should remove a font face without a family even when a font-family value uses var()',
  processCSS(
    '@font-face{src:url(a.woff)}a{font-family:var(--x)}',
    'a{font-family:var(--x)}'
  )
);
