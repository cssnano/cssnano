import assert from 'node:assert/strict';
import nodepath from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
const { join } = nodepath;
const { processCSS } = processCSSFactory(plugin);

function fixture(range) {
  return `@font-face{font-family:test;unicode-range:${range}}*{font-family:test}`;
}

test(
  'should downcase the unicode-range property/value pair',
  processCSS(
    '@font-face{font-family:test;UNICODE-RANGE:U+07-F}*{font-family:test}',
    '@font-face{font-family:test;UNICODE-RANGE:u+07-f}*{font-family:test}',
    { overrideBrowserslist: ['defaults', 'not ie <=11'] }
  )
);

test('should update raw values on cache hits', async () => {
  const root = postcss.parse(
    'a{unicode-range:U+2B00-2BFF;unicode-range:U+2B00-2BFF}'
  );
  const declarations = root.nodes[0].nodes;
  for (const decl of declarations) {
    decl.raws.value = { raw: decl.value, value: decl.value };
  }
  await postcss(
    plugin({ overrideBrowserslist: ['defaults', 'not ie <=11'] })
  ).process(root, { from: undefined });
  for (const decl of declarations) {
    assert.equal(decl.value, 'u+2b??');
    assert.equal(decl.raws.value.raw, 'u+2b??');
  }
  assert.equal(root.toString(), 'a{unicode-range:u+2b??;unicode-range:u+2b??}');
});

test(
  'should upcase every range in a legacy descriptor list',
  processCSS(fixture('u+2b00-2bff, u+1e00-1eff'), fixture('U+2b??, U+1e??'), {
    overrideBrowserslist: 'IE 9',
  })
);

test(
  'should normalize legacy lists with comments and whitespace around separators',
  processCSS(
    fixture(
      ' /* before */ u+2b00-2bff /* left */ , /* right */ U+1e00-1eff /* after */ '
    ),
    fixture(
      ' /* before */ U+2b?? /* left */ , /* right */ U+1e?? /* after */ '
    ),
    { overrideBrowserslist: 'IE 9' }
  )
);

describe('Upcase', () => {
  test(
    'should upcase the "u" prefix (IE)',
    processCSS(fixture('u+2002-2ff2'), fixture('U+2002-2ff2'), {
      overrideBrowserslist: 'IE 9',
    })
  );

  test(
    'should upcase the "u" prefix (Edge 15)',
    processCSS(fixture('u+2002-2ff2'), fixture('U+2002-2ff2'), {
      overrideBrowserslist: 'Edge 15',
    })
  );

  test(
    'should upcase the "u" prefix based on Browserslist config [legacy] env',
    processCSS(fixture('u+2002-2ff2'), fixture('U+2002-2ff2'), {
      from: join(testDir, 'browserslist/example.css'),
      env: 'legacy',
    })
  );

  test(
    'should upcase the "u" prefix based on Browserslist config [legacy] env using webpack file path',
    processCSS(fixture('u+2002-2ff2'), fixture('U+2002-2ff2'), {
      file: join(testDir, 'browserslist/example.css'),
      env: 'legacy',
    })
  );

  test(
    'should upcase the "u" prefix based on Browserslist config [legacy] env using custom path',
    processCSS(fixture('u+2002-2ff2'), fixture('U+2002-2ff2'), {
      path: join(testDir, 'browserslist'),
      env: 'legacy',
    })
  );
});

describe('Downcase', () => {
  test(
    'should downcase the "u" prefix based on Browserslist config [modern] env',
    processCSS(fixture('U+2002-2ff2'), fixture('u+2002-2ff2'), {
      from: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    })
  );

  test(
    'should downcase the "u" prefix based on Browserslist config [modern] env using webpack file path',
    processCSS(fixture('U+2002-2ff2'), fixture('u+2002-2ff2'), {
      file: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    })
  );

  test(
    'should downcase the "u" prefix based on Browserslist config [modern] env using custom path',
    processCSS(fixture('U+2002-2ff2'), fixture('u+2002-2ff2'), {
      path: join(testDir, 'browserslist'),
      env: 'modern',
    })
  );
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
