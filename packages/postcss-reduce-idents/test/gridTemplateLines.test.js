import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

describe('Grid template lines', () => {
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

  test(
    'should rename both areas and bracketed line names in grid-template shorthand',
    processCSS(
      'body{grid-template:[header-start] "head head" 50px [header-end] / auto}header{grid-area:head;grid-row:header-start/header-end}',
      'body{grid-template:[a] "b b" 50px [c] / auto}header{grid-area:b;grid-row:a/c}'
    )
  );

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

  test(
    'should rename gridlines named by the grid shorthand',
    processCSS(
      '.grid{grid:[header] auto / 1fr}.a{grid-row:header}',
      '.grid{grid:[a] auto / 1fr}.a{grid-row:a}'
    )
  );

  test(
    'should not rename idents outside brackets in grid-template matching line names',
    processCSS(
      'header{grid-template:[line] "area" line;grid-column:line;grid-area:area}',
      'header{grid-template:[a] "b" line;grid-column:a;grid-area:b}'
    )
  );

  test(
    'should rename multiple line names within single brackets in grid-template-columns',
    processCSS(
      'body{grid-template-columns:[col1 col2] 100px [col3];}div{grid-column:col1/col3}',
      'body{grid-template-columns:[a b] 100px [c];}div{grid-column:a/c}'
    )
  );

  test(
    'should rename standalone placement properties',
    processCSS(
      '.item{grid-area:content;grid-column:col-start}',
      '.item{grid-area:a;grid-column:b}'
    )
  );

  test('should not generate colliding grid-template idents when plugin instance is reused', async () => {
    const instance = postcss(plugin);

    const [result1, result2] = await Promise.all([
      instance.process(
        'body{grid-template-areas:"head main"}header{grid-area:head}main{grid-area:main}',
        { from: undefined }
      ),
      instance.process(
        'body{grid-template-areas:"top foot"}nav{grid-area:top}footer{grid-area:foot}',
        { from: undefined }
      ),
    ]);

    assert.strictEqual(
      result1.css,
      'body{grid-template-areas:"a b"}header{grid-area:a}main{grid-area:b}'
    );
    assert.strictEqual(
      result2.css,
      'body{grid-template-areas:"c d"}nav{grid-area:c}footer{grid-area:d}'
    );
  });
});
