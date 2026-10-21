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
/** @type {string} */
let projectWithEnvConfig;
const savedQuery = process.env.BROWSERSLIST;

before(() => {
  projectWithoutConfig = mkdtempSync(join(tmpdir(), 'cssnano-no-config-'));
  writeFileSync(join(projectWithoutConfig, 'package.json'), '{}');
  projectWithDefaultsConfig = mkdtempSync(join(tmpdir(), 'cssnano-config-'));
  writeFileSync(join(projectWithDefaultsConfig, '.browserslistrc'), 'defaults');
  projectWithEnvConfig = mkdtempSync(join(tmpdir(), 'cssnano-env-config-'));
  writeFileSync(
    join(projectWithEnvConfig, '.browserslistrc'),
    `[modern]\n${defaultTargetsQuery}\n\n[legacy]\nie 11\n`
  );
});

beforeEach(() => {
  delete process.env.BROWSERSLIST;
});

after(() => {
  if (savedQuery === undefined) delete process.env.BROWSERSLIST;
  else process.env.BROWSERSLIST = savedQuery;
  rmSync(projectWithoutConfig, { recursive: true });
  rmSync(projectWithDefaultsConfig, { recursive: true });
  rmSync(projectWithEnvConfig, { recursive: true });
});

/**
 * @param {string} project directory that holds the stylesheet
 * @param {object} [options] default preset options
 * @return {Promise<string>}
 */
async function minify(project, options = {}) {
  const result = await postcss(preset(options)).process(input, {
    from: join(project, 'app.css'),
  });
  return result.css;
}

/** @param {string | string[]} query */
function minifyFor(query) {
  return minify(projectWithoutConfig, { browserslist: { query } });
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

  test('targets browserslist.query instead of the project config', async () => {
    assert.equal(
      await minify(projectWithDefaultsConfig, {
        browserslist: { query: defaultTargetsQuery },
      }),
      await minifyFor(defaultTargetsQuery)
    );
  });

  test('targets the section of the project browserslist config that browserslist.env names', async () => {
    assert.equal(
      await minify(projectWithEnvConfig, { browserslist: { env: 'legacy' } }),
      await minify(projectWithoutConfig, { browserslist: { query: 'ie 11' } })
    );
  });

  test('targets the usage data that browserslist.stats gives for a query', async () => {
    assert.equal(
      await minify(projectWithoutConfig, {
        browserslist: {
          query: '> 1%',
          stats: { chrome: { 150: 100 } },
        },
      }),
      await minifyFor('chrome 150')
    );
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
  return postcss(preset({ browserslist: { query } })).process(
    supportDependentInput,
    {
      from: join(projectWithoutConfig, 'app.css'),
    }
  );
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

describe('browser target options that a plugin sets itself', () => {
  test('throws for overrideBrowserslist in the options of a plugin, and names browserslist', () => {
    assert.throws(
      () =>
        cssnano({
          preset,
          options: { merge: { overrideBrowserslist: 'ie 11' } },
        }),
      /"overrideBrowserslist" in options\.merge was removed; set browserslist\.query instead/v
    );
  });
});
