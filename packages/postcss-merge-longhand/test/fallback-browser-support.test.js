import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { longstandingFeatures } from '../src/lib/syntaxFeatures.js';
import { featuresSupportedByAll } from '../src/lib/targetSupport.js';

const modern = 'chrome 120, firefox 120, safari 17';

/**
 * @param {string} css
 * @param {Parameters<typeof plugin>[0]} options
 * @param {import('postcss').ProcessOptions} [processOptions]
 * @return {Promise<string>}
 */
async function run(css, options, processOptions = {}) {
  const result = await postcss([plugin(options)]).process(css, {
    from: undefined,
    ...processOptions,
  });
  return result.css;
}

describe('fallbacks dropped when every browserslist target supports the syntax', () => {
  const cases = [
    ['margin:1px;margin:5dvh', 'margin:5dvh'],
    ['margin:1px;margin-top:5dvh', 'margin:5dvh 1px 1px'],
    ['column-count:2;columns:revert-layer', 'columns:revert-layer'],
    ['border-top-color:#fff;border-top-color:#ffff', 'border-top-color:#ffff'],
    ['color:#fff;color:#ffff', 'color:#ffff'],
  ];

  for (const [input, output] of cases) {
    test(`reduces ${input} for modern targets`, async () => {
      assert.equal(
        await run(`a{${input}}`, { overrideBrowserslist: modern }),
        `a{${output}}`
      );
    });

    // UC Browser, QQ Browser and KaiOS lack the syntax or have no data.
    test(`keeps ${input} for the default targets because some of them lack the syntax`, async () => {
      assert.equal(
        await run(`a{${input}}`, { overrideBrowserslist: 'defaults' }),
        `a{${input}}`
      );
    });
  }

  test('keeps margin:1px before margin:1vmax for IE 11, which has no vmax', async () => {
    const css = 'a{margin:1px;margin:1vmax}';
    assert.equal(await run(css, { overrideBrowserslist: 'ie 11' }), css);
  });

  test('keeps margin:1px before margin:1vmax for Edge 15, which predates vmax', async () => {
    const css = 'a{margin:1px;margin:1vmax}';
    assert.equal(await run(css, { overrideBrowserslist: 'edge 15' }), css);
  });

  test('keeps margin-top:1px before margin-top:1vmax for IE 11, which has no vmax', async () => {
    const css = 'a{margin-top:1px;margin-top:1vmax}';
    assert.equal(await run(css, { overrideBrowserslist: 'ie 11' }), css);
  });

  test('does not merge margin longhands that use vmax for IE 11, which would drop the whole shorthand', async () => {
    const css =
      'a{margin-top:1vmax;margin-right:1px;margin-bottom:1px;margin-left:1px}';
    assert.equal(await run(css, { overrideBrowserslist: 'ie 11' }), css);
  });

  test('merges margin longhands that use vmax for modern targets', async () => {
    assert.equal(
      await run(
        'a{margin-top:1vmax;margin-right:1px;margin-bottom:1px;margin-left:1px}',
        { overrideBrowserslist: modern }
      ),
      'a{margin:1vmax 1px 1px}'
    );
  });

  test('keeps margin:1px before margin:5dvh for Safari 15.3, which predates dynamic viewport units', async () => {
    const css = 'a{margin:1px;margin:5dvh}';
    assert.equal(await run(css, { overrideBrowserslist: 'safari 15.3' }), css);
  });

  test('keeps a margin before its -webkit-calc() duplicate even for modern targets because the prefix serves other engines', async () => {
    const css = 'a{margin-top:1px;margin-top:-webkit-calc(2px)}';
    assert.equal(await run(css, { overrideBrowserslist: modern }), css);
  });

  test('honours a browserslist file found next to the stylesheet', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'merge-longhand-'));
    writeFileSync(join(dir, '.browserslistrc'), 'chrome 120\n');
    assert.equal(
      await run('a{margin:1px;margin:5dvh}', {}, { from: join(dir, 'in.css') }),
      'a{margin:5dvh}'
    );
  });

  test('does not carry one stylesheet target support into the next', async () => {
    const css = 'a{margin:1px;margin:5dvh}';
    await run(css, { overrideBrowserslist: modern });
    assert.equal(await run(css, { overrideBrowserslist: 'defaults' }), css);
  });
});

