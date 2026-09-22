import nodepath from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
const { join } = nodepath;
const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Normalise @media queries', () => {
  test(
    'should normalise @media queries',
    processCSS(
      '@media SCREEN ,\tprint {h1{color:red}}@media print,screen{h2{color:blue}}',
      '@media SCREEN,print {h1{color:red}}@media print,screen{h2{color:blue}}'
    )
  );

  test(
    'should normalise @media queries (uppercase)',
    processCSS(
      '@MEDIA SCREEN ,\tPRINT {h1{color:red}}@MEDIA PRINT,SCREEN{h2{color:blue}}',
      '@MEDIA PRINT,SCREEN {h1{color:red}}@MEDIA PRINT,SCREEN{h2{color:blue}}'
    )
  );

  test(
    'should normalise @media queries (2)',
    processCSS(
      '@media only screen \n and ( min-width: 400px, min-height: 500px ){h1{color:blue}}',
      '@media only screen and (min-width:400px,min-height:500px){h1{color:blue}}'
    )
  );

  test(
    'should normalise @media queries (3)',
    processCSS(
      '@media (min-height: 680px),(min-height: 680px){h1{color:red}}',
      '@media (min-height:680px){h1{color:red}}'
    )
  );

  test.skip(
    'should normalise @media queries (3) (lowercase and uppercase)',
    processCSS(
      '@media (min-height: 680px),(MIN-HEIGHT: 680PX){h1{color:red}}',
      '@media (min-height:680px){h1{color:red}}'
    )
  );
});

describe('Normalise "all" in @media queries', () => {
  test(
    'should normalise "all" in @media queries',
    processCSS('@media all{h1{color:blue}}', '@media{h1{color:blue}}', {
      overrideBrowserslist: 'Chrome 58',
    })
  );

  test(
    'should normalise "all" in @media queries (uppercase)',
    processCSS('@MEDIA ALL{h1{color:blue}}', '@MEDIA{h1{color:blue}}', {
      overrideBrowserslist: 'Chrome 58',
    })
  );

  test(
    'should not normalise "all" in @media queries',
    processCSS('@media all{h1{color:blue}}', '@media all{h1{color:blue}}', {
      overrideBrowserslist: 'IE 11',
    })
  );

  test(
    'should not normalise "all" in @media queries based on Browserslist config [legacy] env',
    passthroughCSS('@media all{h1{color:blue}}', {
      from: join(testDir, 'browserslist/example.css'),
      env: 'legacy',
    })
  );

  test(
    'should not normalise "all" in @media queries based on Browserslist config [legacy] env using webpack file path',
    passthroughCSS('@media all{h1{color:blue}}', {
      file: join(testDir, 'browserslist/example.css'),
      env: 'legacy',
    })
  );

  test(
    'should not normalise "all" in @media queries based on Browserslist config [legacy] env using custom path',
    passthroughCSS('@media all{h1{color:blue}}', {
      path: join(testDir, 'browserslist'),
      env: 'legacy',
    })
  );

  test(
    'should normalise "all" in @media queries based on Browserslist config [modern] env',
    processCSS('@media all{h1{color:blue}}', '@media{h1{color:blue}}', {
      from: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    })
  );

  test(
    'should normalise "all" in @media queries based on Browserslist config [modern] env using webpack file path',
    processCSS('@media all{h1{color:blue}}', '@media{h1{color:blue}}', {
      file: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    })
  );

  test(
    'should normalise "all" in @media queries based on Browserslist config [modern] env using custom path',
    processCSS('@media all{h1{color:blue}}', '@media{h1{color:blue}}', {
      path: join(testDir, 'browserslist'),
      env: 'modern',
    })
  );

  test(
    'should normalise "all and" in @media queries',
    processCSS(
      '@media all and (min-width:500px){h1{color:blue}}',
      '@media (min-width:500px){h1{color:blue}}'
    )
  );

  test(
    'should make a media query list unconditional when it contains standalone all',
    processCSS('@media all, screen{h1{color:blue}}', '@media{h1{color:blue}}', {
      overrideBrowserslist: 'Chrome 58',
    })
  );

  test(
    'should make a comment-separated unconditional media query list empty',
    processCSS(
      '@media all/**/,screen{h1{color:blue}}',
      '@media{h1{color:blue}}',
      { overrideBrowserslist: 'Chrome 58' }
    )
  );

  test(
    'should preserve standalone all in a media list for legacy IE',
    processCSS(
      '@media all, screen{h1{color:blue}}',
      '@media all,screen{h1{color:blue}}',
      { overrideBrowserslist: 'IE 11' }
    )
  );

  test(
    'should preserve comment-separated all in a media list for legacy IE',
    processCSS(
      '@media all/**/,screen{h1{color:blue}}',
      '@media all/**/,screen{h1{color:blue}}',
      { overrideBrowserslist: 'IE 11' }
    )
  );

  test(
    'should normalise "all and" in @media queries (uppercase)',
    processCSS(
      '@media ALL AND (min-width:500px){h1{color:blue}}',
      '@media (min-width:500px){h1{color:blue}}'
    )
  );

  test(
    'should preserve comments while removing comment-separated all and',
    processCSS(
      '@media all/**/and (width:1px){h1{color:blue}}',
      '@media /**/(width:1px){h1{color:blue}}'
    )
  );

  test(
    'should preserve comments around removed all and',
    processCSS(
      '@media /*before*/ all /*between*/ and /*after*/ (width:1px){h1{color:blue}}',
      '@media /*before*/ /*between*//*after*/ (width:1px){h1{color:blue}}'
    )
  );

  test(
    'should preserve comments around legacy IE all and removal',
    processCSS(
      '@media /*before*/ all /*between*/ and /*after*/ (width:1px){h1{color:blue}}',
      '@media /*before*/ /*between*//*after*/ (width:1px){h1{color:blue}}',
      { overrideBrowserslist: 'IE 11' }
    )
  );

  test(
    'should not normalise "not all and" in @media queries',
    processCSS(
      '@media not all and (min-width: 768px){h1{color:blue}}',
      '@media not all and (min-width:768px){h1{color:blue}}'
    )
  );
});

