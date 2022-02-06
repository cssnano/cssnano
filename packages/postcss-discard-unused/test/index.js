'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');

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
  'should not be responsible for normalising fonts',
  processCSS(
    '@font-face {font-family:"Does Exist";src:url("fonts/does-exist.ttf") format("truetype")}body{font-family:Does Exist}',
    'body{font-family:Does Exist}'
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

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
test.run();
