import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { readdirSync, readFileSync, readdir } from 'node:fs';
import postcss from 'postcss';
import cssnano from '../packages/cssnano/src/index.js';

function base(filepath = '') {
  return new URL(join('../frameworks', filepath), import.meta.url);
}

/** @type {Record<string, string>} */
const frameworks = {};
for (const framework of readdirSync(base())) {
  frameworks[basename(framework, '.css')] = readFileSync(
    base(framework),
    'utf8'
  );
}

function rebuild(pkg) {
  for (const framework of Object.keys(frameworks)) {
    import(pkg + '/src/index.js')
      .then((presetModule) => {
        const preset = presetModule.default();

        return postcss([cssnano({ preset })]).process(frameworks[framework], {
          from: undefined,
        });
      })
      .then((result) => {
        return fs.writeFile(
          `${pkg}/test/integrations/${framework}.css`,
          result.css
        );
      });
  }
}

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '../packages');
readdir(pkgDir, (err, packages) => {
  for (const pkg of packages) {
    if (pkg.startsWith('cssnano-preset-')) {
      rebuild(join(pkgDir, pkg));
    }
  }
});
