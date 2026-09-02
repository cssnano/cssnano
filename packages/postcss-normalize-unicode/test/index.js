import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
import nodepath from 'node:path';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { join } = nodepath;
const { passthroughCSS, processCSS, processor } = processCSSFactory(plugin);

async function processDeclaration(value) {
  const root = postcss
    .root()
    .append(
      postcss
        .rule({ selector: 'a' })
        .append(postcss.decl({ prop: 'unicode-range', value }))
    );
  await processor(root, {
    overrideBrowserslist: ['defaults', 'not ie <=11'],
  });
  return root.first.first;
}

function fixture(range) {
  return `@font-face{font-family:test;unicode-range:${range}}*{font-family:test}`;
}

test(
  'should convert a unicode range to a wildcard range',
  processCSS(
    fixture('u+2b00-2bff'), // Miscellaneous Symbols and Arrows
    fixture('u+2b??'),
    { overrideBrowserslist: ['defaults', 'not ie <=11'] }
  )
);

describe('Convert', () => {
  test(
    'should convert a unicode range to a wildcard range (2)',
    processCSS(
      fixture('u+1e00-1eff'), // Latin Extended Additional
      fixture('u+1e??'),
      { overrideBrowserslist: ['defaults', 'not ie <=11'] }
    )
  );

  test(
    'should convert a unicode range to a wildcard range (3)',
    processCSS(fixture('u+2120-212f'), fixture('u+212?'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test(
    'should convert a unicode range to a wildcard range (4)',
    processCSS(fixture('u+2100-21ff'), fixture('u+21??'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test(
    'should convert a unicode range to a wildcard range (5)',
    processCSS(fixture('u+2000-2fff'), fixture('u+2???'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );
});

describe('Pass', () => {
  test(
    'should pass through a unicode range that cannot be reduced',
    passthroughCSS(
      fixture('u+0-7f'), // Basic Latin
      { overrideBrowserslist: ['defaults', 'not ie <=11'] }
    )
  );

  test(
    'should pass through a unicode range that cannot be reduced (2)',
    passthroughCSS(fixture('u+2125-2128'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test(
    'should pass through a unicode range that cannot be reduced (3)',
    passthroughCSS(fixture('u+2012-2f12'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test(
    'should pass through a unicode range that cannot be reduced (4)',
    passthroughCSS(fixture('u+2002-2ff2'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test(
    'should pass through css variables',
    passthroughCSS(fixture('var(--caseInsensitive)'))
  );

  test(
    'should pass through env variables',
    passthroughCSS(fixture('env(foo-bar)'))
  );

  test(
    'should preserve strings and functions',
    passthroughCSS(fixture('"u+2b00-2bff" /* comment */ var(--range)'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test('should preserve a mismatched delimiter', async () => {
    const decl = await processDeclaration('u+2b00-2bff (] u+2b00-2bff');
    assert.equal(decl.value, 'u+2b00-2bff (] u+2b00-2bff');
  });

  test('should preserve an unclosed delimiter', async () => {
    const decl = await processDeclaration('u+2b00-2bff (u+2b00-2bff');
    assert.equal(decl.value, 'u+2b00-2bff (u+2b00-2bff');
  });

  test('should preserve an unterminated comment', async () => {
    const decl = await processDeclaration('u+2b00-2bff /*');
    assert.equal(decl.value, 'u+2b00-2bff /*');
  });

  test(
    'should preserve a bare URL token',
    passthroughCSS(fixture('url(u+2b00-2bff)'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test(
    'should normalize multiple ranges while preserving separators',
    processCSS(
      fixture('u+2b00-2bff/**/, U+1e00-1eff'),
      fixture('u+2b??/**/, u+1e??'),
      { overrideBrowserslist: ['defaults', 'not ie <=11'] }
    )
  );

  test(
    'should preserve leading commas',
    passthroughCSS(fixture(',u+2b00-2bff'))
  );

  test(
    'should preserve trailing commas',
    passthroughCSS(fixture('u+2b00-2bff,'))
  );

  test(
    'should preserve doubled commas',
    passthroughCSS(fixture('u+2b00-2bff,,u+1e00-1eff'))
  );

  test(
    'should preserve adjacent unicode ranges without commas',
    passthroughCSS(fixture('u+2b00-2bff u+1e00-1eff'))
  );

  test(
    'should preserve values that are not unicode-range descriptor lists',
    passthroughCSS(
      fixture(
        'var(--range,u+2b00-2bff) func(u+2b00-2bff) [u+2b00-2bff] (u+2b00-2bff) u+2b00-2bff'
      ),
      { overrideBrowserslist: ['defaults', 'not ie <=11'] }
    )
  );

  test(
    'should preserve escaped function names',
    passthroughCSS(fixture('v\\61 r(u+2b00-2bff)'), {
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    })
  );

  test('should pass through initial', passthroughCSS(fixture('initial')));

  test(
    'should pass through unknown property',
    passthroughCSS('new-property: u+2b00-2bff')
  );
});

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
