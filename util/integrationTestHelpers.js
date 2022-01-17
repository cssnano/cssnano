import path from 'path';
import fs from 'fs';
import postcss from 'postcss';
import * as assert from 'uvu/assert';
import cssnano from '../packages/cssnano/src/index.js';
import { processCSSFactory } from './testHelpers.js';

export function processCSSWithPresetFactory(preset) {
  return processCSSFactory([cssnano({ preset })]);
}

export function loadPreset(preset) {
  return postcss(cssnano({ preset }));
}

export function integrationTests(preset, integrations) {
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
