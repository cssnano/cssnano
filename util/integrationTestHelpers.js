'use strict';
const path = require('path');
const fs = require('fs');
const postcss = require('postcss');
const assert = require('uvu/assert');
const cssnano = require('../packages/cssnano/src/index.js');
const { processCSSFactory } = require('./testHelpers.js');

function processCSSWithPresetFactory(preset) {
  return processCSSFactory([cssnano({ preset })]);
}

function loadPreset(preset) {
  return postcss(cssnano({ preset }));
}

function integrationTests(preset, integrations) {
  const frameworks = new Map();
  for (const framework of fs.readdirSync(
    path.join(__dirname, '../frameworks')
  )) {
    frameworks.set(
      path.basename(framework, '.css'),
      fs.readFileSync(path.join(__dirname, '../frameworks', framework), 'utf8')
    );
  }

  const expectations = [];
  for (const [framework, css] of frameworks) {
    expectations.push(
      postcss([cssnano({ preset })])
        .process(css, { from: undefined })
        .then((result) => {
          assert.is(
            result.css,
            fs.readFileSync(`${integrations}/${framework}.css`, 'utf8')
          );
        })
    );
  }
  return () => Promise.all(expectations);
}

module.exports = { processCSSWithPresetFactory, loadPreset, integrationTests };
