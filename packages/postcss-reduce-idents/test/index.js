'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const postcss = require('postcss');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');
const encode = require('../src/lib/encode.js');
const plugin = require('../src/index.js');

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should rename keyframes',
  processCSS(
    '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
    '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}'
  )
);

test(
  'should rename keyframes (uppercase)',
  processCSS(
    '@KEYFRAMES whiteToBlack{0%{color:#fff}to{color:#000}}.one{ANIMATION-NAME:whiteToBlack}',
    '@KEYFRAMES a{0%{color:#fff}to{color:#000}}.one{ANIMATION-NAME:a}'
  )
);

test(
  'should rename multiple keyframes',
  processCSS(
    '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes fadeOut{0%{opacity:1}to{opacity:0}}.one{animation-name:whiteToBlack}.two{animation-name:fadeOut}',
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{opacity:1}to{opacity:0}}.one{animation-name:a}.two{animation-name:b}'
  )
);

test(
  'should rename multiple keyframes (uppercase)',
  processCSS(
    '@KEYFRAMES whiteToBlack{0%{color:#fff}to{color:#000}}@KEYFRAMES fadeOut{0%{opacity:1}to{opacity:0}}.one{animation-name:whiteToBlack}.two{animation-name:fadeOut}',
    '@KEYFRAMES a{0%{color:#fff}to{color:#000}}@KEYFRAMES b{0%{opacity:1}to{opacity:0}}.one{animation-name:a}.two{animation-name:b}'
  )
);

test(
  'should reuse the same animation name for vendor prefixed keyframes',
  processCSS(
    '@-webkit-keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:whiteToBlack;animation-name:whiteToBlack}',
    '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:a;animation-name:a}'
  )
);

test(
  'should reuse the same animation name for vendor prefixed keyframes #1',
  processCSS(
    '@-WEBKIT-KEYFRAMES whiteToBlack{0%{color:#fff}to{color:#000}}@KEYFRAMES whiteToBlack{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:whiteToBlack;animation-name:whiteToBlack}',
    '@-WEBKIT-KEYFRAMES a{0%{color:#fff}to{color:#000}}@KEYFRAMES a{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:a;animation-name:a}'
  )
);

test(
  'should support multiple animations',
  processCSS(
    '@keyframes one{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes two{0%{border-width:0;opacity:0}}.loader{animation:one  1250ms  infinite linear, two .3s ease-out both}',
    '@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes b{0%{border-width:0;opacity:0}}.loader{animation:a  1250ms  infinite linear, b .3s ease-out both}'
  )
);

test(
  'should support multiple animations (uppercase)',
  processCSS(
    '@KEYFRAMES one{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@KEYFRAMES two{0%{border-width:0;opacity:0}}.loader{animation:one  1250ms  infinite linear, two .3s ease-out both}',
    '@KEYFRAMES a{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@KEYFRAMES b{0%{border-width:0;opacity:0}}.loader{animation:a  1250ms  infinite linear, b .3s ease-out both}'
  )
);

test(
  'should not touch animation names that are not defined in the file',
  passthroughCSS('.one{animation-name:fadeInUp}')
);

test(
  'should not touch animation names that are not defined in the file (uppercase)',
  passthroughCSS('.one{ANIMATION-NAME:fadeInUp}')
);

test(
  'should not touch keyframes that are not referenced in the file',
  passthroughCSS('@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}')
);

test(
  'should not touch keyframes & animation names, combined',
  passthroughCSS(
    '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:fadeInUp}'
  )
);

test(
  'should rename counter styles',
  processCSS(
    '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
    '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}'
  )
);

test(
  'should rename counter styles (uppercase)',
  processCSS(
    '@COUNTER-STYLE custom{system:extends decimal;suffix:"> "}ol{LIST-STYLE:custom}',
    '@COUNTER-STYLE a{system:extends decimal;suffix:"> "}ol{LIST-STYLE:a}'
  )
);

test(
  'should rename multiple counter styles & be aware of extensions',
  processCSS(
    '@counter-style custom{system:extends decimal;suffix:"> "}@counter-style custom2{system:extends  custom;prefix:"-"}ol{list-style:custom2}',
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends  a;prefix:"-"}ol{list-style:b}'
  )
);

