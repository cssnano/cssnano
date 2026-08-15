'use strict';
const path = require('node:path');
const fs = require('node:fs');
const postcss = require('postcss');
const assert = require('node:assert/strict');
const cssnano = require('../packages/cssnano/src/index.js');
const { processCSSFactory } = require('./testHelpers.js');

function processCSSWithPresetFactory(preset) {
  return processCSSFactory([cssnano({ preset })]);
}

function loadPreset(preset) {
  return postcss(cssnano({ preset }));
}

function integrationTests(preset, integrations) {
  const presetName = path.basename(path.resolve(integrations, '../..'));
  const frameworks = new Map();
  for (const framework of fs.readdirSync(
    path.join(__dirname, '../frameworks')
  )) {
    frameworks.set(
      path.basename(framework, '.css'),
      fs.readFileSync(path.join(__dirname, '../frameworks', framework), 'utf8')
    );
  }

  return async (t) =>
    Promise.all(
      Array.from(frameworks, ([framework, css]) =>
        t.test(`${presetName} - ${framework}`, async () => {
          const result = await postcss([cssnano({ preset })]).process(css, {
            from: undefined,
          });
          assert.strictEqual(
            result.css,
            fs.readFileSync(
              path.join(integrations, `${framework}.css`),
              'utf8'
            ),
            `Mismatch for preset "${preset}" and framework "${framework}"`
          );
        })
      )
    );
}

module.exports = { processCSSWithPresetFactory, loadPreset, integrationTests };