describe('featuresSupportedByAll', () => {
  test('includes dynamic viewport units for targets that all have them', () => {
    assert.ok(
      featuresSupportedByAll(['chrome 120', 'safari 17']).has('unit:dvh')
    );
  });

  test('excludes a feature when one target predates it', () => {
    assert.equal(
      featuresSupportedByAll(['chrome 120', 'safari 15.3']).has('unit:dvh'),
      false
    );
  });

  test('grants a target without compatibility data only the longstanding syntax, which it is assumed to parse', () => {
    assert.deepEqual(
      featuresSupportedByAll(['kaios 3.0']),
      new Set(longstandingFeatures)
    );
  });

  test('withholds the longstanding syntax when one target is below the floor', () => {
    assert.equal(
      featuresSupportedByAll(['chrome 120', 'ie 8']).has('unit:rem'),
      false
    );
  });
});

describe('length units as one shape for supporting targets', () => {
  test('drops height:100vh before height:100dvh when every target supports dvh', async () => {
    assert.equal(
      await run('a{height:100vh;height:100dvh}', {
        overrideBrowserslist: modern,
      }),
      'a{height:100dvh}'
    );
  });

  test('keeps height:100vh before height:100dvh for the default targets because some lack dvh', async () => {
    const css = 'a{height:100vh;height:100dvh}';
    assert.equal(await run(css, { overrideBrowserslist: 'defaults' }), css);
  });

  for (const [name, overrideBrowserslist] of [
    ['modern targets', modern],
    ['the default targets', 'defaults'],
    ['IE 11', 'ie 11'],
  ]) {
    test(`drops height:1vh before height:1px for ${name} because every browser parses both units`, async () => {
      assert.equal(
        await run('a{height:1vh;height:1px}', {
          overrideBrowserslist,
        }),
        'a{height:1px}'
      );
    });
  }

  test('keeps width:1px before width:1Q for the default targets because some lack the Q unit', async () => {
    const css = 'a{width:1px;width:1Q}';
    assert.equal(await run(css, { overrideBrowserslist: 'defaults' }), css);
  });

  test('keeps width:1px before width:1vmax for IE 11 because IE lacks the vmax unit', async () => {
    const css = 'a{width:1px;width:1vmax}';
    assert.equal(await run(css, { overrideBrowserslist: 'ie 11' }), css);
  });

  test('keeps width:1px before width:1deg for any targets because an angle is no length', async () => {
    const css = 'a{width:1px;width:1deg}';
    assert.equal(await run(css, { overrideBrowserslist: 'ie 11' }), css);
  });

  test('keeps width:1px before width:1deg for modern targets because an angle is no length', async () => {
    const css = 'a{width:1px;width:1deg}';
    assert.equal(await run(css, { overrideBrowserslist: modern }), css);
  });

  test('keeps a length before a dimension of a newer non-length unit for modern targets', async () => {
    const css = 'a{width:1px;width:1x}';
    assert.equal(await run(css, { overrideBrowserslist: modern }), css);
  });
});

describe('units Opera Mini lacks are kept as fallbacks', () => {
  const operaMini = 'op_mini all';

  test('keeps width:10px before width:10vw under op_mini all, which has no viewport units', async () => {
    const css = 'a{width:10px;width:10vw}';
    assert.equal(await run(css, { overrideBrowserslist: operaMini }), css);
  });

  test('keeps width:1em before width:2ch under op_mini all, which has no ch unit', async () => {
    const css = 'a{width:1em;width:2ch}';
    assert.equal(await run(css, { overrideBrowserslist: operaMini }), css);
  });

  test('keeps width:10px before width:10vw for the default targets, which include Opera Mini', async () => {
    const css = 'a{width:10px;width:10vw}';
    assert.equal(await run(css, { overrideBrowserslist: 'defaults' }), css);
  });

  test('does not merge margin longhands with vw under op_mini all, which would drop the whole shorthand', async () => {
    const css =
      'a{margin-top:1vw;margin-right:0;margin-bottom:0;margin-left:0}';
    assert.equal(await run(css, { overrideBrowserslist: operaMini }), css);
  });

  for (const overrideBrowserslist of ['ie 11', modern]) {
    test(`drops width:10px before width:10vw for ${overrideBrowserslist}, which parse viewport units`, async () => {
      assert.equal(
        await run('a{width:10px;width:10vw}', { overrideBrowserslist }),
        'a{width:10vw}'
      );
    });
  }
});

