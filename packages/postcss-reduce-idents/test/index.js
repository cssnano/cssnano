import nodetest from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import encode from '../src/lib/encode.js';
import plugin from '../src/index.js';

const { describe, test } = nodetest;
const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Rename', () => {
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
});

describe('Reuse', () => {
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
});

describe('Support', () => {
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
});

describe('Touch', () => {
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
});

describe('Rename', () => {
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
});

test(
  'should not touch counter styles that are not referenced in the file',
  passthroughCSS('@counter-style custom{system:extends decimal;suffix:"> "}')
);

test(
  'should not rename a descriptor keyword that reads as a counter style name',
  processCSS(
    [
      '@counter-style words{system:cyclic;symbols:"x"}',
      '@counter-style fixed{system:cyclic;symbols:"y"}',
      '@counter-style custom{system:fixed 3;symbols:"0";speak-as:words}',
      'ol{list-style:custom}',
    ].join(''),
    [
      '@counter-style words{system:cyclic;symbols:"x"}',
      '@counter-style fixed{system:cyclic;symbols:"y"}',
      '@counter-style a{system:fixed 3;symbols:"0";speak-as:words}',
      'ol{list-style:a}',
    ].join('')
  )
);

test(
  'should not touch list-styles that are not defined in the file',
  passthroughCSS('ol{list-style:custom2}')
);

describe('Rename', () => {
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
      'li{counter-increment:item}li::marker{content:"(" counters(item,".") ")"}',
      'li{counter-increment:a}li::marker{content:"(" counters(a,".") ")"}'
    )
  );

  test(
    'should rename counters (3) (uppercase)',
    processCSS(
      'li{counter-increment:item}li::marker{content:"(" COUNTERS(item,".") ")"}',
      'li{counter-increment:a}li::marker{content:"(" COUNTERS(a,".") ")"}'
    )
  );

  test(
    'should rename multiple counters',
    processCSS(
      'h1:before{counter-reset:chapter 1 section pagenum 1;content: counter(chapter) \t "."  counter(section) " (pg." counter(pagenum) ") "}',
      'h1:before{counter-reset:a 1 b c 1;content: counter(a) "." counter(b) " (pg." counter(c) ") "}'
    )
  );

  test(
    'should rename multiple counters with random order',
    processCSS(
      'h1:before{content: counter(chapter) "." counter(section) " (pg." counter(pagenum) ") ";counter-reset:chapter 1 section  pagenum 1}',
      'h1:before{content: counter(a) "." counter(b) " (pg." counter(c) ") ";counter-reset:a 1 b  c 1}'
    )
  );

  test(
    'should not rename the counters the user agent maintains',
    passthroughCSS(
      '@page{counter-reset:page 1}ol{counter-reset:list-item 3}li:before{content:counter(list-item) "/" counter(page)}'
    )
  );

  test(
    'should rename a counter referenced from string-set',
    processCSS(
      'h1{counter-reset:chapter;string-set:title counter(chapter)}p:before{content:counter(chapter)}',
      'h1{counter-reset:a;string-set:title counter(a)}p:before{content:counter(a)}'
    )
  );

  test(
    'should rename counters defined with counter-set',
    processCSS(
      'body{counter-set:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
      'body{counter-set:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}'
    )
  );

  test(
    'should rename counters with counter-set and counter-reset together',
    processCSS(
      'body{counter-reset:section;counter-set:subsection}h3:before{counter-increment:subsection;content:counter(section) "." counter(subsection)}',
      'body{counter-reset:a;counter-set:b}h3:before{counter-increment:b;content:counter(a) "." counter(b)}'
    )
  );
});

describe('Touch', () => {
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
});

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

describe('Rename', () => {
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
    'should rename gridline names inside repeat() and minmax()',
    processCSS(
      [
        'body{grid-template-columns:repeat(2,[narrow] 1fr) minmax([wide] 100px,1fr);}',
        '.narrow{grid-column:narrow}',
        '.wide{grid-column:wide}',
      ].join(''),
      [
        'body{grid-template-columns:repeat(2,[a] 1fr) minmax([b] 100px,1fr);}',
        '.narrow{grid-column:a}',
        '.wide{grid-column:b}',
      ].join('')
    )
  );
});

test(
  'should leave the line numbers of a grid placement alone',
  processCSS(
    [
      'body{grid-template-areas:". narrow ." "wide wide wide";}',
      '.left{grid-column:1/narrow}',
      '.right{grid-column:2/wide}',
    ].join(''),
    [
      'body{grid-template-areas:". a ." "b b b";}',
      '.left{grid-column:1/a}',
      '.right{grid-column:2/b}',
    ].join('')
  )
);

