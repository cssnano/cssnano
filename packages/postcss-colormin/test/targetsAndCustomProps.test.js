import nodepath from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
const { join } = nodepath;
const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('Custom properties and variables', () => {
  test(
    'should not attempt to convert z-index',
    passthroughCSS('h1{z-index:999}')
  );

  test(
    'should not attempt to convert variables',
    passthroughCSS(':root{--some-color: 200 255 0}')
  );

  test(
    'should minify colors inside custom properties by default',
    processCSS('a{--foo:rgb(0 0 0)}', 'a{--foo:#000}')
  );

  test(
    'should not minify colors inside custom properties when transformCustomProperties is false',
    passthroughCSS('a{--foo:rgb(0 0 0)}', { transformCustomProperties: false })
  );

  test(
    'should respect CSS variables',
    passthroughCSS(
      'div{background-color:rgba(51,153,255,var(--tw-bg-opacity))}'
    )
  );
});

describe('Browserslist and alphaHex targets', () => {
  test(
    'should convert long color to 8-digit hex when supported',
    processCSS('h1{color:rgba(100% 50% 0% / 50%)}', 'h1{color:#ff800080}', {
      overrideBrowserslist: 'Chrome 62',
    })
  );

  test(
    'should convert long color to 4-digit hex when supported',
    processCSS('h1{color:hsla(0 100% 50% / 40%)}', 'h1{color:#f006}', {
      overrideBrowserslist: 'Chrome 62',
    })
  );

  test(
    'should convert long color based on Browserslist config [legacy] env',
    processCSS(
      'h1{color:hsla(0 100% 50% / 40%)}',
      'h1{color:rgba(255,0,0,.4)}',
      {
        from: join(testDir, 'browserslist/example.css'),
        env: 'legacy',
      }
    )
  );

  test(
    'should convert long color based on Browserslist config [legacy] env using webpack file path',
    processCSS(
      'h1{color:hsla(0 100% 50% / 40%)}',
      'h1{color:rgba(255,0,0,.4)}',
      {
        file: join(testDir, 'browserslist/example.css'),
        env: 'legacy',
      }
    )
  );

  test(
    'should convert long color based on Browserslist config [legacy] env using custom path',
    processCSS(
      'h1{color:hsla(0 100% 50% / 40%)}',
      'h1{color:rgba(255,0,0,.4)}',
      {
        path: join(testDir, 'browserslist'),
        env: 'legacy',
      }
    )
  );

  test(
    'should convert long color based on Browserslist config [modern] env',
    processCSS('h1{color:hsla(0 100% 50% / 40%)}', 'h1{color:#f006}', {
      from: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    })
  );

  test(
    'should convert long color based on Browserslist config [modern] env using webpack file path',
    processCSS('h1{color:hsla(0 100% 50% / 40%)}', 'h1{color:#f006}', {
      file: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    })
  );

  test(
    'should convert long color based on Browserslist config [modern] env using custom path',
    processCSS('h1{color:hsla(0 100% 50% / 40%)}', 'h1{color:#f006}', {
      path: join(testDir, 'browserslist'),
      env: 'modern',
    })
  );

  test(
    'should not attempt to convert font names',
    passthroughCSS('@font-face{src:local(Noto Sans Black)}')
  );
});

describe('Modern CSS Color Level 4 syntax', () => {
  test(
    'should minify space-separated rgb() to shortest form',
    processCSS('h1{color:rgb(255 0 0)}', 'h1{color:red}')
  );

  test(
    'should minify space-separated rgb() with slash alpha',
    processCSS('h1{color:rgb(255 0 0 / 0.5)}', 'h1{color:rgba(255,0,0,.5)}')
  );

  test(
    'should minify space-separated hsl() to shortest form',
    processCSS('h1{color:hsl(0 100% 50%)}', 'h1{color:red}')
  );

  test(
    'should pass through oklch() values unchanged',
    passthroughCSS('h1{color:oklch(0.6279 0.2577 29.23)}')
  );

  test(
    'should pass through oklab() values unchanged',
    passthroughCSS('h1{color:oklab(0.5 0.1 -0.2)}')
  );

  test(
    'should minify hwb() values',
    processCSS('h1{color:hwb(120 0% 0%)}', 'h1{color:#0f0}')
  );
});