describe('CSS-wide keywords older targets lack are kept as fallbacks', () => {
  test('keeps margin-top:1px before margin-top:initial for IE 11, which has no initial', async () => {
    const css = 'a{margin-top:1px;margin-top:initial}';
    assert.equal(await run(css, { overrideBrowserslist: 'ie 11' }), css);
  });

  test('keeps margin-top:1px before margin-top:unset for Safari 9, which predates unset', async () => {
    const css = 'a{margin-top:1px;margin-top:unset}';
    assert.equal(await run(css, { overrideBrowserslist: 'safari 9' }), css);
  });

  test('drops margin-top:1px before margin-top:initial for modern targets', async () => {
    assert.equal(
      await run('a{margin-top:1px;margin-top:initial}', {
        overrideBrowserslist: modern,
      }),
      'a{margin-top:initial}'
    );
  });
});

describe('support that caniuse records later than browser-compat-data', () => {
  test('keeps color:#abc before color:#abcd for iOS Safari 9.3, which caniuse records without alpha hex', async () => {
    const css = 'a{color:#abc;color:#abcd}';
    assert.equal(await run(css, { overrideBrowserslist: 'ios_saf 9.3' }), css);
  });
});

describe('units below the support floor are kept as fallbacks', () => {
  test('keeps font-size:16px before font-size:1rem for IE 8, which has no rem', async () => {
    const css = 'a{font-size:16px;font-size:1rem}';
    assert.equal(await run(css, { overrideBrowserslist: 'ie 8' }), css);
  });

  test('keeps margin-top:16px before margin-top:1rem for IE 8, which has no rem', async () => {
    const css = 'a{margin-top:16px;margin-top:1rem}';
    assert.equal(await run(css, { overrideBrowserslist: 'ie 8' }), css);
  });

  test('does not merge margin longhands with rem for IE 8, which would drop the whole shorthand', async () => {
    const css =
      'a{margin-top:1rem;margin-right:0;margin-bottom:0;margin-left:0}';
    assert.equal(await run(css, { overrideBrowserslist: 'ie 8' }), css);
  });

  test('does not merge border colours with hsl() for IE 8, which would drop the whole shorthand', async () => {
    const css =
      'a{border-top-color:hsl(0,0%,0%);border-right-color:red;border-bottom-color:red;border-left-color:red}';
    assert.equal(await run(css, { overrideBrowserslist: 'ie 8' }), css);
  });

  test('drops width:1px before width:2px for IE 8, as both use a CSS 1 unit', async () => {
    assert.equal(
      await run('a{width:1px;width:2px}', { overrideBrowserslist: 'ie 8' }),
      'a{width:2px}'
    );
  });

  test('rewrites the margin slot that a later margin-top:1rem overrides, as every modern target parses rem', async () => {
    assert.equal(
      await run(
        'a{margin:5px 2px 1px 2px;margin-inline-start:0;margin-top:1rem}',
        {
          overrideBrowserslist: modern,
        }
      ),
      'a{margin:1px 2px;margin-inline-start:0;margin-top:1rem}'
    );
  });

  test('keeps the margin slot that a later margin-top:1rem overrides for IE 8, which falls back on it', async () => {
    const css =
      'a{margin:5px 2px 1px 2px;margin-inline-start:0;margin-top:1rem}';
    assert.equal(
      await run(css, { overrideBrowserslist: 'ie 8' }),
      'a{margin:5px 2px 1px;margin-inline-start:0;margin-top:1rem}'
    );
  });

  for (const overrideBrowserslist of ['ie 11', 'defaults', modern]) {
    test(`drops font-size:16px before font-size:1rem for ${overrideBrowserslist}, which all parse rem`, async () => {
      assert.equal(
        await run('a{font-size:16px;font-size:1rem}', { overrideBrowserslist }),
        'a{font-size:1rem}'
      );
    });
  }
});