describe('Rename', () => {
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
    'should rename grid-template-columns',
    processCSS(
      `.grid {
  display: grid;
  grid-template-columns:
    [kw] 2.5em
    [day] 3em
    [description] 10em;
}
.grid > .kw {
  grid-column: kw;
}
.grid > .day {
  grid-column: day;
}
.grid > .description {
  grid-column: description;
}`,
      `.grid {
  display: grid;
  grid-template-columns:
    [a] 2.5em [b] 3em [c] 10em;
}
.grid > .kw {
  grid-column: a;
}
.grid > .day {
  grid-column: b;
}
.grid > .description {
  grid-column: c;
}`
    )
  );

  test(
    'should rename a list of grid-template-rows',
    processCSS(
      '.grid {grid-template-rows: [linename1 linename2] 100px;} .a { grid-row: linename1;}',
      '.grid {grid-template-rows: [a b] 100px;} .a { grid-row: a;}'
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
});

test(
  'should preserve grid template area order',
  passthroughCSS(`.project {
  display: grid;
  grid-template-areas:
    'b a' 'b c';
}`)
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

// Which declarations name an identifier, and which keywords such a name
// cannot be, come from `@webref/css`. These are the cases the property name
// heuristics that preceded that data got wrong.

test(
  'should not rename a keyframes name in a property that does not take one',
  processCSS(
    '@keyframes fade{from{opacity:0}}.a{animation-name:fade;animation-timing-function:fade}',
    '@keyframes a{from{opacity:0}}.a{animation-name:a;animation-timing-function:fade}'
  )
);

test(
  'should not touch a keyframes name that reads as an animation keyword',
  passthroughCSS(
    '@keyframes linear{from{opacity:0}}.a{animation:linear 2s linear}'
  )
);

describe('Rename', () => {
  test(
    'should rename a counter style referenced by a fallback descriptor',
    processCSS(
      '@counter-style custom{system:cyclic;symbols:"x"}@counter-style other{system:numeric;symbols:"0" "1";fallback:custom}ol{list-style-type:custom}',
      '@counter-style a{system:cyclic;symbols:"x"}@counter-style other{system:numeric;symbols:"0" "1";fallback:a}ol{list-style-type:a}'
    )
  );

  test(
    'should rename a counter style passed to a counter function',
    processCSS(
      '@counter-style custom{system:cyclic;symbols:"x"}ol{list-style-type:custom}li:before{content:counter(chapter,custom)}',
      '@counter-style a{system:cyclic;symbols:"x"}ol{list-style-type:a}li:before{content:counter(chapter,a)}'
    )
  );
});

test(
  'should not touch a counter style that reads as a list-style keyword',
  passthroughCSS(
    '@counter-style inside{system:cyclic;symbols:"x"}ol{list-style:inside inside}'
  )
);

test(
  'should rename a counter referenced by target-counter',
  processCSS(
    'body{counter-reset:section}h3:before{content:counter(section)}a:after{content:target-counter(attr(href),section)}',
    'body{counter-reset:a}h3:before{content:counter(a)}a:after{content:target-counter(attr(href),a)}'
  )
);

test(
  'should tell a counter apart from the counter style beside it',
  processCSS(
    '@counter-style custom{system:cyclic;symbols:"x"}ol{list-style-type:custom}body{counter-reset:section}h3:before{content:counter(section,custom)}',
    '@counter-style a{system:cyclic;symbols:"x"}ol{list-style-type:a}body{counter-reset:a}h3:before{content:counter(a,a)}'
  )
);

describe('Rename', () => {
  test(
    'should rename gridlines named by the grid shorthand',
    processCSS(
      '.grid{grid:[header] auto / 1fr}.a{grid-row:header}',
      '.grid{grid:[a] auto / 1fr}.a{grid-row:a}'
    )
  );

  test(
    'should rename grid areas named by the grid shorthand',
    processCSS(
      '.grid{grid:"head head" auto / 1fr}.a{grid-area:head}',
      '.grid{grid:"a a" auto / 1fr}.a{grid-area:a}'
    )
  );
});

test(
  'should not touch a grid area that reads as a grid keyword',
  passthroughCSS(
    '.grid{grid-template-areas:"dense"}.a{grid-area:dense}.b{grid:auto-flow dense / 1fr}'
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

test('should not generate same ident when plugin instance is reused', async () => {
  const instance = postcss(plugin);

  const [result1, result2, result3, result4] = await Promise.all([
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
  ]);
  assert.strictEqual(
    result1.css,
    '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}'
  );
  assert.strictEqual(
    result2.css,
    '@KEYFRAMES a{0%{color:#fff}to{color:#000}}.one{animation-name:a}'
  );
  assert.strictEqual(
    result3.css,
    '@keyframes b{0%{opacity:1}to{opacity:0}}.two{animation-name:b}'
  );
  assert.strictEqual(
    result4.css,
    '@KEYFRAMES b{0%{opacity:1}to{opacity:0}}.two{animation-name:b}'
  );
});

describe('Encoder', () => {
  test('encoder', async () => {
    const arr = Array.from({ length: 1984 }, (value, index) => index);
    const cache = [];

    for (const num of arr) {
      const encoded = encode(null, num);
      cache.push(encoded);

      const indexes = cache.filter((c) => c === encoded);

      assert.strictEqual(indexes.length, 1);
    }
  });

  test('encoder gen spec', async () => {
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
    for (const num of Object.keys(edgeCaseList)) {
      assert.strictEqual(encode(null, num), edgeCaseList[num]);
    }
  });
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
