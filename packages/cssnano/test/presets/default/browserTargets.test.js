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

  test('ignores browser targets given to a single plugin, so every plugin judges the file against the same browsers', async () => {
    const targets = { overrideBrowserslist: 'defaults' };
    assert.equal(
      await minify(projectWithoutConfig, {
        overrideBrowserslist: defaultTargetsQuery,
        mergeLonghand: targets,
      }),
      await minifyFor(defaultTargetsQuery)
    );
  });
});

// Each rule minifies differently for the Baseline targets and the oldest
// ones, through a check on browser support or on a browser bug.
const supportDependentInput = [
  'a{background-color:rgba(0,0,0,0);color:rgba(255,0,0,.5)}',
  'b{align-items:center;justify-items:start}',
  'c{top:0;right:0;bottom:0;left:0}',
  'd{height:0%}',
  'e:is(f){color:red}g{color:red}',
  'h[a=b i]{color:red}i{color:red}',
  '@media all{j{color:red}}',
  '@font-face{unicode-range:U+0-7F}',
].join('');

// Every browser that bugs.json lists, none of which supports the newer
// syntax the plugins check for.
const oldestTargets =
  'ie 5.5, ie 6, ie 7, ie 8, ie 9, ie 10, ie 11, edge 12, edge 13, edge 14, edge 15, firefox 2, opera 9';

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
