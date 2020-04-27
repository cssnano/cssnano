import postcss from 'postcss';

import plugin from '..';

function run(testMsg = 'should work', input, output) {
  it(testMsg, (done) => {
    let result = postcss([plugin]).process(input, {
      from: undefined,
    });
    expect(result.css).toEqual(output);
    done();
  });
}

describe('transforming @media', () => {
  run(
    'should safely transform the @media and its properties',
    '@MEDIA screen and (min-width: 480px){body{COLOR: lightgreen;}}',
    '@media screen and (min-width: 480px){body{color: lightgreen;}}'
  );

  run(
    'should safely transform the @media but not the params',
    '@MEDIA SCREEN and (min-width: 480px){}',
    '@media screen and (min-width: 480px){}'
  );
});

describe('transforming @charset', () => {
  run(
    'should not transform the @charset',
    '@charset "UTF-8";',
    '@charset "UTF-8";'
  );
  run(
    'should safely transform the @charset',
    '@CHARSET "iso-8859-15";',
    '@charset "iso-8859-15";'
  );
});

describe('transforming @import ', () => {
  run(
    'should  transform the @import ',
    `@IMPORT url("fineprint.css") print;@import url("bluish.css") speech;@ImPoRt 'custom.css';@import url("CHROME://communicator/SKIN/");@import "common.css" screen;`,
    `@import url("fineprint.css") print;@import url("bluish.css") speech;@import 'custom.css';@import url("CHROME://communicator/SKIN/");@import "common.css" screen;`
  );
});

describe('transforming @namespace', () => {
  run(
    'should safely transform the @namespace',
    '@NAMESPACE prefix url(http://www.w3.org/1999/xhtml);',
    '@namespace prefix url(http://www.w3.org/1999/xhtml);'
  );
});

describe('transforming @supports ', () => {
  run(
    'should safely transform the @supports ',
    '@SUPPORTS (display: grid) {div {display: grid;}};@supports not (display: GRID) {div {float: right;}}',
    '@supports (display: grid) {div {display: grid;}};@supports not (display: GRID) {div {float: right;}}'
  );
});

describe('transforming @document  ', () => {
  run(
    'should safely transform the @document  ',
    '@DOCUMENT URL("https://www.EXAMPLE.com/") {h1 {COLOR: green;}}',
    '@document URL("https://www.EXAMPLE.com/") {h1 {color: green;}}'
  );
});

describe('transforming @page   ', () => {
  run(
    'should safely transform the @page   ',
    '@PAGE {margin: 1cm;};@page :FIRST {margin: 2cm;}',
    '@page {margin: 1cm;};@page :FIRST {margin: 2cm;}'
  );
});

describe('transforming @font-face', () => {
  run(
    'should safely transform the @font-face   ',
    '@FONT-FACE {font-family: "Open Sans";src: url("/fonts/OpenSans-Regular-webfont.woff2") format("woff2"),url("/fonts/OpenSans-Regular-webfont.woff") FORMAT("woff");}',
    '@font-face {font-family: "Open Sans";src: url("/fonts/OpenSans-Regular-webfont.woff2") format("woff2"),url("/fonts/OpenSans-Regular-webfont.woff") FORMAT("woff");}'
  );
});

describe('transforming @keyframes', () => {
  run(
    'should safely transform the @keyframes',
    '@KEYFRAMES slidein {from {transform: translateX(0%);}};@KEYFRAMES important2  {FROM {TRANSFORM: translateX(0%);}}',
    '@keyframes slidein {from {transform: translateX(0%);}};@keyframes important2  {from {transform: translateX(0%);}}'
  );
});

describe('transforming @viewports', () => {
  run(
    'should safely transform the @viewports',
    '@VIEWPORT {min-width: 640px;max-width: 800px;}@viewport {ZOOM: 0.75;  min-zoom: 0.5;max-zoom: 0.9;}@viewport {orientation: LANDSCAPE;}',
    '@viewport {min-width: 640px;max-width: 800px;}@viewport {zoom: 0.75;  min-zoom: 0.5;max-zoom: 0.9;}@viewport {orientation: LANDSCAPE;}'
  );
});

describe('transforming @counter-style', () => {
  run(
    'should safely transform the @counter-style',
    '@counter-STYLE thumbs {system: cyclic;SYMBOLs: "F44D";suffix: " ";} UL{list-style: thumbs;}',
    '@counter-style thumbs {system: cyclic;symbols: "F44D";suffix: " ";} ul{list-style: thumbs;}'
  );
});

describe('transforming @counter-style', () => {
  run(
    'should safely transform the @counter-style',
    '@counter-STYLE CAPS {system: cyclic;SYMBOLs: "F44D";suffix: " ";} UL{list-style: CAPS;} .ulstyle {list-style: caps;}',
    '@counter-style CAPS {system: cyclic;symbols: "F44D";suffix: " ";} ul{list-style: CAPS;} .ulstyle {list-style: caps;}'
  );
});
