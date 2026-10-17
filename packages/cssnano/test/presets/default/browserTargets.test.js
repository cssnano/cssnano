import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';
import postcss from 'postcss';
import cssnano from '../../../src/index.js';
import preset from '../../../src/presets/default.js';
import { defaultTargetsQuery } from '../../../src/utils/browserTargets.js';

// The alignment shorthands are Baseline widely available, but `defaults`
// includes Opera Mini and UC Browser, which do not parse them, so the two
// target sets minify this input differently.
const input = 'a{align-items:center;justify-items:start}';

/** @type {string} */
let projectWithoutConfig;
/** @type {string} */
let projectWithDefaultsConfig;
const savedQuery = process.env.BROWSERSLIST;

before(() => {
  projectWithoutConfig = mkdtempSync(join(tmpdir(), 'cssnano-no-config-'));
  writeFileSync(join(projectWithoutConfig, 'package.json'), '{}');
  projectWithDefaultsConfig = mkdtempSync(join(tmpdir(), 'cssnano-config-'));
  writeFileSync(join(projectWithDefaultsConfig, '.browserslistrc'), 'defaults');
});

beforeEach(() => {
  delete process.env.BROWSERSLIST;
});

after(() => {
  if (savedQuery === undefined) delete process.env.BROWSERSLIST;
  else process.env.BROWSERSLIST = savedQuery;
  rmSync(projectWithoutConfig, { recursive: true });
  rmSync(projectWithDefaultsConfig, { recursive: true });
});

/**
 * @param {string} project directory that holds the stylesheet
 * @param {object} [options] default preset options
 * @return {Promise<string>}
 */
async function minify(project, options = {}) {
  const result = await postcss(cssnano({ preset: [preset, options] })).process(
    input,
    { from: join(project, 'app.css') }
  );
  return result.css;
}

/** @param {string | string[]} query */
function minifyFor(query) {
  return minify(projectWithoutConfig, { overrideBrowserslist: query });
}

describe('default preset browser targets', () => {
  test('the input minifies differently for Baseline widely available and for browserslist defaults, so the comparisons below can tell them apart', async () => {
    assert.notEqual(
      await minifyFor(defaultTargetsQuery),
      await minifyFor('defaults')
    );
  });

  test('targets Baseline widely available browsers when the project states no preference', async () => {
    assert.equal(
      await minify(projectWithoutConfig),
      await minifyFor(defaultTargetsQuery)
    );
  });

  test('targets the project browserslist config instead of the default', async () => {
    assert.equal(
      await minify(projectWithDefaultsConfig),
      await minifyFor('defaults')
    );
  });

  test('targets the BROWSERSLIST environment variable instead of the default', async () => {
    process.env.BROWSERSLIST = 'defaults';
    const output = await minify(projectWithoutConfig);
    delete process.env.BROWSERSLIST;
    assert.equal(output, await minifyFor('defaults'));
  });

  test('targets overrideBrowserslist instead of the project config', async () => {
    assert.equal(
      await minify(projectWithDefaultsConfig, {
        overrideBrowserslist: defaultTargetsQuery,
      }),
      await minifyFor(defaultTargetsQuery)
    );
  });

  // A wrapper preset may copy the plugin options, and structuredClone, like a
  // JSON round trip, drops symbol-keyed properties.
  test('targets overrideBrowserslist when a wrapper preset clones the plugin options', async () => {
    const { plugins } = preset({ overrideBrowserslist: defaultTargetsQuery });
    const cloned = plugins.map(([plugin, options]) => [
      plugin,
      structuredClone(options),
    ]);
    const result = await postcss(
      cssnano({ preset: { plugins: cloned } })
    ).process(input, { from: join(projectWithDefaultsConfig, 'app.css') });
    assert.equal(result.css, await minifyFor(defaultTargetsQuery));
  });

  // A spread keeps the preset's symbol-keyed properties, so the edit must be
  // read from the plain options, as it is after a clone.
  test('targets overrideBrowserslist that a wrapper preset sets on the plugin options', async () => {
    const { plugins } = preset({ overrideBrowserslist: 'defaults' });
    const edited = plugins.map(([plugin, options]) => [
      plugin,
      { ...options, overrideBrowserslist: defaultTargetsQuery },
    ]);
    const result = await postcss(
      cssnano({ preset: { plugins: edited } })
    ).process(input, { from: join(projectWithoutConfig, 'app.css') });
    assert.equal(result.css, await minifyFor(defaultTargetsQuery));
  });
});

