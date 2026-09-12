import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Grid template areas', () => {
  test(
    'should normalize empty grid-template areas without area references',
    processCSS(
      'a{grid-template-areas:"... ..."}',
      'a{grid-template-areas:". ."}'
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
    'should treat escaped whitespace as a grid cell separator',
    processCSS(
      'body{grid-template-areas:"header\\ footer"}header{grid-area:header}footer{grid-area:footer}',
      'body{grid-template-areas:"a b"}header{grid-area:a}footer{grid-area:b}'
    )
  );

  test(
    'should treat escaped CSS whitespace as a grid cell separator',
    processCSS(
      'body{grid-template-areas:"header\\20 footer" "nav\\000020main"}header{grid-area:header}footer{grid-area:footer}nav{grid-area:nav}main{grid-area:main}',
      'body{grid-template-areas:"a b" "c d"}header{grid-area:a}footer{grid-area:b}nav{grid-area:c}main{grid-area:d}'
    )
  );

  test(
    'should keep non-CSS whitespace inside a grid area name',
    processCSS(
      'body{grid-template-areas:"foo bar"}main{grid-area:foo\\A0 bar}',
      'body{grid-template-areas:"a"}main{grid-area:a}'
    )
  );

  test(
    'should escape decoded characters when serializing grid strings',
    processCSS(
      'body{grid-template-areas:"foo\\\"bar"}',
      'body{grid-template-areas:"foo\\\"bar"}'
    )
  );

  test(
    'should handle invalid Unicode escapes in grid templates',
    processCSS(
      'body{grid-template-areas:"\\110000 \\D800"}',
      'body{grid-template-areas:"\uFFFD\uFFFD"}'
    )
  );

  test(
    'should normalize escaped dots as null cells',
    processCSS(
      'body{grid-template-areas:"content \\."}main{grid-area:content}',
      'body{grid-template-areas:"a ."}main{grid-area:a}'
    )
  );

  test(
    'should normalize CSS whitespace in grid templates',
    processCSS(
      'body{grid-template-areas:"header\\9 footer" "nav\\c main" "aside\\d \\a content"}header{grid-area:header}footer{grid-area:footer}nav{grid-area:nav}main{grid-area:main}aside{grid-area:aside}content{grid-area:content}',
      'body{grid-template-areas:"a b" "c d" "e f"}header{grid-area:a}footer{grid-area:b}nav{grid-area:c}main{grid-area:d}aside{grid-area:e}content{grid-area:f}'
    )
  );

  test(
    'should not split escaped newlines in grid area names',
    processCSS(
      'body{grid-template-areas:"header\\\nfooter"}main{grid-area:headerfooter}',
      'body{grid-template-areas:"a"}main{grid-area:a}'
    )
  );

  test(
    'should rename referenced escaped grid area names',
    processCSS(
      'body{grid-template-areas:"header \\." "footer unused"}header{grid-area:header}footer{grid-area:footer}',
      'body{grid-template-areas:"a ." "b c"}header{grid-area:a}footer{grid-area:b}'
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
    'should preserve grid template area order',
    passthroughCSS(`.project {
  display: grid;
  grid-template-areas:
    'b a' 'b c';
}`)
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
    'should rename grid areas named by the grid shorthand',
    processCSS(
      '.grid{grid:"head head" auto / 1fr}.a{grid-area:head}',
      '.grid{grid:"a a" auto / 1fr}.a{grid-area:a}'
    )
  );

  test(
    'should not touch a grid area that reads as a grid keyword',
    passthroughCSS(
      '.grid{grid-template-areas:"dense"}.a{grid-area:dense}.b{grid:auto-flow dense / 1fr}'
    )
  );
});
