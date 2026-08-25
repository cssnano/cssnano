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

function createCssnanoProcessor(preset) {
  return postcss(cssnano({ preset }));
}

function firstDifference(actual, expected) {
  let index = 0;
  while (
    index < actual.length &&
    index < expected.length &&
    actual[index] === expected[index]
  ) {
    index++;
  }
  return index;
}

function mismatchMessage(framework, actual, expected) {
  const index = firstDifference(actual, expected);
  const context = 40;
  const start = Math.max(0, index - context);
  const end = index + context;
  return [
    `Framework "${framework}" output differs at character ${index}`,
    `actual  (${actual.length} chars): ${JSON.stringify(actual.slice(start, end))}`,
    `expected (${expected.length} chars): ${JSON.stringify(expected.slice(start, end))}`,
  ].join('\n');
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
    Promise.allSettled(
      Array.from(frameworks, ([framework, css]) =>
        t.test(`${presetName} - ${framework}`, async () => {
          const result = await postcss([cssnano({ preset })]).process(css, {
            from: undefined,
          });
          const expected = fs.readFileSync(
            path.join(integrations, `${framework}.css`),
            'utf8'
          );
          if (result.css !== expected) {
            assert.fail(mismatchMessage(framework, result.css, expected));
          }
        })
      )
    );
}

module.exports = {
  processCSSWithPresetFactory,
  createCssnanoProcessor,
  integrationTests,
};