// Each rule minifies differently for the Baseline targets and the oldest
// ones, through a check on browser support or on a browser bug. The
// rgba(0,0,0,0) rule is left out: it becomes the transparent keyword for every
// known target, IE 11 included, so it does not depend on support.
const supportDependentInput = [
  'a{color:rgba(255,0,0,.5)}',
  'b{align-items:center;justify-items:start}',
  'c{top:0;right:0;bottom:0;left:0}',
  'd{height:0%}',
  'e:is(f){color:red}g{color:red}',
  'h[a=b i]{color:red}i{color:red}',
  '@media all{j{color:red}}',
  '@font-face{unicode-range:U+0-7F}',
].join('');

// IE 11 is the oldest supported browser, and it lacks the newer syntax the
// plugins check for.
const oldestTargets = 'ie 11';

/** @param {string | string[]} query */
function processFor(query) {
  return postcss(
    cssnano({ preset: [preset, { overrideBrowserslist: query }] })
  ).process(supportDependentInput, {
    from: join(projectWithoutConfig, 'app.css'),
  });
}

const matchesNothing = ['ie 11', 'not ie 11'];

describe('default preset with a query that matches no browser', () => {
  test('the input minifies differently for Baseline widely available and for the oldest targets, so the comparison below can tell them apart', async () => {
    assert.notEqual(
      (await processFor(defaultTargetsQuery)).css,
      (await processFor(oldestTargets)).css
    );
  });

  test('keeps every support-dependent optimization off, as for the oldest targets', async () => {
    assert.equal(
      (await processFor(matchesNothing)).css,
      (await processFor(oldestTargets)).css
    );
  });

  test('warns that the query matches no browser', async () => {
    const result = await processFor(matchesNothing);
    assert.ok(
      result.warnings().some(({ text }) => /matches no browser/v.test(text))
    );
  });
});

/**
 * @param {object} presetOptions
 * @param {number} files how many stylesheets one processor handles
 * @return {Promise<string[][]>} the warning texts of each result
 */
async function warningsPerFile(presetOptions, files = 1) {
  const processor = postcss(cssnano({ preset: [preset, presetOptions] }));
  const texts = [];
  for (let i = 0; i < files; i++) {
    const result = await processor.process(input, {
      from: join(projectWithoutConfig, `app${i}.css`),
    });
    texts.push(result.warnings().map(({ text }) => text));
  }
  return texts;
}

describe('per-plugin browser target options', () => {
  for (const key of ['overrideBrowserslist', 'stats', 'env', 'path']) {
    test(`the result warns that ${key} set on a plugin is ignored`, async () => {
      const [[text]] = await warningsPerFile({
        mergeRules: { [key]: 'ie 11' },
      });
      assert.match(
        text,
        new RegExp(`The mergeRules option ${key} is ignored`, 'v')
      );
    });
  }

  test('the result warns that a target option set on a plugin that ignores browser targets is ignored', async () => {
    const [[text]] = await warningsPerFile({
      discardComments: { overrideBrowserslist: 'ie 11' },
    });
    assert.match(
      text,
      /The discardComments option overrideBrowserslist is ignored/v
    );
  });

  test('the result warns about a target option on a plugin that ignores browser targets on every file', async () => {
    const [first, second] = await warningsPerFile(
      { discardComments: { stats: {} } },
      2
    );
    assert.deepEqual([first.length, second.length], [1, 1]);
  });

  test('the result warns about a target option on minifySelectors when convertToIs is false', async () => {
    const [[text]] = await warningsPerFile({
      minifySelectors: { convertToIs: false, env: 'production' },
    });
    assert.match(text, /The minifySelectors option env is ignored/v);
  });

  test('the plugin keeps the preset targets when it sets its own', async () => {
    assert.equal(
      (
        await minify(projectWithoutConfig, {
          overrideBrowserslist: defaultTargetsQuery,
          mergeRules: { overrideBrowserslist: 'ie 11' },
        })
      ).toString(),
      await minifyFor(defaultTargetsQuery)
    );
  });

  test('the result warns on every file a processor handles', async () => {
    const [first, second, third] = await warningsPerFile(
      { minifyParams: { path: '/a' } },
      3
    );
    assert.deepEqual([first.length, second.length, third.length], [1, 1, 1]);
  });

  test('a plugin that sets other options produces no warning', async () => {
    assert.deepEqual(
      await warningsPerFile({ minifySelectors: { sort: false } }),
      [[]]
    );
  });

  test('a plugin target option that is undefined produces no warning', async () => {
    assert.deepEqual(
      await warningsPerFile({ mergeRules: { env: undefined } }),
      [[]]
    );
  });

  test('a plugin excluded with exclude: true produces no warning, because it never runs', async () => {
    assert.deepEqual(
      await warningsPerFile({ colormin: { exclude: true, stats: {} } }),
      [[]]
    );
  });

  test('a plugin disabled with false produces no warning', async () => {
    assert.deepEqual(await warningsPerFile({ mergeRules: false }), [[]]);
  });
});
