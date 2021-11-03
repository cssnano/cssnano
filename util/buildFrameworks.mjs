import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { readdirSync, readFileSync } from 'fs';
import glob from 'glob';
import postcss from 'postcss';
import cssnano from '../packages/cssnano/dist/index.js';

function base(filepath = '') {
  return new URL(join('../frameworks', filepath), import.meta.url);
}

const frameworks = readdirSync(base()).reduce((list, framework) => {
  list[basename(framework, '.css')] = readFileSync(base(framework), 'utf8');

  return list;
}, {});

function rebuild(pkg) {
  return Object.keys(frameworks).forEach(async (framework) => {
    const presetModule = await import(pkg + '/dist/index.js');
    const preset = presetModule.default();

    return postcss([cssnano({ preset })])
      .process(frameworks[framework], { from: undefined })
      .then((result) => {
        return fs.writeFile(
          `${pkg}/src/__tests__/integrations/${framework}.css`,
          result.css
        );
      });
  });
}

glob(
  `${join(
    dirname(fileURLToPath(import.meta.url)),
    '../packages'
  )}/cssnano-preset-*`,
  (err, packages) => {
    if (err) {
      throw err;
    }
    packages.forEach(rebuild);
  }
);