describe('Media Queries Level 4 and whitespace', () => {
  test(
    'should not throw on empty parentheses',
    passthroughCSS('@media (){h1{color:blue}}')
  );

  test(
    'should remove function-boundary whitespace without removing required media spacing',
    processCSS(
      '@media only screen\n and ( min-width: 400px , min-height: 500px ) {}',
      '@media only screen and (min-width:400px,min-height:500px) {}'
    )
  );

  test(
    'should minify a whitespace-heavy media prelude',
    (() => {
      const input = Array.from({ length: 1000 }, () => '(min-width: 1px)').join(
        ' '
      );
      const expected = input.replaceAll(': ', ':');
      return processCSS(`@media ${input}{}`, `@media ${expected}{}`);
    })()
  );

  test(
    'should normalize range context with dimension on the left',
    processCSS(
      '@media (400px <= width <= 800px){h1{color:blue}}',
      '@media (400px<=width<=800px){h1{color:blue}}'
    )
  );

  test(
    'should normalize range context with spaces',
    processCSS(
      '@media ( 400px <= width <= 800px ){h1{color:blue}}',
      '@media (400px<=width<=800px){h1{color:blue}}'
    )
  );

  test(
    'should normalize range context with unitless zero',
    processCSS(
      '@media (0 < width < 1000px){h1{color:blue}}',
      '@media (0<width<1000px){h1{color:blue}}'
    )
  );

  test(
    'should preserve calc() in media query conditions',
    passthroughCSS('@media (min-width:calc(100vw - 2rem)){h1{color:red}}')
  );

  test(
    'should preserve whitespace around binary plus in calc()',
    passthroughCSS('@media (min-width:calc(100vw + 2rem)){h1{color:red}}')
  );

  test(
    'should preserve @media with negated condition using and (not ...)',
    passthroughCSS('@media screen and (not (hover:hover)){h1{color:red}}')
  );
});