test(
  'should not touch counter styles that are not referenced in the file',
  passthroughCSS('@counter-style custom{system:extends decimal;suffix:"> "}')
);

test(
  'should not touch list-styles that are not defined in the file',
  passthroughCSS('ol{list-style:custom2}')
);

test(
  'should rename counters',
  processCSS(
    'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}'
  )
);

test(
  'should rename counters (uppercase)',
  processCSS(
    'body{COUNTER-RESET:section}h3:before{COUNTER-INCREMENT:section;CONTENT:"Section" counter(section) ": "}',
    'body{COUNTER-RESET:a}h3:before{COUNTER-INCREMENT:a;CONTENT:"Section" counter(a) ": "}'
  )
);

test(
  'should rename counters (2)',
  processCSS(
    'h3:before{content:counter(section, section2);counter-increment:section}',
    'h3:before{content:counter(a, section2);counter-increment:a}'
  )
);

test(
  'should rename counters (3)',
  processCSS(
    'li{counter-increment:list-item}li::marker{content:"(" counters(list-item,".") ")"}',
    'li{counter-increment:a}li::marker{content:"(" counters(a,".") ")"}'
  )
);

test(
  'should rename counters (3) (uppercase)',
  processCSS(
    'li{counter-increment:list-item}li::marker{content:"(" COUNTERS(list-item,".") ")"}',
    'li{counter-increment:a}li::marker{content:"(" COUNTERS(a,".") ")"}'
  )
);

test(
  'should rename multiple counters',
  processCSS(
    'h1:before{counter-reset:chapter 1 section page 1;content: counter(chapter) \t "."  counter(section) " (pg." counter(page) ") "}',
    'h1:before{counter-reset:a 1 b c 1;content: counter(a) "." counter(b) " (pg." counter(c) ") "}'
  )
);

test(
  'should rename multiple counters with random order',
  processCSS(
    'h1:before{content: counter(chapter) "." counter(section) " (pg." counter(page) ") ";counter-reset:chapter 1 section  page 1}',
    'h1:before{content: counter(a) "." counter(b) " (pg." counter(c) ") ";counter-reset:a 1 b  c 1}'
  )
);

test(
  'should not touch counters that are not outputted',
  passthroughCSS('h1{counter-reset:chapter 1 section page 1}')
);

test(
  'should not touch counter functions which are not defined',
  passthroughCSS('h1:before{content:counter(chapter) ". "}')
);

test(
  'should not touch keyframes names',
  processCSS(
    [
      '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
      '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
      'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    ].join(''),
    [
      '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
      '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}',
      'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}',
    ].join(''),
    { keyframes: false }
  )
);

test(
  'should not touch counter styles',
  processCSS(
    [
      '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
      '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
      'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    ].join(''),
    [
      '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}',
      '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
      'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}',
    ].join(''),
    { counterStyle: false }
  )
);

test(
  'should not touch counter functions',
  processCSS(
    [
      '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
      '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
      'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    ].join(''),
    [
      '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}',
      '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}',
      'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    ].join(''),
    { counter: false }
  )
);

test(
  'should rename grid-template-areas and grid-area',
  processCSS(
    [
      'body{grid-template-areas:"head head" \n"nav  main"\n"nav  foot";}',
      'header { grid-area: head }',
      'nav{grid-area:nav}',
      'main{grid-area:main}',
      'footer{grid-area:foot}',
    ].join(''),
    [
      'body{grid-template-areas:"a a" "b c" "b d";}',
      'header { grid-area: a }',
      'nav{grid-area:b}',
      'main{grid-area:c}',
      'footer{grid-area:d}',
    ].join('')
  )
);

test(
  'should leave grid-template-rows',
  processCSS(
    [
      'body{grid-template-areas:"head head" \n"nav  main"\n"nav  foot"; grid-template-rows: 1fr 1fr 1fr;}',
      'header { grid-area: head }',
      'nav{grid-area:nav}',
      'main{grid-area:main}',
      'footer{grid-area:foot}',
    ].join(''),
    [
      'body{grid-template-areas:"a a" "b c" "b d"; grid-template-rows: 1fr 1fr 1fr;}',
      'header { grid-area: a }',
      'nav{grid-area:b}',
      'main{grid-area:c}',
      'footer{grid-area:d}',
    ].join('')
  )
);

test(
  'should rename grid-template-areas and grid-area (uppercase)',
  processCSS(
    [
      'body{GRID-TEMPLATE-AREAS:"head head" \n"nav  main"\n"nav  foot";}',
      'header { GRID-AREA: head }',
      'nav{GRID-AREA:nav}',
      'main{GRID-AREA:main}',
      'footer{GRID-AREA:foot}',
    ].join(''),
    [
      'body{GRID-TEMPLATE-AREAS:"a a" "b c" "b d";}',
      'header { GRID-AREA: a }',
      'nav{GRID-AREA:b}',
      'main{GRID-AREA:c}',
      'footer{GRID-AREA:d}',
    ].join('')
  )
);

test(
  'should rename grid-template short syntax',
  processCSS(
    [
      'body{grid-template: "head head" 50px "nav main" 1fr "...  foot" 30px / 150px 1fr;}',
      'header { grid-area: head }',
      'nav{grid-area:nav}',
      'main{grid-area:main}',
      'footer{grid-area:foot}',
    ].join(''),
    [
      'body{grid-template: "a a" 50px "b c" 1fr ". d" 30px / 150px 1fr;}',
      'header { grid-area: a }',
      'nav{grid-area:b}',
      'main{grid-area:c}',
      'footer{grid-area:d}',
    ].join('')
  )
);

test(
  'should rename grid-column, grid-column-start and grid-column-end',
  processCSS(
    [
      'body{grid-template-areas:". narrow ." \n"wide wide wide";}',
      '.narrow { grid-column: narrow }',
      '.wide{grid-column:wide}',
      '.left{grid-column:wide/narrow}',
      '.right{grid-column-start:narrow; grid-column-end: wide}',
    ].join(''),
    [
      'body{grid-template-areas:". a ." "b b b";}',
      '.narrow { grid-column: a }',
      '.wide{grid-column:b}',
      '.left{grid-column:b/a}',
      '.right{grid-column-start:a; grid-column-end: b}',
    ].join('')
  )
);

test(
  'should rename grid-column, grid-column-start and grid-column-end (uppercase)',
  processCSS(
    [
      'body{GRID-TEMPLATE-AREAS:". narrow ." \n"wide wide wide";}',
      '.narrow { GRID-COLUMN: narrow }',
      '.wide{GRID-COLUMN:wide}',
      '.left{GRID-COLUMN:wide/narrow}',
      '.right{GRID-COLUMN-START:narrow; GRID-COLUMN-END: wide}',
    ].join(''),
    [
      'body{GRID-TEMPLATE-AREAS:". a ." "b b b";}',
      '.narrow { GRID-COLUMN: a }',
      '.wide{GRID-COLUMN:b}',
      '.left{GRID-COLUMN:b/a}',
      '.right{GRID-COLUMN-START:a; GRID-COLUMN-END: b}',
    ].join('')
  )
);

test(
  'should rename grid-row, grid-row-start and grid-row-end',
  processCSS(
    [
      'body{grid-template-areas:"full ." \n"full middle" \n"full .";}',
      '.full { grid-row: full }',
      '.middle{grid-row:middle}',
      '.top{grid-row:full/middle}',
      '.bottom{grid-row-start:middle; grid-row-end: full}',
    ].join(''),
    [
      'body{grid-template-areas:"a ." "a b" "a .";}',
      '.full { grid-row: a }',
      '.middle{grid-row:b}',
      '.top{grid-row:a/b}',
      '.bottom{grid-row-start:b; grid-row-end: a}',
    ].join('')
  )
);

test(
  'should rename grid-row, grid-row-start and grid-row-end (uppercase)',
  processCSS(
    [
      'body{GRID-TEMPLATE-AREAS:"full ." \n"full middle" \n"full .";}',
      '.full { GRID-ROW: full }',
      '.middle{GRID-ROW:middle}',
      '.top{GRID-ROW:full/middle}',
      '.bottom{GRID-ROW-START:middle; GRID-ROW-END: full}',
    ].join(''),
    [
      'body{GRID-TEMPLATE-AREAS:"a ." "a b" "a .";}',
      '.full { GRID-ROW: a }',
      '.middle{GRID-ROW:b}',
      '.top{GRID-ROW:a/b}',
      '.bottom{GRID-ROW-START:b; GRID-ROW-END: a}',
    ].join('')
  )
);

test(
  'should not rename uppercase reserved keywords in grid-row, grid-row-start and grid-row-end',
  processCSS(
    [
      'body{grid-template-areas:"full ." \n"full middle" \n"full .";}',
      '.full { grid-row: AUTO }',
      '.middle{grid-row:INHERIT}',
      '.top{grid-row:full/middle}',
      '.bottom{grid-row-start:middle; grid-row-end: full}',
    ].join(''),
    [
      'body{grid-template-areas:"a ." "a b" "a .";}',
      '.full { grid-row: AUTO }',
      '.middle{grid-row:INHERIT}',
      '.top{grid-row:a/b}',
      '.bottom{grid-row-start:b; grid-row-end: a}',
    ].join('')
  )
);

test(
  'should not touch grid templates',
  passthroughCSS(
    [
      'body{grid-template-areas:"head head" \n"nav  main"\n"nav  foot";}',
      'header { grid-area: head }',
      'nav{grid-area:nav}',
      'main{grid-area:main}',
      'footer{grid-area:foot}',
    ].join(''),
    { gridTemplate: false }
  )
);

test(
  'should not rename reserved keywords in grid areas',
  passthroughCSS(
    [
      'body{grid-template: repeat(4, 1fr) / auto 100px;}',
      'main{grid-area: 2 / 2 / auto / span 3;}',
    ].join(''),
    { gridTemplate: true }
  )
);

test(
  'should allow a custom prefix',
  processCSS(
    [
      '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation: 100ms whiteToBlack}',
      '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
      'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    ].join(''),
    [
      '@keyframes PREFIXwhiteToBlack{0%{color:#fff}to{color:#000}}.one{animation: 100ms PREFIXwhiteToBlack}',
      '@counter-style PREFIXcustom{system:extends decimal;suffix:"> "}ol{list-style:PREFIXcustom}',
      'body{counter-reset:PREFIXsection}h3:before{counter-increment:PREFIXsection;content:"Section" counter(PREFIXsection) ": "}',
    ].join(''),
    { encoder: (val) => `PREFIX${val}` }
  )
);

test('should not generate same ident when plugin instance is reused', () => {
  const instance = postcss(plugin);

  return Promise.all([
    instance.process(
      '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
      { from: undefined }
    ),
    instance.process(
      '@KEYFRAMES whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
      { from: undefined }
    ),
    instance.process(
      '@keyframes fadeOut{0%{opacity:1}to{opacity:0}}.two{animation-name:fadeOut}',
      { from: undefined }
    ),
    instance.process(
      '@KEYFRAMES fadeOut{0%{opacity:1}to{opacity:0}}.two{animation-name:fadeOut}',
      { from: undefined }
    ),
  ]).then(([result1, result2, result3, result4]) => {
    assert.is(
      result1.css,
      '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}'
    );
    assert.is(
      result2.css,
      '@KEYFRAMES a{0%{color:#fff}to{color:#000}}.one{animation-name:a}'
    );
    assert.is(
      result3.css,
      '@keyframes b{0%{opacity:1}to{opacity:0}}.two{animation-name:b}'
    );
    assert.is(
      result4.css,
      '@KEYFRAMES b{0%{opacity:1}to{opacity:0}}.two{animation-name:b}'
    );
  });
});

test('encoder', () => {
  let iterations = new Array(1984);
  let arr = Array.apply([], iterations).map((a, b) => b);
  let cache = [];

  arr.map((num) => {
    let encoded = encode(null, num);

    cache.push(encoded);

    let indexes = cache.filter((c) => c === encoded);

    assert.is(indexes.length, 1);
  });
});

test('encoder gen spec', () => {
  const edgeCaseList = {
    0: 'a',
    1: 'b',
    51: 'Z',
    52: 'aa',
    53: 'ba',
    103: 'Za',
    104: 'ab',
    2704: 'aZ',
    2755: 'ZZ',
    2756: 'a0',
    2807: 'Z0',
    3380: 'aaa',
    3431: 'Zaa',
    216372: 'aaaa',
    216373: 'baaa',
    216423: 'Zaaa',
    13847860: 'aaaaa',
  };
  Object.keys(edgeCaseList).forEach((num) => {
    assert.is(encode(null, num), edgeCaseList[num]);
  });
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
test.run();
